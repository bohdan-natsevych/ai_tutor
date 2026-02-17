'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  audioUrl?: string;
  audioData?: ArrayBuffer;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

export function AudioPlayer({
  audioUrl,
  audioData,
  onPlayStart,
  onPlayEnd,
  autoPlay = false,
  showControls = true,
  className = '',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create audio element from data
  useEffect(() => {
    if (audioData) {
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
      }
      
      return () => URL.revokeObjectURL(url);
    } else if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
    }
  }, [audioData, audioUrl]);

  // Auto-play when requested
  useEffect(() => {
    if (autoPlay && audioRef.current && (audioUrl || audioData)) {
      audioRef.current.play().catch(console.error);
    }
  }, [autoPlay, audioUrl, audioData]);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    onPlayEnd?.();
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setProgress(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio
        ref={audioRef}
        onPlay={() => {
          setIsPlaying(true);
          onPlayStart?.();
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      {showControls && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={isPlaying ? handlePause : handlePlay}
            className="h-8 w-8 rounded-full"
          >
            {isPlaying ? (
              <PauseIcon className="h-4 w-4" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1 flex items-center gap-2">
            <Slider
              value={[progress]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Icons
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
