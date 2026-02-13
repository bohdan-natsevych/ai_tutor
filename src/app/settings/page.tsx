'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { HeaderLanguageSelector } from '@/components/layout/HeaderLanguageSelector';
import { VoiceSelector } from '@/components/settings/VoiceSelector';
import { AIProviderSelector } from '@/components/settings/AIProviderSelector';
import { ContextSettings } from '@/components/settings/ContextSettings';
import { PromptEditor } from '@/components/settings/PromptEditor';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { INTERFACE_LANGUAGES } from '@/lib/i18n/translations';

export default function SettingsPage() {
  const { ui, setUISettings, translation, setTranslationSettings, resetToDefaults } = useSettingsStore();
  const { t } = useTranslation();

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
          <div>
            <h1 className="text-xl font-bold">{t('settings.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('settings.subtitle')}</p>
          </div>
          <HeaderLanguageSelector className="ml-auto" />
        </div>
      </header>

      {/* Settings content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Language Settings */}
        <LanguageSelector />

        {/* Voice Settings */}
        <VoiceSelector />

        {/* AI Settings */}
        <AIProviderSelector />

        {/* Context & Summarization Settings */}
        <ContextSettings />

        {/* Custom Prompts */}
        <PromptEditor />

        {/* Translation Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.translation.title')}</CardTitle>
            <CardDescription>
              {t('settings.translation.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Translation Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">{t('settings.translation.richTranslation')}</label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.translation.richTranslationDesc')}
                </p>
              </div>
              <Switch
                checked={translation.mode === 'rich'}
                onCheckedChange={(checked) => setTranslationSettings({ mode: checked ? 'rich' : 'simple' })}
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              {translation.mode === 'simple' ? (
                <p>{t('settings.translation.simpleNote')}</p>
              ) : (
                <p>{t('settings.translation.richNote')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* UI Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.interface.title')}</CardTitle>
            <CardDescription>
              {t('settings.interface.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Listen-first mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">{t('settings.interface.listenFirst')}</label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.interface.listenFirstDesc')}
                </p>
              </div>
              <Switch
                checked={ui.listenFirstMode}
                onCheckedChange={(checked) => setUISettings({ listenFirstMode: checked })}
              />
            </div>

            <Separator />

            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">{t('settings.interface.theme')}</label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.interface.themeDesc')}
                </p>
              </div>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((theme) => (
                  <Button
                    key={theme}
                    variant={ui.theme === theme ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUISettings({ theme })}
                    className="capitalize"
                  >
                    {theme === 'light' ? t('settings.interface.themeLight') : theme === 'dark' ? t('settings.interface.themeDark') : t('settings.interface.themeSystem')}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Interface Language */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">{t('settings.interface.language')}</label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.interface.languageDesc')}
                </p>
              </div>
              <Select
                value={ui.interfaceLanguage}
                onValueChange={(value) => setUISettings({ interfaceLanguage: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERFACE_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.id === 'auto' ? t('settings.interface.languageAuto') : lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reset */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t('settings.reset.title')}</CardTitle>
            <CardDescription>
              {t('settings.reset.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (confirm(t('settings.reset.confirm'))) {
                  resetToDefaults();
                }
              }}
            >
              {t('settings.reset.button')}
            </Button>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
