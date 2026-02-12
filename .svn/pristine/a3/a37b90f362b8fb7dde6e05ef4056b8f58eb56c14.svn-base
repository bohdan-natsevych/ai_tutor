import OpenAI from 'openai';
import type { AIProvider, AIModel, AIResponse, Analysis, UnifiedResponse, ConversationContext, AIOptions, AIProviderStatus, ChatMessage, RichTranslation } from '../types';
import { getRichTranslationPrompt, getUnifiedResponsePrompt } from '../prompts';

// OpenAI Assistants API Provider (OpenAI manages conversation history)
export class OpenAIAssistantProvider implements AIProvider {
  id = 'openai-assistant';
  name = 'OpenAI (Assistants)';
  type = 'cloud' as const;
  contextMode = 'managed' as const;
  
  models: AIModel[] = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, description: 'Fast and affordable' },
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, description: 'Most capable' },
  ];

  private client: OpenAI | null = null;
  private assistantId: string | null = null;
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
        error: 'OpenAI API key not configured',
      };
      return;
    }

    this.client = new OpenAI({ apiKey });
    this.status = {
      initialized: true,
      loading: false,
    };
  }

  // Set or create assistant
  async setAssistant(assistantId?: string, systemPrompt?: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    if (assistantId) {
      // Verify assistant exists
      try {
        await this.client.beta.assistants.retrieve(assistantId);
        this.assistantId = assistantId;
        return assistantId;
      } catch {
        // Assistant doesn't exist, create new one
      }
    }

    // Create new assistant
    const assistant = await this.client.beta.assistants.create({
      name: 'Lanqua Language Tutor',
      instructions: systemPrompt || 'You are a friendly language tutor helping someone learn English.',
      model: 'gpt-4o-mini',
    });

    this.assistantId = assistant.id;
    return assistant.id;
  }

  async createThread(): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const thread = await this.client.beta.threads.create();
    return thread.id;
  }

  async getThreadMessages(threadId: string): Promise<ChatMessage[]> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const messages = await this.client.beta.threads.messages.list(threadId);
    
    return messages.data.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
    }));
  }

  async generate(context: ConversationContext, message: string, options?: AIOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    if (!context.threadId) {
      throw new Error('Thread ID required for Assistants API');
    }

    if (!this.assistantId) {
      await this.setAssistant(undefined, context.systemPrompt);
    }

    // Add message to thread
    await this.client.beta.threads.messages.create(context.threadId, {
      role: 'user',
      content: message,
    });

    // Create and poll run
    const run = await this.client.beta.threads.runs.createAndPoll(context.threadId, {
      assistant_id: this.assistantId!,
      model: options?.model,
    });

    if (run.status === 'completed') {
      const messages = await this.client.beta.threads.messages.list(context.threadId);
      const lastMessage = messages.data[0];
      
      return {
        content: lastMessage.content[0]?.type === 'text' ? lastMessage.content[0].text.value : '',
        usage: run.usage ? {
          promptTokens: run.usage.prompt_tokens,
          completionTokens: run.usage.completion_tokens,
          totalTokens: run.usage.total_tokens,
        } : undefined,
      };
    }

    throw new Error(`Run failed with status: ${run.status}`);
  }

  async respond(context: ConversationContext, userMessage: string, options?: AIOptions): Promise<UnifiedResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const hasAudio = !!(options?.audioBase64 && options?.audioFormat);
    const unifiedPrompt = getUnifiedResponsePrompt(options?.motherLanguage, options?.learningLanguage, hasAudio);

    const recentMessages = context.messages.slice(-10);
    const conversationContext = `${context.summary ? `EARLIER CONVERSATION SUMMARY:\n${context.summary}\n\n` : ''}RECENT CONVERSATION:\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    let response;

    if (hasAudio) {
      const model = options?.model?.includes('audio') ? options.model : 'gpt-4o-audio-preview';

      response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `${unifiedPrompt}\n\nCRITICAL: Respond ONLY with valid JSON. Start with { and end with }. Nothing else.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `${conversationContext}\n\nNow listen to the audio, respond as a tutor, and analyze the learner's message. JSON only.` },
              { type: 'input_audio', input_audio: { data: options!.audioBase64!, format: options!.audioFormat! } },
            ] as unknown as string,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
    } else {
      response = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4o-mini',
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
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
    }

    const content = response.choices[0].message.content || '{}';
    try {
      const parsed = JSON.parse(content);
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
          transcribedText: parsed.analysis?.transcribedText ?? '',
          mispronunciations: Array.isArray(parsed.analysis?.mispronunciations)
            ? parsed.analysis.mispronunciations.map((item: { word?: string; heardAs?: string; correctPronunciation?: string }) => ({
                word: item.word ?? '', heardAs: item.heardAs ?? '', correctPronunciation: item.correctPronunciation ?? '',
              }))
            : [],
          pronunciationFeedback: parsed.analysis?.pronunciationFeedback ?? '',
        };
      }
      return { reply: parsed.reply ?? '', analysis };
    } catch {
      return {
        reply: '',
        analysis: {
          grammarScore: 70, grammarErrors: [], vocabularyScore: 70,
          vocabularySuggestions: [], relevanceScore: 80,
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

    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a language learning assistant providing detailed translations. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: options?.maxTokens ?? 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    
    try {
      const parsed = JSON.parse(content);
      return {
        translation: parsed.translation || text,
        type: parsed.type || 'word',
        definition: parsed.definition || '',
        usageExamples: Array.isArray(parsed.usageExamples) ? parsed.usageExamples : [],
        notes: parsed.notes || undefined,
        formality: parsed.formality || 'neutral',
      };
    } catch {
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
export const openAIAssistantProvider = new OpenAIAssistantProvider();
