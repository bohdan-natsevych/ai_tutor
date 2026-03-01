import type { STTProvider, STTOptions, STTResult, STTProviderStatus } from '../types';
import type { 
  SpeechRecognitionCustom, 
  SpeechRecognitionEventCustom, 
  SpeechRecognitionErrorEventCustom 
} from '@/types/speech-recognition';

// Web Speech API Provider for STT
export class WebSpeechSTTProvider implements STTProvider {
  id = 'web-speech-stt';
  name = 'Web Speech (Browser)';
  type = 'local' as const;

  private recognition: SpeechRecognitionCustom | null = null;
  private _isListening = false;
  private status: STTProviderStatus = {
    initialized: false,
    listening: false,
  };

  // Event handlers
  onResult: ((result: STTResult) => void) | null = null;
  onError: ((error: Error) => void) | null = null;
  onStart: (() => void) | null = null;
  onEnd: (() => void) | null = null;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      this.status = {
        initialized: false,
        listening: false,
        error: 'Web Speech API requires browser environment',
      };
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.status = {
        initialized: false,
        listening: false,
        error: 'Web Speech API not supported in this browser',
      };
      return;
    }

    this.recognition = new SpeechRecognition();
    this.status.initialized = true;
  }

  startListening(options: STTOptions): void {
    if (!this.recognition) {
      this.onError?.(new Error('Web Speech not initialized'));
      return;
    }

    // Configure recognition
    this.recognition.lang = this.getLanguageCode(options.language, options.dialect);
    this.recognition.continuous = options.continuous ?? true;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = 1;

    // Set up event handlers
    this.recognition.onresult = (event: SpeechRecognitionEventCustom) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      this.onResult?.({
        transcript,
        confidence,
        isFinal,
      });
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventCustom) => {
      this._isListening = false;
      this.status.listening = false;
      this.onError?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onstart = () => {
      this._isListening = true;
      this.status.listening = true;
      this.onStart?.();
    };

    this.recognition.onend = () => {
      this._isListening = false;
      this.status.listening = false;
      this.onEnd?.();
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (e) {
      this.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  stopListening(): void {
    if (this.recognition && this._isListening) {
      this.recognition.stop();
    }
  }

  isListening(): boolean {
    return this._isListening;
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  getStatus(): STTProviderStatus {
    return this.status;
  }

  private getLanguageCode(language: string, dialect?: string): string {
    // Map language + dialect to BCP-47 code
    if (language === 'en') {
      switch (dialect) {
        case 'american': return 'en-US';
        case 'british': return 'en-GB';
        case 'australian': return 'en-AU';
        default: return 'en-US';
      }
    }
    // Map language codes to full BCP-47 locale codes
    const languageMap: Record<string, string> = {
      uk: 'uk-UA',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
      it: 'it-IT',
      pt: 'pt-PT',
      pl: 'pl-PL',
      nl: 'nl-NL',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      ar: 'ar-SA',
      tr: 'tr-TR',
      cs: 'cs-CZ',
      sv: 'sv-SE',
      da: 'da-DK',
      fi: 'fi-FI',
      no: 'nb-NO',
      ro: 'ro-RO',
      hu: 'hu-HU',
      el: 'el-GR',
      he: 'he-IL',
      th: 'th-TH',
      vi: 'vi-VN',
      hi: 'hi-IN',
      ru: 'ru-RU',
    };
    return languageMap[language] || language;
  }
}

// Export singleton instance
export const webSpeechSTTProvider = new WebSpeechSTTProvider();
