'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SelectableText } from './SelectableText';
import type { MessageAnalysis } from '@/stores/chatStore';
import { ttsManager } from '@/lib/tts/manager';

// CURSOR: Section label translations keyed by mother language code
const SECTION_LABELS: Record<string, Record<string, string>> = {
  uk: {
    messageAnalysis: 'Аналіз повідомлення',
    grammar: 'Граматика',
    vocabulary: 'Словниковий запас',
    relevance: 'Відповідність',
    pronunciation: 'Вимова',
    grammarCorrections: 'Граматичні виправлення',
    vocabularyTips: 'Поради щодо словникового запасу',
    alternativePhrasings: 'Інші способи сказати це',
    contextRelevance: 'Відповідність контексту',
    overallFeedback: 'Загальний відгук',
    heard: 'Почуто',
    noMispronunciations: 'Значних помилок у вимові не виявлено.',
    heardAs: 'почуто як',
  },
  ru: {
    messageAnalysis: 'Анализ сообщения',
    grammar: 'Грамматика',
    vocabulary: 'Словарный запас',
    relevance: 'Релевантность',
    pronunciation: 'Произношение',
    grammarCorrections: 'Грамматические исправления',
    vocabularyTips: 'Советы по словарному запасу',
    alternativePhrasings: 'Другие способы сказать это',
    contextRelevance: 'Соответствие контексту',
    overallFeedback: 'Общий отзыв',
    heard: 'Услышано',
    noMispronunciations: 'Значительных ошибок в произношении не обнаружено.',
    heardAs: 'услышано как',
  },
  en: {
    messageAnalysis: 'Message Analysis',
    grammar: 'Grammar',
    vocabulary: 'Vocabulary',
    relevance: 'Relevance',
    pronunciation: 'Pronunciation',
    grammarCorrections: 'Grammar Corrections',
    vocabularyTips: 'How to Improve Your Vocabulary',
    alternativePhrasings: 'Other Ways to Say This',
    contextRelevance: 'Context Relevance',
    overallFeedback: 'Overall Feedback',
    heard: 'Heard',
    noMispronunciations: 'No clear mispronunciations detected.',
    heardAs: 'heard as',
  },
};

function getLabels(motherLanguage: string) {
  return SECTION_LABELS[motherLanguage] || SECTION_LABELS.en;
}

interface MessageAnalysisPopupProps {
  analysis: MessageAnalysis;
  motherLanguage?: string;
  learningLanguage?: string;
  className?: string;
}

export function MessageAnalysisPopup({ analysis, motherLanguage = 'uk', learningLanguage = 'en', className = '' }: MessageAnalysisPopupProps) {
  const labels = getLabels(motherLanguage);

  // CURSOR: Defensive defaults for potentially undefined fields
  const grammarErrors = analysis.grammarErrors ?? [];
  const vocabularySuggestions = analysis.vocabularySuggestions ?? [];
  const alternativePhrasings = analysis.alternativePhrasings ?? [];
  const grammarScore = analysis.grammarScore ?? 70;
  const vocabularyScore = analysis.vocabularyScore ?? 70;
  const relevanceScore = analysis.relevanceScore ?? 80;
  const relevanceFeedback = analysis.relevanceFeedback;
  const overallFeedback = analysis.overallFeedback ?? 'Analysis complete.';
  const pronunciation = analysis.pronunciation;
  const pronunciationScore = pronunciation?.pronunciationScore ?? null;
  const mispronunciations = pronunciation?.mispronunciations ?? [];
  const pronunciationFeedback = pronunciation?.pronunciationFeedback ?? '';

  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopPronunciationAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingKey(null);
  };

  const playPronunciation = async (text: string, key: string) => {
    stopPronunciationAudio();
    setPlayingKey(key);
    try {
      const audioData = await ttsManager.synthesize(text);
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setPlayingKey(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setPlayingKey(null);
      };
      await audio.play();
    } catch (error) {
      console.error('Pronunciation playback failed:', error);
      setPlayingKey(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '👏';
    if (score >= 80) return '👍';
    if (score >= 70) return '💪';
    if (score >= 60) return '🤔';
    return '📚';
  };

  // CURSOR: Average score - includes pronunciation if available, excludes fluency
  const scores = [grammarScore, vocabularyScore, relevanceScore];
  if (pronunciationScore !== null) scores.push(pronunciationScore);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div className="p-4 pb-2 border-b bg-background">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{labels.messageAnalysis}</span>
          <Badge variant="secondary" className="text-lg">
            {averageScore}/100
          </Badge>
        </div>
      </div>
      
      <div>
        <div className="p-4 pb-12">
          {/* Score Overview - pronunciation in top cards when available */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <ScoreCard
              label={labels.grammar}
              score={grammarScore}
              color={getScoreColor(grammarScore)}
            />
            <ScoreCard
              label={labels.vocabulary}
              score={vocabularyScore}
              color={getScoreColor(vocabularyScore)}
            />
            <ScoreCard
              label={labels.relevance}
              score={relevanceScore}
              color={getScoreColor(relevanceScore)}
            />
            {pronunciationScore !== null && (
              <ScoreCard
                label={labels.pronunciation}
                score={pronunciationScore}
                color={getScoreColor(pronunciationScore)}
              />
            )}
          </div>

          {/* CURSOR: Show relevance feedback when score is low or feedback exists */}
          {(relevanceScore < 60 || relevanceFeedback) && (
            <div className="mb-4">
              <Separator className="my-4" />
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full ${relevanceScore < 60 ? 'bg-orange-500' : 'bg-blue-500'} text-white text-xs flex items-center justify-center`}>?</span>
                <span>{labels.contextRelevance}</span>
              </h4>
              {relevanceFeedback ? (
                <SelectableText text={relevanceFeedback} className="text-sm text-muted-foreground" />
              ) : relevanceScore < 60 ? (
                <p className="text-sm text-muted-foreground">
                  Your response may not have been directly related to the previous question or topic. 
                  Try to address what was asked before changing the subject.
                </p>
              ) : null}
            </div>
          )}

          {/* Grammar Errors */}
          {grammarErrors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">!</span>
                <span>{labels.grammarCorrections}</span>
              </h4>
              <div className="space-y-2">
                {grammarErrors.map((error, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="line-through text-muted-foreground">{error.original}</span>
                      <span className="text-green-600">-&gt;</span>
                      <span className="font-medium text-green-600">{error.correction}</span>
                    </div>
                    <SelectableText text={error.explanation} className="text-sm text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vocabulary Suggestions */}
          {vocabularySuggestions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">i</span>
                <span>{labels.vocabularyTips}</span>
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {vocabularySuggestions.map((suggestion, index) => (
                  <li key={index} className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <SelectableText text={suggestion} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternative Phrasings with inline translate */}
          {alternativePhrasings.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">+</span>
                <span>{labels.alternativePhrasings}</span>
              </h4>
              <div className="space-y-2">
                {alternativePhrasings.map((phrase, index) => (
                  <div key={index} className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-1">
                      <SelectableText text={phrase} className="text-sm italic flex-1" />
                      <TranslateInline
                        text={phrase}
                        motherLanguage={motherLanguage}
                        learningLanguage={learningLanguage}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CURSOR: Pronunciation details (transcribed text, mispronunciations) */}
          {pronunciation && (
            <div className="mb-4">
              <Separator className="my-4" />
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">🎤</span>
                <span>{labels.pronunciation}</span>
              </h4>
              {pronunciation.transcribedText && (
                <p className="text-sm text-muted-foreground mb-3">
                  {labels.heard}: <em>{pronunciation.transcribedText}</em>
                </p>
              )}
              {mispronunciations.length > 0 ? (
                <div className="space-y-2">
                  {mispronunciations.map((item, index) => {
                    const key = `${item.word}-${index}`;
                    return (
                      <div key={key} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.word || 'Unknown'}</span>
                              <span className="text-muted-foreground">{labels.heardAs}</span>
                              <span className="text-muted-foreground">{item.heardAs || '-'}</span>
                            </div>
                            {item.correctPronunciation && (
                              <div className="text-xs text-muted-foreground">
                                IPA: {item.correctPronunciation}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => playPronunciation(item.word || '', key)}
                            disabled={!item.word || playingKey === key}
                          >
                            {playingKey === key ? '...' : '▶'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{labels.noMispronunciations}</p>
              )}
              {pronunciationFeedback && (
                <SelectableText text={pronunciationFeedback} className="text-sm text-muted-foreground mt-3" />
              )}
            </div>
          )}

          {/* Overall Feedback */}
          <div className="pt-4 mt-4 border-t">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>{getScoreLabel(averageScore)}</span>
              <span>{labels.overallFeedback}</span>
            </h4>
            <SelectableText text={overallFeedback} className="text-sm text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

// CURSOR: Inline translate button for learning-language content
function TranslateInline({ text, motherLanguage, learningLanguage }: { text: string; motherLanguage: string; learningLanguage: string }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async () => {
    if (translation) {
      setShowTranslation(!showTranslation);
      return;
    }
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: motherLanguage,
          sourceLanguage: learningLanguage,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setTranslation(data.translation.translatedText);
        setShowTranslation(true);
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex flex-col items-end shrink-0">
      <button
        onClick={handleTranslate}
        disabled={isTranslating}
        className="text-xs text-blue-500 hover:text-blue-700 px-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
        title="Translate"
      >
        {isTranslating ? '...' : showTranslation ? '✕' : '🌐'}
      </button>
      {showTranslation && translation && (
        <span className="text-xs text-muted-foreground italic mt-1">{translation}</span>
      )}
    </div>
  );
}

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{score}</span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
