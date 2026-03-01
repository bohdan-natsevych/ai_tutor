'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChatStore } from '@/stores/chatStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { ttsManager } from '@/lib/tts/manager';
import { Play, Square, Trash2, BookOpen, Search } from 'lucide-react';

interface VocabularyEntry {
  id: string;
  word: string;
  translation?: string;
  example?: string;
  context?: string;
  dictionaryId?: string;
  createdAt: string;
}

interface Dictionary {
  id: string;
  name: string;
}

export function VocabularyPanel() {
  const vocabularyPanelOpen = useChatStore((s) => s.vocabularyPanelOpen);
  const { t } = useTranslation();

  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [activeDictId, setActiveDictId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = activeDictId === 'all'
        ? '/api/vocabulary'
        : `/api/vocabulary?dictionaryId=${activeDictId}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.vocabulary || []);
      }
    } catch (err) {
      console.error('Failed to fetch vocabulary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeDictId]);

  const fetchDictionaries = useCallback(async () => {
    try {
      const response = await fetch('/api/dictionaries');
      if (response.ok) {
        const data = await response.json();
        setDictionaries(data.dictionaries || []);
      }
    } catch (err) {
      console.error('Failed to fetch dictionaries:', err);
    }
  }, []);

  // Fetch data when panel opens
  useEffect(() => {
    if (vocabularyPanelOpen) {
      fetchDictionaries();
      fetchEntries();
    }
  }, [vocabularyPanelOpen, fetchEntries, fetchDictionaries]);

  // Listen for vocabulary-updated events to refresh
  useEffect(() => {
    const handleUpdate = () => {
      if (vocabularyPanelOpen) {
        fetchEntries();
      }
    };
    window.addEventListener('vocabulary-updated', handleUpdate);
    return () => window.removeEventListener('vocabulary-updated', handleUpdate);
  }, [vocabularyPanelOpen, fetchEntries]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = async (word: string, entryId: string) => {
    if (playingId === entryId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
      return;
    }

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingId(entryId);
    try {
      const audioData = await ttsManager.synthesize(word);
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        setPlayingId(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        setPlayingId(null);
      };
      await audio.play();
    } catch (err) {
      console.error('TTS playback failed:', err);
      setPlayingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/vocabulary?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete vocabulary entry:', err);
    }
  };

  if (!vocabularyPanelOpen) return null;

  const filteredEntries = searchQuery.trim()
    ? entries.filter((entry) => {
        const q = searchQuery.toLowerCase();
        return (
          entry.word.toLowerCase().includes(q) ||
          (entry.translation && entry.translation.toLowerCase().includes(q))
        );
      })
    : entries;

  return (
    <div className="w-[300px] shrink-0 border-r bg-background flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background/80">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{t('chat.vocabulary.title')}</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {entries.length}
          </Badge>
        </div>
      </div>

      {/* Dictionary filter tabs */}
      {dictionaries.length > 1 && (
        <div className="px-3 py-2 border-b overflow-x-auto flex gap-1 scrollbar-none">
          <button
            onClick={() => setActiveDictId('all')}
            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeDictId === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            All
          </button>
          {dictionaries.map((dict) => (
            <button
              key={dict.id}
              onClick={() => setActiveDictId(dict.id)}
              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                activeDictId === dict.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {dict.name}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('dict.searchPlaceholder')}
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Entries list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{t('chat.vocabulary.empty')}</p>
            <p className="text-xs mt-1 opacity-70">{t('chat.vocabulary.emptyHint')}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
            <p className="text-sm">{t('dict.noSearchResults')}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="px-3 py-2.5 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.word}</p>
                    {entry.translation && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {entry.translation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handlePlay(entry.word, entry.id)}
                      className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={playingId === entry.id ? 'Stop' : 'Play'}
                    >
                      {playingId === entry.id ? (
                        <Square className="h-3 w-3 fill-current" />
                      ) : (
                        <Play className="h-3 w-3 fill-current" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
