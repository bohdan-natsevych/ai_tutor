'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SelectableText } from './SelectableText';
import type { ChatMessage } from '@/stores/chatStore';
import { useChatStore } from '@/stores/chatStore';

import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface ChatMessageProps {
  message: ChatMessage;
  onReplay?: () => void;  // CURSOR: Regenerate and play audio
  onPause?: () => void;   // CURSOR: Pause currently playing audio
  onResume?: () => void;  // CURSOR: Resume paused audio
  onStop?: () => void;    // CURSOR: Stop and reset audio
  onSpeedChange?: (speed: number) => void; // CURSOR: Change playback speed
  isPlaying?: boolean;
  isPaused?: boolean;
  playbackSpeed?: number;
  highlightedWordIndex?: number; // CURSOR: Index of word to highlight during TTS playback
  className?: string;
}

export function ChatMessageBubble({
  message,
  onReplay,
  onPause,
  onResume,
  onStop,
  onSpeedChange,
  isPlaying = false,
  isPaused = false,
  playbackSpeed = 1.0,
  highlightedWordIndex = -1,
  className = '',
}: ChatMessageProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [fullTranslation, setFullTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // CURSOR: Play user's recorded audio
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // CURSOR: Use selector for better performance
  const ui = useSettingsStore((state) => state.ui);
  const language = useSettingsStore((state) => state.language);
  const showAnalysisForMessage = useChatStore((state) => state.showAnalysisForMessage);

  const analysisPanelMessageId = useChatStore((state) => state.analysisPanelMessageId);
  const { t, lang } = useTranslation();
  
  const isUser = message.role === 'user';
  const isHidden = ui.listenFirstMode && 
    message.role === 'assistant' && 
    message.state === 'playing' && 
    !message.audioPlayed;

  // Determine what to show based on state
  const showLoader = message.state === 'generating' || message.state === 'audio_loading';
  const showContent = !isHidden && (message.state === 'revealed' || isUser);
  const showPlayButton = message.role === 'assistant' && 
    (message.state === 'revealed' || message.audioPlayed);

  // CURSOR: Cleanup user audio on unmount
  useEffect(() => {
    return () => {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
    };
  }, []);

  // CURSOR: Play the user's recorded audio blob
  const handlePlayUserAudio = () => {
    if (isPlayingUserAudio) {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        userAudioRef.current = null;
      }
      setIsPlayingUserAudio(false);
      return;
    }

    if (!message.audioBlob) return;

    const audioUrl = URL.createObjectURL(message.audioBlob);
    const audio = new Audio(audioUrl);
    userAudioRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (userAudioRef.current === audio) userAudioRef.current = null;
      setIsPlayingUserAudio(false);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      if (userAudioRef.current === audio) userAudioRef.current = null;
      setIsPlayingUserAudio(false);
    };
    setIsPlayingUserAudio(true);
    audio.play();
  };

  // CURSOR: Fetch full message translation
  const handleTranslateMessage = async () => {
    if (fullTranslation) {
      setShowTranslation(!showTranslation);
      return;
    }
    
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.content,
          targetLanguage: language.mother,
          sourceLanguage: language.learning,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFullTranslation(data.translation.translatedText);
        setShowTranslation(true);
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0',
          isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-violet-500 to-purple-600'
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Message content */}
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            isUser
              ? 'bg-blue-500 text-white rounded-tr-none'
              : 'bg-muted rounded-tl-none'
          )}
        >
          {showLoader ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm opacity-70">
                {message.state === 'generating' ? t('chat.msg.thinking') : t('chat.msg.preparingAudio')}
              </span>
            </div>
          ) : isHidden ? (
            <div className="flex items-center gap-2">
              <WaveformIcon className="w-5 h-5 animate-pulse" />
              <span className="text-sm">{t('chat.msg.listen')}</span>
            </div>
          ) : showContent ? (
            <>
              <SelectableText 
                text={message.content} 
                chatId={message.chatId}
                highlightedWordIndex={isPlaying ? highlightedWordIndex : -1}
              />
              {/* Full translation toggle */}
              {showTranslation && fullTranslation && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <p className="text-sm opacity-80 italic">{fullTranslation}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* CURSOR: Play recorded audio for user messages */}
          {isUser && message.audioBlob && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayUserAudio}
              className="text-xs gap-1 min-w-[120px]"
            >
              {isPlayingUserAudio ? (
                <><StopIcon className="h-3 w-3" /> {t('chat.msg.stopRecording')}</>
              ) : (
                <><PlayIcon className="h-3 w-3" /> {t('chat.msg.playRecording')}</>
              )}
            </Button>
          )}
          
          {/* Playback controls for AI messages */}
          {message.role === 'assistant' && showPlayButton && (
            <div className="flex items-center gap-1">
              {/* Play/Pause/Resume button */}
              {isPlaying ? (
                <>
                  {isPaused ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onResume}
                      className="text-xs gap-1"
                    >
                      <PlayIcon className="h-3 w-3" />
                      {t('chat.msg.resume')}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onPause}
                      className="text-xs gap-1"
                    >
                      <PauseIcon className="h-3 w-3" />
                      {t('chat.msg.pause')}
                    </Button>
                  )}
                  {/* Stop button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onStop}
                    className="text-xs gap-1"
                  >
                    <StopIcon className="h-3 w-3" />
                    {t('chat.msg.stop')}
                  </Button>
                  {/* Speed control during playback */}
                  <select
                    value={playbackSpeed}
                    onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
                    className="h-7 text-xs bg-transparent border rounded px-1 cursor-pointer"
                    title="Playback speed"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.6">0.6x</option>
                    <option value="0.65">0.65x</option>
                    <option value="0.7">0.7x</option>
                    <option value="0.75">0.75x</option>
                    <option value="0.8">0.8x</option>
                    <option value="0.85">0.85x</option>
                    <option value="0.9">0.9x</option>
                    <option value="1">1x</option>
                    <option value="1.1">1.1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReplay}
                    className="text-xs gap-1"
                  >
                    <PlayIcon className="h-3 w-3" />
                    {t('chat.msg.replay')}
                  </Button>
                  {/* Speed selector when not playing */}
                  <select
                    value={playbackSpeed}
                    onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
                    className="h-7 text-xs bg-transparent border rounded px-1 cursor-pointer"
                    title="Playback speed"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.6">0.6x</option>
                    <option value="0.65">0.65x</option>
                    <option value="0.7">0.7x</option>
                    <option value="0.75">0.75x</option>
                    <option value="0.8">0.8x</option>
                    <option value="0.85">0.85x</option>
                    <option value="0.9">0.9x</option>
                    <option value="1">1x</option>
                    <option value="1.1">1.1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </>
              )}
            </div>
          )}

          {/* Translate button - available for all revealed messages */}
          {showContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTranslateMessage}
              disabled={isTranslating}
              className="text-xs"
            >
              {isTranslating ? t('chat.msg.translating') : showTranslation ? t('chat.msg.hideTranslation') : t('chat.msg.translate')}
            </Button>
          )}

          {/* Analyze button for user messages */}
          {isUser && message.state === 'revealed' && message.analysis && (
            <Button
              variant={analysisPanelMessageId === message.id ? 'default' : 'ghost'}
              size="sm"
              className={analysisPanelMessageId === message.id ? 'text-xs ring-2 ring-primary/30' : 'text-xs'}
              onClick={() => showAnalysisForMessage(message.id)}
            >
              {t('chat.msg.analyze')}
            </Button>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {formatTime(message.createdAt, lang)}
        </span>
      </div>
    </div>
  );
}

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

function WaveformIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 3v18m-4-6v6m8-14v14M4 10v4m16-6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}
