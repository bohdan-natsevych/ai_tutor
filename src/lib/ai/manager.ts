import type { AIProvider, AIResponse, UnifiedResponse, ConversationContext, AIOptions, AIModel, AIProviderConfig, RichTranslation } from './types';
import { getAllAIProviders, getAIProvider, getDefaultAIProvider } from './providers';

// AI Manager - Handles provider selection and AI interactions

class AIManager {
  private currentProvider: AIProvider | null = null;
  private config: AIProviderConfig = {
    providerId: 'openai-chat',
    model: 'gpt-4o-audio-preview',
    temperature: 0.7,
    maxTokens: 500,
  };

  // Initialize the manager with a specific provider
  async initialize(providerId?: string): Promise<void> {
    if (providerId) {
      const provider = getAIProvider(providerId);
      if (provider) {
        await provider.initialize();
        this.currentProvider = provider;
        this.config.providerId = providerId;
        
        // CURSOR: Only reset model for local providers - cloud providers accept any valid model
        // since they have many models not in our static list
        if (provider.type === 'local' && provider.models.length > 0 && !provider.models.find(m => m.id === this.config.model)) {
          this.config.model = provider.models[0].id;
        }
        return;
      }
    }

    // Use default provider
    const defaultProvider = await getDefaultAIProvider();
    await defaultProvider.initialize();
    this.currentProvider = defaultProvider;
    this.config.providerId = defaultProvider.id;
  }

  // Switch to a different provider
  async switchProvider(providerId: string): Promise<void> {
    const provider = getAIProvider(providerId);
    if (!provider) {
      throw new Error(`AI provider not found: ${providerId}`);
    }

    await provider.initialize();
    this.currentProvider = provider;
    this.config.providerId = providerId;

    // CURSOR: Only reset model for local providers - cloud providers accept any valid model
    if (provider.type === 'local' && !provider.models.find(m => m.id === this.config.model) && provider.models.length > 0) {
      this.config.model = provider.models[0].id;
    }
  }

  // Set model
  setModel(modelId: string): void {
    this.config.model = modelId;
  }

  // Set temperature
  setTemperature(temperature: number): void {
    this.config.temperature = Math.max(0, Math.min(2, temperature));
  }

  // Set max tokens
  setMaxTokens(maxTokens: number): void {
    this.config.maxTokens = maxTokens;
  }

  // Get current configuration
  getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  // Get current provider
  getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
  }

  // Get available models for current provider
  getModels(): AIModel[] {
    return this.currentProvider?.models || [];
  }

  // Get all available providers
  getProviders(): AIProvider[] {
    return getAllAIProviders();
  }

  // Simple text generation (opening messages, suggestions)
  async generate(context: ConversationContext, message: string, options?: Partial<AIOptions>): Promise<AIResponse> {
    if (!this.currentProvider) {
      throw new Error('AI not initialized. Call initialize() first.');
    }

    const fullOptions: AIOptions = {
      model: options?.model || this.config.model,
      temperature: options?.temperature ?? this.config.temperature,
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
    };

    return this.currentProvider.generate(context, message, fullOptions);
  }

  // Unified respond: reply to user + analyze their message in one call
  async respond(context: ConversationContext, userMessage: string, options?: Partial<AIOptions>): Promise<UnifiedResponse> {
    if (!this.currentProvider) {
      throw new Error('AI not initialized. Call initialize() first.');
    }

    const fullOptions: AIOptions = {
      model: options?.model || this.config.model,
      temperature: 0.3,
      maxTokens: options?.maxTokens ?? 4000,
      motherLanguage: options?.motherLanguage,
      learningLanguage: options?.learningLanguage,
      audioBase64: options?.audioBase64,
      audioFormat: options?.audioFormat,
      whisperTranscription: options?.whisperTranscription,
    };

    return this.currentProvider.respond(context, userMessage, fullOptions);
  }

  // CURSOR: Rich translate - get translation with definition, usage examples, and type classification
  async richTranslate(
    text: string,
    learningLanguage: string,
    motherLanguage: string,
    options?: Partial<AIOptions>
  ): Promise<RichTranslation> {
    if (!this.currentProvider) {
      throw new Error('AI not initialized. Call initialize() first.');
    }

    const fullOptions: AIOptions = {
      model: options?.model || this.config.model,
      temperature: 0.3, // Lower temperature for consistent output
      maxTokens: options?.maxTokens ?? 500,
    };

    return this.currentProvider.richTranslate(text, learningLanguage, motherLanguage, fullOptions);
  }

  // Create thread (for Assistants API)
  async createThread(): Promise<string | undefined> {
    if (!this.currentProvider) return undefined;
    return this.currentProvider.createThread?.();
  }

  // Get thread messages (for Assistants API)
  async getThreadMessages(threadId: string) {
    if (!this.currentProvider) return [];
    return this.currentProvider.getThreadMessages?.(threadId) || [];
  }
}

// Export singleton instance
export const aiManager = new AIManager();

// Re-export types
export * from './types';
