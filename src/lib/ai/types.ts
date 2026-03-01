// AI Provider Interface and Types

export type ProviderType = 'local' | 'cloud';
export type ContextMode = 'manual' | 'managed';

export interface AIModel {
  id: string;
  name: string;
  contextWindow: number;
  description?: string;
}

export interface AIResponse {
  content: string;
  audioBase64?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GrammarError {
  original: string;
  correction: string;
  explanation: string;
}

export interface PronunciationAnalysis {
  pronunciationScore: number;
  transcribedText: string;
  mispronunciations: Array<{
    word: string;
    heardAs: string;
    correctPronunciation: string;
  }>;
  pronunciationFeedback: string;
}

export interface Analysis {
  grammarScore: number;
  grammarErrors: GrammarError[];
  vocabularyScore: number;
  vocabularySuggestions: string[];
  relevanceScore: number;
  relevanceFeedback?: string;
  overallFeedback: string;
  alternativePhrasings: string[];
  pronunciation?: PronunciationAnalysis;
}

// Unified response: AI reply + analysis in one call
export interface UnifiedResponse {
  reply: string;
  analysis: Analysis;
  audioBase64?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Rich translation result with definition, usage, and type info
export interface RichTranslation {
  translation: string;
  type: 'word' | 'phrase' | 'idiom' | 'collocation' | 'expression';
  definition: string;
  usageExamples: string[];
  notes?: string;
  formality?: 'formal' | 'neutral' | 'informal' | 'slang';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ConversationContext {
  chatId: string;
  threadId?: string; // For Assistants API
  messages: ChatMessage[];
  systemPrompt: string;
  summary?: string;
}

export interface AIOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  motherLanguage?: string;
  learningLanguage?: string;
  level?: 'novice' | 'beginner' | 'intermediate' | 'advanced';
  audioBase64?: string;
  audioFormat?: string;
  whisperTranscription?: string;
  wantAudioOutput?: boolean;
  voice?: string;
}

export interface AIProvider {
  /** Unique provider identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Whether this runs locally or in the cloud */
  type: ProviderType;
  
  /** Who manages conversation history */
  contextMode: ContextMode;
  
  /** Available models */
  models: AIModel[];
  
  /** Whether this provider is deprecated (hidden from UI) */
  deprecated?: boolean;
  
  /** Initialize the provider */
  initialize(): Promise<void>;
  
  /** Audio generation (opening messages, chat responses requiring audio output) */
  generate(context: ConversationContext, message: string, options?: AIOptions): Promise<AIResponse>;

  /** Text-only generation (suggestions, summarization - no audio modality) */
  generateText(context: ConversationContext, message: string, options?: AIOptions): Promise<AIResponse>;
  
  /** Unified respond: reply to user + analyze their message in one call */
  respond(context: ConversationContext, userMessage: string, options?: AIOptions): Promise<UnifiedResponse>;

  /** Rich translate - get translation with definition, usage, and type */
  richTranslate(text: string, learningLanguage: string, motherLanguage: string, options?: AIOptions): Promise<RichTranslation>;
  
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
  
  /** For managed mode: create a new thread */
  createThread?(): Promise<string>;
  
  /** For managed mode: get thread messages */
  getThreadMessages?(threadId: string): Promise<ChatMessage[]>;
}

export interface AIProviderStatus {
  initialized: boolean;
  loading: boolean;
  error?: string;
}

export interface AIProviderConfig {
  providerId: string;
  model: string;
  temperature: number;
  maxTokens: number;
}
