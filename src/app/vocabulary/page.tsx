'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ttsManager } from '@/lib/tts/manager';

interface Dictionary {
  id: string;
  name: string;
  createdAt: string;
}

interface VocabEntry {
  id: string;
  word: string;
  translation: string | null;
  example: string | null;
  context: string | null;
  dictionaryId: string | null;
  createdAt: string;
}

export default function VocabularyPage() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [activeDictId, setActiveDictId] = useState<string | null>(null);
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [allEntries, setAllEntries] = useState<VocabEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New dictionary form
  const [newDictName, setNewDictName] = useState('');
  const [showNewDictInput, setShowNewDictInput] = useState(false);

  // Add word form
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newExample, setNewExample] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editExample, setEditExample] = useState('');

  // Rename dictionary
  const [renamingDictId, setRenamingDictId] = useState<string | null>(null);
  const [renameDictName, setRenameDictName] = useState('');

  // Move dialog
  const [movingEntryId, setMovingEntryId] = useState<string | null>(null);

  // TTS playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = async (entryId: string, word: string) => {
    // Stop if already playing this entry
    if (playingId === entryId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
      return;
    }
    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(entryId);
    try {
      const audio = await ttsManager.createAudioElement(word);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null;
        setPlayingId(null);
      };
      audio.onerror = () => {
        if (audioRef.current === audio) audioRef.current = null;
        setPlayingId(null);
      };
      await audio.play();
    } catch (err) {
      console.error('TTS playback failed:', err);
      setPlayingId(null);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const fetchDictionaries = useCallback(async () => {
    try {
      const res = await fetch('/api/dictionaries');
      if (res.ok) {
        const data = await res.json();
        setDictionaries(data.dictionaries || []);
        // Select first dict if none selected
        if (!activeDictId && (data.dictionaries || []).length > 0) {
          setActiveDictId(data.dictionaries[0].id);
        }
      }
    } catch (err) { console.error(err); }
  }, [activeDictId]);

  const fetchEntries = useCallback(async (dictId?: string) => {
    try {
      const url = dictId ? `/api/vocabulary?dictionaryId=${dictId}` : '/api/vocabulary';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (dictId) {
          setEntries(data.vocabulary || []);
        } else {
          setAllEntries(data.vocabulary || []);
        }
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([fetchDictionaries(), fetchEntries()]).finally(() => setIsLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (activeDictId) {
      fetchEntries(activeDictId);
    }
  }, [activeDictId, fetchEntries]);

  // word counts per dictionary
  const wordCountsMap: Record<string, number> = {};
  for (const entry of allEntries) {
    const key = entry.dictionaryId || 'none';
    wordCountsMap[key] = (wordCountsMap[key] || 0) + 1;
  }

  const createDictionary = async () => {
    if (!newDictName.trim()) return;
    try {
      const res = await fetch('/api/dictionaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDictName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewDictName('');
        setShowNewDictInput(false);
        await fetchDictionaries();
        await fetchEntries();
        if (data.dictionary) setActiveDictId(data.dictionary.id);
      }
    } catch (err) { console.error(err); }
  };

  const renameDictionary = async (id: string) => {
    if (!renameDictName.trim()) return;
    try {
      await fetch('/api/dictionaries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: renameDictName.trim() }),
      });
      setRenamingDictId(null);
      setRenameDictName('');
      fetchDictionaries();
    } catch (err) { console.error(err); }
  };

  const deleteDictionary = async (id: string) => {
    const dict = dictionaries.find(d => d.id === id);
    if (!confirm(t('dict.deleteConfirm').replace('{name}', dict?.name || ''))) return;
    try {
      await fetch(`/api/dictionaries?id=${id}`, { method: 'DELETE' });
      if (activeDictId === id) {
        setActiveDictId(dictionaries.find(d => d.id !== id)?.id || null);
      }
      await fetchDictionaries();
      await fetchEntries();
    } catch (err) { console.error(err); }
  };

  const addWord = async () => {
    if (!newWord.trim() || !activeDictId) return;
    try {
      await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: newWord.trim(),
          translation: newTranslation.trim() || undefined,
          example: newExample.trim() || undefined,
          dictionaryId: activeDictId,
        }),
      });
      setNewWord(''); setNewTranslation(''); setNewExample('');
      setShowAddForm(false);
      fetchEntries(activeDictId);
      fetchEntries();
    } catch (err) { console.error(err); }
  };

  const startEdit = (entry: VocabEntry) => {
    setEditingId(entry.id);
    setEditWord(entry.word);
    setEditTranslation(entry.translation || '');
    setEditExample(entry.example || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editWord.trim()) return;
    try {
      await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          word: editWord.trim(),
          translation: editTranslation.trim(),
          example: editExample.trim(),
        }),
      });
      setEditingId(null);
      fetchEntries(activeDictId!);
      fetchEntries();
    } catch (err) { console.error(err); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm(t('vocab.deleteConfirm'))) return;
    try {
      await fetch(`/api/vocabulary?id=${id}`, { method: 'DELETE' });
      fetchEntries(activeDictId!);
      fetchEntries();
    } catch (err) { console.error(err); }
  };

  const moveEntry = async (entryId: string, targetDictId: string) => {
    try {
      await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, dictionaryId: targetDictId }),
      });
      setMovingEntryId(null);
      fetchEntries(activeDictId!);
      fetchEntries();
    } catch (err) { console.error(err); }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeDict = dictionaries.find(d => d.id === activeDictId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span>{t('common.back')}</span>
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity hidden sm:flex">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-sm">
                AI
              </div>
              <span className="text-lg font-semibold tracking-tight">{t('common.appName')}</span>
            </Link>
          </div>

          <div className="flex items-center justify-end flex-1">
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline-block">{t('common.settings')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('dict.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {allEntries.length} {t('vocab.wordsSaved')}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Dictionary sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('dict.dictionaries')}</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowNewDictInput(!showNewDictInput)}>
                + {t('dict.create')}
              </Button>
            </div>

            {showNewDictInput && (
              <div className="flex gap-1">
                <Input
                  value={newDictName}
                  onChange={(e) => setNewDictName(e.target.value)}
                  placeholder={t('dict.namePlaceholder')}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && createDictionary()}
                />
                <Button size="sm" className="h-8 px-2" onClick={createDictionary}>
                  {t('common.add')}
                </Button>
              </div>
            )}

            {dictionaries.map((dict) => (
              <div key={dict.id}>
                {renamingDictId === dict.id ? (
                  <div className="flex gap-1">
                    <Input
                      value={renameDictName}
                      onChange={(e) => setRenameDictName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && renameDictionary(dict.id)}
                      autoFocus
                    />
                    <Button size="sm" className="h-8 px-2" onClick={() => renameDictionary(dict.id)}>{t('common.save')}</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setRenamingDictId(null)}>✕</Button>
                  </div>
                ) : (
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-colors ${
                      activeDictId === dict.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveDictId(dict.id)}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>📖</span>
                      <span className="truncate">{dict.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{wordCountsMap[dict.id] || 0}</span>
                      {dict.name !== 'Default' && (
                        <span className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                          <button
                            className="text-xs hover:text-primary p-0.5"
                            onClick={(e) => { e.stopPropagation(); setRenamingDictId(dict.id); setRenameDictName(dict.name); }}
                            title={t('dict.rename')}
                          >✏️</button>
                          <button
                            className="text-xs hover:text-destructive p-0.5"
                            onClick={(e) => { e.stopPropagation(); deleteDictionary(dict.id); }}
                            title={t('common.delete')}
                          >🗑️</button>
                        </span>
                      )}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {activeDictId && activeDict && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{activeDict.name}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(!showAddForm)}
                  >
                    + {t('dict.addWord')}
                  </Button>
                </div>

                {/* Add word form */}
                {showAddForm && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          value={newWord}
                          onChange={(e) => setNewWord(e.target.value)}
                          placeholder={t('dict.wordPlaceholder')}
                          className="text-sm"
                        />
                        <Input
                          value={newTranslation}
                          onChange={(e) => setNewTranslation(e.target.value)}
                          placeholder={t('dict.translationPlaceholder')}
                          className="text-sm"
                        />
                      </div>
                      <Input
                        value={newExample}
                        onChange={(e) => setNewExample(e.target.value)}
                        placeholder={t('dict.examplePlaceholder')}
                        className="text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>{t('common.cancel')}</Button>
                        <Button size="sm" onClick={addWord} disabled={!newWord.trim()}>{t('common.add')}</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Entries list */}
                {entries.length === 0 ? (
                  <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                    <p className="text-muted-foreground font-medium mb-2">{t('dict.noEntries')}</p>
                    <p className="text-sm text-muted-foreground">{t('dict.noEntriesDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <Card key={entry.id} className="group">
                        <CardContent className="p-4">
                          {editingId === entry.id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input value={editWord} onChange={(e) => setEditWord(e.target.value)} className="text-sm" />
                                <Input value={editTranslation} onChange={(e) => setEditTranslation(e.target.value)} className="text-sm" />
                              </div>
                              <Input value={editExample} onChange={(e) => setEditExample(e.target.value)} className="text-sm" />
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>{t('common.cancel')}</Button>
                                <Button size="sm" onClick={saveEdit}>{t('common.save')}</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                  <span className="font-medium">{entry.word}</span>
                                  {entry.translation && (
                                    <span className="text-sm text-muted-foreground">— {entry.translation}</span>
                                  )}
                                </div>
                                {entry.example && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">{entry.example}</p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  className={`text-xs p-1 transition-colors ${playingId === entry.id ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                  onClick={() => handlePlay(entry.id, entry.word)}
                                  title={playingId === entry.id ? 'Stop' : 'Play'}
                                >
                                  {playingId === entry.id ? (
                                    <Square className="h-3.5 w-3.5 fill-current" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                  )}
                                </button>
                                <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button className="text-xs p-1 hover:text-primary" onClick={() => startEdit(entry)} title={t('dict.editWord')}>✏️</button>
                                  {dictionaries.length > 1 && (
                                    <button className="text-xs p-1 hover:text-primary" onClick={() => setMovingEntryId(entry.id)} title={t('dict.moveWord')}>↗️</button>
                                  )}
                                  <button className="text-xs p-1 hover:text-destructive" onClick={() => deleteEntry(entry.id)} title={t('common.delete')}>🗑️</button>
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Move dropdown */}
                          {movingEntryId === entry.id && (
                            <div className="mt-2 p-2 border rounded-lg bg-muted/30 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">{t('dict.moveToDict')}</p>
                              {dictionaries.filter(d => d.id !== activeDictId).map(d => (
                                <button
                                  key={d.id}
                                  className="w-full text-left text-sm px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                                  onClick={() => moveEntry(entry.id, d.id)}
                                >
                                  📖 {d.name}
                                </button>
                              ))}
                              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setMovingEntryId(null)}>
                                {t('common.cancel')}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!activeDictId && !isLoading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('dict.selectOrCreate')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
