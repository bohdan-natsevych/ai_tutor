import { create } from 'zustand';

// Message state types
export type MessageState = 
  | 'generating'    // AI is generating response
  | 'audio_loading' // TTS is converting text to audio
  | 'playing'       // Audio is playing, text hidden
  | 'revealed';     // Audio finished, text visible

// CURSOR: Word timestamp for precise highlighting during TTS playback
export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

// CURSOR: Reply suggestion type for user guidance
export interface ReplySuggestion {
  id: string;
  content: string;
  translation?: string;
  audioData?: ArrayBuffer;
  wordTimestamps?: WordTimestamp[];
  playbackSpeed?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  state: MessageState;
  audioUrl?: string;
  audioData?: ArrayBuffer; // CURSOR: Cache audio data for Whisper analysis
  audioBlob?: Blob;
  audioFormat?: string;
  audioPlayed: boolean;
  playbackSpeed?: number; // CURSOR: Per-message playback speed (0.75 - 2.0)
  wordTimestamps?: WordTimestamp[]; // CURSOR: Cached word timestamps from Whisper
  analysis?: MessageAnalysis;
  createdAt: Date;
}

export interface MessageAnalysis {
  grammarScore: number;
  grammarErrors: Array<{
    original: string;
    correction: string;
    explanation: string;
  }>;
  vocabularyScore: number;
  vocabularySuggestions: string[];
  relevanceScore: number;
  relevanceFeedback?: string;
  overallFeedback: string;
  alternativePhrasings: string[];
  pronunciation?: {
    pronunciationScore: number;
    transcribedText: string;
    mispronunciations: Array<{
      word: string;
      heardAs: string;
      correctPronunciation: string;
    }>;
    pronunciationFeedback: string;
  };
}

export interface Chat {
  id: string;
  title: string;
  topicType: 'general' | 'roleplay' | 'topic';
  topicKey?: string;
  topicDetails?: Record<string, unknown>;
  language: string;
  dialect: string;
  threadId?: string;
  aiProvider: string;
  aiMode: 'chat' | 'assistant';
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  // Current chat state
  currentChat: Chat | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  
  // Recording state
  isRecording: boolean;
  transcript: string;
  
  // Playback state
  currentlyPlayingId: string | null;
  isPaused: boolean;
  currentWordIndex: number; // CURSOR: Index of word currently being spoken for highlighting
  
  // Analysis panel state
  analysisPanelOpen: boolean;
  analysisPanelMessageId: string | null; // Which message's analysis is shown
  
  // CURSOR: Reply suggestions state
  suggestions: ReplySuggestion[];
  previousSuggestions: ReplySuggestion[]; // CURSOR: Store previous suggestions for undo
  isSuggestionsLoading: boolean;
  
  // Actions
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  setRecording: (recording: boolean) => void;
  setTranscript: (transcript: string) => void;
  
  setCurrentlyPlaying: (messageId: string | null) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentWordIndex: (index: number) => void;
  
  // Analysis panel actions
  setAnalysisPanelOpen: (open: boolean) => void;
  setAnalysisPanelMessageId: (messageId: string | null) => void;
  showAnalysisForMessage: (messageId: string) => void;
  
  // CURSOR: Suggestion actions
  setSuggestions: (suggestions: ReplySuggestion[]) => void;
  updateSuggestion: (id: string, updates: Partial<ReplySuggestion>) => void;
  clearSuggestions: () => void;
  setSuggestionsLoading: (loading: boolean) => void;
  undoUseSuggestion: () => void;
  
  reset: () => void;
}

const initialState = {
  currentChat: null,
  messages: [],
  isLoading: false,
  error: null,
  isRecording: false,
  transcript: '',
  currentlyPlayingId: null,
  isPaused: false,
  currentWordIndex: -1, // CURSOR: -1 means no word is highlighted
  analysisPanelOpen: false,
  analysisPanelMessageId: null as string | null,
  suggestions: [] as ReplySuggestion[],
  previousSuggestions: [] as ReplySuggestion[],
  isSuggestionsLoading: false,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setCurrentChat: (chat) => set({ currentChat: chat }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),
  
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  setRecording: (isRecording) => set({ isRecording }),
  
  setTranscript: (transcript) => set({ transcript }),
  
  setCurrentlyPlaying: (messageId) => set({ currentlyPlayingId: messageId, isPaused: false, currentWordIndex: -1 }),
  
  setIsPaused: (isPaused) => set({ isPaused }),
  
  setCurrentWordIndex: (index) => set({ currentWordIndex: index }),
  
  // Analysis panel actions
  setAnalysisPanelOpen: (open) => set({ analysisPanelOpen: open }),
  setAnalysisPanelMessageId: (messageId) => set({ analysisPanelMessageId: messageId }),
  showAnalysisForMessage: (messageId) => set({ analysisPanelOpen: true, analysisPanelMessageId: messageId }),
  
  // CURSOR: Suggestion actions
  setSuggestions: (suggestions) => set({ suggestions }),
  
  updateSuggestion: (id, updates) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  
  clearSuggestions: () => set({ suggestions: [], previousSuggestions: [] }),
  
  setSuggestionsLoading: (isSuggestionsLoading) => set({ isSuggestionsLoading }),
  
  undoUseSuggestion: () =>
    set((state) => ({
      suggestions: state.previousSuggestions.length > 0 ? state.previousSuggestions : state.suggestions,
      previousSuggestions: [],
    })),
  
  reset: () => set(initialState),
}));
