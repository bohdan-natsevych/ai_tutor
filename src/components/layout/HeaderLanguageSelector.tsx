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

interface HeaderLanguageSelectorProps {
  className?: string;
}

export function HeaderLanguageSelector({ className }: HeaderLanguageSelectorProps) {
  const { ui, setUISettings } = useSettingsStore();
  const hydrated = useHydration();

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
        <GlobeIcon className="h-3.5 w-3.5 opacity-70 mr-1" />
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent align="end">
        {INTERFACE_LANGUAGES.map((lang) => (
          <SelectItem key={lang.id} value={lang.id} className="text-xs">
            <span className="flex items-center gap-2">
              <span className="text-xs">{lang.id === 'en' ? 'EN' : lang.flag}</span>
              <span>{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
