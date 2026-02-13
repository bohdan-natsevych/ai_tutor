'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageAnalysisPopup } from './MessageAnalysis';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function AnalysisPanel() {
  const analysisPanelOpen = useChatStore((s) => s.analysisPanelOpen);
  const analysisPanelMessageId = useChatStore((s) => s.analysisPanelMessageId);
  const messages = useChatStore((s) => s.messages);
  const setAnalysisPanelOpen = useChatStore((s) => s.setAnalysisPanelOpen);
  const language = useSettingsStore((s) => s.language);
  const { t, lang } = useTranslation();

  // Find the message whose analysis to display
  const targetMessage = useMemo(() => {
    if (analysisPanelMessageId) {
      return messages.find((m) => m.id === analysisPanelMessageId) ?? null;
    }
    // Fallback: latest user message with analysis
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].analysis) {
        return messages[i];
      }
    }
    return null;
  }, [analysisPanelMessageId, messages]);

  // Compute message index for display (1-based, user messages only)
  const userMessageIndex = useMemo(() => {
    if (!targetMessage) return 0;
    let idx = 0;
    for (const m of messages) {
      if (m.role === 'user') idx++;
      if (m.id === targetMessage.id) return idx;
    }
    return 0;
  }, [targetMessage, messages]);

  if (!analysisPanelOpen) return null;

  const hasAnalysis = targetMessage?.analysis;

  return (
    <div className="w-[380px] shrink-0 border-l bg-background flex flex-col h-full overflow-hidden">
      {/* Panel header removed as per user request */}


      {/* Message indicator */}
      {targetMessage && (
        <div className="px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0 text-xs">
              {t('settings.context.messages')} #{userMessageIndex}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {formatTime(targetMessage.createdAt, lang)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
            &ldquo;{targetMessage.content}&rdquo;
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {hasAnalysis ? (
          <MessageAnalysisPopup
            analysis={targetMessage.analysis!}
            motherLanguage={language.mother}
            learningLanguage={language.learning}
          />
        ) : targetMessage ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground">
            <AnalysisIcon className="h-8 w-8 mb-3 opacity-40" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground">
            <AnalysisIcon className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{t('chat.analysis.startPrompt')}</p>
            <p className="text-xs mt-1 opacity-70">
              {t('chat.analysis.autoPrompt')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}


function AnalysisIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 7v2" />
      <path d="M12 13h.01" />
    </svg>
  );
}


function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
