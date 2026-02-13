'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// CURSOR: Vocabulary Page - View and manage saved words

interface VocabularyEntry {
  id: string;
  word: string;
  translation: string | null;
  example: string | null;
  context: string | null;
  createdAt: string;
}

export default function VocabularyPage() {
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    fetchVocabulary();
  }, []);

  const fetchVocabulary = async () => {
    try {
      const response = await fetch('/api/vocabulary');
      const data = await response.json();
      setVocabulary(data.vocabulary || []);
    } catch (error) {
      console.error('Failed to fetch vocabulary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWord = async (id: string) => {
    if (!confirm(t('vocab.deleteConfirm'))) return;
    
    try {
      const response = await fetch(`/api/vocabulary?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setVocabulary(vocabulary.filter(v => v.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete word:', error);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{t('vocab.title')}</h1>
            <p className="text-xs text-muted-foreground">
              {vocabulary.length} {t('vocab.wordsSaved')}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : vocabulary.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent className="pt-6">
              <div className="text-4xl mb-3">📚</div>
              <h3 className="font-semibold mb-1">{t('vocab.noSavedWords')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('vocab.noSavedWordsDesc')}
              </p>
              <Link href="/">
                <Button>{t('vocab.startConversation')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {vocabulary.map((entry) => (
                <Card key={entry.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-lg">{entry.word}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-muted-foreground">{entry.translation || t('vocab.noTranslation')}</span>
                        </div>
                        {entry.example && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            "{entry.example}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('vocab.saved')} {formatDate(entry.createdAt, t)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => deleteWord(entry.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>
    </div>
  );
}

function formatDate(date: string, t: (key: any) => string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  if (diff < 60000) return t('vocab.date.justNow');
  if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t('vocab.date.minAgo')}`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t('vocab.date.hoursAgo')}`;
  
  return d.toLocaleDateString();
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
