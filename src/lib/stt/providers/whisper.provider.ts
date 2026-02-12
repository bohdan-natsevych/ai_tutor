import type { STTProvider, STTOptions, STTResult, STTProviderStatus } from '../types';

// CURSOR: OpenAI Whisper STT Provider - Cloud-based speech-to-text
// High accuracy across many languages and accents
// Cost: ~$0.006 per minute of audio

export class WhisperProvider implements STTProvider {
  id = 'whisper';
  name = 'OpenAI Whisper (Cloud)';
  type = 'cloud' as const;

  private status: STTProviderStatus = {
    initialized: false,
    listening: false,
  };

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

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
        error: 'Whisper STT requires browser environment',
      };
      return;
    }

    // Check for microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking access
      
      this.status = {
        initialized: true,
        listening: false,
      };
    } catch (error) {
      this.status = {
        initialized: false,
        listening: false,
        error: 'Microphone access denied',
      };
    }
  }

  startListening(options: STTOptions): void {
    if (this.status.listening) {
      return;
    }

    this.audioChunks = [];
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.stream = stream;
        this.mediaRecorder = new MediaRecorder(stream);
        
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstart = () => {
          this.status.listening = true;
          this.onStart?.();
        };

        this.mediaRecorder.onstop = async () => {
          this.status.listening = false;
          
          // Clean up stream
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }

          // Process audio through Whisper API
          await this.processAudio(options.language);
          
          this.onEnd?.();
        };

        this.mediaRecorder.onerror = () => {
          this.status.listening = false;
          this.onError?.(new Error('Recording failed'));
        };

        this.mediaRecorder.start();
      })
      .catch(error => {
        this.onError?.(error instanceof Error ? error : new Error('Failed to access microphone'));
      });
  }

  stopListening(): void {
    if (this.mediaRecorder && this.status.listening) {
      this.mediaRecorder.stop();
    }
  }

  isListening(): boolean {
    return this.status.listening;
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    // Check if we have microphone access and the API is configured
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      return hasMicrophone;
    } catch {
      return false;
    }
  }

  getStatus(): STTProviderStatus {
    return this.status;
  }

  private async processAudio(language: string): Promise<void> {
    if (this.audioChunks.length === 0) {
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // CURSOR: Send to our API route which calls Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('language', language);

    try {
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const data = await response.json();
      
      this.onResult?.({
        transcript: data.text || '',
        confidence: 0.95, // Whisper doesn't return confidence, use high default
        isFinal: true,
      });
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error('Transcription failed'));
    }
  }
}

// Export singleton instance
export const whisperProvider = new WhisperProvider();
