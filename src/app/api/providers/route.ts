import { NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai/providers';

// GET /api/providers - Returns available AI providers
export async function GET() {
  const provider = getAIProvider('openai-chat');
  const providers = provider ? [{
    id: provider.id,
    name: provider.name,
    description: 'Chat Completions API – we manage conversation history',
  }] : [];

  return NextResponse.json({ providers });
}
