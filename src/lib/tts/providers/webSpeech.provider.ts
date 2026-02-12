import type { TTSProvider, TTSOptions, Voice, TTSProviderStatus } from '../types';

// Web Speech Synthesis Provider (Browser Built-in)
// This is a fallback provider that works in most modern browsers

export class WebSpeechProvider implements TTSProvider {
  id = 'web-speech';
  name = 'Web Speech (Browser)';
  type = 'local' as const;
  voices: Voice[] = [];
  
  private synthesis: SpeechSynthesis | null = null;
  private systemVoices: SpeechSynthesisVoice[] = [];
  private status: TTSProviderStatus = {
    initialized: false,
    loading: false,
  };

  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.status = {
        initialized: false,
        loading: false,
        error: 'Web Speech API not available',
      };
      return;
    }

    this.status.loading = true;
    this.synthesis = window.speechSynthesis;

    // Wait for voices to load
    await new Promise<void>((resolve) => {
      const loadVoices = () => {
        this.systemVoices = this.synthesis!.getVoices();
        if (this.systemVoices.length > 0) {
          this.voices = this.systemVoices
            .filter(v => v.lang.startsWith('en'))
            .map(v => ({
              id: v.voiceURI,
              name: v.name,
              language: v.lang.split('-')[0],
              dialect: v.lang.includes('US') ? 'american' : 
                       v.lang.includes('GB') ? 'british' : 
                       v.lang.includes('AU') ? 'australian' : undefined,
              gender: v.name.toLowerCase().includes('female') ? 'female' as const : 
                      v.name.toLowerCase().includes('male') ? 'male' as const : 'neutral' as const,
            }));
          resolve();
        }
      };

      // Voices might already be loaded
      loadVoices();
      
      // Or we need to wait for them
      if (this.systemVoices.length === 0) {
        this.synthesis!.addEventListener('voiceschanged', loadVoices);
        // Timeout after 3 seconds
        setTimeout(() => {
          loadVoices();
          resolve();
        }, 3000);
      }
    });

    this.status = {
      initialized: true,
      loading: false,
    };
  }

  async synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer> {
    if (!this.synthesis) {
      throw new Error('Web Speech not initialized');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Find the selected voice
      const selectedVoice = this.systemVoices.find(v => v.voiceURI === options.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = options.speed;
      if (options.pitch) {
        utterance.pitch = options.pitch;
      }

      // Web Speech API doesn't provide raw audio data
      // We need to use MediaRecorder to capture it
      // For now, we'll use a workaround that plays directly

      // Create an AudioContext to capture the output
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        resolve(arrayBuffer);
      };

      utterance.onend = () => {
        mediaRecorder.stop();
        audioContext.close();
      };

      utterance.onerror = (e) => {
        reject(new Error(`Speech synthesis error: ${e.error}`));
      };

      mediaRecorder.start();
      this.synthesis!.speak(utterance);
    });
  }

  getVoices(): Voice[] {
    return this.voices;
  }

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getStatus(): TTSProviderStatus {
    return this.status;
  }

  // CURSOR: Cleanup speech synthesis resources
  cleanup(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.synthesis = null;
    this.systemVoices = [];
    this.voices = [];
    this.status = {
      initialized: false,
      loading: false,
    };
  }
}

// Export singleton instance
export const webSpeechProvider = new WebSpeechProvider();
