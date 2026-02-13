import OpenAI from 'openai';
import type { AIProvider, AIModel, AIResponse, Analysis, UnifiedResponse, ConversationContext, AIOptions, AIProviderStatus, RichTranslation } from '../types';
import { getRichTranslationPrompt, getUnifiedResponsePrompt, buildSystemPrompt } from '../prompts';

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

    const model = options?.model || this.config.model;

    const response = await this.client.chat.completions.create({
      model,
      messages,
    });

    const choice = response.choices[0];
    
    return {
      content: choice.message.content || '',
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
    const unifiedPrompt = getUnifiedResponsePrompt(options?.motherLanguage, options?.learningLanguage);

    const recentMessages = context.messages.slice(-10);
    const conversationContext = `${context.summary ? `EARLIER CONVERSATION SUMMARY:\n${context.summary}\n\n` : ''}RECENT CONVERSATION:\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    let response;

    if (hasAudio) {
      // Audio model - use the selected model (should be an audio-capable model)
      const model = options?.model || 'gpt-4o-audio-preview';
      console.log('[OpenAI Respond] Audio mode, model:', model);

      // CURSOR: Build user message with Whisper transcription as ground truth
      const whisperText = options?.whisperTranscription;
      const userTextContent = whisperText
        ? `${conversationContext}\n\nVERIFIED TRANSCRIPTION (from Whisper, use this EXACTLY as transcribedText): "${whisperText}"\n\nNow listen to the audio ONLY for pronunciation analysis. The transcription above is correct - do NOT change it. Respond as a tutor to what the learner said, and analyze their pronunciation from the audio.`
        : `${conversationContext}\n\nNow listen to the audio, respond as a tutor, and analyze the learner's message. JSON only. List ALL mispronounced words.`;

      response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `${unifiedPrompt}\n\nCRITICAL: Respond ONLY with valid JSON. Start with { and end with }. Nothing else.\n${whisperText ? 'CRITICAL: The transcribedText field MUST be EXACTLY: "' + whisperText + '". This was verified by Whisper. Do NOT modify, rephrase, or reinterpret it.' : 'CRITICAL: The mispronunciations array MUST contain ALL mispronounced words. Do NOT truncate or limit this array.'}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userTextContent },
              { type: 'input_audio', input_audio: { data: options!.audioBase64!, format: options!.audioFormat! } },
            ] as unknown as string,
          },
        ],
      });
    } else {
      // Text-only mode - use model directly (caller provides text model)
      console.log('[OpenAI Respond] Text mode');
      const textModel = options?.model || 'gpt-4o';

      response = await this.client.chat.completions.create({
        model: textModel,
        messages: [
          {
            role: 'system',
            content: `${unifiedPrompt}\n\nRespond ONLY with valid JSON.`,
          },
          {
            role: 'user',
            content: `${conversationContext}\n\nMESSAGE TO RESPOND TO AND ANALYZE:\n${userMessage}`,
          },
        ],
        response_format: { type: 'json_object' },
      });
    }

    const content = response.choices[0].message.content || '{}';
    console.log('[OpenAI Respond] Raw response:', content.substring(0, 300) + '...');

    return this.parseUnifiedResponse(content, hasAudio, options?.whisperTranscription);
  }

  private parseUnifiedResponse(content: string, hasAudio: boolean, whisperTranscription?: string): UnifiedResponse {
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
          // CURSOR: Always use Whisper transcription as ground truth - it's accurate
          // The chat model hallucinates transcriptions based on conversation context
          transcribedText: whisperTranscription || parsed.analysis?.transcribedText || '',
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
      };
    } catch (e) {
      console.error('[OpenAI Respond] JSON parse failed:', e);
      console.error('[OpenAI Respond] Content was:', content);
      return {
        reply: '',
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
