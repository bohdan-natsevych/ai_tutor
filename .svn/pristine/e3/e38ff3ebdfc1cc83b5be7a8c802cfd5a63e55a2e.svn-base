import type { STTProvider } from '../types';
import { webSpeechSTTProvider } from './webSpeech.provider';
import { whisperProvider } from './whisper.provider';

// Registry of all available STT providers
export const sttProviders: Record<string, STTProvider> = {
  'web-speech-stt': webSpeechSTTProvider,
  'whisper': whisperProvider,
};

// Get provider by ID
export function getSTTProvider(id: string): STTProvider | undefined {
  return sttProviders[id];
}

// Get all providers
export function getAllSTTProviders(): STTProvider[] {
  return Object.values(sttProviders);
}

// Get default provider (Web Speech is free and works offline)
export async function getDefaultSTTProvider(): Promise<STTProvider> {
  if (await webSpeechSTTProvider.isAvailable()) {
    return webSpeechSTTProvider;
  }
  return whisperProvider;
}
