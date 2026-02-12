'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/stores/settingsStore';

const LANGUAGES = [
  { id: 'en', name: 'English', flag: 'en' },
  { id: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { id: 'de', name: 'German', flag: '🇩🇪' },
  { id: 'fr', name: 'French', flag: '🇫🇷' },
  { id: 'es', name: 'Spanish', flag: '🇪🇸' },
  { id: 'it', name: 'Italian', flag: '🇮🇹' },
  { id: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { id: 'pl', name: 'Polish', flag: '🇵🇱' },
  { id: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { id: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { id: 'ko', name: 'Korean', flag: '🇰🇷' },
];

const DIALECTS: Record<string, Array<{ id: string; name: string }>> = {
  en: [
    { id: 'american', name: 'American English' },
    { id: 'british', name: 'British English' },
    { id: 'australian', name: 'Australian English' },
  ],
};

export function LanguageSelector() {
  const { language, setLanguageSettings } = useSettingsStore();
  const dialects = DIALECTS[language.learning] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language Settings</CardTitle>
        <CardDescription>
          Configure your learning and native languages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language to learn */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Language to Learn</label>
          <Select
            value={language.learning}
            onValueChange={(value) => setLanguageSettings({ learning: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
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
            <label className="text-sm font-medium">Dialect</label>
            <Select
              value={language.dialect}
              onValueChange={(value) => setLanguageSettings({ dialect: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dialect" />
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
          <label className="text-sm font-medium">Native Language</label>
          <Select
            value={language.mother}
            onValueChange={(value) => setLanguageSettings({ mother: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your native language" />
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
            Translations will be shown in this language
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
