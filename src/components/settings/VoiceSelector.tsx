'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settingsStore';
import { ttsManager } from '@/lib/tts/manager';
import { useTranslation } from '@/lib/i18n/useTranslation';

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
  'kokoro_mix': [ // Internal use for mixing
  ]
};

// Add non-English voices to Kokoro
const KOKORO_VOICES = VOICES['kokoro'];
// Japanese
KOKORO_VOICES.push(
  { id: 'jf_alpha', name: 'Alpha', gender: 'Female (Japanese)' },
  { id: 'jf_gongitsune', name: 'Gongitsune', gender: 'Female (Japanese)' },
  { id: 'jf_nezumi', name: 'Nezumi', gender: 'Female (Japanese)' },
  { id: 'jf_tebukuro', name: 'Tebukuro', gender: 'Female (Japanese)' }
);
// Mandarin
KOKORO_VOICES.push(
  { id: 'zf_xiaobei', name: 'Xiaobei', gender: 'Female (Chinese)' },
  { id: 'zf_xiaomi', name: 'Xiaomi', gender: 'Female (Chinese)' },
  { id: 'zf_xiaoxiao', name: 'Xiaoxiao', gender: 'Female (Chinese)' },
  { id: 'zf_xiaoyi', name: 'Xiaoyi', gender: 'Female (Chinese)' },
  { id: 'zm_yunjian', name: 'Yunjian', gender: 'Male (Chinese)' },
  { id: 'zm_yunxi', name: 'Yunxi', gender: 'Male (Chinese)' },
  { id: 'zm_yunxia', name: 'Yunxia', gender: 'Male (Chinese)' },
  { id: 'zm_yunyang', name: 'Yunyang', gender: 'Male (Chinese)' }
);
// French
KOKORO_VOICES.push(
  { id: 'ff_siwis', name: 'Siwis', gender: 'Female (French)' }
);
// Spanish
KOKORO_VOICES.push(
  { id: 'ef_dora', name: 'Dora', gender: 'Female (Spanish)' },
  { id: 'em_alex', name: 'Alex', gender: 'Male (Spanish)' },
  { id: 'em_santa', name: 'Santa', gender: 'Male (Spanish)' }
);
// Italian
KOKORO_VOICES.push(
  { id: 'if_sara', name: 'Sara', gender: 'Female (Italian)' },
  { id: 'im_nicola', name: 'Nicola', gender: 'Male (Italian)' }
);
// Portuguese
KOKORO_VOICES.push(
  { id: 'pf_dora', name: 'Dora', gender: 'Female (Portuguese)' },
  { id: 'pm_alex', name: 'Alex', gender: 'Male (Portuguese)' },
  { id: 'pm_santa', name: 'Santa', gender: 'Male (Portuguese)' }
);

export function VoiceSelector() {
  const { tts, language, setTTSSettings } = useSettingsStore();
  const { t } = useTranslation();
  
  // Filter voices by language and dialect for Kokoro provider
  const allVoices = VOICES[tts.provider] || [];
  const voices = tts.provider === 'kokoro' 
    ? allVoices.filter(voice => {
        // English
        if (language.learning === 'en') {
          const dialectMatch = language.dialect === 'american' 
            ? voice.id.startsWith('am_') || voice.id.startsWith('af_')
            : voice.id.startsWith('bm_') || voice.id.startsWith('bf_');
          return dialectMatch;
        }
        
        // Other languages - map based on prefix
        // ja -> j, zh -> z, fr -> f, es -> e, it -> i, pt -> p
        const prefixMap: Record<string, string> = {
          'ja': 'j',
          'zh': 'z',
          'fr': 'f',
          'es': 'e',
          'it': 'i',
          'pt': 'p',
        };
        
        const prefix = prefixMap[language.learning];
        if (prefix) {
          return voice.id.startsWith(prefix);
        }
        
        // No fallback for unsupported languages - return nothing so user knows it's not supported
        return false;
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
  }, [language.dialect, language.learning, tts.provider]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.voice.title')}</CardTitle>
        <CardDescription>
          {t('settings.voice.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TTS Provider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.voice.provider')}</label>
          <Select
            value={tts.provider}
            onValueChange={(value) => {
              setTTSSettings({ provider: value });
              // Reset voice when provider changes - respect dialect filtering
              const allProviderVoices = VOICES[value] || [];
              const filteredVoices = value === 'kokoro'
                ? allProviderVoices.filter(voice => {
                    // Replicate filtering logic (this logic is duplicated, ideally should be a function)
                    // English
                    if (language.learning === 'en') {
                      const dialectMatch = language.dialect === 'american' 
                        ? voice.id.startsWith('am_') || voice.id.startsWith('af_')
                        : voice.id.startsWith('bm_') || voice.id.startsWith('bf_');
                      return dialectMatch;
                    }
                    
                    const prefixMap: Record<string, string> = {
                      'ja': 'j',
                      'zh': 'z',
                      'fr': 'f',
                      'es': 'e',
                      'it': 'i',
                      'pt': 'p',
                    };
                    const prefix = prefixMap[language.learning];
                    if (prefix) return voice.id.startsWith(prefix);
                    return false;
                  })
                : allProviderVoices;
              
              if (filteredVoices.length > 0) {
                setTTSSettings({ voice: filteredVoices[0].id });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.voice.selectProvider')} />
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
        {voices.length > 0 ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.voice.voice')}</label>
            <div className="flex gap-2">
              <Select
                value={tts.voice}
                onValueChange={(value) => {
                  userChangedVoiceRef.current = true;
                  setTTSSettings({ voice: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.voice.selectVoice')} />
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
                    {t('settings.voice.playing')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <PlayIcon className="h-4 w-4" />
                    {t('settings.voice.test')}
                  </span>
                )}
              </Button>
            </div>
          </div>
        ) : tts.provider === 'kokoro' ? (
          <div className="rounded-md bg-yellow-50 p-4 border border-yellow-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Language not supported by Kokoro TTS</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Kokoro TTS does not yet support this language. Please switch to <b>Web Speech</b> or <b>OpenAI</b> for the best experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Speech speed */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <label className="text-sm font-medium">{t('settings.voice.speed')}</label>
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
            <span>{t('settings.voice.slower')}</span>
            <span>{t('settings.voice.faster')}</span>
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

function AlertTriangle({ className }: { className?: string }) {
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
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
