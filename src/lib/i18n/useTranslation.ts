import { useSettingsStore } from '@/stores/settingsStore';
import { translations, type TranslationKey } from './translations';

/**
 * Returns a `t(key)` function that resolves translation keys
 * to the current interface language.
 *
 * Interface language is resolved as:
 *  - If `ui.interfaceLanguage` is 'auto' → use `language.mother`
 *  - Otherwise → use the explicit value
 *
 * Falls back to English if a key is missing for the resolved language.
 */
import { useHydration } from '@/hooks/useHydration';

/**
 * Returns a `t(key)` function that resolves translation keys
 * to the current interface language.
 *
 * Interface language is resolved as:
 *  - If `ui.interfaceLanguage` is 'auto' → use `language.mother`
 *  - Otherwise → use the explicit value
 *
 * Falls back to English if a key is missing for the resolved language.
 */
export function useTranslation() {
  const interfaceLanguage = useSettingsStore((s) => s.ui.interfaceLanguage);
  const motherLanguage = useSettingsStore((s) => s.language.mother);
  const hydrated = useHydration();

  // During SSR/pre-hydration, default to English to match server
  const lang = !hydrated ? 'en' : (interfaceLanguage === 'auto' ? motherLanguage : interfaceLanguage);
  const dict = translations[lang] ?? translations.en;
  const fallback = translations.en;

  const t = (key: TranslationKey): string => {
    return dict[key] ?? fallback[key] ?? key;
  };

  return { t, lang };
}
