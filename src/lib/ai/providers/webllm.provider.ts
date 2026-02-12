import type { AIProvider, AIModel, AIResponse, Analysis, UnifiedResponse, ConversationContext, AIOptions, AIProviderStatus, RichTranslation } from '../types';
import { getRichTranslationPrompt, getUnifiedResponsePrompt } from '../prompts';

/**
 * @deprecated WebLLM provider is not actively used. Audio-based flow requires OpenAI.
 * Kept for compilation but not recommended for use.
 */

export class WebLLMProvider implements AIProvider {
  id = 'webllm';
  name = 'WebLLM (Browser)';
  type = 'local' as const;
  contextMode = 'manual' as const;
  deprecated = true;
  
  // CURSOR: List of WebLLM-compatible models
  // Smaller models load faster and use less memory
  models: AIModel[] = [
    { id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', name: 'Llama 3.2 1B', contextWindow: 4096, description: 'Tiny, fast (~500MB)' },
    { id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC', name: 'Llama 3.2 3B', contextWindow: 8192, description: 'Small, balanced (~1.5GB)' },
    { id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', name: 'Qwen 2.5 1.5B', contextWindow: 4096, description: 'Multilingual (~800MB)' },
    { id: 'SmolLM2-1.7B-Instruct-q4f32_1-MLC', name: 'SmolLM2 1.7B', contextWindow: 4096, description: 'Efficient (~900MB)' },
    { id: 'Phi-3.5-mini-instruct-q4f32_1-MLC', name: 'Phi 3.5 Mini', contextWindow: 4096, description: 'Microsoft model (~2GB)' },
  ];

  private engine: unknown = null;
  private currentModelId: string | null = null;
  private status: AIProviderStatus = {
    initialized: false,
    loading: false,
  };

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      this.status = {
        initialized: false,
        loading: false,
        error: 'WebLLM requires browser environment',
      };
      return;
    }

    // Check WebGPU support
    const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
    if (!gpu) {
      this.status = {
        initialized: false,
        loading: false,
        error: 'WebGPU not supported in this browser',
      };
      return;
    }

    // CURSOR: Mark as initialized but model not loaded yet
    // Model loading happens on first use to avoid blocking page load
    this.status = {
      initialized: true,
      loading: false,
    };
  }

  // CURSOR: Load a specific model (called before first use)
  private async loadModel(modelId: string): Promise<void> {
    if (this.engine && this.currentModelId === modelId) {
      return; // Already loaded
    }

    this.status.loading = true;

    try {
      // CURSOR: Dynamically import WebLLM to avoid SSR issues (it only works in browser)
      const webllm = await import('@mlc-ai/web-llm');
      
      // Create engine with progress callback
      this.engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (progress: { text: string; progress: number }) => {
          console.log(`[WebLLM] ${progress.text} (${Math.round(progress.progress * 100)}%)`);
        },
      });

      this.currentModelId = modelId;
      this.status = {
        initialized: true,
        loading: false,
      };
    } catch (error) {
      this.status = {
        initialized: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load WebLLM model',
      };
      throw error;
    }
  }

  async generate(context: ConversationContext, message: string, options?: AIOptions): Promise<AIResponse> {
    const modelId = options?.model || this.models[0].id;
    
    await this.loadModel(modelId);
    
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: context.systemPrompt },
    ];

    if (context.summary) {
      messages.push({
        role: 'system',
        content: `CONVERSATION SUMMARY (earlier messages):\n${context.summary}`,
      });
    }

    messages.push(...context.messages);
    messages.push({ role: 'user', content: message });

    try {
      const engine = this.engine as {
        chat: {
          completions: {
            create: (params: {
              messages: typeof messages;
              temperature?: number;
              max_tokens?: number;
            }) => Promise<{
              choices: Array<{ message: { content: string } }>;
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
            }>;
          };
        };
      };

      const response = await engine.chat.completions.create({
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 500,
      });

      const choice = response.choices[0];
      
      return {
        content: choice.message.content || '',
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      throw new Error(`WebLLM generate failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async respond(context: ConversationContext, userMessage: string, options?: AIOptions): Promise<UnifiedResponse> {
    const modelId = options?.model || this.models[0].id;
    
    await this.loadModel(modelId);
    
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const unifiedPrompt = getUnifiedResponsePrompt(options?.motherLanguage, options?.learningLanguage, false);
    const recentMessages = context.messages.slice(-10);
    const conversationContext = `${context.summary ? `EARLIER CONVERSATION SUMMARY:\n${context.summary}\n\n` : ''}RECENT CONVERSATION:\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    try {
      const engine = this.engine as {
        chat: {
          completions: {
            create: (params: {
              messages: Array<{ role: string; content: string }>;
              temperature?: number;
              max_tokens?: number;
            }) => Promise<{
              choices: Array<{ message: { content: string } }>;
            }>;
          };
        };
      };

      const response = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: `${unifiedPrompt}\n\nRespond ONLY with valid JSON, no other text.` },
          { role: 'user', content: `${conversationContext}\n\nMESSAGE TO RESPOND TO AND ANALYZE:\n${userMessage}` },
        ],
        temperature: 0.3,
        max_tokens: options?.maxTokens ?? 2000,
      });

      const content = response.choices[0].message.content || '{}';
      
      try {
        const parsed = JSON.parse(content);
        return {
          reply: parsed.reply ?? '',
          analysis: {
            grammarScore: parsed.analysis?.grammarScore ?? 70,
            grammarErrors: Array.isArray(parsed.analysis?.grammarErrors) ? parsed.analysis.grammarErrors : [],
            vocabularyScore: parsed.analysis?.vocabularyScore ?? 70,
            vocabularySuggestions: Array.isArray(parsed.analysis?.vocabularySuggestions) ? parsed.analysis.vocabularySuggestions : [],
            relevanceScore: parsed.analysis?.relevanceScore ?? 80,
            relevanceFeedback: parsed.analysis?.relevanceFeedback,
            overallFeedback: parsed.analysis?.overallFeedback ?? 'Good effort!',
            alternativePhrasings: Array.isArray(parsed.analysis?.alternativePhrasings) ? parsed.analysis.alternativePhrasings : [],
          },
        };
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            reply: parsed.reply ?? '',
            analysis: {
              grammarScore: parsed.analysis?.grammarScore ?? 70,
              grammarErrors: Array.isArray(parsed.analysis?.grammarErrors) ? parsed.analysis.grammarErrors : [],
              vocabularyScore: parsed.analysis?.vocabularyScore ?? 70,
              vocabularySuggestions: Array.isArray(parsed.analysis?.vocabularySuggestions) ? parsed.analysis.vocabularySuggestions : [],
              relevanceScore: parsed.analysis?.relevanceScore ?? 80,
              relevanceFeedback: parsed.analysis?.relevanceFeedback,
              overallFeedback: parsed.analysis?.overallFeedback ?? 'Good effort!',
              alternativePhrasings: Array.isArray(parsed.analysis?.alternativePhrasings) ? parsed.analysis.alternativePhrasings : [],
            },
          };
        }
        return this.getDefaultUnifiedResponse();
      }
    } catch (error) {
      console.error('WebLLM respond failed:', error);
      return this.getDefaultUnifiedResponse();
    }
  }

  private getDefaultUnifiedResponse(): UnifiedResponse {
    return {
      reply: '',
      analysis: {
        grammarScore: 70,
        grammarErrors: [],
        vocabularyScore: 70,
        vocabularySuggestions: [],
        relevanceScore: 80,
        overallFeedback: 'Unable to perform detailed analysis.',
        alternativePhrasings: [],
      },
    };
  }

  // CURSOR: Rich translation with definition, usage examples, and type classification
  async richTranslate(
    text: string,
    learningLanguage: string,
    motherLanguage: string,
    options?: AIOptions
  ): Promise<RichTranslation> {
    const modelId = options?.model || this.models[0].id;
    
    await this.loadModel(modelId);
    
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const prompt = getRichTranslationPrompt(text, learningLanguage, motherLanguage);

    try {
      const engine = this.engine as {
        chat: {
          completions: {
            create: (params: {
              messages: Array<{ role: string; content: string }>;
              temperature?: number;
              max_tokens?: number;
            }) => Promise<{
              choices: Array<{ message: { content: string } }>;
            }>;
          };
        };
      };

      const response = await engine.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: 'You are a language learning assistant providing detailed translations. Respond ONLY with valid JSON.' 
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: options?.maxTokens ?? 500,
      });

      const content = response.choices[0].message.content || '{}';
      
      try {
        // Try direct parse first
        const parsed = JSON.parse(content);
        return {
          translation: parsed.translation || text,
          type: parsed.type || 'word',
          definition: parsed.definition || '',
          usageExamples: Array.isArray(parsed.usageExamples) ? parsed.usageExamples : [],
          notes: parsed.notes || undefined,
          formality: parsed.formality || 'neutral',
        };
      } catch {
        // Try to find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            translation: parsed.translation || text,
            type: parsed.type || 'word',
            definition: parsed.definition || '',
            usageExamples: Array.isArray(parsed.usageExamples) ? parsed.usageExamples : [],
            notes: parsed.notes || undefined,
            formality: parsed.formality || 'neutral',
          };
        }
        return this.getDefaultRichTranslation(text);
      }
    } catch (error) {
      console.error('WebLLM richTranslate failed:', error);
      return this.getDefaultRichTranslation(text);
    }
  }

  private getDefaultRichTranslation(text: string): RichTranslation {
    return {
      translation: text,
      type: 'word',
      definition: '',
      usageExamples: [],
      formality: 'neutral',
    };
  }

  async isAvailable(): Promise<boolean> {
    // CURSOR: WebLLM only works in browser with WebGPU
    if (typeof window === 'undefined') return false;
    
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu) return false;
    
    try {
      const adapter = await gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }

  // CURSOR: Cleanup WebGPU resources
  cleanup(): void {
    if (this.engine) {
      // WebLLM engine cleanup
      const engine = this.engine as { unload?: () => Promise<void> };
      if (engine.unload) {
        engine.unload().catch(console.error);
      }
    }
    this.engine = null;
    this.currentModelId = null;
    this.status = {
      initialized: false,
      loading: false,
    };
  }
}

// Export singleton instance
export const webLLMProvider = new WebLLMProvider();
