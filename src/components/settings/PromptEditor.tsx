'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/stores/settingsStore';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { useTranslation } from '@/lib/i18n/useTranslation';

// CURSOR: PromptEditor Component
// Allows users to customize AI prompts for different conversation types

export function PromptEditor() {
  const { prompts, setCustomPrompt } = useSettingsStore();
  const { t } = useTranslation();
  const [editedPrompts, setEditedPrompts] = useState({
    system: prompts.system || '',
    analysis: prompts.analysis || '',
  });

  const handleSave = (key: 'system' | 'analysis') => {
    if (editedPrompts[key].trim()) {
      setCustomPrompt(key, editedPrompts[key]);
    } else {
      // Clear custom prompt to use default
      setCustomPrompt(key, '');
    }
  };

  const handleReset = (key: 'system' | 'analysis') => {
    setEditedPrompts(prev => ({ ...prev, [key]: '' }));
    setCustomPrompt(key, '');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.prompts.title')}</CardTitle>
        <CardDescription>
          {t('settings.prompts.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system">{t('settings.prompts.systemTab')}</TabsTrigger>
            <TabsTrigger value="analysis">{t('settings.prompts.analysisTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">{t('settings.prompts.tutorPersonality')}</label>
                {prompts.system && (
                  <span className="text-xs text-green-600">{t('common.custom')}</span>
                )}
              </div>
              <Textarea
                placeholder={t('settings.prompts.systemPlaceholder')}
                value={editedPrompts.system}
                onChange={(e) => setEditedPrompts(prev => ({ ...prev, system: e.target.value }))}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.prompts.systemHint')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleSave('system')} 
                size="sm"
                disabled={editedPrompts.system === (prompts.system || '')}
              >
                {t('settings.prompts.saveChanges')}
              </Button>
              <Button 
                onClick={() => handleReset('system')} 
                size="sm" 
                variant="outline"
                disabled={!prompts.system && !editedPrompts.system}
              >
                {t('settings.prompts.resetToDefault')}
              </Button>
              <Button
                onClick={() => setEditedPrompts(prev => ({ ...prev, system: SYSTEM_PROMPTS.tutor }))}
                size="sm"
                variant="ghost"
              >
                {t('settings.prompts.viewDefault')}
              </Button>
            </div>

            {/* Default prompt preview */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                {t('settings.prompts.showDefaultSystem')}
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto whitespace-pre-wrap">
                {SYSTEM_PROMPTS.tutor}
              </pre>
            </details>
          </TabsContent>

          <TabsContent value="analysis" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">{t('settings.prompts.analysisLabel')}</label>
                {prompts.analysis && (
                  <span className="text-xs text-green-600">{t('common.custom')}</span>
                )}
              </div>
              <Textarea
                placeholder={t('settings.prompts.analysisPlaceholder')}
                value={editedPrompts.analysis}
                onChange={(e) => setEditedPrompts(prev => ({ ...prev, analysis: e.target.value }))}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.prompts.analysisHint')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleSave('analysis')} 
                size="sm"
                disabled={editedPrompts.analysis === (prompts.analysis || '')}
              >
                {t('settings.prompts.saveChanges')}
              </Button>
              <Button 
                onClick={() => handleReset('analysis')} 
                size="sm" 
                variant="outline"
                disabled={!prompts.analysis && !editedPrompts.analysis}
              >
                {t('settings.prompts.resetToDefault')}
              </Button>
              <Button
                onClick={() => setEditedPrompts(prev => ({ ...prev, analysis: SYSTEM_PROMPTS.unifiedResponseAudio }))}
                size="sm"
                variant="ghost"
              >
                {t('settings.prompts.viewDefault')}
              </Button>
            </div>

            {/* Default prompt preview */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                {t('settings.prompts.showDefaultAnalysis')}
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto whitespace-pre-wrap">
                {SYSTEM_PROMPTS.unifiedResponseAudio}
              </pre>
            </details>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
