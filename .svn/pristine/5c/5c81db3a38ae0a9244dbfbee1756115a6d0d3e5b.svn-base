'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SelectableText } from './SelectableText';
import type { ReplySuggestion } from '@/stores/chatStore';

interface SuggestionBubbleProps {
  suggestion: ReplySuggestion;
  isPlaying: boolean;
  isPaused: boolean;
  highlightedWordIndex: number;
  isChosen?: boolean; // CURSOR: True when this is the only remaining suggestion (user chose it)
  onUse: () => void;
  onUndo?: () => void; // CURSOR: Undo "use this" action to show all suggestions again
  onPlay: (suggestion: ReplySuggestion) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpeedChange: (id: string, speed: number) => void;
  onTranslate: (id: string) => Promise<string | null>;
  className?: string;
}

export function SuggestionBubble({
  suggestion,
  isPlaying,
  isPaused,
  highlightedWordIndex,
  isChosen = false,
  onUse,
  onUndo,
  onPlay,
  onPause,
  onResume,
  onStop,
  onSpeedChange,
  onTranslate,
  className = '',
}: SuggestionBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(suggestion.translation || null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const playbackSpeed = suggestion.playbackSpeed ?? 1.0;
  
  // CURSOR: Handle translation toggle
  const handleTranslateClick = useCallback(async () => {
    if (translation) {
      setShowTranslation(!showTranslation);
      return;
    }
    
    setIsTranslating(true);
    try {
      const result = await onTranslate(suggestion.id);
      if (result) {
        setTranslation(result);
        setShowTranslation(true);
      }
    } finally {
      setIsTranslating(false);
    }
  }, [translation, showTranslation, onTranslate, suggestion.id]);
  
  // CURSOR: Render text with word highlighting during playback
  const renderHighlightedText = () => {
    if (highlightedWordIndex < 0 || !suggestion.wordTimestamps) {
      return suggestion.content;
    }
    
    const words = suggestion.content.split(/(\s+)/);
    let wordIdx = 0;
    
    return words.map((part, i) => {
      if (/^\s+$/.test(part)) {
        return <span key={i}>{part}</span>;
      }
      
      const isHighlighted = wordIdx === highlightedWordIndex;
      wordIdx++;
      
      return (
        <span
          key={i}
          className={cn(
            'transition-colors duration-100',
            isHighlighted && 'bg-yellow-300 dark:bg-yellow-600 rounded px-0.5'
          )}
        >
          {part}
        </span>
      );
    });
  };
  
  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%] ml-auto',
        className
      )}
    >
      {/* Suggestion content */}
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            'rounded-tr-none',
            isChosen
              ? 'bg-emerald-200 dark:bg-emerald-800/50 border-2 border-solid border-emerald-500 dark:border-emerald-500'
              : 'bg-emerald-100 dark:bg-emerald-900/40 border-2 border-dashed border-emerald-400 dark:border-emerald-600'
          )}
        >
          {/* Suggestion label */}
          <div className="flex items-center gap-1 mb-1 text-xs text-emerald-700 dark:text-emerald-400">
            <LightbulbIcon className="h-3 w-3" />
            <span>{isChosen ? 'Your chosen reply - now say it!' : 'Suggestion'}</span>
          </div>
          
          {/* Text content */}
          {isPlaying ? (
            <p className="text-sm">
              {renderHighlightedText()}
            </p>
          ) : (
            <SelectableText text={suggestion.content} className="text-sm" />
          )}
          
          {/* Translation */}
          {showTranslation && translation && (
            <div className="mt-2 pt-2 border-t border-emerald-300 dark:border-emerald-600">
              <p className="text-sm opacity-80 italic">{translation}</p>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Playback controls */}
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
                  Resume
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPause}
                  className="text-xs gap-1"
                >
                  <PauseIcon className="h-3 w-3" />
                  Pause
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="text-xs gap-1"
              >
                <StopIcon className="h-3 w-3" />
                Stop
              </Button>
              {/* Speed control */}
              <select
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(suggestion.id, parseFloat(e.target.value))}
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
                onClick={() => onPlay(suggestion)}
                className="text-xs gap-1"
              >
                <PlayIcon className="h-3 w-3" />
                Play
              </Button>
              {/* Speed selector when not playing */}
              <select
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(suggestion.id, parseFloat(e.target.value))}
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
          
          {/* Translate button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTranslateClick}
            disabled={isTranslating}
            className="text-xs"
          >
            {isTranslating ? 'Translating...' : showTranslation ? 'Hide Translation' : 'Translate'}
          </Button>
          
          {/* Undo button - show when chosen */}
          {isChosen && onUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              className="text-xs gap-1 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              <UndoIcon className="h-3 w-3" />
              Undo
            </Button>
          )}
          
          {/* Use suggestion button - hide when already chosen */}
          {!isChosen && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUse}
              className="text-xs gap-1 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            >
              <CheckIcon className="h-3 w-3" />
              Use This
            </Button>
          )}
        </div>
      </div>
      
      {/* Suggestion avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0 bg-emerald-500"
      >
        <LightbulbIcon className="h-4 w-4" />
      </div>
    </div>
  );
}

// Icons
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

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
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
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}
