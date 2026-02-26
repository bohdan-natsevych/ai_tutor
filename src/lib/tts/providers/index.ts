import type { TTSProvider } from '../types';
import { kokoroProvider } from './kokoro.provider';
import { webSpeechProvider } from './webSpeech.provider';
import { openAITTSProvider } from './openai.provider';

// CURSOR: Registry of eagerly-loaded TTS providers.
// Piper is lazy-loaded to avoid bundling its WASM (contains require('fs'))
// into the SSR bundle, which breaks Turbopack.
const ttsProviders: Record<string, TTSProvider> = {
  kokoro: kokoroProvider,
  'web-speech': webSpeechProvider,
  'openai-tts': openAITTSProvider,
};

// CURSOR: Lazy-loaded providers cache - avoids re-importing on every call
const lazyProviderCache: Record<string, TTSProvider> = {};

export async function getTTSProvider(id: string): Promise<TTSProvider | undefined> {
  if (ttsProviders[id]) return ttsProviders[id];

  if (id === 'piper') {
    if (!lazyProviderCache['piper']) {
      const { piperProvider } = await import('./piper.provider');
      lazyProviderCache['piper'] = piperProvider;
    }
    return lazyProviderCache['piper'];
  }

  return undefined;
}

export function getAllTTSProviders(): TTSProvider[] {
  return Object.values(ttsProviders);
}

export async function getDefaultTTSProvider(): Promise<TTSProvider> {
  if (await kokoroProvider.isAvailable()) {
    return kokoroProvider;
  }
  return webSpeechProvider;
}
