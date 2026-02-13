import type { AIProvider } from '../types';
import { openAIChatProvider } from './openai-chat.provider';
import { openAIAssistantProvider } from './openai-assistant.provider';

// Registry of active AI providers
export const aiProviders: Record<string, AIProvider> = {
  'openai-chat': openAIChatProvider,
  'openai-assistant': openAIAssistantProvider,
};

// Get provider by ID
export function getAIProvider(id: string): AIProvider | undefined {
  return aiProviders[id];
}

// Get default provider
export async function getDefaultAIProvider(): Promise<AIProvider> {
  return openAIChatProvider;
}
