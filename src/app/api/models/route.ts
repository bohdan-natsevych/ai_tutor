import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export interface OpenAIModel {
  id: string;
  name: string;
  description: string;
  contextWindow?: number;
}

// CURSOR: Fetch available models from OpenAI API dynamically
// ?type=text returns standard text chat models; default returns audio-capable models
export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'text' or null (default = audio)

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.models.list();
    
    const excludePatterns = ['instruct', 'realtime', 'transcribe', 'tts'];
    
    let chatModels;
    if (type === 'text') {
      // Text models: standard GPT chat models (no audio)
      chatModels = response.data
        .filter(model => model.id.startsWith('gpt-') && !model.id.includes('audio'))
        .filter(model => !excludePatterns.some(p => model.id.includes(p)))
        .map(model => ({
          id: model.id,
          name: formatModelName(model.id),
          description: getModelDescription(model.id),
          contextWindow: getContextWindow(model.id),
        }))
        .sort((a, b) => getModelPriority(b.id) - getModelPriority(a.id));
    } else {
      // Audio models (default): audio-capable models for voice tutoring
      chatModels = response.data
        .filter(model => model.id.startsWith('gpt-') && model.id.includes('audio'))
        .filter(model => !excludePatterns.some(p => model.id.includes(p)))
        .map(model => ({
          id: model.id,
          name: formatModelName(model.id),
          description: getModelDescription(model.id),
          contextWindow: getContextWindow(model.id),
        }))
        .sort((a, b) => getModelPriority(b.id) - getModelPriority(a.id));
    }

    return NextResponse.json({ models: chatModels });
  } catch (error) {
    console.error('[Models API] Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

// CURSOR: Format model ID into readable name
function formatModelName(modelId: string): string {
  if (modelId.includes('audio')) {
    if (modelId === 'gpt-audio') return 'GPT Audio';
    if (modelId === 'gpt-4o-audio-preview') return 'GPT-4o Audio Preview';
    return modelId.replace(/-/g, ' ');
  }
  // Handle known model patterns
  if (modelId.startsWith('gpt-4o')) {
    if (modelId === 'gpt-4o') return 'GPT-4o';
    if (modelId === 'gpt-4o-mini') return 'GPT-4o Mini';
    // Date-versioned models like gpt-4o-2024-11-20
    const dateMatch = modelId.match(/gpt-4o-(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return `GPT-4o (${dateMatch[1]})`;
    const miniDateMatch = modelId.match(/gpt-4o-mini-(\d{4}-\d{2}-\d{2})/);
    if (miniDateMatch) return `GPT-4o Mini (${miniDateMatch[1]})`;
    return modelId.replace('gpt-4o-', 'GPT-4o ').replace(/-/g, ' ');
  }
  
  if (modelId.startsWith('gpt-4.5')) {
    if (modelId === 'gpt-4.5-preview') return 'GPT-4.5 Preview';
    const dateMatch = modelId.match(/gpt-4\.5-preview-(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return `GPT-4.5 Preview (${dateMatch[1]})`;
    return modelId.replace('gpt-4.5-', 'GPT-4.5 ');
  }
  
  if (modelId.startsWith('gpt-5')) {
    if (modelId === 'gpt-5') return 'GPT-5';
    const dateMatch = modelId.match(/gpt-5-(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return `GPT-5 (${dateMatch[1]})`;
    return modelId.replace('gpt-5-', 'GPT-5 ');
  }
  
  if (modelId.startsWith('gpt-4-turbo')) {
    if (modelId === 'gpt-4-turbo') return 'GPT-4 Turbo';
    if (modelId === 'gpt-4-turbo-preview') return 'GPT-4 Turbo Preview';
    return modelId.replace('gpt-4-turbo-', 'GPT-4 Turbo ');
  }
  
  if (modelId.startsWith('gpt-4')) {
    if (modelId === 'gpt-4') return 'GPT-4';
    return modelId.replace('gpt-4-', 'GPT-4 ');
  }
  
  if (modelId.startsWith('gpt-3.5-turbo')) {
    if (modelId === 'gpt-3.5-turbo') return 'GPT-3.5 Turbo';
    return modelId.replace('gpt-3.5-turbo-', 'GPT-3.5 Turbo ');
  }
  
  // Fallback: capitalize and clean up
  return modelId.replace(/gpt-/i, 'GPT-').replace(/-/g, ' ');
}

// CURSOR: Get model description based on ID
function getModelDescription(modelId: string): string {
  if (modelId.includes('audio')) return 'Audio-enabled model';
  if (modelId.startsWith('gpt-5')) return 'Latest generation model';
  if (modelId.startsWith('gpt-4.5')) return 'Enhanced reasoning capabilities';
  if (modelId === 'gpt-4o-mini') return 'Fast and affordable';
  if (modelId.startsWith('gpt-4o-mini')) return 'Fast and affordable (versioned)';
  if (modelId === 'gpt-4o') return 'Most capable multimodal';
  if (modelId.startsWith('gpt-4o')) return 'Multimodal (versioned)';
  if (modelId.startsWith('gpt-4-turbo')) return 'High performance';
  if (modelId.startsWith('gpt-4')) return 'Powerful reasoning';
  if (modelId.startsWith('gpt-3.5')) return 'Legacy, fast';
  return 'OpenAI model';
}

// CURSOR: Get context window size
function getContextWindow(modelId: string): number {
  if (modelId.startsWith('gpt-5')) return 200000; // ASSUMPTION: GPT-5 context window
  if (modelId.startsWith('gpt-4.5')) return 128000;
  if (modelId.startsWith('gpt-4o')) return 128000;
  if (modelId.startsWith('gpt-4-turbo')) return 128000;
  if (modelId.startsWith('gpt-4-32k')) return 32768;
  if (modelId.startsWith('gpt-4')) return 8192;
  if (modelId.startsWith('gpt-3.5-turbo-16k')) return 16385;
  if (modelId.startsWith('gpt-3.5')) return 16385;
  return 8192;
}

// CURSOR: Priority for sorting (higher = shown first)
function getModelPriority(modelId: string): number {
  if (modelId.startsWith('gpt-5')) return 100;
  if (modelId.startsWith('gpt-4.5')) return 90;
  if (modelId.includes('audio')) return 83;
  if (modelId === 'gpt-4o') return 85;
  if (modelId === 'gpt-4o-mini') return 84;
  if (modelId.startsWith('gpt-4o')) return 80;
  if (modelId.startsWith('gpt-4-turbo')) return 70;
  if (modelId.startsWith('gpt-4')) return 60;
  if (modelId.startsWith('gpt-3.5')) return 30;
  return 10;
}
