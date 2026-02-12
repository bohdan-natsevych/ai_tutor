'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRoleplayScenarios, getTopics } from '@/lib/ai/prompts';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Chat } from '@/stores/chatStore';

export default function HomePage() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'general' | 'roleplay' | 'topic'>('general');

  const ai = useSettingsStore((state) => state.ai);

  useEffect(() => {
    fetchChats();
  }, []);

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

  const createChat = async (topicType: 'general' | 'roleplay' | 'topic', topicKey?: string) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newChatTitle || getDefaultTitle(topicType, topicKey),
          topicType,
          topicKey,
          aiProvider: ai.provider,
          aiModel: ai.model,
        }),
      });

      const data = await response.json();
      if (data.chat) {
        router.push(`/chat/${data.chat.id}`);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreating(false);
      setShowNewChatDialog(false);
      setNewChatTitle('');
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
        setChats(chats.filter(chat => chat.id !== chatId));
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
            <span className="text-lg font-semibold tracking-tight">AI Tutor</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/vocabulary">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <BookIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Vocabulary</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl">
        {/* Hero banner */}
        <section className="relative py-12 sm:py-16 mb-10 overflow-hidden">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent" />
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Practice speaking with&nbsp;AI
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed mb-6 max-w-lg">
              Have natural voice conversations and get instant feedback on your grammar, vocabulary, and pronunciation — all powered by AI.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MicIcon className="h-4 w-4 text-blue-500" />
                Voice input
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                Grammar correction
              </span>
              <span className="inline-flex items-center gap-1.5">
                <SparklesIcon className="h-4 w-4 text-amber-500" />
                Smart suggestions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TranslateIcon className="h-4 w-4 text-violet-500" />
                Translation on tap
              </span>
            </div>
          </div>
        </section>

        {/* Quick start cards */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold tracking-tight mb-1">Start a conversation</h2>
          <p className="text-sm text-muted-foreground mb-5">Pick a mode that fits your mood</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Free conversation */}
            <Card
              className="cursor-pointer border-2 border-transparent hover:border-blue-500/30 transition-all hover:shadow-md group relative overflow-hidden"
              onClick={() => createChat('general')}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-6 relative">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xl mb-4">
                  💬
                </div>
                <h3 className="font-semibold mb-1.5">Free Chat</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Open conversation about anything you like. Perfect for casual daily practice.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">Casual</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">Any topic</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">Beginner friendly</span>
                </div>
              </CardContent>
            </Card>

            {/* Roleplay */}
            <Card
              className="cursor-pointer border-2 border-transparent hover:border-amber-500/30 transition-all hover:shadow-md group relative overflow-hidden"
              onClick={() => { setSelectedTab('roleplay'); setShowNewChatDialog(true); }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-6 relative">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl mb-4">
                  🎭
                </div>
                <h3 className="font-semibold mb-1.5">Roleplay</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Simulate real-life situations — order food, attend interviews, check into a hotel.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">{roleplayScenarios.length} scenarios</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">Immersive</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">Practical</span>
                </div>
              </CardContent>
            </Card>

            {/* Topics */}
            <Card
              className="cursor-pointer border-2 border-transparent hover:border-emerald-500/30 transition-all hover:shadow-md group relative overflow-hidden"
              onClick={() => { setSelectedTab('topic'); setShowNewChatDialog(true); }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-6 relative">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl mb-4">
                  📚
                </div>
                <h3 className="font-semibold mb-1.5">Topics</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Dive into specific subjects to build vocabulary and confidence in focused areas.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">{topics.length} topics</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Focused</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Vocabulary</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Scenario/topic picker dialog */}
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pick a scenario</DialogTitle>
              <DialogDescription>
                Choose a scenario or topic, then start chatting
              </DialogDescription>
            </DialogHeader>

            <Input
              placeholder="Custom name (optional)"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
            />

            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="roleplay">Roleplay</TabsTrigger>
                <TabsTrigger value="topic">Topics</TabsTrigger>
              </TabsList>

              <TabsContent value="roleplay" className="mt-3 max-h-72 overflow-y-auto">
                <div className="grid gap-1">
                  {roleplayScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      className="flex items-start gap-3 p-3 rounded-lg text-left hover:bg-muted/60 transition-colors"
                      onClick={() => createChat('roleplay', scenario.id)}
                      disabled={isCreating}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-sm shrink-0 mt-0.5">🎭</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{scenario.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{scenario.description}</div>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="topic" className="mt-3 max-h-72 overflow-y-auto">
                <div className="grid gap-1">
                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      className="flex items-start gap-3 p-3 rounded-lg text-left hover:bg-muted/60 transition-colors"
                      onClick={() => createChat('topic', topic.id)}
                      disabled={isCreating}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-sm shrink-0 mt-0.5">📚</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{topic.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{topic.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Recent conversations */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight mb-0.5">Recent conversations</h2>
              {chats.length > 0 && (
                <p className="text-xs text-muted-foreground">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <ChatBubbleIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No conversations yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Start your first conversation above — pick Free Chat to jump right in, or choose a scenario.
                </p>
              </CardContent>
            </Card>
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
                        <h3 className="text-sm font-medium line-clamp-2 mb-2">{chat.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(chat.updatedAt)}
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

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
