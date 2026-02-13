import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface LanguageSettings {
  learning: string;
  dialect: string;
  mother: string;
}

export interface TTSSettings {
  provider: string;
  voice: string;
  speed: number;
}

export interface STTSettings {
  provider: string;
}

export interface AISettings {
  provider: string;
  model: string;
  textModel: string;
  openaiMode: 'chat' | 'assistant';
  openaiAssistantId?: string;
}

export interface ContextSettings {
  recentWindowSize: number;
  summarizeAfterMessages: number;
  summarizationProvider: 'same' | 'local';
  localSummarizationModel?: string;
  disableSummarization: boolean;
}

export interface UISettings {
  listenFirstMode: boolean;
  theme: 'light' | 'dark' | 'system';
  interfaceLanguage: string; // 'auto' = use mother language, or explicit code like 'en', 'uk'
}

// CURSOR: Translation mode - simple (DeepL only) or rich (LLM with definitions/usage)
export interface TranslationSettings {
  mode: 'simple' | 'rich';
}

export interface CustomPrompts {
  system?: string;
  analysis?: string;
  topics: Record<string, string>;
}

export interface AppSettings {
  language: LanguageSettings;
  tts: TTSSettings;
  stt: STTSettings;
  ai: AISettings;
  context: ContextSettings;
  ui: UISettings;
  translation: TranslationSettings;
  prompts: CustomPrompts;
}

// Default settings
const defaultSettings: AppSettings = {
  language: {
    learning: 'en',
    dialect: 'american',
    mother: 'uk', // Ukrainian
  },
  tts: {
    provider: 'kokoro',
    voice: 'af_heart',
    speed: 1,  // CURSOR: Slower default for beginners (0.5-2.0 range)
  },
  stt: {
    provider: 'web-speech-stt',
  },
  ai: {
    provider: 'openai-chat',
    model: 'gpt-audio',
    textModel: 'gpt-5.2',
    openaiMode: 'chat',
  },
  context: {
    recentWindowSize: 20,
    summarizeAfterMessages: 10,
    summarizationProvider: 'same',
    disableSummarization: false,
  },
  ui: {
    listenFirstMode: true,
    theme: 'system',
    interfaceLanguage: 'auto',
  },
  translation: {
    mode: 'simple', // CURSOR: DeepL-only is default
  },
  prompts: {
    topics: {},
  },
};

interface SettingsState extends AppSettings {
  // Actions
  setLanguageSettings: (settings: Partial<LanguageSettings>) => void;
  setTTSSettings: (settings: Partial<TTSSettings>) => void;
  setSTTSettings: (settings: Partial<STTSettings>) => void;
  setAISettings: (settings: Partial<AISettings>) => void;
  setContextSettings: (settings: Partial<ContextSettings>) => void;
  setUISettings: (settings: Partial<UISettings>) => void;
  setTranslationSettings: (settings: Partial<TranslationSettings>) => void;
  setCustomPrompt: (key: string, prompt: string) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setLanguageSettings: (settings) =>
        set((state) => ({
          language: { ...state.language, ...settings },
        })),

      setTTSSettings: (settings) =>
        set((state) => ({
          tts: { ...state.tts, ...settings },
        })),

      setSTTSettings: (settings) =>
        set((state) => ({
          stt: { ...state.stt, ...settings },
        })),

      setAISettings: (settings) =>
        set((state) => ({
          ai: { ...state.ai, ...settings },
        })),

      setContextSettings: (settings) =>
        set((state) => ({
          context: { ...state.context, ...settings },
        })),

      setUISettings: (settings) =>
        set((state) => ({
          ui: { ...state.ui, ...settings },
        })),

      setTranslationSettings: (settings) =>
        set((state) => ({
          translation: { ...state.translation, ...settings },
        })),

      setCustomPrompt: (key, prompt) =>
        set((state) => ({
          prompts: {
            ...state.prompts,
            [key]: prompt,
          },
        })),

      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'lanqua-settings',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as AppSettings;
        if (version === 0) {
          // v0 → v1: Ensure AI model is audio-capable (old default was gpt-4o-mini)
          if (state.ai && !state.ai.model.includes('audio')) {
            state.ai.model = 'gpt-4o-audio-preview';
          }
        }
        if (version < 2) {
          // v1 → v2: Add text model setting
          if (state.ai && !state.ai.textModel) {
            state.ai.textModel = 'gpt-4o-mini';
          }
        }
        if (version < 3) {
          // v2 → v3: Add interface language setting
          if (state.ui && !(state.ui as unknown as Record<string, unknown>).interfaceLanguage) {
            (state.ui as unknown as Record<string, unknown>).interfaceLanguage = 'auto';
          }
        }
        return state;
      },
    }
  )
);
