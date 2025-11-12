import * as React from 'react';
import { useLanguage, Language } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ChevronDown } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedLanguage = languages.find(l => l.code === language) || languages[0];

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm text-sm font-medium transition-colors border ${
          theme === 'light'
            ? 'bg-[var(--drip-card)] border-[var(--drip-border)] text-[var(--drip-text)] hover:bg-[var(--drip-surface)]'
            : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
        }`}
      >
        <span aria-hidden="true">{selectedLanguage.flag}</span>
        <span className="sr-only">{selectedLanguage.name}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full right-0 mt-2 w-48 rounded-lg shadow-lg z-20 animate-fade-in-up origin-top-right border ${
            theme === 'light'
              ? 'bg-[var(--drip-card)] border-[var(--drip-border)]'
              : 'bg-neutral-800 border-neutral-700'
          }`}
        >
          <ul className="py-1">
            {languages.map(lang => (
              <li key={lang.code}>
                <button
                  onClick={() => {
                    setLanguage(lang.code as Language);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    theme === 'light'
                      ? 'text-[var(--drip-text)] hover:bg-[var(--drip-surface)]'
                      : 'text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
