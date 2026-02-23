import { NextRequest, NextResponse } from 'next/server';
import { getChat, getChatMessages } from '@/lib/db/queries';
import { aiManager } from '@/lib/ai/manager';
import { contextManager } from '@/lib/ai/context';
import { buildSystemPrompt, getSuggestionPrompt, type ProficiencyLevel } from '@/lib/ai/prompts';

// CURSOR: Track last initialized provider to reinitialize when changed
let lastInitializedProvider: string | null = null;

// CURSOR: Initialize with specified provider and model, or use defaults
async function ensureInitialized(providerId?: string, model?: string) {
  const targetProvider = providerId || 'openai-chat';
  
  if (lastInitializedProvider !== targetProvider) {
    await aiManager.initialize(targetProvider);
    lastInitializedProvider = targetProvider;
  }
  
  if (model) {
    aiManager.setModel(model);
  }
}

// POST /api/suggest - Generate reply suggestions for the learner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, count = 3, aiProvider, aiModel, chatContext, recentMessages } = body;
    
    // CURSOR: Initialize with provider/model from request (from user settings)
    await ensureInitialized(aiProvider, aiModel);
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }
    
    // Try to get chat from DB, fall back to inline context for pending chats
    const chat = await getChat(chatId);
    
    let topicType: string;
    let learningLanguage: string;
    let chatLevel: ProficiencyLevel;
    let topicDetails: Record<string, unknown> = {};
    let conversationMessages: { role: string; content: string }[];
    
    if (chat) {
      // Chat exists in DB - use DB data
      topicType = chat.topicType || 'general';
      learningLanguage = chat.language || 'en';
      chatLevel = (chat.level as ProficiencyLevel) || 'intermediate';
      try {
        topicDetails = chat.topicDetails ? JSON.parse(chat.topicDetails) : {};
      } catch {
        console.warn('Failed to parse topicDetails for chat:', chatId);
      }
      const messages = await getChatMessages(chatId);
      conversationMessages = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));
    } else if (chatContext && recentMessages) {
      // Pending chat - use inline context from client
      topicType = chatContext.topicType || 'general';
      learningLanguage = chatContext.language || 'en';
      chatLevel = (chatContext.level as ProficiencyLevel) || 'intermediate';
      try {
        topicDetails = chatContext.topicDetails ? JSON.parse(chatContext.topicDetails) : {};
      } catch {
        topicDetails = {};
      }
      conversationMessages = recentMessages;
    } else {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    
    const systemPrompt = buildSystemPrompt(
      topicType as 'general' | 'roleplay' | 'topic',
      topicDetails.topicKey as string | undefined,
      learningLanguage,
      chatLevel
    );
    
    // Build context - use DB context if available, otherwise build from inline messages
    let context;
    if (chat) {
      context = await contextManager.buildContext(chatId, systemPrompt, chat.threadId || undefined);
    } else {
      context = {
        chatId,
        messages: conversationMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        systemPrompt,
      };
    }
    
    const suggestionPrompt = getSuggestionPrompt(count, learningLanguage, chatLevel);
    
    // CURSOR: Build recent messages string for the prompt
    const recentMessagesStr = conversationMessages.map(m => 
      `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`
    ).join('\n');
    
    const fullPrompt = `${suggestionPrompt}\n\nRecent conversation:\n${recentMessagesStr}\n\nGenerate ${count} natural reply suggestions for the learner:`;
    
    const response = await aiManager.generate(context, fullPrompt);
    
    // CURSOR: Parse JSON response
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ 
          suggestions: parsed.suggestions || [],
        });
      }
    } catch (parseError) {
      console.error('Failed to parse suggestion response:', parseError);
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate suggestions',
      raw: response.content,
    }, { status: 500 });
    
  } catch (error) {
    console.error('Suggest API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
