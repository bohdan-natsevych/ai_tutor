import type { STTProvider, STTOptions, STTResult } from './types';
import { getSTTProvider, getAllSTTProviders, getDefaultSTTProvider } from './providers';

// STT Manager - Handles provider selection and speech recognition

class STTManager {
  private currentProvider: STTProvider | null = null;
  private config: { providerId: string; language: string; dialect?: string } = {
    providerId: 'web-speech-stt',
    language: 'en',
    dialect: 'american',
  };

  // Event handlers (delegated to current provider)
  private _onResult: ((result: STTResult) => void) | null = null;
  private _onError: ((error: Error) => void) | null = null;
  private _onStart: (() => void) | null = null;
  private _onEnd: (() => void) | null = null;

  // Initialize the manager with a specific provider
  async initialize(providerId?: string): Promise<void> {
    if (providerId) {
      const provider = getSTTProvider(providerId);
      if (provider) {
        await provider.initialize();
        this.currentProvider = provider;
        this.config.providerId = providerId;
        this.setupEventHandlers();
        return;
      }
    }

    // Use default provider
    const defaultProvider = await getDefaultSTTProvider();
    await defaultProvider.initialize();
    this.currentProvider = defaultProvider;
    this.config.providerId = defaultProvider.id;
    this.setupEventHandlers();
  }

  // Setup event handlers on current provider
  private setupEventHandlers(): void {
    if (!this.currentProvider) return;
    
    this.currentProvider.onResult = (result) => this._onResult?.(result);
    this.currentProvider.onError = (error) => this._onError?.(error);
    this.currentProvider.onStart = () => this._onStart?.();
    this.currentProvider.onEnd = () => this._onEnd?.();
  }

  // Switch to a different provider
  async switchProvider(providerId: string): Promise<void> {
    const provider = getSTTProvider(providerId);
    if (!provider) {
      throw new Error(`STT provider not found: ${providerId}`);
    }

    await provider.initialize();
    this.currentProvider = provider;
    this.config.providerId = providerId;
    this.setupEventHandlers();
  }

  // Set language and dialect
  setLanguage(language: string, dialect?: string): void {
    this.config.language = language;
    this.config.dialect = dialect;
  }

  // Get current configuration
  getConfig() {
    return { ...this.config };
  }

  // Get current provider
  getCurrentProvider(): STTProvider | null {
    return this.currentProvider;
  }

  // Get all available providers
  getProviders(): STTProvider[] {
    return getAllSTTProviders();
  }

  // Start listening
  startListening(options?: Partial<STTOptions>): void {
    if (!this.currentProvider) {
      throw new Error('STT not initialized. Call initialize() first.');
    }

    const fullOptions: STTOptions = {
      language: options?.language || this.config.language,
      dialect: options?.dialect || this.config.dialect,
      continuous: options?.continuous ?? true,
      interimResults: options?.interimResults ?? true,
    };

    this.currentProvider.startListening(fullOptions);
  }

  // Stop listening
  stopListening(): void {
    this.currentProvider?.stopListening();
  }

  // Check if listening
  isListening(): boolean {
    return this.currentProvider?.isListening() ?? false;
  }

  // Event handler setters
  set onResult(handler: ((result: STTResult) => void) | null) {
    this._onResult = handler;
    if (this.currentProvider) {
      this.currentProvider.onResult = handler;
    }
  }

  set onError(handler: ((error: Error) => void) | null) {
    this._onError = handler;
    if (this.currentProvider) {
      this.currentProvider.onError = handler;
    }
  }

  set onStart(handler: (() => void) | null) {
    this._onStart = handler;
    if (this.currentProvider) {
      this.currentProvider.onStart = handler;
    }
  }

  set onEnd(handler: (() => void) | null) {
    this._onEnd = handler;
    if (this.currentProvider) {
      this.currentProvider.onEnd = handler;
    }
  }
}

// Export singleton instance
export const sttManager = new STTManager();

// Re-export types
export * from './types';
