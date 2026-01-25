import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  allowedLanguages: string[];
  disabled?: boolean;
}

const LANGUAGE_LABELS: Record<string, { label: string; icon: string }> = {
  c: { label: 'C', icon: '🔵' },
  cpp: { label: 'C++', icon: '🔷' },
  java: { label: 'Java', icon: '☕' },
  python: { label: 'Python', icon: '🐍' },
};

export function LanguageSelector({
  value,
  onChange,
  allowedLanguages,
  disabled = false,
}: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {allowedLanguages.map((lang) => {
          const langInfo = LANGUAGE_LABELS[lang];
          return (
            <SelectItem key={lang} value={lang}>
              <span className="flex items-center gap-2">
                <span>{langInfo?.icon}</span>
                <span>{langInfo?.label || lang}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
