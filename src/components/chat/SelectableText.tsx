'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TranslationPopup } from './TranslationPopup';
import { Button } from '@/components/ui/button';
import { ttsManager } from '@/lib/tts/manager';
import { Play, Square, Languages } from 'lucide-react';

// CURSOR: SelectableText - Allows users to select words/phrases for translation
// Wraps message content and handles text selection
// Also supports word highlighting during TTS playback

interface SelectableTextProps {
  text: string;
  chatId?: string;
  className?: string;
  highlightedWordIndex?: number; // CURSOR: Index of word to highlight during TTS playback (-1 = none)
}

export function SelectableText({ text, chatId, className = '', highlightedWordIndex = -1 }: SelectableTextProps) {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // CURSOR: Parse text into tokens (words and whitespace/punctuation) for highlighting
  // We preserve whitespace and punctuation to maintain original formatting
  const tokens = useMemo(() => {
    return parseTextIntoTokens(text);
  }, [text]);

  const handlePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    if (!selectedText) return;

    setIsPlaying(true);
    try {
      const audio = await ttsManager.createAudioElement(selectedText);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      
      await audio.play();
    } catch (err) {
      console.error('TTS playback failed:', err);
      setIsPlaying(false);
    }
  };

  // CURSOR: Listen for mousedown outside to dismiss the translate button
  useEffect(() => {
    if (!selectedText) return;

    const handleDocumentMouseDown = (e: MouseEvent) => {
      // Don't dismiss if the popover is open (user is interacting with translation)
      if (popoverOpen) return;
      // Don't dismiss if clicking on the menu itself
      if (menuRef.current?.contains(e.target as Node)) return;
      // Don't dismiss if selecting within this component
      if (containerRef.current?.contains(e.target as Node)) return;

      // Stop audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsPlaying(false);
      }

      setSelectedText(null);
      setPopoverPosition(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [selectedText, popoverOpen]);

  // CURSOR: Listen for selectionchange to dismiss when selection is cleared
  useEffect(() => {
    if (!selectedText) return;

    const handleSelectionChange = () => {
      if (popoverOpen) return;
      const selection = window.getSelection();
      if (!selection?.toString().trim()) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
          setIsPlaying(false);
        }
        setSelectedText(null);
        setPopoverPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [selectedText, popoverOpen]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();
    
    if (selected && selected.length > 0 && selected.length < 200) {
      setSelectedText(selected);
      
      // Get selection position for popover
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setPopoverPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
    }
  }, []);

  // CURSOR: Render text with word highlighting for TTS playback
  const renderHighlightedText = () => {
    if (highlightedWordIndex < 0) {
      // No highlighting, render plain text
      return text;
    }

    let wordCount = 0;
    return tokens.map((token, index) => {
      if (token.isWord) {
        const isHighlighted = wordCount === highlightedWordIndex;
        wordCount++;
        return (
          <span
            key={index}
            className={isHighlighted ? 'bg-yellow-300 dark:bg-yellow-600 rounded px-0.5 transition-colors duration-150' : ''}
          >
            {token.text}
          </span>
        );
      }
      // Whitespace/punctuation - render as-is
      return <span key={index}>{token.text}</span>;
    });
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <p 
        className="whitespace-pre-wrap cursor-text select-text"
        onMouseUp={handleMouseUp}
      >
        {renderHighlightedText()}
      </p>
      
      {/* Selection action menu */}
      {selectedText && popoverPosition && (
        <div 
          ref={menuRef}
          className="fixed z-50 flex items-center gap-1 p-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            left: popoverPosition.x, 
            top: popoverPosition.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={handlePlay}
            title={isPlaying ? "Stop" : "Read Aloud"}
          >
            {isPlaying ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>

          <div className="w-[1px] h-4 bg-border mx-0.5" />

          <TranslationPopup 
            text={selectedText} 
            chatId={chatId}
            onOpenChange={(open) => {
              setPopoverOpen(open);
              if (open && isPlaying) {
                // Stop audio when opening translation to avoid overlay
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current = null;
                  setIsPlaying(false);
                }
              }
            }}
            onSaveToVocabulary={() => {
              setSelectedText(null);
              setPopoverPosition(null);
            }}
          >
            <Button 
              size="sm"
              variant="secondary"
              className="h-8 gap-2 px-2"
              title="Translate"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium">Translate</span>
            </Button>
          </TranslationPopup>
        </div>
      )}
    </div>
  );
}

// CURSOR: Token type for text parsing
interface TextToken {
  text: string;
  isWord: boolean;
}

// CURSOR: Parse text into tokens (words vs whitespace/punctuation)
// This allows us to highlight individual words while preserving formatting
function parseTextIntoTokens(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  // Match sequences of word characters OR sequences of non-word characters
  const regex = /(\S+)|(\s+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // Non-whitespace token - could be word or punctuation
      tokens.push({ text: match[1], isWord: true });
    } else if (match[2]) {
      // Whitespace token
      tokens.push({ text: match[2], isWord: false });
    }
  }
  
  return tokens;
}

// CURSOR: Utility function to count words in text (exported for use in timing calculation)
export function countWords(text: string): number {
  const tokens = parseTextIntoTokens(text);
  return tokens.filter(t => t.isWord).length;
}
