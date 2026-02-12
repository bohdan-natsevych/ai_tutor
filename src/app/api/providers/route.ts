import { NextResponse } from 'next/server';
import { getActiveAIProviders } from '@/lib/ai/providers';

// GET /api/providers - Returns active (non-deprecated) AI providers
export async function GET() {
  const providers = getActiveAIProviders().map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    contextMode: p.contextMode,
    description: getProviderDescription(p.id),
  }));

  return NextResponse.json({ providers });
}

function getProviderDescription(providerId: string): string {
  switch (providerId) {
    case 'openai-chat':
      return 'Chat Completions API – we manage conversation history';
    case 'openai-assistant':
      return 'Assistants API – OpenAI manages conversation history';
    default:
      return '';
  }
}
