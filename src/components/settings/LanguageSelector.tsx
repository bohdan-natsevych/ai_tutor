'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/lib/i18n/useTranslation';

import { LANGUAGES } from '@/lib/i18n/translations';

const DIALECTS: Record<string, Array<{ id: string; name: string }>> = {
  en: [
    { id: 'american', name: 'American English' },
    { id: 'british', name: 'British English' },
    { id: 'australian', name: 'Australian English' },
  ],
};

export function LanguageSelector() {
  const { language, setLanguageSettings } = useSettingsStore();
  const { t } = useTranslation();
  const dialects = DIALECTS[language.learning] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.lang.title')}</CardTitle>
        <CardDescription>
          {t('settings.lang.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language to learn */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.lang.learning')}</label>
          <Select
            value={language.learning}
            onValueChange={(value) => setLanguageSettings({ learning: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.lang.selectLanguage')} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dialect selection (if available) */}
        {dialects.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('settings.lang.dialect')}</label>
            <Select
              value={language.dialect}
              onValueChange={(value) => setLanguageSettings({ dialect: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.lang.selectDialect')} />
              </SelectTrigger>
              <SelectContent>
                {dialects.map((dialect) => (
                  <SelectItem key={dialect.id} value={dialect.id}>
                    {dialect.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mother language */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.lang.native')}</label>
          <Select
            value={language.mother}
            onValueChange={(value) => setLanguageSettings({ mother: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.lang.selectNative')} />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('settings.lang.nativeHint')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
