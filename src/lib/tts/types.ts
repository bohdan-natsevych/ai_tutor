// TTS Provider Interface and Types

export type ProviderType = 'local' | 'cloud';

export interface Voice {
  id: string;
  name: string;
  language: string;
  dialect?: string;
  gender: 'male' | 'female' | 'neutral';
  preview?: string; // Preview audio URL
}

export interface TTSOptions {
  voice: string;
  speed: number; // 0.5 - 2.0
  pitch?: number;
  language: string;
  dialect?: string;
}

export interface TTSProvider {
  /** Unique provider identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Whether this runs locally or in the cloud */
  type: ProviderType;
  
  /** Available voices for this provider */
  voices: Voice[];
  
  /** Initialize the provider (load models, etc.) */
  initialize(): Promise<void>;
  
  /** Convert text to audio */
  synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer>;
  
  /** Get available voices */
  getVoices(): Voice[];
  
  /** Check if provider is available (WebGPU support, etc.) */
  isAvailable(): Promise<boolean>;
  
  /** Get initialization status (for loading indicators) */
  getStatus(): TTSProviderStatus;
  
  /** CURSOR: Cleanup resources (WebGPU, AudioContext, etc.) */
  cleanup(): void;
}

export interface TTSProviderStatus {
  initialized: boolean;
  loading: boolean;
  error?: string;
  progress?: number; // 0-100 for model downloads
  device?: 'webgpu' | 'wasm'; // CURSOR: Active device backend for local providers
}

export interface TTSProviderConfig {
  providerId: string;
  voice: string;
  speed: number;
}
