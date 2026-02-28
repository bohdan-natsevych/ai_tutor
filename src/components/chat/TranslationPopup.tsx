'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSettingsStore } from '@/stores/settingsStore';
import { ttsManager } from '@/lib/tts/manager';

// CURSOR: TranslationPopup - Shows translation for selected text
// Supports simple (DeepL) and rich (LLM) translation modes
// Rich mode provides definition, usage examples, and type classification

interface TranslationPopupProps {
  text: string;
  children: React.ReactNode;
  chatId?: string;
  onOpenChange?: (open: boolean) => void;
  onSaveToVocabulary?: (word: string, translation: string) => void;
}

interface TranslationResult {
  translatedText: string;
  detectedSourceLang?: string;
}

// CURSOR: Rich translation result with additional context
interface RichTranslationResult {
  translation: string;
  type: 'word' | 'phrase' | 'idiom' | 'collocation' | 'expression';
  definition: string;
  usageExamples: string[];
  notes?: string;
  formality?: 'formal' | 'neutral' | 'informal' | 'slang';
}

export function TranslationPopup({ 
  text, 
  children, 
  chatId,
  onOpenChange,
  onSaveToVocabulary 
}: TranslationPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [richTranslation, setRichTranslation] = useState<RichTranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Dictionary state
  const [dictionaries, setDictionaries] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDictId, setSelectedDictId] = useState<string>('');
  
  const language = useSettingsStore((state) => state.language);
  const translationMode = useSettingsStore((state) => state.translation.mode);
  const aiSettings = useSettingsStore((state) => state.ai);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Fetch dictionaries when popup opens
  const fetchDictionaries = async () => {
    try {
      const response = await fetch('/api/dictionaries');
      if (response.ok) {
        const data = await response.json();
        setDictionaries(data.dictionaries || []);
        // Restore last-used dictionary from localStorage
        const lastUsed = localStorage.getItem('lastDictionaryId');
        const dicts = data.dictionaries || [];
        if (lastUsed && dicts.some((d: any) => d.id === lastUsed)) {
          setSelectedDictId(lastUsed);
        } else if (dicts.length > 0) {
          setSelectedDictId(dicts[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dictionaries:', err);
    }
  };

  // CURSOR: Play the original (learning language) text using TTS
  const handlePlayTranslation = async () => {
    if (isPlayingTTS) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingTTS(false);
      return;
    }

    // Play the original text (learning language), not the translated text
    if (!text) return;

    setIsPlayingTTS(true);
    try {
      const audioData = await ttsManager.synthesize(text);
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        setIsPlayingTTS(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        setIsPlayingTTS(false);
      };
      await audio.play();
    } catch (err) {
      console.error('TTS playback failed:', err);
      setIsPlayingTTS(false);
    }
  };

  const fetchTranslation = async () => {
    if (translation) return; // Already fetched
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: language.mother, // Translate to user's native language
          sourceLanguage: language.learning,
          mode: translationMode, // CURSOR: Pass translation mode
          aiProvider: aiSettings.provider, // CURSOR: Pass AI settings for rich mode
          aiModel: aiSettings.textModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslation({
        translatedText: data.translation.translatedText,
        detectedSourceLang: data.translation.detectedSourceLang,
      });
      
      // CURSOR: Set rich translation data if available
      if (data.rich) {
        setRichTranslation(data.rich);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
    if (open) {
      if (!translation) fetchTranslation();
      fetchDictionaries();
    }
    if (!open) {
      // Stop TTS when closing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingTTS(false);
    }
  };

  const handleSave = async () => {
    if (!translation) return;
    
    try {
      // Remember selected dictionary
      if (selectedDictId) {
        localStorage.setItem('lastDictionaryId', selectedDictId);
      }

      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: text,
          translation: translation.translatedText,
          context: chatId,
          dictionaryId: selectedDictId || undefined,
        }),
      });

      if (response.ok) {
        setSaved(true);
        onSaveToVocabulary?.(text, translation.translatedText);
      }
    } catch (err) {
      console.error('Failed to save to vocabulary:', err);
    }
  };

  // CURSOR: Get badge variant based on type
  const getTypeBadgeVariant = (type: RichTranslationResult['type']) => {
    switch (type) {
      case 'idiom': return 'destructive';
      case 'collocation': return 'secondary';
      case 'expression': return 'outline';
      case 'phrase': return 'default';
      default: return 'secondary';
    }
  };

  // CURSOR: Get formality label
  const getFormalityLabel = (formality?: RichTranslationResult['formality']) => {
    switch (formality) {
      case 'formal': return 'Formal';
      case 'informal': return 'Informal';
      case 'slang': return 'Slang';
      default: return null;
    }
  };

  // CURSOR: Use rich mode UI (wider) when setting is 'rich', show content once loaded
  const isRichModeSetting = translationMode === 'rich';
  const hasRichData = richTranslation !== null;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className={isRichModeSetting ? "w-80 p-0" : "w-64 p-3"} align="start">
        {/* Loading state */}
        {isLoading && (
          <div className={isRichModeSetting ? "p-4" : ""}>
            <p className="text-sm text-muted-foreground animate-pulse">
              {isRichModeSetting ? 'Analyzing...' : 'Translating...'}
            </p>
          </div>
        )}
        
        {/* Error state */}
        {!isLoading && error && (
          <div className={isRichModeSetting ? "p-4" : ""}>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        {/* Rich translation UI */}
        {!isLoading && !error && isRichModeSetting && hasRichData && (
          // CURSOR: Rich translation UI with definition, usage, type
          <div className="flex flex-col max-h-[400px]">
            {/* Header - fixed */}
            <div className="p-3 border-b bg-background flex-shrink-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <p className="font-medium truncate">{text}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayTranslation}
                    className="h-6 w-6 p-0 shrink-0"
                    title={isPlayingTTS ? 'Stop' : 'Listen'}
                  >
                    {isPlayingTTS ? (
                      <StopIcon className="h-3 w-3" />
                    ) : (
                      <SpeakerIcon className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {getFormalityLabel(richTranslation.formality) && (
                    <Badge variant="outline" className="text-xs h-5 px-1.5">
                      {getFormalityLabel(richTranslation.formality)}
                    </Badge>
                  )}
                  <Badge variant={getTypeBadgeVariant(richTranslation.type)} className="text-xs h-5 px-1.5">
                    {richTranslation.type}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-primary break-words">{richTranslation.translation}</p>
              </div>
            </div>
            
            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-3 space-y-3">
                {/* Definition */}
                {richTranslation.definition && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">Definition</span>
                    <p className="text-sm mt-1">{richTranslation.definition}</p>
                  </div>
                )}

                {/* Usage Examples */}
                {richTranslation.usageExamples.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">Examples</span>
                    <ul className="mt-1 space-y-1">
                      {richTranslation.usageExamples.map((example, index) => (
                        <li key={index} className="text-sm italic text-muted-foreground pl-2 border-l-2 border-primary/30">
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {richTranslation.notes && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">Notes</span>
                    <p className="text-sm mt-1 text-muted-foreground">{richTranslation.notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer - fixed */}
            <div className="p-3 border-t flex-shrink-0 space-y-2">
              {dictionaries.length > 1 && (
                <select
                  value={selectedDictId}
                  onChange={(e) => setSelectedDictId(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1 bg-background"
                >
                  {dictionaries.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
              <Button
                size="sm"
                variant={saved ? 'secondary' : 'default'}
                onClick={handleSave}
                disabled={saved}
                className="w-full"
              >
                {saved ? 'Saved!' : dictionaries.length <= 1 ? 'Save to Vocabulary' : `Save to ${dictionaries.find(d => d.id === selectedDictId)?.name || 'Dictionary'}`}
              </Button>
            </div>
          </div>
        )}
        
        {/* Simple translation UI */}
        {!isLoading && !error && !isRichModeSetting && translation && (
          <div className="space-y-2">
            {/* Original text */}
            <div>
              <span className="text-xs text-muted-foreground">Original:</span>
              <div className="flex items-center gap-2">
                <p className="font-medium break-words">{text}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayTranslation}
                  className="h-6 w-6 p-0 shrink-0"
                  title={isPlayingTTS ? 'Stop' : 'Listen'}
                >
                  {isPlayingTTS ? (
                    <StopIcon className="h-3 w-3" />
                  ) : (
                    <SpeakerIcon className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Translation */}
            <div>
              <span className="text-xs text-muted-foreground">Translation:</span>
              <div className="flex items-center gap-2">
                <p className="font-medium">{translation.translatedText}</p>
              </div>
            </div>

            {/* Dictionary selector + Save button */}
            {dictionaries.length > 1 && (
              <select
                value={selectedDictId}
                onChange={(e) => setSelectedDictId(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1 bg-background"
              >
                {dictionaries.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              variant={saved ? 'secondary' : 'default'}
              onClick={handleSave}
              disabled={saved}
              className="w-full mt-2"
            >
              {saved ? 'Saved!' : dictionaries.length <= 1 ? 'Save to Vocabulary' : `Save to ${dictionaries.find(d => d.id === selectedDictId)?.name || 'Dictionary'}`}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// CURSOR: Icons for TTS playback
function SpeakerIcon({ className }: { className?: string }) {
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
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
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
