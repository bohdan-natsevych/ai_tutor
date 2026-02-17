import { NextRequest, NextResponse } from 'next/server';
import { createChat, getChat, getAllChats, updateChat, deleteChat, createMessage, updateMessage, getChatMessages } from '@/lib/db/queries';
import { aiManager } from '@/lib/ai/manager';
import { contextManager } from '@/lib/ai/context';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { convertToWav } from '@/lib/audio/convert';

// CURSOR: Track last initialized provider to reinitialize when changed
let lastInitializedProvider: string | null = null;

// CURSOR: Initialize with specified provider and model, or use defaults
async function ensureInitialized(providerId?: string, model?: string) {
  const targetProvider = providerId || 'openai-chat';
  
  // CURSOR: Reinitialize if provider changed
  if (lastInitializedProvider !== targetProvider) {
    await aiManager.initialize(targetProvider);
    lastInitializedProvider = targetProvider;
  }
  
  // CURSOR: Set model if provided
  if (model) {
    aiManager.setModel(model);
  }
}

// GET /api/chat - List all chats
// GET /api/chat?id=xxx - Get specific chat with messages
export async function GET(request: NextRequest) {
  // CURSOR: GET doesn't need AI, but ensure basic initialization
  await ensureInitialized();
  try {
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('id');

    if (chatId) {
      const chat = await getChat(chatId);
      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }
      
      const messages = await getChatMessages(chatId);
      return NextResponse.json({ chat, messages });
    }

    const chats = await getAllChats();
    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Create new chat or send message
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');
    let body: Record<string, unknown> = {};
    let audioBuffer: Buffer | null = null;
    let audioFormat: string | null = null;

    if (isFormData) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      const audioFile = formData.get('audio');
      if (audioFile && typeof audioFile === 'object' && 'arrayBuffer' in audioFile) {
        const arrayBuffer = await (audioFile as File).arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      }
      const audioFormatValue = formData.get('audioFormat');
      if (typeof audioFormatValue === 'string') {
        audioFormat = audioFormatValue;
      }
    } else {
      body = await request.json();
    }

    const { action, aiProvider, aiModel, aiTextModel } = body as { action?: string; aiProvider?: string; aiModel?: string; aiTextModel?: string };
    
    // CURSOR: Initialize with provider/model from request (from user settings)
    try {
      await ensureInitialized(aiProvider, aiModel);
    } catch (initError) {
      console.error('AI initialization error:', initError);
      return NextResponse.json(
        { 
          error: 'AI provider initialization failed',
          details: initError instanceof Error ? initError.message : 'Unknown error',
          hint: 'Please ensure OPENAI_API_KEY is set in your environment variables'
        },
        { status: 503 }
      );
    }

    // CURSOR: Apply context settings from client (summarization, window size, etc.)
    const rawContextSettings = body.contextSettings;
    if (rawContextSettings) {
      const parsed = typeof rawContextSettings === 'string' ? JSON.parse(rawContextSettings) : rawContextSettings;
      contextManager.setSettings(parsed);
    }

    if (action === 'create') {
      // Create new chat - DON'T save to DB yet, just generate the data
      const { title, topicType, topicKey, language, dialect, aiMode } = body as Record<string, string | undefined>;
      const { v4: uuidv4 } = await import('uuid');
      const chatId = uuidv4();
      const messageId = uuidv4();
      const now = new Date();
      
      const chat = {
        id: chatId,
        title: title || 'New Conversation',
        topicType: (topicType as 'general' | 'roleplay' | 'topic') || 'general',
        topicDetails: topicKey ? JSON.stringify({ topicKey }) : undefined,
        language: language || 'en',
        dialect: dialect || 'american',
        aiProvider: aiProvider || 'openai-chat',
        aiMode: (aiMode as 'chat' | 'assistant') || 'chat',
        createdAt: now,
        updatedAt: now,
        threadId: null,
      };

      // Generate opening message from AI
      const systemPrompt = buildSystemPrompt((topicType as 'general' | 'roleplay' | 'topic') || 'general', topicKey, undefined, language || 'en');
      const context = await contextManager.buildContext(chatId, systemPrompt);
      
      const openingPrompt = topicType === 'roleplay'
        ? 'You are starting roleplay scenario with an appropriate opening. User didn\'t say anything yet, so just set the scene. Speak in the learning language.'
        : topicType === 'topic'
        ? 'You are starting this conversation about the given topic. User didn\'t say anything yet, so just set the scene. Speak in the learning language.'
        : 'You are starting this conversation. The learner has not said anything yet. Greet them warmly and ask an ONE simple question to get them talking. Speak in the learning language.';
      
      const response = await aiManager.generate(context, openingPrompt, { model: aiTextModel || aiModel });
      
      // Create opening message object (DON'T save to DB yet)
      const aiMessage = {
        id: messageId,
        chatId: chatId,
        role: 'assistant' as const,
        content: response.content,
        createdAt: now,
        audioBlob: null,
        audioFormat: null,
      };

      return NextResponse.json({ 
        pending: true,
        chat, 
        openingMessage: {
          ...aiMessage,
          state: 'audio_loading',
          audioPlayed: false,
        }
      });
    }

    if (action === 'message') {
      const { chatId, content, motherLanguage } = body as { chatId?: string; content?: string; motherLanguage?: string };
      if (!chatId || (!content && !audioBuffer)) {
        return NextResponse.json({ error: 'chatId and either content or audio required' }, { status: 400 });
      }
      
      // Check if this is the first message with pending chat data
      let pendingChatRaw = (body as any).pendingChat;
      let pendingOpeningMessageRaw = (body as any).pendingOpeningMessage;
      
      // Handle FormData case where these come as JSON strings
      if (typeof pendingChatRaw === 'string') {
        try { pendingChatRaw = JSON.parse(pendingChatRaw); } catch {}
      }
      if (typeof pendingOpeningMessageRaw === 'string') {
        try { pendingOpeningMessageRaw = JSON.parse(pendingOpeningMessageRaw); } catch {}
      }
      
      // If pending data exists, save the chat and opening message first
      if (pendingChatRaw && pendingOpeningMessageRaw) {
        await createChat({
          title: pendingChatRaw.title,
          topicType: pendingChatRaw.topicType,
          topicDetails: pendingChatRaw.topicDetails,
          language: pendingChatRaw.language,
          dialect: pendingChatRaw.dialect,
          aiProvider: pendingChatRaw.aiProvider,
          aiMode: pendingChatRaw.aiMode,
        }, pendingChatRaw.id);
        
        await createMessage({
          chatId: pendingChatRaw.id,
          role: 'assistant',
          content: pendingOpeningMessageRaw.content,
        }, pendingOpeningMessageRaw.id);
      }
      
      const chat = await getChat(chatId);
      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      // Save user message with placeholder content if audio-only (will be updated after AI transcribes)
      const userMessage = await createMessage({
        chatId,
        role: 'user',
        content: content || '[audio]',
        audioBlob: audioBuffer || undefined,
        audioFormat: audioFormat || undefined,
      });

      // Build conversation context
      let topicDetails: Record<string, unknown> = {};
      try {
        topicDetails = chat.topicDetails ? JSON.parse(chat.topicDetails) : {};
      } catch {
        console.warn('Failed to parse topicDetails for chat:', chatId);
      }
      
      const learningLanguage = chat.language || 'en';
      const systemPrompt = buildSystemPrompt(
        chat.topicType as 'general' | 'roleplay' | 'topic',
        topicDetails.topicKey as string | undefined,
        undefined,
        learningLanguage
      );
      const context = await contextManager.buildContext(chatId, systemPrompt, chat.threadId || undefined);

      // Convert audio to WAV for the AI provider
      let audioBase64: string | undefined;
      let audioFormatForAI: string | undefined;
      
      if (audioBuffer) {
        try {
          const originalFormat = audioFormat || 'webm';
          const wavBuffer = await convertToWav(audioBuffer, originalFormat);
          audioBase64 = wavBuffer.toString('base64');
          audioFormatForAI = 'wav';
        } catch (error) {
          console.error('[Chat API] Audio conversion failed:', error);
        }
      }

      // CURSOR: Get Web Speech API transcription sent from client
      // The browser's native speech recognition provides accurate verbatim transcription
      // This is used as ground truth - gpt-4o-audio-preview hallucinates transcriptions
      const whisperTranscription = (body.whisperTranscription as string) || undefined;
      if (whisperTranscription) {
        console.log('[Chat API] STT transcription from client:', whisperTranscription);
      }

      // CURSOR: Step 2 - Send to AI with Whisper transcription as ground truth
      // The chat model uses the accurate Whisper transcription and only analyzes pronunciation from audio
      const response = await aiManager.respond(context, whisperTranscription || content || '', {
        motherLanguage: motherLanguage || 'uk',
        learningLanguage,
        audioBase64,
        audioFormat: audioFormatForAI,
        whisperTranscription,
      });

      // CURSOR: Use AI transcription (which may correct the draft) as authoritative text
      const finalContent = response.analysis.pronunciation?.transcribedText || whisperTranscription || content || '[audio]';

      // Update user message with transcription and analysis
      await updateMessage(userMessage.id, {
        content: finalContent,
        analysis: JSON.stringify(response.analysis),
      });

      // Save AI reply
      const aiMessage = await createMessage({
        chatId,
        role: 'assistant',
        content: response.reply,
      });

      return NextResponse.json({
        userMessage: {
          ...userMessage,
          content: finalContent,
          analysis: JSON.stringify(response.analysis),
          state: 'revealed',
          audioPlayed: true,
        },
        aiMessage: {
          ...aiMessage,
          state: 'audio_loading',
          audioPlayed: false,
        },
        usage: response.usage,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

// PATCH /api/chat - Update chat
export async function PATCH(request: NextRequest) {
  // CURSOR: PATCH doesn't need AI, but ensure basic initialization
  await ensureInitialized();
  try {
    const body = await request.json();
    const { chatId, ...updates } = body;

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    await updateChat(chatId, updates);
    const chat = await getChat(chatId);
    
    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Chat PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat?id=xxx - Delete chat
export async function DELETE(request: NextRequest) {
  await ensureInitialized();
  try {
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('id');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    await deleteChat(chatId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
