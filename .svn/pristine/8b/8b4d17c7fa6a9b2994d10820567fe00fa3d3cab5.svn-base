import { NextRequest, NextResponse } from 'next/server';
import { deeplClient } from '@/lib/translation/deepl';
import { aiManager } from '@/lib/ai/manager';

// Initialize DeepL client
deeplClient.initialize();

// CURSOR: Track last initialized provider to reinitialize when changed
let lastInitializedProvider: string | null = null;

// CURSOR: Initialize with specified provider and model, or use defaults
async function ensureAIInitialized(providerId?: string, model?: string) {
  const targetProvider = providerId || 'openai-chat';
  
  if (lastInitializedProvider !== targetProvider) {
    await aiManager.initialize(targetProvider);
    lastInitializedProvider = targetProvider;
  }
  
  if (model) {
    aiManager.setModel(model);
  }
}

// POST /api/translate - Translate text
// Supports two modes:
// - simple (default): DeepL translation only
// - rich: LLM-based with definition, usage examples, type classification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, texts, targetLanguage, sourceLanguage, mode = 'simple', aiProvider, aiModel } = body;

    if (!targetLanguage) {
      return NextResponse.json(
        { error: 'targetLanguage required' },
        { status: 400 }
      );
    }

    if (!text && !texts) {
      return NextResponse.json(
        { error: 'text or texts required' },
        { status: 400 }
      );
    }

    // CURSOR: Rich translation mode using LLM
    if (mode === 'rich' && text) {
      // CURSOR: Initialize with provider/model from request (from user settings)
      await ensureAIInitialized(aiProvider, aiModel);
      
      const richResult = await aiManager.richTranslate(
        text,
        sourceLanguage || 'en',
        targetLanguage
      );
      
      return NextResponse.json({ 
        translation: {
          translatedText: richResult.translation,
          sourceText: text,
          sourceLanguage: sourceLanguage || 'auto',
          targetLanguage,
        },
        rich: richResult,
      });
    }

    // Simple mode: DeepL translation
    if (!deeplClient.isAvailable()) {
      return NextResponse.json(
        { error: 'DeepL API not configured' },
        { status: 503 }
      );
    }

    // Batch translation
    if (texts && Array.isArray(texts)) {
      const results = await deeplClient.translateBatch(texts, targetLanguage, sourceLanguage);
      return NextResponse.json({ translations: results });
    }

    // Single translation
    const result = await deeplClient.translate(text, targetLanguage, sourceLanguage);
    return NextResponse.json({ translation: result });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate text' },
      { status: 500 }
    );
  }
}

// GET /api/translate/usage - Get usage statistics
export async function GET() {
  try {
    if (!deeplClient.isAvailable()) {
      return NextResponse.json(
        { error: 'DeepL API not configured' },
        { status: 503 }
      );
    }

    const usage = await deeplClient.getUsage();
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
