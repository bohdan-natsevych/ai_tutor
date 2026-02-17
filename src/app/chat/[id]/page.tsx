'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessageBubble } from '@/components/chat/ChatMessage';
import { SuggestionBubble } from '@/components/chat/SuggestionBubble';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import { AnalysisPanel } from '@/components/chat/AnalysisPanel';
import { useChatStore, type ChatMessage as ChatMessageType, type WordTimestamp, type ReplySuggestion } from '@/stores/chatStore';
import { getWordTimestamps } from '@/lib/whisper/wordTiming';
import { useSettingsStore } from '@/stores/settingsStore';
import { ttsManager, createValidatedAudioElement } from '@/lib/tts/manager';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { HeaderLanguageSelector } from '@/components/layout/HeaderLanguageSelector';
import { getDisplayTitle } from '@/lib/chatUtils';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { id: chatId } = use(params);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hintsRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [ttsInitialized, setTtsInitialized] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  // CURSOR: Store TTS init promise to await it when needed for first message
  const ttsInitPromiseRef = useRef<Promise<boolean> | null>(null);
  // CURSOR: Store current audio element for pause/resume/stop control
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // CURSOR: Use selectors for better performance - only re-render when specific state changes
  const currentChat = useChatStore((state) => state.currentChat);
  const messages = useChatStore((state) => state.messages);
  const currentlyPlayingId = useChatStore((state) => state.currentlyPlayingId);
  const isLoading = useChatStore((state) => state.isLoading);
  const isPaused = useChatStore((state) => state.isPaused);
  const isRecording = useChatStore((state) => state.isRecording);
  const currentWordIndex = useChatStore((state) => state.currentWordIndex);
  
  // CURSOR: Suggestion state
  const suggestions = useChatStore((state) => state.suggestions);
  const previousSuggestions = useChatStore((state) => state.previousSuggestions);
  const isSuggestionsLoading = useChatStore((state) => state.isSuggestionsLoading);
  
  // Analysis panel state
  const analysisPanelOpen = useChatStore((state) => state.analysisPanelOpen);
  const setAnalysisPanelOpen = useChatStore((state) => state.setAnalysisPanelOpen);
  const showAnalysisForMessage = useChatStore((state) => state.showAnalysisForMessage);
  
  // Actions don't cause re-renders, safe to get from store directly
  const setCurrentChat = useChatStore((state) => state.setCurrentChat);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setCurrentlyPlaying = useChatStore((state) => state.setCurrentlyPlaying);
  const setLoading = useChatStore((state) => state.setLoading);
  const setIsPaused = useChatStore((state) => state.setIsPaused);
  const setCurrentWordIndex = useChatStore((state) => state.setCurrentWordIndex);
  
  // CURSOR: Suggestion actions
  const setSuggestions = useChatStore((state) => state.setSuggestions);
  const updateSuggestion = useChatStore((state) => state.updateSuggestion);
  const clearSuggestions = useChatStore((state) => state.clearSuggestions);
  const setSuggestionsLoading = useChatStore((state) => state.setSuggestionsLoading);
  const undoUseSuggestion = useChatStore((state) => state.undoUseSuggestion);

  // CURSOR: Use selectors for settings too
  const tts = useSettingsStore((state) => state.tts);
  const ui = useSettingsStore((state) => state.ui);
  const ai = useSettingsStore((state) => state.ai);
  const language = useSettingsStore((state) => state.language);
  const { t } = useTranslation();
  
  // CURSOR: Default playback speed from settings, used for first playback
  const defaultSpeed = tts.speed;

  // Initialize TTS
  useEffect(() => {
    const initTTS = async (): Promise<boolean> => {
      try {
        await ttsManager.initialize(tts.provider);
        ttsManager.setVoice(tts.voice);
        ttsManager.setSpeed(tts.speed);
        setTtsInitialized(true);
        setTtsError(null);
        return true;
      } catch (error) {
        console.error('Failed to initialize TTS:', error);
        setTtsError(error instanceof Error ? error.message : 'TTS initialization failed');
        setTtsInitialized(false);
        return false;
      }
    };
    ttsInitPromiseRef.current = initTTS();
  }, [tts.provider, tts.voice, tts.speed]);

  // CURSOR: Stop audio function - can be called on unmount or when recording starts
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setCurrentlyPlaying(null);
    setIsPaused(false);
    setCurrentWordIndex(-1);
  }, [setCurrentlyPlaying, setIsPaused, setCurrentWordIndex]);

  // CURSOR: Pause audio function
  const pauseCurrentAudio = useCallback(() => {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
      setIsPaused(true);
    }
  }, [setIsPaused]);

  // CURSOR: Resume audio function
  const resumeCurrentAudio = useCallback(() => {
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play().catch(console.error);
      setIsPaused(false);
    }
  }, [setIsPaused]);

  // CURSOR: Change playback speed for a specific message - applies immediately if playing
  const changePlaybackSpeed = useCallback((messageId: string, speed: number) => {
    const clampedSpeed = Math.max(0.6, Math.min(1.5, speed));
    // Update message's per-message speed
    updateMessage(messageId, { playbackSpeed: clampedSpeed });
    // Apply immediately if this message is currently playing
    if (currentlyPlayingId === messageId && currentAudioRef.current) {
      currentAudioRef.current.playbackRate = clampedSpeed;
    }
  }, [currentlyPlayingId, updateMessage]);

  // CURSOR: Set up precise word highlighting using cached Whisper timestamps
  // Only used on replay when timestamps are available
  const setupPreciseWordHighlighting = useCallback((
    audio: HTMLAudioElement, 
    timestamps: WordTimestamp[]
  ) => {
    if (!timestamps || timestamps.length === 0) return;

    // CURSOR: Track previous index to avoid unnecessary state updates
    let previousWordIndex = -1;
    
    // CURSOR: Bias to compensate for processing/rendering delay (configurable via env)
    const biasMs = parseInt(process.env.NEXT_PUBLIC_WORD_HIGHLIGHT_BIAS_MS || '100', 10);
    const TIMESTAMP_BIAS = biasMs / 1000; // Convert ms to seconds

    const handleTimeUpdate = () => {
      // CURSOR: Add bias to look slightly ahead in the audio
      const currentTime = audio.currentTime + TIMESTAMP_BIAS;
      
      let wordIndex = -1;
      for (let i = 0; i < timestamps.length; i++) {
        if (currentTime >= timestamps[i].start && currentTime <= timestamps[i].end) {
          wordIndex = i;
          break;
        }
        // If we're past this word but before the next, highlight this word
        if (currentTime > timestamps[i].end && 
            (i === timestamps.length - 1 || currentTime < timestamps[i + 1].start)) {
          wordIndex = i;
          break;
        }
      }
      
      // If we're before the first word, show first word
      if (wordIndex === -1 && timestamps.length > 0 && currentTime < timestamps[0].start) {
        wordIndex = 0;
      }
      
      // CURSOR: Only update state when word index actually changes
      if (wordIndex !== previousWordIndex) {
        previousWordIndex = wordIndex;
        setCurrentWordIndex(wordIndex);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    // Clean up when audio ends or errors
    const cleanup = () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      setCurrentWordIndex(-1);
    };
    
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });
  }, [setCurrentWordIndex]);

  // CURSOR: Stop audio when recording starts
  useEffect(() => {
    if (isRecording && currentlyPlayingId) {
      stopCurrentAudio();
    }
  }, [isRecording, currentlyPlayingId, stopCurrentAudio]);

  // CURSOR: Cleanup audio when component unmounts (user exits chat)
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // CURSOR: Track which message IDs we've already played to prevent double-play
  const playedMessageIds = useRef<Set<string>>(new Set());
  
  // CURSOR: Track currently playing suggestion ID (separate from messages)
  const [playingSuggestionId, setPlayingSuggestionId] = useState<string | null>(null);
  // CURSOR: Store suggestion audio element for control
  const suggestionAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // CURSOR: Custom hint input state (type in mother language, translate to learning language)
  const [customHintInput, setCustomHintInput] = useState('');
  const [isCustomHintTranslating, setIsCustomHintTranslating] = useState(false);
  
  // CURSOR: Hints panel visibility toggle
  const [hintsVisible, setHintsVisible] = useState(false);
  
  // CURSOR: Language name mapping for hint placeholder
  const languageNames: Record<string, string> = {
    en: 'English',
    uk: 'Ukrainian',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    pl: 'Polish',
    ru: 'Russian',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
  };
  
  // CURSOR: Build hint placeholder from language settings
  const hintPlaceholder = `Type in ${languageNames[language.mother] || 'Ukrainian'} to add ${languageNames[language.learning] || 'English'} hint...`;

  // CURSOR: Track pending chat data (not yet saved to DB) for first message send
  const pendingChatRef = useRef<{ chat: any; openingMessage: any } | null>(null);

  // Fetch chat and messages
  useEffect(() => {
    const fetchChat = async () => {
      setLoading(true);
      try {
        // Check for pending chat data in sessionStorage (new chat, not yet persisted)
        const pendingKey = `pendingChat:${chatId}`;
        const pendingData = sessionStorage.getItem(pendingKey);
        
        if (pendingData) {
          const parsed = JSON.parse(pendingData);
          pendingChatRef.current = parsed;
          
          setCurrentChat({
            ...parsed.chat,
            createdAt: new Date(parsed.chat.createdAt),
            updatedAt: new Date(parsed.chat.updatedAt),
          });
          
          // Set the opening message as needing playback
          setMessages([{
            ...parsed.openingMessage,
            createdAt: new Date(parsed.openingMessage.createdAt),
            state: 'audio_loading',
            audioPlayed: false,
          }]);
          
          return;
        }

        const response = await fetch(`/api/chat?id=${chatId}`);
        const data = await response.json();
        
        if (data.chat) {
          // CURSOR: Convert date strings to Date objects from API response
          setCurrentChat({
            ...data.chat,
            createdAt: new Date(data.chat.createdAt),
            updatedAt: new Date(data.chat.updatedAt),
          });
          
          // CURSOR: Check if this is a new chat (only 1 assistant message = opening message)
          const isNewChat = data.messages.length === 1 && 
                           data.messages[0].role === 'assistant';
          
          if (isNewChat) {
            // Mark first message as needing playback
            setMessages(data.messages.map((msg: ChatMessageType) => ({
              ...msg,
              createdAt: new Date(msg.createdAt),
              state: 'audio_loading',
              audioPlayed: false,
            })));
          } else {
            // Existing chat - all messages already played
            setMessages(data.messages.map((msg: ChatMessageType) => ({
              ...msg,
              createdAt: new Date(msg.createdAt),
              state: 'revealed',
              audioPlayed: true,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch chat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId, setCurrentChat, setMessages, setLoading]);

  // CURSOR: Play first message for new chats once TTS is ready
  // During first play: audio plays (text hidden), Whisper runs in background to get timestamps
  useEffect(() => {
    if (messages.length === 0) return;
    
    const firstMessage = messages[0];
    
    // Only play if: assistant message, in audio_loading state, and not already played
    if (firstMessage.role !== 'assistant' || 
        firstMessage.state !== 'audio_loading' ||
        playedMessageIds.current.has(firstMessage.id)) {
      return;
    }
    
    // Mark as played BEFORE async work to prevent double-play
    playedMessageIds.current.add(firstMessage.id);
    
    const playFirstMessage = async () => {
      if (ui.listenFirstMode) {
        // Wait for TTS init to complete
        const ttsReady = ttsInitPromiseRef.current 
          ? await ttsInitPromiseRef.current 
          : false;
        
        if (ttsReady) {
          try {
            // CURSOR: Get audio data (ArrayBuffer) for Whisper analysis
            const audioData = await ttsManager.synthesize(firstMessage.content);
            
            // CURSOR: Create audio element from data
            const blob = new Blob([audioData], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            
            // CURSOR: Store audio ref for pause/resume/stop control
            currentAudioRef.current = audio;
            
            // CURSOR: Apply default speed from settings for first playback
            audio.playbackRate = defaultSpeed;
            
            // CURSOR: No word highlighting during first play (text is hidden anyway)
            // Instead, run Whisper in background to get timestamps for replay
            
            updateMessage(firstMessage.id, { state: 'playing', audioUrl, audioData });
            setCurrentlyPlaying(firstMessage.id);
            setIsPaused(false);
            
            // CURSOR: Run Whisper in background while audio plays
            // This doesn't block playback - timestamps will be ready for replay
            getWordTimestamps(audioData).then((timestamps) => {
              console.log('[Whisper] Got word timestamps:', timestamps.length, 'words');
              updateMessage(firstMessage.id, { wordTimestamps: timestamps });
            }).catch((err) => {
              console.error('[Whisper] Failed to get timestamps:', err);
            });
            
            audio.onended = () => {
              updateMessage(firstMessage.id, { state: 'revealed', audioPlayed: true });
              currentAudioRef.current = null;
              setCurrentlyPlaying(null);
              setIsPaused(false);
              URL.revokeObjectURL(audioUrl);
            };
            
            audio.onerror = () => {
              updateMessage(firstMessage.id, { state: 'revealed', audioPlayed: true });
              currentAudioRef.current = null;
              setCurrentlyPlaying(null);
              setIsPaused(false);
              URL.revokeObjectURL(audioUrl);
            };
            
            await audio.play();
          } catch (err) {
            console.error('First message TTS failed:', err);
            updateMessage(firstMessage.id, { state: 'revealed', audioPlayed: true });
            currentAudioRef.current = null;
            setIsPaused(false);
          }
        } else {
          // TTS not available, just reveal
          updateMessage(firstMessage.id, { state: 'revealed', audioPlayed: true });
        }
      } else {
        // Listen-first mode disabled, just reveal
        updateMessage(firstMessage.id, { state: 'revealed', audioPlayed: true });
      }
    };
    
    playFirstMessage();
  }, [messages, ui.listenFirstMode, defaultSpeed, updateMessage, setCurrentlyPlaying, setIsPaused]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // CURSOR: Play audio for a message (first play - text hidden)
  // Runs Whisper in background to get timestamps for replay
  const playMessageAudio = async (
    messageId: string, 
    content: string, 
    ttsReady?: boolean
  ) => {
    const isTtsAvailable = ttsReady ?? ttsInitialized;
    if (!isTtsAvailable || !content) {
      // If TTS not available, just reveal the message
      updateMessage(messageId, { state: 'revealed', audioPlayed: true });
      return;
    }

    try {
      updateMessage(messageId, { state: 'audio_loading' });
      
      // CURSOR: Get audio data (ArrayBuffer) for Whisper analysis
      const audioData = await ttsManager.synthesize(content);
      
      // CURSOR: Create validated audio element (throws if WAV is malformed)
      const { audio, audioUrl } = await createValidatedAudioElement(audioData);
      
      // CURSOR: Store audio ref for pause/resume/stop control
      currentAudioRef.current = audio;
      
      // CURSOR: Apply default speed from settings for first playback
      audio.playbackRate = defaultSpeed;
      
      // CURSOR: No word highlighting during first play (text is hidden)
      // Whisper runs in background to get timestamps for replay
      
      updateMessage(messageId, { 
        state: 'playing',
        audioUrl,
        audioData,
      });
      setCurrentlyPlaying(messageId);
      setIsPaused(false);

      // CURSOR: Run Whisper in background while audio plays
      getWordTimestamps(audioData).then((timestamps) => {
        console.log('[Whisper] Got word timestamps:', timestamps.length, 'words');
        updateMessage(messageId, { wordTimestamps: timestamps });
      }).catch((err) => {
        console.error('[Whisper] Failed to get timestamps:', err);
      });

      const cleanupAudio = (logPrefix?: string) => {
        if (logPrefix) console.error(logPrefix, audio.error?.message || '');
        updateMessage(messageId, { state: 'revealed', audioPlayed: true });
        currentAudioRef.current = null;
        setCurrentlyPlaying(null);
        setIsPaused(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onended = () => cleanupAudio();
      audio.onerror = () => cleanupAudio('[Audio] Playback error:');
      audio.onabort = () => cleanupAudio('[Audio] Playback aborted.');

      await audio.play();
    } catch (err) {
      console.error('[Audio] TTS failed:', err);
      updateMessage(messageId, { state: 'revealed', audioPlayed: true });
      currentAudioRef.current = null;
      setCurrentlyPlaying(null);
      setIsPaused(false);
    }
  };

  // Handle sending message (text from suggestion, or audio-only from recording)
  const sendMessage = async (text?: string, audio?: { blob: Blob; format: string; sttTranscript?: string }) => {
    if (!text?.trim() && !audio) return;
    if (isSending) return;

    setIsSending(true);
    
    // Clear suggestions and hide hints panel when user sends a message
    clearSuggestions();
    setHintsVisible(false);

    // Add user message immediately (placeholder if audio-only)
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const tempUserMessage: ChatMessageType = {
      id: tempUserMessageId,
      chatId,
      role: 'user',
      content: text || t('chat.processingAudio'),
      state: 'revealed',
      audioBlob: audio?.blob,
      audioFormat: audio?.format,
      audioPlayed: true,
      createdAt: new Date(),
    };
    addMessage(tempUserMessage);

    // Add placeholder for AI response
    const tempAiMessageId = `temp-ai-${Date.now()}`;
    addMessage({
      id: tempAiMessageId,
      chatId,
      role: 'assistant',
      content: '',
      state: 'generating',
      audioPlayed: false,
      createdAt: new Date(),
    });

    try {
      let response: Response;
      if (audio?.blob) {
        const formData = new FormData();
        formData.append('action', 'message');
        formData.append('chatId', chatId);
        if (text) formData.append('content', text);
        // CURSOR: Send Web Speech API transcript as ground truth for transcription
        // gpt-4o-audio-preview hallucinates transcriptions from conversation context
        if (audio.sttTranscript) formData.append('whisperTranscription', audio.sttTranscript);
        formData.append('aiProvider', ai.provider);
        formData.append('aiModel', ai.model);
        formData.append('aiTextModel', ai.textModel);
        formData.append('audioFormat', audio.format);
        formData.append('motherLanguage', language.mother);
        // Include pending chat data if this is the first message
        if (pendingChatRef.current) {
          formData.append('pendingChat', JSON.stringify(pendingChatRef.current.chat));
          formData.append('pendingOpeningMessage', JSON.stringify(pendingChatRef.current.openingMessage));
        }
        formData.append('audio', audio.blob, `recording.${audio.format}`);
        response = await fetch('/api/chat', {
          method: 'POST',
          body: formData,
        });
      } else {
        const messageBody: Record<string, unknown> = {
          action: 'message',
          chatId,
          content: text,
          motherLanguage: language.mother,
          aiProvider: ai.provider,
          aiModel: ai.model,
          aiTextModel: ai.textModel,
        };
        // Include pending chat data if this is the first message
        if (pendingChatRef.current) {
          messageBody.pendingChat = pendingChatRef.current.chat;
          messageBody.pendingOpeningMessage = pendingChatRef.current.openingMessage;
        }
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBody),
        });
      }

      const data = await response.json();

      // Clear pending state after successful first message
      if (pendingChatRef.current) {
        sessionStorage.removeItem(`pendingChat:${chatId}`);
        pendingChatRef.current = null;
      }

      if (data.aiMessage) {
        const realAiMessageId = data.aiMessage.id;
        
        // Update user message with real ID, content (AI transcription), and analysis
        if (data.userMessage) {
          let parsedAnalysis;
          if (data.userMessage.analysis) {
            try {
              parsedAnalysis = JSON.parse(data.userMessage.analysis);
            } catch (e) {
              console.error('Failed to parse analysis:', e);
              parsedAnalysis = {
                grammarScore: 0,
                grammarErrors: [],
                vocabularyScore: 0,
                vocabularySuggestions: [],
                relevanceScore: 0,
                relevanceFeedback: '',
                overallFeedback: 'Failed to get analysis.',
                alternativePhrasings: [],
              };
            }
          } else {
            // Analysis not available
            parsedAnalysis = {
              grammarScore: 0,
              grammarErrors: [],
              vocabularyScore: 0,
              vocabularySuggestions: [],
              relevanceScore: 0,
              relevanceFeedback: '',
              overallFeedback: 'Failed to get analysis.',
              alternativePhrasings: [],
            };
          }
          updateMessage(tempUserMessageId, {
            id: data.userMessage.id,
            content: data.userMessage.content,
            analysis: parsedAnalysis,
          });
          // Auto-show analysis panel for the latest user message
          if (parsedAnalysis) {
            showAnalysisForMessage(data.userMessage.id);
          }
        }

        // CURSOR: Update AI message with real ID and content BEFORE audio playback
        // to avoid race condition where onended callback references old temp ID
        updateMessage(tempAiMessageId, {
          id: realAiMessageId,
          content: data.aiMessage.content,
          createdAt: new Date(data.aiMessage.createdAt),
        });

        // Play audio if listen-first mode is enabled
        if (ui.listenFirstMode) {
          // CURSOR: Show audio loading state while waiting for TTS init
          updateMessage(realAiMessageId, { state: 'audio_loading' });
          
          // CURSOR: Wait for TTS initialization to complete before deciding
          // This ensures first message also plays audio once TTS is ready
          const ttsReady = ttsInitPromiseRef.current 
            ? await ttsInitPromiseRef.current 
            : false;
          
          if (ttsReady) {
            await playMessageAudio(realAiMessageId, data.aiMessage.content, true);
          } else {
            // TTS failed to initialize, reveal the message
            updateMessage(realAiMessageId, { 
              state: 'revealed', 
              audioPlayed: true 
            });
          }
        } else {
          // Listen-first mode disabled, just reveal the message
          updateMessage(realAiMessageId, { 
            state: 'revealed', 
            audioPlayed: true 
          });
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      updateMessage(tempAiMessageId, {
        content: 'Sorry, there was an error. Please try again.',
        state: 'revealed',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle voice recording - called when recording stops with transcript + audio blob
  const handleVoiceSend = useCallback((transcript: string, audioBlob?: Blob, audioFormat?: string) => {
    if (!isSending && audioBlob && audioFormat) {
      sendMessage(undefined, { blob: audioBlob, format: audioFormat, sttTranscript: transcript });
    }
  }, [isSending]);



  // CURSOR: Handle replay - use cached audio and timestamps for precise highlighting
  const handleReplay = useCallback(async (
    messageId: string, 
    content: string, 
    messageSpeed?: number,
    cachedAudioData?: ArrayBuffer,
    cachedTimestamps?: WordTimestamp[]
  ) => {
    if (currentlyPlayingId) return; // Already playing something
    
    try {
      setCurrentlyPlaying(messageId);
      setIsPaused(false);
      
      let audioUrl: string;
      
      // CURSOR: Use cached audio data if available, otherwise regenerate
      if (cachedAudioData) {
        const blob = new Blob([cachedAudioData], { type: 'audio/wav' });
        audioUrl = URL.createObjectURL(blob);
      } else {
        // Check if TTS is available
        const ttsReady = ttsInitPromiseRef.current 
          ? await ttsInitPromiseRef.current 
          : ttsInitialized;
        
        if (!ttsReady || !content) {
          setCurrentlyPlaying(null);
          return;
        }
        
        const audioData = await ttsManager.synthesize(content);
        const blob = new Blob([audioData], { type: 'audio/wav' });
        audioUrl = URL.createObjectURL(blob);
      }
      
      const audio = new Audio(audioUrl);
      
      // CURSOR: Store audio ref for pause/resume/stop control
      currentAudioRef.current = audio;
      
      // CURSOR: Use message's per-message speed if set, otherwise default from settings
      audio.playbackRate = messageSpeed ?? defaultSpeed;
      
      // CURSOR: Set up precise word highlighting using cached timestamps
      if (cachedTimestamps && cachedTimestamps.length > 0) {
        setupPreciseWordHighlighting(audio, cachedTimestamps);
      }
      
      audio.onended = () => {
        currentAudioRef.current = null;
        setCurrentlyPlaying(null);
        setIsPaused(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        currentAudioRef.current = null;
        setCurrentlyPlaying(null);
        setIsPaused(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Replay failed:', err);
      currentAudioRef.current = null;
      setCurrentlyPlaying(null);
      setIsPaused(false);
    }
  }, [currentlyPlayingId, ttsInitialized, defaultSpeed, setCurrentlyPlaying, setIsPaused, setupPreciseWordHighlighting]);

  // CURSOR: Toggle hints panel - if already visible, hide it; if hidden, show it (and fetch if empty)
  const handleToggleHints = useCallback(async () => {
    if (hintsVisible) {
      setHintsVisible(false);
      return;
    }
    setHintsVisible(true);
    // Scroll to hints after they render
    setTimeout(() => {
      hintsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    // Only fetch if no suggestions yet
    if (suggestions.length > 0 || isSuggestionsLoading) return;
    
    setSuggestionsLoading(true);
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          count: 3,
          // CURSOR: Pass text model for suggestions (not audio model)
          aiProvider: ai.provider,
          aiModel: ai.textModel,
          // CURSOR: Pass chat context inline so suggest works for pending chats not yet in DB
          chatContext: {
            topicType: currentChat?.topicType || 'general',
            language: currentChat?.language || language.learning,
            topicDetails: currentChat?.topicDetails,
          },
          recentMessages: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      
      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        const formattedSuggestions: ReplySuggestion[] = data.suggestions.map((content: string, index: number) => ({
          id: `suggestion-${Date.now()}-${index}`,
          content,
          playbackSpeed: defaultSpeed,
        }));
        setSuggestions(formattedSuggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [hintsVisible, suggestions.length, chatId, isSuggestionsLoading, defaultSpeed, setSuggestions, setSuggestionsLoading, ai.provider, ai.textModel, currentChat, language.learning, messages]);

  // CURSOR: Play suggestion audio with TTS
  const handlePlaySuggestion = useCallback(async (suggestion: ReplySuggestion) => {
    if (playingSuggestionId || currentlyPlayingId) return; // Already playing something
    
    try {
      setPlayingSuggestionId(suggestion.id);
      setIsPaused(false);
      
      let audioUrl: string;
      let audioData: ArrayBuffer;
      
      // CURSOR: Use cached audio if available
      if (suggestion.audioData) {
        audioData = suggestion.audioData;
        const blob = new Blob([audioData], { type: 'audio/wav' });
        audioUrl = URL.createObjectURL(blob);
      } else {
        // CURSOR: Generate TTS audio
        const ttsReady = ttsInitPromiseRef.current 
          ? await ttsInitPromiseRef.current 
          : ttsInitialized;
        
        if (!ttsReady) {
          setPlayingSuggestionId(null);
          return;
        }
        
        audioData = await ttsManager.synthesize(suggestion.content);
        const blob = new Blob([audioData], { type: 'audio/wav' });
        audioUrl = URL.createObjectURL(blob);
        
        // CURSOR: Cache the audio data
        updateSuggestion(suggestion.id, { audioData });
      }
      
      const audio = new Audio(audioUrl);
      suggestionAudioRef.current = audio;
      
      // CURSOR: Apply playback speed
      audio.playbackRate = suggestion.playbackSpeed ?? defaultSpeed;
      
      // CURSOR: Run Whisper in background to get timestamps for highlighting
      if (!suggestion.wordTimestamps) {
        getWordTimestamps(audioData).then((timestamps) => {
          updateSuggestion(suggestion.id, { wordTimestamps: timestamps });
          // CURSOR: Set up highlighting if audio is still playing
          if (suggestionAudioRef.current === audio) {
            setupPreciseWordHighlighting(audio, timestamps);
          }
        }).catch((err) => {
          console.error('[Whisper] Failed to get suggestion timestamps:', err);
        });
      } else {
        // CURSOR: Set up highlighting with existing timestamps
        setupPreciseWordHighlighting(audio, suggestion.wordTimestamps);
      }
      
      audio.onended = () => {
        suggestionAudioRef.current = null;
        setPlayingSuggestionId(null);
        setIsPaused(false);
        setCurrentWordIndex(-1);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        suggestionAudioRef.current = null;
        setPlayingSuggestionId(null);
        setIsPaused(false);
        setCurrentWordIndex(-1);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Suggestion playback failed:', err);
      suggestionAudioRef.current = null;
      setPlayingSuggestionId(null);
      setIsPaused(false);
      setCurrentWordIndex(-1);
    }
  }, [playingSuggestionId, currentlyPlayingId, ttsInitialized, defaultSpeed, updateSuggestion, setIsPaused, setCurrentWordIndex, setupPreciseWordHighlighting]);

  // CURSOR: Pause suggestion audio
  const pauseSuggestionAudio = useCallback(() => {
    if (suggestionAudioRef.current && !suggestionAudioRef.current.paused) {
      suggestionAudioRef.current.pause();
      setIsPaused(true);
    }
  }, [setIsPaused]);

  // CURSOR: Resume suggestion audio
  const resumeSuggestionAudio = useCallback(() => {
    if (suggestionAudioRef.current && suggestionAudioRef.current.paused) {
      suggestionAudioRef.current.play().catch(console.error);
      setIsPaused(false);
    }
  }, [setIsPaused]);

  // CURSOR: Stop suggestion audio
  const stopSuggestionAudio = useCallback(() => {
    if (suggestionAudioRef.current) {
      suggestionAudioRef.current.pause();
      suggestionAudioRef.current.currentTime = 0;
      suggestionAudioRef.current = null;
    }
    setPlayingSuggestionId(null);
    setIsPaused(false);
    setCurrentWordIndex(-1);
  }, [setIsPaused, setCurrentWordIndex]);

  // CURSOR: Change suggestion playback speed
  const changeSuggestionSpeed = useCallback((suggestionId: string, speed: number) => {
    const clampedSpeed = Math.max(0.6, Math.min(1.5, speed));
    updateSuggestion(suggestionId, { playbackSpeed: clampedSpeed });
    // CURSOR: Apply immediately if this suggestion is playing
    if (playingSuggestionId === suggestionId && suggestionAudioRef.current) {
      suggestionAudioRef.current.playbackRate = clampedSpeed;
    }
  }, [playingSuggestionId, updateSuggestion]);

  // CURSOR: Translate a suggestion
  const translateSuggestion = useCallback(async (suggestionId: string): Promise<string | null> => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return null;
    
    // CURSOR: Return cached translation
    if (suggestion.translation) return suggestion.translation;
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: suggestion.content,
          targetLanguage: language.mother,
          sourceLanguage: language.learning,
          // CURSOR: Pass AI settings in case rich mode is used
          aiProvider: ai.provider,
          aiModel: ai.textModel,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const translation = data.translation.translatedText;
        updateSuggestion(suggestionId, { translation });
        return translation;
      }
    } catch (err) {
      console.error('Suggestion translation failed:', err);
    }
    
    return null;
  }, [suggestions, language.mother, language.learning, updateSuggestion, ai.provider, ai.textModel]);

  // CURSOR: Use a suggestion - keep only the chosen one, user must speak it themselves
  const useSuggestion = useCallback((suggestionId: string) => {
    // CURSOR: Stop any playing suggestion audio first
    stopSuggestionAudio();
    // CURSOR: Save current suggestions for undo
    const chosenSuggestion = suggestions.find(s => s.id === suggestionId);
    if (chosenSuggestion) {
      // Store current suggestions before filtering
      useChatStore.setState({ previousSuggestions: suggestions });
      setSuggestions([chosenSuggestion]);
    }
  }, [stopSuggestionAudio, suggestions, setSuggestions]);

  // CURSOR: Add a custom hint by translating mother language input to learning language
  const handleAddCustomHint = useCallback(async () => {
    const input = customHintInput.trim();
    if (!input || isCustomHintTranslating) return;

    setIsCustomHintTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input,
          targetLanguage: language.learning, // Translate TO learning language (English)
          sourceLanguage: language.mother,    // FROM mother language (Ukrainian)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const translatedText = data.translation.translatedText;

        const newHint: ReplySuggestion = {
          id: `custom-hint-${Date.now()}`,
          content: translatedText,
          translation: input, // Store original Ukrainian text as translation
          playbackSpeed: defaultSpeed,
        };

        setSuggestions([...suggestions, newHint]);
        setCustomHintInput('');
      }
    } catch (err) {
      console.error('Custom hint translation failed:', err);
    } finally {
      setIsCustomHintTranslating(false);
    }
  }, [customHintInput, isCustomHintTranslating, language.learning, language.mother, defaultSpeed, suggestions, setSuggestions]);

  return (
    <div className="flex h-screen overflow-hidden">
    {/* Main chat column */}
    <div className="flex flex-col flex-1 min-w-0 gradient-bg overflow-hidden">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold line-clamp-1">
              {getDisplayTitle(currentChat, t)}
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentChat?.topicType === 'general' ? `💬 ${t('chat.freeConversation')}` : 
               currentChat?.topicType === 'roleplay' ? `🎭 ${t('chat.roleplay')}` : 
               `📚 ${t('chat.topicDiscussion')}`}
            </p>
          </div>
          {ttsError && (
            <span className="text-xs text-amber-500">⚠️ {t('chat.ttsUnavailable')}</span>
          )}
          <HeaderLanguageSelector className="mr-2" />
          <Button
            variant={analysisPanelOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAnalysisPanelOpen(!analysisPanelOpen)}
            className="text-xs gap-1 shrink-0"
          >
            <AnalysisToggleIcon className="h-4 w-4" />
            {t('chat.analysis')}
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="container mx-auto max-w-2xl space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('chat.startConversation')}
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  isPlaying={currentlyPlayingId === message.id}
                  isPaused={isPaused && currentlyPlayingId === message.id}
                  playbackSpeed={message.playbackSpeed ?? defaultSpeed}
                  highlightedWordIndex={currentlyPlayingId === message.id ? currentWordIndex : -1}
                  onReplay={() => handleReplay(
                    message.id, 
                    message.content, 
                    message.playbackSpeed,
                    message.audioData,
                    message.wordTimestamps
                  )}
                  onPause={pauseCurrentAudio}
                  onResume={resumeCurrentAudio}
                  onStop={stopCurrentAudio}
                  onSpeedChange={(speed) => changePlaybackSpeed(message.id, speed)}
                  className={message.role === 'user' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
                />
              ))}
              
              {/* CURSOR: Render suggestions panel when visible */}
              {hintsVisible && (
                <div ref={hintsRef} className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>{t('chat.replySuggestions')}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  
                  {/* Custom hint input - type in mother language */}
                  <div className="flex items-center gap-1 max-w-[85%] ml-auto">
                    <Input
                      value={customHintInput}
                      onChange={(e) => setCustomHintInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddCustomHint();
                        }
                      }}
                      placeholder={hintPlaceholder}
                      className="h-8 text-xs"
                      disabled={isCustomHintTranslating}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomHint}
                      disabled={isCustomHintTranslating || !customHintInput.trim()}
                      className="text-xs gap-1 shrink-0 h-8"
                    >
                      {isCustomHintTranslating ? (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Add'
                      )}
                    </Button>
                  </div>
                  
                  {isSuggestionsLoading && suggestions.length === 0 && (
                    <div className="flex items-center justify-center py-4">
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-xs text-muted-foreground">Getting suggestions...</span>
                    </div>
                  )}
                  {suggestions.map((suggestion) => (
                    <SuggestionBubble
                      key={suggestion.id}
                      suggestion={suggestion}
                      isPlaying={playingSuggestionId === suggestion.id}
                      isPaused={isPaused && playingSuggestionId === suggestion.id}
                      highlightedWordIndex={playingSuggestionId === suggestion.id ? currentWordIndex : -1}
                      isChosen={suggestions.length === 1}
                      onUse={() => useSuggestion(suggestion.id)}
                      onUndo={undoUseSuggestion}
                      onPlay={handlePlaySuggestion}
                      onPause={pauseSuggestionAudio}
                      onResume={resumeSuggestionAudio}
                      onStop={stopSuggestionAudio}
                      onSpeedChange={changeSuggestionSpeed}
                      onTranslate={translateSuggestion}
                      className="animate-slide-in-right"
                    />
                  ))}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - Voice only, sticky at bottom */}
      <div className="border-t bg-background/80 backdrop-blur-sm p-4 sticky bottom-0 z-10 shrink-0">
        <div className="container mx-auto max-w-2xl">
          {/* CURSOR: Hint toggle button */}
          <div className="flex items-center justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleHints}
              disabled={isSuggestionsLoading && !hintsVisible}
              className="text-xs gap-1 shrink-0 h-8"
            >
              {isSuggestionsLoading && !hintsVisible ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Getting suggestions...
                </>
              ) : hintsVisible ? (
                <>
                  <LightbulbIcon className="h-3 w-3" />
                  Hide hints
                </>
              ) : (
                <>
                  <LightbulbIcon className="h-3 w-3" />
                  {suggestions.length > 0 ? 'Show hints' : 'Need a hint?'}
                </>
              )}
            </Button>
          </div>
          
          <VoiceRecorder
            onSend={handleVoiceSend}
            disabled={isSending}
            language={language.learning}
            dialect={currentChat?.dialect}
          />
        </div>
      </div>
    </div>
    
    {/* Analysis side panel */}
    <AnalysisPanel />
    </div>
  );
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function AnalysisToggleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 7v2" />
      <path d="M12 13h.01" />
    </svg>
  );
}