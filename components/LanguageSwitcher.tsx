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
        className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold transition-all duration-300 ios-glass hover:scale-105 active:scale-95 shadow-md border border-white/20 text-[var(--drip-text)] dark:text-white"
      >
        <span aria-hidden="true" className="text-lg">{selectedLanguage.flag}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-48 ios-glass rounded-2xl shadow-xl z-20 animate-fade-in-up origin-top-right border border-white/20 overflow-hidden backdrop-blur-xl"
          style={{ backgroundColor: theme === 'dark' ? 'rgba(22, 22, 24, 0.95)' : 'rgba(255, 255, 255, 0.9)' }}
        >
          <ul className="py-2">
            {languages.map(lang => (
              <li key={lang.code}>
                <button
                  onClick={() => {
                    setLanguage(lang.code as Language);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/10 ${language === lang.code ? 'bg-[var(--drip-primary)]/10 text-[var(--drip-primary)]' : 'text-[var(--drip-text)] dark:text-neutral-200'}`}
                >
                  <span className="text-xl shadow-sm rounded-sm">{lang.flag}</span>
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
