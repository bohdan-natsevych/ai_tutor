// Web Speech API Type Definitions
// These types are for the SpeechRecognition API which isn't fully typed in TypeScript

// Speech recognition interfaces
export interface SpeechRecognitionEventMap {
  audioend: Event;
  audiostart: Event;
  end: Event;
  error: SpeechRecognitionErrorEventCustom;
  nomatch: SpeechRecognitionEventCustom;
  result: SpeechRecognitionEventCustom;
  soundend: Event;
  soundstart: Event;
  speechend: Event;
  speechstart: Event;
  start: Event;
}

export interface SpeechRecognitionEventCustom extends Event {
  readonly results: SpeechRecognitionResultListCustom;
  readonly resultIndex: number;
}

export interface SpeechRecognitionResultListCustom {
  readonly length: number;
  item(index: number): SpeechRecognitionResultCustom;
  [index: number]: SpeechRecognitionResultCustom;
}

export interface SpeechRecognitionResultCustom {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternativeCustom;
  [index: number]: SpeechRecognitionAlternativeCustom;
}

export interface SpeechRecognitionAlternativeCustom {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionErrorEventCustom extends Event {
  readonly error: string;
  readonly message: string;
}

export interface SpeechRecognitionCustom extends EventTarget {
  continuous: boolean;
  grammars: unknown;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  onaudioend: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;
  onaudiostart: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;
  onend: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;
  onerror: ((this: SpeechRecognitionCustom, ev: SpeechRecognitionErrorEventCustom) => unknown) | null;
  onnomatch: ((this: SpeechRecognitionCustom, ev: SpeechRecognitionEventCustom) => unknown) | null;
  onresult: ((this: SpeechRecognitionCustom, ev: SpeechRecognitionEventCustom) => unknown) | null;
  onsoundend: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;
  onsoundstart: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;
  onspeechend: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;
  onspeechstart: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;
  onstart: ((this: SpeechRecognitionCustom, ev: Event) => unknown) | null;

  abort(): void;
  start(): void;
  stop(): void;
}

export interface SpeechRecognitionConstructorCustom {
  new (): SpeechRecognitionCustom;
  prototype: SpeechRecognitionCustom;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorCustom;
    webkitSpeechRecognition?: SpeechRecognitionConstructorCustom;
  }
  
  // WebGPU types
  interface Navigator {
    gpu?: GPU;
  }
  
  interface GPU {
    requestAdapter(): Promise<GPUAdapter | null>;
  }
  
  interface GPUAdapter {
    // minimal interface
  }
}

export {};
