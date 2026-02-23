'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getRoleplayScenarios, getTopics, DEFAULT_GENERAL_OPENING, type ProficiencyLevel } from '@/lib/ai/prompts';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Chat } from '@/stores/chatStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { TranslationKey } from '@/lib/i18n/translations';
import { HeaderLanguageSelector } from '@/components/layout/HeaderLanguageSelector';
import { getDisplayTitle } from '@/lib/chatUtils';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [openingPrompt, setOpeningPrompt] = useState(DEFAULT_GENERAL_OPENING);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'general' | 'roleplay' | 'topic'>('general');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel>('intermediate');
  const [listenFirst, setListenFirst] = useState(true);
  const [showTextAuto, setShowTextAuto] = useState(true);
  const { t, lang } = useTranslation();

  const ai = useSettingsStore((state) => state.ai);
  const setUISettings = useSettingsStore((state) => state.setUISettings);
  const languageSettings = useSettingsStore((state) => state.language);
  const [createError, setCreateError] = useState<string | null>(null);
  const { user, isLoading: authLoading, logout } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // CURSOR: Auto-set defaults based on selected level
  const handleLevelChange = (level: ProficiencyLevel) => {
    setSelectedLevel(level);
    if (level === 'advanced') {
      setListenFirst(true);
      setShowTextAuto(false);
    } else {
      setListenFirst(true);
      setShowTextAuto(true);
    }
  };

  useEffect(() => {
    if (user) fetchChats();
  }, [user]);

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const createChat = async (topicType: 'general' | 'roleplay' | 'topic', topicKey?: string) => {
    setIsCreating(true);
    setCreateError(null);
    // CURSOR: Apply dialog audio settings to global store before navigating
    setUISettings({ listenFirstMode: listenFirst, showTextAutomatically: showTextAuto });
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newChatTitle || getDefaultTitle(topicType, topicKey),
          topicType,
          topicKey,
          level: selectedLevel,
          language: languageSettings.learning,
          dialect: languageSettings.dialect,
          aiProvider: ai.provider,
          aiModel: ai.model,
          aiTextModel: ai.textModel,
          openingPrompt: topicType === 'general' ? openingPrompt : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setCreateError(data.error || 'Failed to create conversation');
        return;
      }
      if (data.chat) {
        if (data.pending) {
          sessionStorage.setItem(`pendingChat:${data.chat.id}`, JSON.stringify({
            chat: data.chat,
            openingMessage: data.openingMessage,
          }));
        }
        router.push(`/chat/${data.chat.id}`);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      setCreateError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
      setShowNewChatDialog(false);
      setNewChatTitle('');
      setOpeningPrompt(DEFAULT_GENERAL_OPENING);
      setSelectedLevel('intermediate');
      setListenFirst(true);
      setShowTextAuto(true);
    }
  };

  const getDefaultTitle = (topicType: string, topicKey?: string): string => {
    if (topicType === 'general') return 'General Conversation';
    if (topicType === 'roleplay' && topicKey) {
      const scenario = getRoleplayScenarios().find(s => s.id === topicKey);
      return scenario ? `Roleplay: ${scenario.name}` : 'Roleplay';
    }
    if (topicType === 'topic' && topicKey) {
      const topic = getTopics().find(t => t.id === topicKey);
      return topic ? `Topic: ${topic.name}` : 'Topic Discussion';
    }
    return 'New Conversation';
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/chat?id=${chatId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
      } else {
        console.error('Failed to delete chat');
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const roleplayScenarios = getRoleplayScenarios();
  const topics = getTopics();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              AI
            </div>
            <span className="text-lg font-semibold tracking-tight">{t('common.appName')}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/vocabulary">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <BookIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('common.vocabulary')}</span>
              </Button>
            </Link>
            <HeaderLanguageSelector />
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>
            {user && (
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={logout}>
                <span className="hidden sm:inline text-xs">{user.name}</span>
                <LogOutIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl">
        {/* CURSOR: Error feedback for chat creation failures */}
        {createError && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center justify-between">
            <span>{createError}</span>
            <button onClick={() => setCreateError(null)} className="ml-2 font-bold hover:opacity-70">x</button>
          </div>
        )}
        {/* Hero banner */}
        <section className="relative py-12 sm:py-16 mb-10 overflow-hidden">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent" />
          <div className="max-w-2xl px-6 sm:px-8 py-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
                  {t('home.hero.title')}
                </h1>
                <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl mb-8 leading-relaxed">
                  {t('home.hero.subtitle')}
                </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">🎤</div>
                    <span className="text-sm font-medium">{t('home.hero.voiceInput')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">✨</div>
                    <span className="text-sm font-medium">{t('home.hero.grammarCorrection')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">💡</div>
                    <span className="text-sm font-medium">{t('home.hero.smartSuggestions')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">🔍</div>
                    <span className="text-sm font-medium">{t('home.hero.translationOnTap')}</span>
                  </div>
            </div>
          </div>
        </section>

        {/* Quick start cards */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">{t('home.pickMode')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Chat Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20" onClick={() => { setSelectedTab('general'); setShowNewChatDialog(true); }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>💬</span> {t('home.freeChat')}
                </CardTitle>
                <CardDescription>
                  {t('home.freeChatDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{t('home.freeChatTagCasual')}</span>
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{t('home.freeChatTagAny')}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md text-xs font-medium">{t('home.freeChatTagBeginner')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Roleplay Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
              setSelectedTab('roleplay');
              setShowNewChatDialog(true);
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>🎭</span> {t('home.roleplay')}
                </CardTitle>
                <CardDescription>
                  {t('home.roleplayDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{getRoleplayScenarios().length} {t('home.scenariosCount')}</span>
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{t('home.roleplayTagImmersive')}</span>
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{t('home.roleplayTagPractical')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Topics Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
              setSelectedTab('topic');
              setShowNewChatDialog(true);
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📚</span> {t('home.topics')}
                </CardTitle>
                <CardDescription>
                  {t('home.topicsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{getTopics().length} {t('home.topicsCount')}</span>
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{t('home.topicsTagFocused')}</span>
                  <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">{t('home.topicsTagVocabulary')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Conversation setup / scenario picker dialog */}
        {showNewChatDialog && (
          <Dialog open={showNewChatDialog} onOpenChange={(open) => { if (!open) { setNewChatTitle(''); setOpeningPrompt(DEFAULT_GENERAL_OPENING); setSelectedLevel('intermediate'); setListenFirst(true); setShowTextAuto(true); } setShowNewChatDialog(open); }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedTab === 'general' ? t('home.freeChat') : selectedTab === 'roleplay' ? t('home.roleplay') : t('home.topics')}
                </DialogTitle>
                <DialogDescription>
                  {selectedTab === 'general' ? t('home.freeChatDesc') : t('home.dialog.description')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* CURSOR: Level picker -- shown for all conversation types */}
                <div className="grid gap-2">
                  <Label>{t('home.dialog.level')}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['novice', 'beginner', 'intermediate', 'advanced'] as const).map((level) => {
                      const labelKey = `home.dialog.level${level.charAt(0).toUpperCase() + level.slice(1)}` as TranslationKey;
                      const descKey = `home.dialog.level${level.charAt(0).toUpperCase() + level.slice(1)}Desc` as TranslationKey;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleLevelChange(level)}
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-colors ${
                            selectedLevel === level
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <span className="text-xs font-medium">{t(labelKey)}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight">{t(descKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CURSOR: Listen-first and show-text-auto toggles, defaults driven by level */}
                <div className="grid gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">{t('settings.interface.listenFirst')}</label>
                      <p className="text-xs text-muted-foreground">{t('settings.interface.listenFirstDesc')}</p>
                    </div>
                    <Switch
                      checked={listenFirst}
                      onCheckedChange={setListenFirst}
                    />
                  </div>
                  {listenFirst && (
                    <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">{t('settings.interface.showTextAuto')}</label>
                        <p className="text-xs text-muted-foreground">{t('settings.interface.showTextAutoDesc')}</p>
                      </div>
                      <Switch
                        checked={showTextAuto}
                        onCheckedChange={setShowTextAuto}
                      />
                    </div>
                  )}
                </div>

                {selectedTab === 'general' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="chat-name">{t('home.dialog.customName')}</Label>
                      <Input
                        id="chat-name"
                        placeholder={t('home.dialog.customNamePlaceholder') || 'E.g., Morning Practice'}
                        value={newChatTitle}
                        onChange={(e) => setNewChatTitle(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="chat-opening">{t('home.dialog.startingMessage') || 'Starting message'}</Label>
                      <Textarea
                        id="chat-opening"
                        value={openingPrompt}
                        onChange={(e) => setOpeningPrompt(e.target.value)}
                        className="min-h-[80px] text-sm"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={() => createChat('general')} disabled={isCreating}>
                        {isCreating ? t('common.loading') : t('home.startConversation')}
                      </Button>
                    </div>
                  </>
                )}

                {selectedTab === 'roleplay' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getRoleplayScenarios().map((scenario) => (
                      <Card
                        key={scenario.id}
                        className={`transition-colors ${isCreating ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary'}`}
                        onClick={() => !isCreating && createChat('roleplay', scenario.id)}
                      >
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{scenario.name}</CardTitle>
                          <CardDescription className="text-xs">{scenario.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedTab === 'topic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getTopics().map((topic) => (
                      <Card
                        key={topic.id}
                        className={`transition-colors ${isCreating ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary'}`}
                        onClick={() => !isCreating && createChat('topic', topic.id)}
                      >
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{topic.name}</CardTitle>
                          <CardDescription className="text-xs">{topic.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* Recent conversations */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t('home.recentConversations')}</h2>
        </div>

        {chats.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-muted-foreground font-medium mb-2">{t('home.noConversationsYet')}</p>
            <p className="text-sm text-muted-foreground">{t('home.noConversationsDesc')}</p>
          </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {chats.map((chat) => {
                const typeConfig = chat.topicType === 'roleplay'
                  ? { icon: '🎭', bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Roleplay' }
                  : chat.topicType === 'topic'
                    ? { icon: '📚', bg: 'bg-emerald-500/10', text: 'text-emerald-700', label: 'Topic' }
                    : { icon: '💬', bg: 'bg-blue-500/10', text: 'text-blue-700', label: 'General' };

                return (
                  <Link key={chat.id} href={`/chat/${chat.id}`}>
                    <Card className="hover:border-primary/30 transition-all hover:shadow-md cursor-pointer h-full group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center text-sm shrink-0`}>
                            {typeConfig.icon}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 -mt-1 -mr-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => deleteChat(chat.id, e)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <h3 className="text-sm font-medium line-clamp-2 mb-2">{getDisplayTitle(chat, t)}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">
                              {chat.topicType === 'general' ? t('home.typeGeneral') : chat.topicType === 'roleplay' ? t('home.typeRoleplay') : t('home.typeTopic')}
                            </span>
                            {chat.level && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {t((`home.level.${chat.level}`) as TranslationKey)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(chat.updatedAt, t, lang)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function formatDate(date: Date | string, t: (key: TranslationKey) => string, locale: string): string {
  const d = new Date(date);
  // Format date relative to now
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return t('home.date.justNow');
    if (minutes < 60) return `${minutes}${t('home.date.mAgo')}`;
    if (hours < 24) return `${hours}${t('home.date.hAgo')}`;
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

// Icons
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}

function TranslateIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
