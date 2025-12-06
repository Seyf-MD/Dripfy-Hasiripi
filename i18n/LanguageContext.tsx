import * as React from 'react';

export type Language = 'en' | 'tr' | 'de' | 'ru' | 'ar';
type Translations = { [key: string]: any };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = React.useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('dripfy_language');
      if (saved && ['en', 'tr', 'de', 'ru', 'ar'].includes(saved)) {
        return saved as Language;
      }
    }
    return 'tr';
  });
  const [translations, setTranslations] = React.useState<{ [key in Language]: Translations } | null>(null);
  const [loadingError, setLoadingError] = React.useState<string | null>(null);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dripfy_language', lang);
    }
  };

  React.useEffect(() => {
    async function loadTranslations() {
      try {
        const timestamp = new Date().getTime();
        const responses = await Promise.all([
          fetch(`/i18n/translations/en.json?v=${timestamp}`),
          fetch(`/i18n/translations/tr.json?v=${timestamp}`),
          fetch(`/i18n/translations/de.json?v=${timestamp}`),
          fetch(`/i18n/translations/ru.json?v=${timestamp}`),
          fetch(`/i18n/translations/ar.json?v=${timestamp}`),
        ]);

        for (const res of responses) {
          if (!res.ok) {
            throw new Error(`Failed to fetch ${res.url}: ${res.statusText}`);
          }
        }

        const [en, tr, de, ru, ar] = await Promise.all(responses.map(res => res.json()));

        setTranslations({ en, tr, de, ru, ar });
      } catch (error) {
        console.error("Failed to load translations:", error);
        setLoadingError(error instanceof Error ? error.message : "An unknown error occurred");
      }
    }
    loadTranslations();
  }, []);

  // Updated translation function to handle nested keys
  const t = (key: string): string => {
    if (!translations) return key;

    const resolve = (path: string, obj: any): string | undefined => {
      return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
      }, obj);
    };

    const currentTranslations = translations[language];
    let translation = resolve(key, currentTranslations);

    if (typeof translation === 'string') {
      return translation;
    }

    // Fallback to English if translation is not found in the current language
    if (language !== 'en') {
      const fallbackTranslations = translations.en;
      translation = resolve(key, fallbackTranslations);
      if (typeof translation === 'string') {
        return translation;
      }
    }

    // If not found anywhere, return the key itself
    return key;
  };

  const value = React.useMemo(() => ({ language, setLanguage: handleSetLanguage, t }), [language, translations]);

  if (loadingError) {
    return (
      <div style={{ color: 'red', padding: '20px', backgroundColor: '#111', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#ff4d4d', fontSize: '24px' }}>Error Loading Application</h1>
        <p style={{ color: 'white', marginTop: '10px' }}>Could not load language files. Please check the console for details.</p>
        <pre style={{ marginTop: '20px', backgroundColor: '#000', padding: '15px', borderRadius: '5px', color: '#ffb3b3', maxWidth: '80vw', overflowX: 'auto' }}>{loadingError}</pre>
      </div>
    );
  }

  if (!translations) {
    return (
      <div style={{ color: 'white', padding: '20px', backgroundColor: '#111', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '24px', letterSpacing: '2px' }}>Loading Dashboard...</h1>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};