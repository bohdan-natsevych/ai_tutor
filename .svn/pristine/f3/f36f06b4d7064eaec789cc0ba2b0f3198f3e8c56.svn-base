import type { TTSProvider } from '../types';
import { kokoroProvider } from './kokoro.provider';
import { webSpeechProvider } from './webSpeech.provider';
import { openAITTSProvider } from './openai.provider';

// Registry of all available TTS providers
export const ttsProviders: Record<string, TTSProvider> = {
  kokoro: kokoroProvider,
  'web-speech': webSpeechProvider,
  'openai-tts': openAITTSProvider,
};

// Get provider by ID
export function getTTSProvider(id: string): TTSProvider | undefined {
  return ttsProviders[id];
}

// Get all providers
export function getAllTTSProviders(): TTSProvider[] {
  return Object.values(ttsProviders);
}

// Get default provider (Kokoro if available, else Web Speech)
export async function getDefaultTTSProvider(): Promise<TTSProvider> {
  if (await kokoroProvider.isAvailable()) {
    return kokoroProvider;
  }
  return webSpeechProvider;
}
