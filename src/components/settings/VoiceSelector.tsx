'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { ttsManager } from '@/lib/tts/manager';

const TTS_PROVIDERS = [
  { id: 'kokoro', name: 'Kokoro TTS', description: 'High-quality local TTS (WebGPU)', type: 'local' },
  { id: 'web-speech', name: 'Web Speech', description: 'Browser built-in (fallback)', type: 'local' },
  { id: 'openai-tts', name: 'OpenAI TTS', description: 'Cloud-based, natural voices (~$15/1M chars)', type: 'cloud' },
];

const VOICES: Record<string, Array<{ id: string; name: string; gender: string }>> = {
  kokoro: [
    // American English voices - Female
    { id: 'af_heart', name: 'Heart', gender: 'Female (American)' },
    { id: 'af_bella', name: 'Bella', gender: 'Female (American)' },
    { id: 'af_nicole', name: 'Nicole', gender: 'Female (American)' },
    { id: 'af_aoede', name: 'Aoede', gender: 'Female (American)' },
    { id: 'af_kore', name: 'Kore', gender: 'Female (American)' },
    { id: 'af_sarah', name: 'Sarah', gender: 'Female (American)' },
    { id: 'af_nova', name: 'Nova', gender: 'Female (American)' },
    { id: 'af_sky', name: 'Sky', gender: 'Female (American)' },
    { id: 'af_alloy', name: 'Alloy', gender: 'Female (American)' },
    { id: 'af_jessica', name: 'Jessica', gender: 'Female (American)' },
    { id: 'af_river', name: 'River', gender: 'Female (American)' },
    // American English voices - Male
    { id: 'am_adam', name: 'Adam', gender: 'Male (American)' },
    { id: 'am_michael', name: 'Michael', gender: 'Male (American)' },
    { id: 'am_fenrir', name: 'Fenrir', gender: 'Male (American)' },
    { id: 'am_puck', name: 'Puck', gender: 'Male (American)' },
    { id: 'am_echo', name: 'Echo', gender: 'Male (American)' },
    { id: 'am_eric', name: 'Eric', gender: 'Male (American)' },
    { id: 'am_liam', name: 'Liam', gender: 'Male (American)' },
    { id: 'am_onyx', name: 'Onyx', gender: 'Male (American)' },
    // British English voices - Female
    { id: 'bf_emma', name: 'Emma', gender: 'Female (British)' },
    { id: 'bf_alice', name: 'Alice', gender: 'Female (British)' },
    { id: 'bf_isabella', name: 'Isabella', gender: 'Female (British)' },
    { id: 'bf_lily', name: 'Lily', gender: 'Female (British)' },
    // British English voices - Male
    { id: 'bm_george', name: 'George', gender: 'Male (British)' },
    { id: 'bm_daniel', name: 'Daniel', gender: 'Male (British)' },
    { id: 'bm_fable', name: 'Fable', gender: 'Male (British)' },
    { id: 'bm_lewis', name: 'Lewis', gender: 'Male (British)' },
  ],
  'web-speech': [
    { id: 'default', name: 'Default', gender: 'System voice' },
  ],
  'openai-tts': [
    { id: 'alloy', name: 'Alloy', gender: 'Neutral' },
    { id: 'echo', name: 'Echo', gender: 'Male' },
    { id: 'fable', name: 'Fable', gender: 'Neutral' },
    { id: 'onyx', name: 'Onyx', gender: 'Male' },
    { id: 'nova', name: 'Nova', gender: 'Female' },
    { id: 'shimmer', name: 'Shimmer', gender: 'Female' },
  ],
};

export function VoiceSelector() {
  const { tts, language, setTTSSettings } = useSettingsStore();
  
  // Filter voices by dialect for Kokoro provider
  const allVoices = VOICES[tts.provider] || [];
  const voices = tts.provider === 'kokoro' 
    ? allVoices.filter(voice => {
        const dialectMatch = language.dialect === 'american' 
          ? voice.id.startsWith('am_') || voice.id.startsWith('af_')
          : voice.id.startsWith('bm_') || voice.id.startsWith('bf_');
        return dialectMatch;
      })
    : allVoices;
  
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play voice preview
  const handlePreviewVoice = async () => {
    if (isPlayingPreview) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    try {
      await ttsManager.initialize(tts.provider);
      ttsManager.setVoice(tts.voice);
      ttsManager.setSpeed(tts.speed);
      
      const sampleText = "Hello! This is how I sound. Nice to meet you!";
      const audioData = await ttsManager.synthesize(sampleText);
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        setIsPlayingPreview(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        setIsPlayingPreview(false);
      };
      await audio.play();
    } catch (err) {
      console.error('Preview playback failed:', err);
      setIsPlayingPreview(false);
    }
  };

  // Track whether voice change was user-initiated (not from page load / dialect switch)
  const userChangedVoiceRef = useRef(false);

  // Play preview only when user explicitly changes voice via dropdown
  useEffect(() => {
    if (!userChangedVoiceRef.current) return;
    userChangedVoiceRef.current = false;
    handlePreviewVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.voice]);

  // Auto-select appropriate voice when dialect changes
  useEffect(() => {
    if (tts.provider !== 'kokoro') return;
    
    // Check if current voice matches the dialect
    const currentVoiceMatchesDialect = voices.some(v => v.id === tts.voice);
    
    if (!currentVoiceMatchesDialect && voices.length > 0) {
      // Switch to first voice of matching dialect
      setTTSSettings({ voice: voices[0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language.dialect, tts.provider]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Settings</CardTitle>
        <CardDescription>
          Configure text-to-speech for AI responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TTS Provider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">TTS Provider</label>
          <Select
            value={tts.provider}
            onValueChange={(value) => {
              setTTSSettings({ provider: value });
              // Reset voice when provider changes - respect dialect filtering
              const allProviderVoices = VOICES[value] || [];
              const filteredVoices = value === 'kokoro'
                ? allProviderVoices.filter(voice => {
                    const dialectMatch = language.dialect === 'american' 
                      ? voice.id.startsWith('am_') || voice.id.startsWith('af_')
                      : voice.id.startsWith('bm_') || voice.id.startsWith('bf_');
                    return dialectMatch;
                  })
                : allProviderVoices;
              
              if (filteredVoices.length > 0) {
                setTTSSettings({ voice: filteredVoices[0].id });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select TTS provider" />
            </SelectTrigger>
            <SelectContent>
              {TTS_PROVIDERS.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex flex-col">
                    <span>{provider.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {provider.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice selection */}
        {voices.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Voice</label>
            <div className="flex gap-2">
              <Select
                value={tts.voice}
                onValueChange={(value) => {
                  userChangedVoiceRef.current = true;
                  setTTSSettings({ voice: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <span className="flex items-center gap-2">
                        <span>{voice.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({voice.gender})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewVoice}
                disabled={isPlayingPreview}
                className="shrink-0"
              >
                {isPlayingPreview ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Playing...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <PlayIcon className="h-4 w-4" />
                    Test
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Speech speed */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <label className="text-sm font-medium">Speech Speed</label>
            <span className="text-sm text-muted-foreground">{tts.speed.toFixed(2)}x</span>
          </div>
          <Slider
            value={[tts.speed]}
            min={0.5}
            max={1.5}
            step={0.05}
            onValueChange={([value]) => setTTSSettings({ speed: value })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Slower (0.5x)</span>
            <span>Faster (1.5x)</span>
          </div>
        </div>
      </CardContent>
    </Card>
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
