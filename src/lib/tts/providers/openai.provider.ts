import type { TTSProvider, TTSOptions, Voice, TTSProviderStatus } from '../types';

// CURSOR: OpenAI TTS Provider - Cloud-based text-to-speech
// High quality voices with natural prosody
// Cost: ~$15 per 1M characters

export class OpenAITTSProvider implements TTSProvider {
  id = 'openai-tts';
  name = 'OpenAI TTS (Cloud)';
  type = 'cloud' as const;
  
  voices: Voice[] = [
    { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral' },
    { id: 'echo', name: 'Echo', language: 'en', gender: 'male' },
    { id: 'fable', name: 'Fable', language: 'en', gender: 'neutral' },
    { id: 'onyx', name: 'Onyx', language: 'en', gender: 'male' },
    { id: 'nova', name: 'Nova', language: 'en', gender: 'female' },
    { id: 'shimmer', name: 'Shimmer', language: 'en', gender: 'female' },
  ];

  private apiKey: string | null = null;
  private status: TTSProviderStatus = {
    initialized: false,
    loading: false,
  };

  async initialize(): Promise<void> {
    // Get API key from environment (server-side only)
    if (typeof window === 'undefined') {
      this.apiKey = process.env.OPENAI_API_KEY || null;
    }

    if (!this.apiKey) {
      this.status = {
        initialized: false,
        loading: false,
        error: 'OpenAI API key not configured',
      };
      return;
    }

    this.status = {
      initialized: true,
      loading: false,
    };
  }

  async synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer> {
    // CURSOR: OpenAI TTS must be called from server-side due to API key
    // This provider should be used via API route
    
    if (typeof window !== 'undefined') {
      // Client-side: call our API route
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: options.voice,
          speed: options.speed,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      return response.arrayBuffer();
    }

    // Server-side: call OpenAI directly
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: options.voice || 'alloy',
        speed: options.speed || 1.0,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} - ${errorText}`);
    }

    return response.arrayBuffer();
  }

  getVoices(): Voice[] {
    return this.voices;
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window !== 'undefined') {
      // Client-side: assume available (check via API)
      return true;
    }
    return !!process.env.OPENAI_API_KEY;
  }

  getStatus(): TTSProviderStatus {
    return this.status;
  }

  cleanup(): void {
    this.status = {
      initialized: false,
      loading: false,
    };
  }
}

// Export singleton instance
export const openAITTSProvider = new OpenAITTSProvider();
