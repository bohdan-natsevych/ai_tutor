'use client';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useSettingsStore } from '@/stores/settingsStore';
import { useHydration } from '@/hooks/useHydration';
import { cn } from '@/lib/utils';
import { INTERFACE_LANGUAGES } from '@/lib/i18n/translations';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface HeaderLanguageSelectorProps {
  className?: string;
}

export function HeaderLanguageSelector({ className }: HeaderLanguageSelectorProps) {
  const { ui, setUISettings } = useSettingsStore();
  const hydrated = useHydration();
  const { t } = useTranslation();

  if (!hydrated) {
    return (
      <div className={cn("h-8 w-[140px] bg-muted/50 rounded animate-pulse", className)} />
    );
  }

  return (
    <Select
      value={ui.interfaceLanguage}
      onValueChange={(value) => setUISettings({ interfaceLanguage: value })}
    >
      <SelectTrigger 
        className={cn(
          "h-8 w-[140px] text-xs bg-muted/50 border-transparent hover:bg-muted focus:ring-0 focus:ring-offset-0 gap-1", 
          className
        )}
      >
        <span className="font-semibold opacity-70 mr-1">{t('common.language')}</span>
        <SelectValue placeholder="EN">
          {(() => {
            if (!ui.interfaceLanguage || ui.interfaceLanguage === 'auto') {
              return 'Auto';
            }
            const selected = INTERFACE_LANGUAGES.find(l => l.id === ui.interfaceLanguage);
            return selected ? selected.id.toUpperCase() : 'EN';
          })()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {INTERFACE_LANGUAGES.map((lang) => (
          <SelectItem key={lang.id} value={lang.id} className="text-xs">
            <span className="flex items-center gap-2">
              <span className="text-xs">{lang.flag}</span>
              <span>{lang.id === 'auto' ? 'Auto' : lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
