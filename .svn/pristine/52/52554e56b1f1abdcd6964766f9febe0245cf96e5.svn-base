// STT Provider Interface and Types

export type ProviderType = 'local' | 'cloud';

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface STTOptions {
  language: string;
  dialect?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface STTProvider {
  /** Unique provider identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Whether this runs locally or in the cloud */
  type: ProviderType;
  
  /** Initialize the provider */
  initialize(): Promise<void>;
  
  /** Start listening for speech */
  startListening(options: STTOptions): void;
  
  /** Stop listening */
  stopListening(): void;
  
  /** Check if currently listening */
  isListening(): boolean;
  
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
  
  /** Event handlers */
  onResult: ((result: STTResult) => void) | null;
  onError: ((error: Error) => void) | null;
  onStart: (() => void) | null;
  onEnd: (() => void) | null;
}

export interface STTProviderStatus {
  initialized: boolean;
  listening: boolean;
  error?: string;
}
