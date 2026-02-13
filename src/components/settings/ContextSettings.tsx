'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/lib/i18n/useTranslation';

// CURSOR: Context Settings Component
// Configures conversation context management and summarization behavior

export function ContextSettings() {
  const { context, setContextSettings } = useSettingsStore();
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.context.title')}</CardTitle>
        <CardDescription>
          {t('settings.context.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Disable summarization toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">{t('settings.context.disableSummarization')}</label>
            <p className="text-xs text-muted-foreground">
              {t('settings.context.disableSummarizationDesc')}
            </p>
          </div>
          <Switch
            checked={context.disableSummarization}
            onCheckedChange={(checked) => setContextSettings({ disableSummarization: checked })}
          />
        </div>

        {/* Settings only shown when summarization is enabled */}
        {!context.disableSummarization && (
          <>
            <Separator />

            {/* Recent window size */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">{t('settings.context.recentWindow')}</label>
                <span className="text-sm text-muted-foreground">{context.recentWindowSize} {t('settings.context.messages')}</span>
              </div>
              <Slider
                value={[context.recentWindowSize]}
                min={5}
                max={50}
                step={5}
                onValueChange={([value]) => setContextSettings({ recentWindowSize: value })}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.context.recentWindowDesc')}
              </p>
            </div>

            <Separator />

            {/* Summarize after N messages */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">{t('settings.context.summarizeEvery')}</label>
                <span className="text-sm text-muted-foreground">{context.summarizeAfterMessages} {t('settings.context.messages')}</span>
              </div>
              <Slider
                value={[context.summarizeAfterMessages]}
                min={5}
                max={30}
                step={5}
                onValueChange={([value]) => setContextSettings({ summarizeAfterMessages: value })}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.context.summarizeEveryDesc')}
              </p>
            </div>


          </>
        )}

        {/* Token savings estimate */}
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-1">{t('settings.context.tokenSavings')}</h4>
          <p className="text-xs text-muted-foreground">
            {context.disableSummarization 
              ? t('settings.context.noSavings')
              : `With window size ${context.recentWindowSize}: ~50-70% token reduction for long conversations`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
