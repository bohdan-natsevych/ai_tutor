import type { TTSProvider, TTSOptions, Voice, TTSProviderStatus } from '../types';

// CURSOR: Piper TTS Provider - CPU-only local TTS via ONNX Runtime WASM.
// ~6-10x faster than Kokoro on CPU. Covers languages Kokoro lacks (uk, de, pl).
// Uses @mintplex-labs/piper-tts-web which runs entirely in the browser.

export class PiperProvider implements TTSProvider {
  id = 'piper';
  name = 'Piper TTS (Local)';
  type = 'local' as const;
  voices: Voice[] = [
    // English - American
    { id: 'en_US-hfc_female-medium', name: 'HFC Female', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'en_US-hfc_male-medium', name: 'HFC Male', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'en_US-amy-medium', name: 'Amy', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'en_US-lessac-medium', name: 'Lessac', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'en_US-ryan-medium', name: 'Ryan', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'en_US-joe-medium', name: 'Joe', language: 'en', dialect: 'american', gender: 'male' },
    { id: 'en_US-kristin-medium', name: 'Kristin', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'en_US-kathleen-low', name: 'Kathleen', language: 'en', dialect: 'american', gender: 'female' },
    { id: 'en_US-danny-low', name: 'Danny', language: 'en', dialect: 'american', gender: 'male' },
    // English - British
    { id: 'en_GB-alba-medium', name: 'Alba', language: 'en', dialect: 'british', gender: 'female' },
    { id: 'en_GB-cori-medium', name: 'Cori', language: 'en', dialect: 'british', gender: 'female' },
    { id: 'en_GB-jenny_dioco-medium', name: 'Jenny', language: 'en', dialect: 'british', gender: 'female' },
    { id: 'en_GB-alan-medium', name: 'Alan', language: 'en', dialect: 'british', gender: 'male' },
    { id: 'en_GB-northern_english_male-medium', name: 'Northern Male', language: 'en', dialect: 'british', gender: 'male' },
    // Ukrainian
    { id: 'uk_UA-ukrainian_tts-medium', name: 'Ukrainian TTS', language: 'uk', gender: 'female' },
    { id: 'uk_UA-lada-x_low', name: 'Lada', language: 'uk', gender: 'female' },
    // German
    { id: 'de_DE-thorsten-medium', name: 'Thorsten', language: 'de', gender: 'male' },
    { id: 'de_DE-thorsten-high', name: 'Thorsten HQ', language: 'de', gender: 'male' },
    { id: 'de_DE-thorsten_emotional-medium', name: 'Thorsten Emotional', language: 'de', gender: 'male' },
    { id: 'de_DE-kerstin-low', name: 'Kerstin', language: 'de', gender: 'female' },
    { id: 'de_DE-ramona-low', name: 'Ramona', language: 'de', gender: 'female' },
    { id: 'de_DE-eva_k-x_low', name: 'Eva', language: 'de', gender: 'female' },
    // French
    { id: 'fr_FR-siwis-medium', name: 'Siwis', language: 'fr', gender: 'female' },
    { id: 'fr_FR-tom-medium', name: 'Tom', language: 'fr', gender: 'male' },
    { id: 'fr_FR-gilles-low', name: 'Gilles', language: 'fr', gender: 'male' },
    // Spanish
    { id: 'es_ES-davefx-medium', name: 'Dave', language: 'es', gender: 'male' },
    { id: 'es_ES-sharvard-medium', name: 'Sharvard', language: 'es', gender: 'male' },
    { id: 'es_ES-carlfm-x_low', name: 'Carl', language: 'es', gender: 'male' },
    { id: 'es_MX-ald-medium', name: 'Ald (MX)', language: 'es', gender: 'male' },
    { id: 'es_MX-claude-high', name: 'Claude (MX)', language: 'es', gender: 'male' },
    // Italian
    { id: 'it_IT-riccardo-x_low', name: 'Riccardo', language: 'it', gender: 'male' },
    // Portuguese
    { id: 'pt_PT-tug\u00e3o-medium', name: 'Tugao', language: 'pt', gender: 'male' },
    { id: 'pt_BR-faber-medium', name: 'Faber (BR)', language: 'pt', gender: 'male' },
    { id: 'pt_BR-edresson-low', name: 'Edresson (BR)', language: 'pt', gender: 'male' },
    // Polish
    { id: 'pl_PL-gosia-medium', name: 'Gosia', language: 'pl', gender: 'female' },
    { id: 'pl_PL-darkman-medium', name: 'Darkman', language: 'pl', gender: 'male' },
    { id: 'pl_PL-mc_speech-medium', name: 'MC Speech', language: 'pl', gender: 'male' },
    // Chinese
    { id: 'zh_CN-huayan-medium', name: 'Huayan', language: 'zh', gender: 'female' },
    { id: 'zh_CN-huayan-x_low', name: 'Huayan Light', language: 'zh', gender: 'female' },
  ];

  private session: unknown = null;
  private currentVoiceId: string | null = null;
  private status: TTSProviderStatus = {
    initialized: false,
    loading: false,
  };

  async initialize(): Promise<void> {
    if (this.status.initialized) return;
    if (this.status.loading) {
      return new Promise((resolve) => {
        const check = () => {
          if (!this.status.loading) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    }

    if (typeof window === 'undefined') {
      this.status = { initialized: false, loading: false, error: 'Piper TTS requires browser environment' };
      return;
    }

    // CURSOR: Mark as ready immediately - actual model download happens on first synthesize
    // per voice. This avoids blocking init since Piper models are per-voice.
    this.status = { initialized: true, loading: false, progress: 100 };
  }

  async synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer> {
    if (typeof window === 'undefined') {
      throw new Error('Piper TTS requires browser environment');
    }

    const piper = await import('@mintplex-labs/piper-tts-web');
    const voiceId = options.voice;

    console.log('[Piper TTS] Generating speech with voice:', voiceId);

    // CURSOR: TtsSession uses a hard singleton internally (_instance).
    // When voice changes we must null out both our ref AND the library's
    // static singleton, otherwise it returns the old session with the old model.
    if (this.currentVoiceId !== voiceId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (piper.TtsSession as any)._instance = null;
      this.session = null;
      this.currentVoiceId = voiceId;
    }

    if (!this.session) {
      this.status = { ...this.status, loading: true, progress: 0 };
      // CURSOR: piper-tts-web hardcodes cdnjs URL for onnxruntime-web 1.18.0,
      // but that CDN lacks .mjs loader files needed by newer ORT versions.
      // We use jsdelivr CDN with the actual installed ORT version (resolved
      // at build time via NEXT_PUBLIC_ORT_WASM_VERSION in next.config.ts).
      const ortVersion = process.env.NEXT_PUBLIC_ORT_WASM_VERSION || '1.24.2';
      const onnxWasmCdn = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist/`;
      this.session = await piper.TtsSession.create({
        voiceId,
        wasmPaths: {
          onnxWasm: onnxWasmCdn,
          piperData: piper.WASM_BASE + '.data',
          piperWasm: piper.WASM_BASE + '.wasm',
        },
        progress: (p) => {
          if (p.total > 0) {
            this.status = { ...this.status, progress: Math.round((p.loaded / p.total) * 100) };
          }
        },
        logger: (msg) => console.log('[Piper TTS]', msg),
      });
      this.status = { ...this.status, loading: false, progress: 100 };
    }

    const session = this.session as { predict: (text: string) => Promise<Blob> };
    const wavBlob = await session.predict(text);
    return await wavBlob.arrayBuffer();
  }

  getVoices(): Voice[] {
    return this.voices;
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined';
  }

  getStatus(): TTSProviderStatus {
    return this.status;
  }

  cleanup(): void {
    this.session = null;
    this.currentVoiceId = null;
    this.status = { initialized: false, loading: false };
  }
}

export const piperProvider = new PiperProvider();
