'use client';

import { useEffect } from 'react';
import { preloadWhisper } from '@/lib/whisper/wordTiming';

// CURSOR: Preloads Whisper model on app startup
// This ensures the ~40MB model is downloaded early, before user needs it
export function WhisperPreloader() {
  useEffect(() => {
    // Small delay to not block initial render
    const timer = setTimeout(() => {
      preloadWhisper();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
}
