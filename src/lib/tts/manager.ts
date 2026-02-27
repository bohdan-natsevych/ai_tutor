import type { TTSProvider, TTSOptions, Voice, TTSProviderConfig } from './types';
import { getAllTTSProviders, getTTSProvider, getDefaultTTSProvider } from './providers';

// TTS Manager - Handles provider selection and audio synthesis

class TTSManager {
  private currentProvider: TTSProvider | null = null;
  private config: TTSProviderConfig = {
    providerId: 'kokoro',
    voice: 'af_heart',
    speed: 1.0,
  };

  // Initialize the manager with a specific provider
  async initialize(providerId?: string): Promise<void> {
    const targetProviderId = providerId || 'kokoro';
    
    // CURSOR: Skip if already initialized with the same provider
    if (this.currentProvider && 
        this.config.providerId === targetProviderId && 
        this.currentProvider.getStatus().initialized) {
      return;
    }

    if (providerId) {
      const provider = await getTTSProvider(providerId);
      if (provider) {
        await provider.initialize();
        this.currentProvider = provider;
        this.config.providerId = providerId;
        return;
      }
    }

    // Use default provider
    const defaultProvider = await getDefaultTTSProvider();
    await defaultProvider.initialize();
    this.currentProvider = defaultProvider;
    this.config.providerId = defaultProvider.id;
  }

  // Switch to a different provider
  async switchProvider(providerId: string): Promise<void> {
    const provider = await getTTSProvider(providerId);
    if (!provider) {
      throw new Error(`TTS provider not found: ${providerId}`);
    }

    if (!provider.getStatus().initialized) {
      await provider.initialize();
    }

    this.currentProvider = provider;
    this.config.providerId = providerId;

    // Reset voice to first available if current voice not available
    const voices = provider.getVoices();
    if (!voices.find(v => v.id === this.config.voice) && voices.length > 0) {
      this.config.voice = voices[0].id;
    }
  }

  // Set voice
  setVoice(voiceId: string): void {
    this.config.voice = voiceId;
  }

  // Set speed
  setSpeed(speed: number): void {
    this.config.speed = Math.max(0.5, Math.min(1.5, speed));
  }

  // Get current configuration
  getConfig(): TTSProviderConfig {
    return { ...this.config };
  }

  // Get current provider
  getCurrentProvider(): TTSProvider | null {
    return this.currentProvider;
  }

  // Get available voices for current provider
  getVoices(): Voice[] {
    return this.currentProvider?.getVoices() || [];
  }

  // Get all available providers
  getProviders(): TTSProvider[] {
    return getAllTTSProviders();
  }

  // Synthesize text to audio
  async synthesize(text: string, options?: Partial<TTSOptions>): Promise<ArrayBuffer> {
    if (!this.currentProvider) {
      throw new Error('TTS not initialized. Call initialize() first.');
    }

    const fullOptions: TTSOptions = {
      voice: options?.voice || this.config.voice,
      speed: options?.speed || this.config.speed,
      language: options?.language || 'en',
      dialect: options?.dialect,
      pitch: options?.pitch,
    };

    return this.currentProvider.synthesize(text, fullOptions);
  }

  // Speak text (synthesize and play)
  async speak(text: string, options?: Partial<TTSOptions>): Promise<void> {
    const audioData = await this.synthesize(text, options);
    
    // Create audio context and play
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    return new Promise((resolve, reject) => {
      source.onended = () => {
        audioContext.close();
        resolve();
      };
      try {
        source.start();
      } catch (e) {
        reject(e);
      }
    });
  }

  // Create audio element from text
  async createAudioElement(text: string, options?: Partial<TTSOptions>): Promise<HTMLAudioElement> {
    const audioData = await this.synthesize(text, options);
    const blob = new Blob([audioData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    // Clean up URL when audio is no longer needed
    audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
    
    return audio;
  }

  // CURSOR: Cleanup all TTS resources
  cleanup(): void {
    if (this.currentProvider) {
      this.currentProvider.cleanup();
    }
    this.currentProvider = null;
  }
}

// Export singleton instance
export const ttsManager = new TTSManager();

// Re-export types
export * from './types';
