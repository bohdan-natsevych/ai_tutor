'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chatStore';
import { sttManager } from '@/lib/stt/manager';

interface VoiceRecorderProps {
  // CURSOR: Sends transcript (from Web Speech API) + raw audio blob
  onSend: (transcript: string, audioBlob?: Blob, audioFormat?: string) => void;
  disabled?: boolean;
  language?: string;
  dialect?: string;
  className?: string;
}

export function VoiceRecorder({
  onSend,
  disabled = false,
  language = 'en',
  dialect = 'american',
  className = '',
}: VoiceRecorderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRecording = useChatStore((state) => state.isRecording);
  const transcript = useChatStore((state) => state.transcript);
  const setRecording = useChatStore((state) => state.setRecording);
  const setTranscript = useChatStore((state) => state.setTranscript);

  // CURSOR: Track accumulated transcript from all segments
  const accumulatedTranscriptRef = useRef('');
  const currentInterimRef = useRef('');
  const pendingSendRef = useRef(false);
  const sttDoneRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioMimeTypeRef = useRef<string>('audio/webm');
  const audioFormatRef = useRef<string>('webm');
  const audioBlobRef = useRef<Blob | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const getAudioFormat = (mimeType: string): string => {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    return 'webm';
  };

  const selectMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const cleanupAudioStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  const resetAudioRecording = () => {
    audioChunksRef.current = [];
    audioBlobRef.current = null;
    audioFormatRef.current = 'webm';
  };

  const trySend = () => {
    if (!pendingSendRef.current) return;
    if (!audioBlobRef.current) return;
    if (!sttDoneRef.current) return;
    const finalTranscript = finalTranscriptRef.current.trim();
    pendingSendRef.current = false;
    if (!finalTranscript) {
      resetAudioRecording();
      return;
    }
    onSend(finalTranscript, audioBlobRef.current, audioFormatRef.current);
    resetAudioRecording();
    accumulatedTranscriptRef.current = '';
    currentInterimRef.current = '';
    finalTranscriptRef.current = '';
    setTranscript('');
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      resetAudioRecording();
      const mimeType = selectMimeType();
      audioMimeTypeRef.current = mimeType || 'audio/webm';
      audioFormatRef.current = getAudioFormat(audioMimeTypeRef.current);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        audioBlobRef.current = new Blob(audioChunksRef.current, { type: audioMimeTypeRef.current });
        cleanupAudioStream();
        trySend();
      };
      recorder.onerror = () => {
        cleanupAudioStream();
        setError('Recording failed');
        pendingSendRef.current = false;
      };
      recorder.start();
    } catch {
      cleanupAudioStream();
      sttManager.stopListening();
      setRecording(false);
      setError('Failed to access microphone');
    }
  };

  // Initialize STT
  useEffect(() => {
    const init = async () => {
      try {
        await sttManager.initialize();
        setIsInitialized(true);
      } catch (e) {
        setError('Failed to initialize speech recognition');
        console.error(e);
      }
    };
    init();
  }, []);

  // Set up event handlers
  useEffect(() => {
    if (!isInitialized) return;

    sttManager.onResult = (result) => {
      if (result.isFinal) {
        accumulatedTranscriptRef.current += result.transcript + ' ';
        currentInterimRef.current = '';
        if (pendingSendRef.current) {
          finalTranscriptRef.current = accumulatedTranscriptRef.current.trim();
          trySend();
        }
      } else {
        currentInterimRef.current = result.transcript;
      }
      const fullTranscript = (accumulatedTranscriptRef.current + currentInterimRef.current).trim();
      setTranscript(fullTranscript);
    };

    sttManager.onError = (err) => {
      setError(err.message);
      setRecording(false);
      pendingSendRef.current = false;
    };

    sttManager.onEnd = () => {
      sttDoneRef.current = true;
      if (pendingSendRef.current) {
        finalTranscriptRef.current = (accumulatedTranscriptRef.current + currentInterimRef.current).trim();
        trySend();
      }
    };

    return () => {
      sttManager.onResult = null;
      sttManager.onError = null;
      sttManager.onStart = null;
      sttManager.onEnd = null;
    };
  }, [isInitialized, setRecording, setTranscript, onSend]);

  const startRecording = useCallback(() => {
    setError(null);
    accumulatedTranscriptRef.current = '';
    currentInterimRef.current = '';
    finalTranscriptRef.current = '';
    setTranscript('');
    pendingSendRef.current = false;
    sttDoneRef.current = false;
    setRecording(true);
    void startAudioCapture();
    sttManager.startListening({ language, dialect });
  }, [language, dialect, setRecording, setTranscript]);

  const stopRecording = useCallback(() => {
    setRecording(false);
    pendingSendRef.current = true;
    sttManager.stopListening();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Fallback timeout - if STT onEnd hasn't fired after 5s, force send
    setTimeout(() => {
      if (pendingSendRef.current) {
        sttDoneRef.current = true;
        finalTranscriptRef.current = (accumulatedTranscriptRef.current + currentInterimRef.current).trim();
        trySend();
      }
    }, 5000);
  }, [setRecording]);

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-destructive text-sm ${className}`}>
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={() => setError(null)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {isRecording && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse shrink-0" />
          <span className="text-sm flex-1 line-clamp-2 break-words">
            {transcript || 'Listening...'}
          </span>
        </div>
      )}

      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!isInitialized || disabled}
        variant={isRecording ? 'destructive' : 'default'}
        size="lg"
        className="w-full gap-2"
      >
        {isRecording ? (
          <>
            <StopIcon className="h-5 w-5" />
            Stop Recording
          </>
        ) : (
          <>
            <MicIcon className="h-5 w-5" />
            Start Recording
          </>
        )}
      </Button>
    </div>
  );
}

// Icons
function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
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
