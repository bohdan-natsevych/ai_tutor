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
  { id: 'kokoro', name: 'Kokoro TTS', description: 'High-quality local TTS (WebGPU/WASM)', type: 'local' },
  { id: 'piper', name: 'Piper TTS', description: 'Fast CPU-only local TTS (WASM)', type: 'local' },
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
  piper: [
    // English - American
    { id: 'en_US-hfc_female-medium', name: 'HFC Female', gender: 'Female (American)' },
    { id: 'en_US-hfc_male-medium', name: 'HFC Male', gender: 'Male (American)' },
    { id: 'en_US-amy-medium', name: 'Amy', gender: 'Female (American)' },
    { id: 'en_US-lessac-medium', name: 'Lessac', gender: 'Female (American)' },
    { id: 'en_US-ryan-medium', name: 'Ryan', gender: 'Male (American)' },
    { id: 'en_US-joe-medium', name: 'Joe', gender: 'Male (American)' },
    { id: 'en_US-kristin-medium', name: 'Kristin', gender: 'Female (American)' },
    { id: 'en_US-kathleen-low', name: 'Kathleen', gender: 'Female (American)' },
    { id: 'en_US-danny-low', name: 'Danny', gender: 'Male (American)' },
    // English - British
    { id: 'en_GB-alba-medium', name: 'Alba', gender: 'Female (British)' },
    { id: 'en_GB-cori-medium', name: 'Cori', gender: 'Female (British)' },
    { id: 'en_GB-jenny_dioco-medium', name: 'Jenny', gender: 'Female (British)' },
    { id: 'en_GB-alan-medium', name: 'Alan', gender: 'Male (British)' },
    { id: 'en_GB-northern_english_male-medium', name: 'Northern Male', gender: 'Male (British)' },
    // Ukrainian
    { id: 'uk_UA-ukrainian_tts-medium', name: 'Ukrainian TTS', gender: 'Female (Ukrainian)' },
    { id: 'uk_UA-lada-x_low', name: 'Lada', gender: 'Female (Ukrainian)' },
    // German
    { id: 'de_DE-thorsten-medium', name: 'Thorsten', gender: 'Male (German)' },
    { id: 'de_DE-thorsten-high', name: 'Thorsten HQ', gender: 'Male (German)' },
    { id: 'de_DE-thorsten_emotional-medium', name: 'Thorsten Emotional', gender: 'Male (German)' },
    { id: 'de_DE-kerstin-low', name: 'Kerstin', gender: 'Female (German)' },
    { id: 'de_DE-ramona-low', name: 'Ramona', gender: 'Female (German)' },
    { id: 'de_DE-eva_k-x_low', name: 'Eva', gender: 'Female (German)' },
    // French
    { id: 'fr_FR-siwis-medium', name: 'Siwis', gender: 'Female (French)' },
    { id: 'fr_FR-tom-medium', name: 'Tom', gender: 'Male (French)' },
    { id: 'fr_FR-gilles-low', name: 'Gilles', gender: 'Male (French)' },
    // Spanish
    { id: 'es_ES-davefx-medium', name: 'Dave', gender: 'Male (Spanish)' },
    { id: 'es_ES-sharvard-medium', name: 'Sharvard', gender: 'Male (Spanish)' },
    { id: 'es_ES-carlfm-x_low', name: 'Carl', gender: 'Male (Spanish)' },
    { id: 'es_MX-ald-medium', name: 'Ald (MX)', gender: 'Male (Spanish)' },
    { id: 'es_MX-claude-high', name: 'Claude (MX)', gender: 'Male (Spanish)' },
    // Italian
    { id: 'it_IT-riccardo-x_low', name: 'Riccardo', gender: 'Male (Italian)' },
    // Portuguese
    { id: 'pt_PT-tug\u00e3o-medium', name: 'Tugao', gender: 'Male (Portuguese)' },
    { id: 'pt_BR-faber-medium', name: 'Faber (BR)', gender: 'Male (Portuguese)' },
    { id: 'pt_BR-edresson-low', name: 'Edresson (BR)', gender: 'Male (Portuguese)' },
    // Polish
    { id: 'pl_PL-gosia-medium', name: 'Gosia', gender: 'Female (Polish)' },
    { id: 'pl_PL-darkman-medium', name: 'Darkman', gender: 'Male (Polish)' },
    { id: 'pl_PL-mc_speech-medium', name: 'MC Speech', gender: 'Male (Polish)' },
    // Chinese
    { id: 'zh_CN-huayan-medium', name: 'Huayan', gender: 'Female (Chinese)' },
    { id: 'zh_CN-huayan-x_low', name: 'Huayan Light', gender: 'Female (Chinese)' },
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

// CURSOR: Centralized voice filtering for providers with per-language voice catalogs
function filterVoicesByLanguage(
  provider: string,
  allVoices: Array<{ id: string; name: string; gender: string }>,
  learningLang: string,
  dialect: string,
): Array<{ id: string; name: string; gender: string }> {
  if (provider === 'kokoro') {
    if (learningLang === 'en') {
      return allVoices.filter(v =>
        dialect === 'american'
          ? v.id.startsWith('am_') || v.id.startsWith('af_')
          : v.id.startsWith('bm_') || v.id.startsWith('bf_'),
      );
    }
    const kokoroPrefixMap: Record<string, string> = { ja: 'j', zh: 'z', fr: 'f', es: 'e', it: 'i', pt: 'p' };
    const prefix = kokoroPrefixMap[learningLang];
    return prefix ? allVoices.filter(v => v.id.startsWith(prefix)) : [];
  }

  if (provider === 'piper') {
    // CURSOR: Piper voice IDs follow locale format: en_US-name-quality, de_DE-name-quality, etc.
    const piperLocaleMap: Record<string, string[]> = {
      en: dialect === 'american' ? ['en_US'] : ['en_GB'],
      uk: ['uk_UA'],
      de: ['de_DE'],
      fr: ['fr_FR'],
      es: ['es_ES', 'es_MX'],
      it: ['it_IT'],
      pt: ['pt_PT', 'pt_BR'],
      pl: ['pl_PL'],
      zh: ['zh_CN'],
    };
    const locales = piperLocaleMap[learningLang];
    if (!locales) return [];
    return allVoices.filter(v => locales.some(loc => v.id.startsWith(loc)));
  }

  return allVoices;
}

export function VoiceSelector() {
  const { tts, language, setTTSSettings } = useSettingsStore();
  const { t } = useTranslation();
  
  // CURSOR: Filter voices by language/dialect for providers that have per-language voices
  const allVoices = VOICES[tts.provider] || [];
  const voices = filterVoicesByLanguage(tts.provider, allVoices, language.learning, language.dialect);
  
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

  // Auto-select appropriate voice when dialect/language changes
  useEffect(() => {
    if (tts.provider !== 'kokoro' && tts.provider !== 'piper') return;
    
    const currentVoiceMatchesDialect = voices.some(v => v.id === tts.voice);
    
    if (!currentVoiceMatchesDialect && voices.length > 0) {
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
              const allProviderVoices = VOICES[value] || [];
              const filteredVoices = filterVoicesByLanguage(value, allProviderVoices, language.learning, language.dialect);
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
        ) : (tts.provider === 'kokoro' || tts.provider === 'piper') ? (
          <div className="rounded-md bg-yellow-50 p-4 border border-yellow-100">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Language not supported by {tts.provider === 'kokoro' ? 'Kokoro' : 'Piper'} TTS</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This language is not yet supported. Please switch to <b>Web Speech</b> or <b>OpenAI</b> for the best experience.
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
