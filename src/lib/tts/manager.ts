import type { TTSProvider, TTSOptions, Voice, TTSProviderConfig } from './types';
import { getAllTTSProviders, getTTSProvider, getDefaultTTSProvider } from './providers';

// TTS Manager - Handles provider selection and audio synthesis

// CURSOR: Validate audio metadata before playback to catch malformed WAV data.
// If the WAV header is broken, audio.duration becomes Infinity/NaN and
// the browser never fires onended, causing the UI to get stuck in "playing" state.
export async function createValidatedAudioElement(
  audioData: ArrayBuffer
): Promise<{ audio: HTMLAudioElement; audioUrl: string }> {
  const blob = new Blob([audioData], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio();

  await new Promise<void>((resolve, reject) => {
    audio.onloadedmetadata = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        URL.revokeObjectURL(audioUrl);
        reject(
          new Error(
            `[TTS Audio] Invalid audio duration: ${audio.duration}. ` +
              `The WAV data from TTS provider is malformed (onended would never fire).`
          )
        );
        return;
      }
      resolve();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      const mediaError = audio.error;
      reject(
        new Error(
          `[TTS Audio] Failed to load audio: ` +
            `${mediaError?.message || 'Unknown error'} (MediaError code: ${mediaError?.code ?? 'N/A'})`
        )
      );
    };

    // CURSOR: If loading is aborted, neither onloadedmetadata nor onerror fires,
    // which would leave this promise hanging forever.
    audio.onabort = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('[TTS Audio] Audio loading was aborted.'));
    };

    audio.src = audioUrl;
  });

  return { audio, audioUrl };
}

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
      const provider = getTTSProvider(providerId);
      if (provider) {
        await provider.initialize();
        // CURSOR: Verify initialization succeeded before assigning
        if (!provider.getStatus().initialized) {
          throw new Error(`Failed to initialize TTS provider: ${providerId}`);
        }
        this.currentProvider = provider;
        this.config.providerId = providerId;
        return;
      }
    }

    // Use default provider
    const defaultProvider = await getDefaultTTSProvider();
    await defaultProvider.initialize();
    if (!defaultProvider.getStatus().initialized) {
      throw new Error(`Failed to initialize default TTS provider: ${defaultProvider.id}`);
    }
    this.currentProvider = defaultProvider;
    this.config.providerId = defaultProvider.id;
  }

  // Switch to a different provider
  async switchProvider(providerId: string): Promise<void> {
    const provider = getTTSProvider(providerId);
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

  // Create audio element from text (validates WAV before returning)
  async createAudioElement(text: string, options?: Partial<TTSOptions>): Promise<HTMLAudioElement> {
    const audioData = await this.synthesize(text, options);
    const { audio, audioUrl } = await createValidatedAudioElement(audioData);

    audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl), { once: true });
    audio.addEventListener('error', () => URL.revokeObjectURL(audioUrl), { once: true });

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
