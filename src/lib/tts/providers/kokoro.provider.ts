import type { TTSProvider, TTSOptions, Voice, TTSProviderStatus } from '../types';

// Kokoro TTS Provider (Local WebGPU)
// Uses kokoro-js library for high-quality local TTS

export class KokoroProvider implements TTSProvider {
  id = 'kokoro';
  name = 'Kokoro TTS (Local)';
  type = 'local' as const;
  voices: Voice[] = [
    // American English voices
    { id: 'af_heart', name: 'Heart (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_bella', name: 'Bella (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_nicole', name: 'Nicole (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_aoede', name: 'Aoede (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_kore', name: 'Kore (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_sarah', name: 'Sarah (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_nova', name: 'Nova (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_sky', name: 'Sky (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_alloy', name: 'Alloy (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_jessica', name: 'Jessica (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'af_river', name: 'River (American Female)', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'am_adam', name: 'Adam (American Male)', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'am_michael', name: 'Michael (American Male)', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'am_fenrir', name: 'Fenrir (American Male)', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'am_puck', name: 'Puck (American Male)', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'am_echo', name: 'Echo (American Male)', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'am_eric', name: 'Eric (American Male)', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'am_liam', name: 'Liam (American Male)', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'am_onyx', name: 'Onyx (American Male)', language: 'en', dialect: 'american', gender: 'male' },
  // British English voices
    { id: 'bf_emma', name: 'Emma (British Female)', language: 'en', dialect: 'british', gender: 'female' },
    { id: 'bf_alice', name: 'Alice (British Female)', language: 'en', dialect: 'british', gender: 'female' },
    { id: 'bf_isabella', name: 'Isabella (British Female)', language: 'en', dialect: 'british', gender: 'female' },
    { id: 'bf_lily', name: 'Lily (British Female)', language: 'en', dialect: 'british', gender: 'female' },
    { id: 'bm_george', name: 'George (British Male)', language: 'en', dialect: 'british', gender: 'male' },
    { id: 'bm_daniel', name: 'Daniel (British Male)', language: 'en', dialect: 'british', gender: 'male' },
    { id: 'bm_fable', name: 'Fable (British Male)', language: 'en', dialect: 'british', gender: 'male' },
    { id: 'bm_lewis', name: 'Lewis (British Male)', language: 'en', dialect: 'british', gender: 'male' },
    // French voices
    { id: 'ff_siwis', name: 'Siwis (French Female)', language: 'fr', gender: 'female' },
    // Japanese voices
    { id: 'jf_alpha', name: 'Alpha (Japanese Female)', language: 'ja', gender: 'female' },
    { id: 'jf_gongitsune', name: 'Gongitsune (Japanese Female)', language: 'ja', gender: 'female' },
    { id: 'jf_nezumi', name: 'Nezumi (Japanese Female)', language: 'ja', gender: 'female' },
    { id: 'jf_tebukuro', name: 'Tebukuro (Japanese Female)', language: 'ja', gender: 'female' },
    // Mandarin Chinese voices
    { id: 'zf_xiaobei', name: 'Xiaobei (Chinese Female)', language: 'zh', gender: 'female' },
    { id: 'zf_xiaomi', name: 'Xiaomi (Chinese Female)', language: 'zh', gender: 'female' },
    { id: 'zf_xiaoxiao', name: 'Xiaoxiao (Chinese Female)', language: 'zh', gender: 'female' },
    { id: 'zf_xiaoyi', name: 'Xiaoyi (Chinese Female)', language: 'zh', gender: 'female' },
    { id: 'zm_yunjian', name: 'Yunjian (Chinese Male)', language: 'zh', gender: 'male' },
    { id: 'zm_yunxi', name: 'Yunxi (Chinese Male)', language: 'zh', gender: 'male' },
    { id: 'zm_yunxia', name: 'Yunxia (Chinese Male)', language: 'zh', gender: 'male' },
    { id: 'zm_yunyang', name: 'Yunyang (Chinese Male)', language: 'zh', gender: 'male' },
    // Spanish voices
    { id: 'ef_dora', name: 'Dora (Spanish Female)', language: 'es', gender: 'female' },
    { id: 'em_alex', name: 'Alex (Spanish Male)', language: 'es', gender: 'male' },
    { id: 'em_santa', name: 'Santa (Spanish Male)', language: 'es', gender: 'male' },
    // Italian voices
    { id: 'if_sara', name: 'Sara (Italian Female)', language: 'it', gender: 'female' },
    { id: 'im_nicola', name: 'Nicola (Italian Male)', language: 'it', gender: 'male' },
    // Portuguese voices
    { id: 'pf_dora', name: 'Dora (Portuguese Female)', language: 'pt', gender: 'female' },
    { id: 'pm_alex', name: 'Alex (Portuguese Male)', language: 'pt', gender: 'male' },
    { id: 'pm_santa', name: 'Santa (Portuguese Male)', language: 'pt', gender: 'male' },
  ];

  private kokoro: unknown = null;
  private status: TTSProviderStatus = {
    initialized: false,
    loading: false,
  };

  async initialize(): Promise<void> {
    // CURSOR: Skip if already initialized or currently loading
    if (this.status.initialized) {
      return;
    }
    if (this.status.loading) {
      // Already loading, wait for it to complete by polling
      return new Promise((resolve) => {
        const checkStatus = () => {
          if (!this.status.loading) {
            resolve();
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        checkStatus();
      });
    }

    if (typeof window === 'undefined') {
      this.status = {
        initialized: false,
        loading: false,
        error: 'Kokoro TTS requires browser environment',
      };
      return;
    }

    // Check WebGPU support
    const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
    if (!gpu) {
      this.status = {
        initialized: false,
        loading: false,
        error: 'WebGPU not supported in this browser',
      };
      return;
    }

    this.status.loading = true;
    this.status.progress = 0;

    try {
      // Dynamically import kokoro-js to avoid SSR issues
      const { KokoroTTS } = await import('kokoro-js');
      
      // Initialize Kokoro TTS
      this.kokoro = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'fp32',
        device: 'webgpu',
        progress_callback: (progress: unknown) => {
          const p = progress as { progress?: number };
          if (p.progress !== undefined) {
            this.status.progress = Math.round(p.progress * 100);
          }
        },
      });

      this.status = {
        initialized: true,
        loading: false,
        progress: 100,
      };
    } catch (error) {
      this.status = {
        initialized: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize Kokoro TTS',
      };
    }
  }

  async synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer> {
    if (!this.kokoro) {
      throw new Error('Kokoro TTS not initialized');
    }

    const kokoroInstance = this.kokoro as {
      generate: (text: string, options: { voice: string; speed: number }) => Promise<{ toWav: () => Uint8Array }>;
    };

    // CURSOR: Log speed to verify it's being passed correctly
    console.log('[Kokoro TTS] Generating speech with speed:', options.speed);

    // Generate audio using Kokoro
    const audio = await kokoroInstance.generate(text, {
      voice: options.voice,
      speed: options.speed,
    });

    // Convert to WAV ArrayBuffer
    const wavData = audio.toWav();
    return new Uint8Array(wavData).buffer as ArrayBuffer;
  }

  getVoices(): Voice[] {
    return this.voices;
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu) return false;
    
    try {
      const adapter = await gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  getStatus(): TTSProviderStatus {
    return this.status;
  }

  // CURSOR: Cleanup WebGPU resources
  cleanup(): void {
    this.kokoro = null;
    this.status = {
      initialized: false,
      loading: false,
    };
  }
}

// Export singleton instance
export const kokoroProvider = new KokoroProvider();
