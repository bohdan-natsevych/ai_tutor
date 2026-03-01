import OpenAI from 'openai';
import type { AIProvider, AIModel, AIResponse, Analysis, UnifiedResponse, ConversationContext, AIOptions, AIProviderStatus, RichTranslation } from '../types';
import { getRichTranslationPrompt, getUnifiedResponsePrompt, buildSystemPrompt } from '../prompts';

const VALID_OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'coral', 'verse', 'ballad', 'ash', 'sage', 'marin', 'cedar'];

function getValidVoice(voice?: unknown): any {
  if (typeof voice === 'string' && VALID_OPENAI_VOICES.includes(voice)) {
    return voice as any;
  }
  return 'alloy' as any;
}

// OpenAI Chat Completions Provider (We manage conversation history)
export class OpenAIChatProvider implements AIProvider {
  id = 'openai-chat';
  name = 'OpenAI (Chat)';
  type = 'cloud' as const;
  contextMode = 'manual' as const;

  
  models: AIModel[] = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, description: 'Fast and affordable' },
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, description: 'Most capable' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, description: 'High performance' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, description: 'Legacy, fast' },
  ];

  private client: OpenAI | null = null;
  private status: AIProviderStatus = {
    initialized: false,
    loading: false,
  };

  async initialize(): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      this.status = {
        initialized: false,
        loading: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.',
      };
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable in your Vercel project settings.');
    }

    this.client = new OpenAI({ apiKey });
    this.status = {
      initialized: true,
      loading: false,
    };
  }

  async generate(context: ConversationContext, message: string, options?: AIOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: context.systemPrompt },
    ];

    if (context.summary) {
      messages.push({
        role: 'system',
        content: `CONVERSATION SUMMARY (earlier messages):\n${context.summary}`,
      });
    }

    messages.push(...context.messages);
    messages.push({ role: 'user', content: message });

    const model = options?.model || this.models[0].id;

    const createParams: any = {
      model,
      messages,
      modalities: ['text', 'audio'],
      audio: {
        voice: getValidVoice(options?.voice),
        format: 'mp3',
      },
    };

    const response = await this.client.chat.completions.create(createParams);

    const choice = response.choices[0];
    
    const audioData = (choice.message as any).audio;
    const content = choice.message.content || (audioData ? audioData.transcript : '');
    
    return {
      content,
      audioBase64: audioData ? audioData.data : undefined,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  async generateText(context: ConversationContext, message: string, options?: AIOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: context.systemPrompt },
    ];

    if (context.summary) {
      messages.push({
        role: 'system',
        content: `CONVERSATION SUMMARY (earlier messages):\n${context.summary}`,
      });
    }

    messages.push(...context.messages);
    messages.push({ role: 'user', content: message });

    const model = options?.model || 'gpt-4o-mini';

    const response = await this.client.chat.completions.create({
      model,
      messages,
    });

    const content = response.choices[0].message.content || '';

    return {
      content,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  async respond(context: ConversationContext, userMessage: string, options?: AIOptions): Promise<UnifiedResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const hasAudio = !!(options?.audioBase64 && options?.audioFormat);
    const unifiedPrompt = getUnifiedResponsePrompt(options?.motherLanguage, options?.learningLanguage, options?.level);

    const recentMessages = context.messages.slice(-10);
    const conversationContext = `${context.summary ? `EARLIER CONVERSATION SUMMARY:\n${context.summary}\n\n` : ''}RECENT CONVERSATION:\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    let response;

    const model = options?.model || 'gpt-4o-audio-preview';
    console.log('[OpenAI Respond] Audio mode, model:', model, 'hasAudio:', hasAudio);

    // CURSOR: Build user message depending on whether audio was provided
    const whisperText = options?.whisperTranscription;
    let userTextContent = '';
    
    if (hasAudio) {
      userTextContent = whisperText
        ? `${conversationContext}\n\nDRAFT TRANSCRIPTION (from local STT): "${whisperText}"\n\nNote: This transcription may contain errors. Use it as a guide, but if the audio clearly indicates a different word (especially names or proper nouns).`
        : `${conversationContext}\n\nNow listen to the audio, respond as a tutor, and analyze the learner's message and pronunciation. JSON only. List ALL mispronounced words.`;
    } else {
      userTextContent = `${conversationContext}\n\nMESSAGE TO RESPOND TO AND ANALYZE:\n${userMessage}`;
    }

    const messagesArray: any[] = [
      {
        role: 'system',
        content: `${context.systemPrompt}\n\n${unifiedPrompt}\n\nCRITICAL: Respond ONLY with valid JSON. Start with { and end with }. Nothing else.\n${(hasAudio && whisperText) ? 'CRITICAL: The transcribedText field should match the audio. If the draft transcription differs from what you hear, use your correction.' : (hasAudio ? 'CRITICAL: The mispronunciations array MUST contain ALL mispronounced words. Do NOT truncate or limit this array.' : '')}`,
      }
    ];

    if (hasAudio) {
      messagesArray.push({
        role: 'user',
        content: [
          { type: 'text', text: userTextContent },
          { type: 'input_audio', input_audio: { data: options!.audioBase64!, format: options!.audioFormat! } },
        ] as unknown as string,
      });
    } else {
      messagesArray.push({
        role: 'user',
        content: userTextContent,
      });
    }

    const createParams: any = {
      model,
      messages: messagesArray,
    };

    // CURSOR: If wantAudioOutput is true (OpenAI TTS), OR there's no audio input (which requires audio output to bypass gpt-4o-audio-preview constraints), we add modalities.
    if (options?.wantAudioOutput || !hasAudio) {
      createParams.modalities = ['text', 'audio'];
      createParams.audio = {
        voice: getValidVoice(options?.voice),
        format: 'mp3',
      };
    } else {
      // Audio input given, text-only output requested. gpt-4o-audio-preview does not support json_object with text+audio input/output, but for text-only output it might.
      // However, since we are doing audio routing, we just omit modalities (keeps it text) and do NOT use response_format to be safe, because audio preview models often crash on it.
    }

    response = await this.client.chat.completions.create(createParams);

    const audioData = (response.choices[0].message as any).audio;
    const content = response.choices[0].message.content || (audioData ? audioData.transcript : '{}');
    console.log('[OpenAI Respond] Raw response:', content.substring(0, 300) + '...');

    return this.parseUnifiedResponse(content, hasAudio, options?.whisperTranscription, audioData?.data);
  }

  private parseUnifiedResponse(content: string, hasAudio: boolean, whisperTranscription?: string, audioBase64?: string): UnifiedResponse {
    try {
      // CURSOR: Sanitize common GPT JSON errors before parsing
      // The model sometimes puts comments/text outside string quotes, e.g.:
      //   "heardAs": "word" (with a slight mispronunciation),
      // Fix by finding string values followed by unquoted text before , or }
      let sanitized = content;
      // Fix: "key": "value" (some extra text), → "key": "value",
      // Match: closing quote, optional whitespace, opening paren, any text, closing paren, optional whitespace before , or }
      sanitized = sanitized.replace(/"(\s*)\(([^)]*)\)(\s*[,}\]])/g, '"$1$3');
      // Fix: "key": "value" with extra text, → "key": "value",
      // Match: closing quote, space, then lowercase text (not a JSON key), before , or }
      sanitized = sanitized.replace(/"(\s+)(?:with|and|but|or|the|a|slight|some|minor|major|very|quite|nearly|almost)(?:\s[^,}"]*)?(\s*[,}\]])/gi, '"$1$2');
      
      const parsed = JSON.parse(sanitized);

      const analysis: Analysis = {
        grammarScore: parsed.analysis?.grammarScore ?? 70,
        grammarErrors: Array.isArray(parsed.analysis?.grammarErrors) ? parsed.analysis.grammarErrors : [],
        vocabularyScore: parsed.analysis?.vocabularyScore ?? 70,
        vocabularySuggestions: Array.isArray(parsed.analysis?.vocabularySuggestions) ? parsed.analysis.vocabularySuggestions : [],
        relevanceScore: parsed.analysis?.relevanceScore ?? 80,
        relevanceFeedback: parsed.analysis?.relevanceFeedback,
        overallFeedback: parsed.analysis?.overallFeedback ?? 'Good effort!',
        alternativePhrasings: Array.isArray(parsed.analysis?.alternativePhrasings) ? parsed.analysis.alternativePhrasings : [],
      };

      if (hasAudio) {
        analysis.pronunciation = {
          pronunciationScore: parsed.analysis?.pronunciationScore ?? 70,
          // CURSOR: AI transcription is now grounded by the draft, so we can trust it to correct errors
          transcribedText: parsed.analysis?.transcribedText || whisperTranscription || '',
          mispronunciations: Array.isArray(parsed.analysis?.mispronunciations)
            ? parsed.analysis.mispronunciations.map((item: { word?: string; heardAs?: string; correctPronunciation?: string }) => ({
                word: item.word ?? '',
                heardAs: item.heardAs ?? '',
                correctPronunciation: item.correctPronunciation ?? '',
              }))
            : [],
          pronunciationFeedback: parsed.analysis?.pronunciationFeedback ?? '',
        };
      }

      return {
        reply: parsed.reply ?? '',
        analysis,
        audioBase64,
      };
    } catch (e) {
      console.error('[OpenAI Respond] JSON parse failed:', e);
      console.error('[OpenAI Respond] Content was:', content);
      return {
        reply: '',
        audioBase64,
        analysis: {
          grammarScore: 70,
          grammarErrors: [],
          vocabularyScore: 70,
          vocabularySuggestions: [],
          relevanceScore: 80,
          overallFeedback: 'Unable to parse response.',
          alternativePhrasings: [],
        },
      };
    }
  }

  // CURSOR: Rich translation with definition, usage examples, and type classification
  async richTranslate(
    text: string,
    learningLanguage: string,
    motherLanguage: string,
    options?: AIOptions
  ): Promise<RichTranslation> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = getRichTranslationPrompt(text, learningLanguage, motherLanguage);

    // Use model passed in options directly (caller provides correct text model)
    const textModel = options?.model || 'gpt-4o-mini';

    const response = await this.client.chat.completions.create({
      model: textModel,
      messages: [
        { role: 'system', content: 'You are a language learning assistant providing detailed translations. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    
    console.log('[OpenAI RichTranslate] Raw response:', content);
    
    try {
      const parsed = JSON.parse(content);
      
      // CURSOR: Normalize response with fallbacks
      const richTranslation: RichTranslation = {
        translation: parsed.translation || text,
        type: parsed.type || 'word',
        definition: parsed.definition || parsed.translation || '',
        usageExamples: Array.isArray(parsed.usageExamples) ? parsed.usageExamples
          : Array.isArray(parsed.usage_examples) ? parsed.usage_examples
          : Array.isArray(parsed.examples) ? parsed.examples
          : [],
        notes: parsed.notes || undefined,
        formality: parsed.formality || 'neutral',
      };
      
      return richTranslation;
    } catch (e) {
      console.error('[OpenAI RichTranslate] JSON parse failed:', e);
      // CURSOR: Return minimal fallback
      return {
        translation: text,
        type: 'word',
        definition: '',
        usageExamples: [],
        formality: 'neutral',
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }
}

// Export singleton instance
export const openAIChatProvider = new OpenAIChatProvider();
