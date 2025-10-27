import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';

type Language = 'en' | 'tr' | 'de' | 'ru' | 'ar';
type Translations = { [key: string]: any };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('tr');
  const [translations, setTranslations] = useState<{ [key in Language]: Translations } | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTranslations() {
      try {
        const responses = await Promise.all([
          fetch('/i18n/translations/en.json'),
          fetch('/i18n/translations/tr.json'),
          fetch('/i18n/translations/de.json'),
          fetch('/i18n/translations/ru.json'),
          fetch('/i18n/translations/ar.json'),
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

  const t = (key: string): string => {
    if (!translations) return key;

    const currentTranslations = translations[language] || translations.en;
    
    // Direct lookup for flat keys
    if (currentTranslations && typeof currentTranslations[key] === 'string') {
        return currentTranslations[key];
    }
    
    // Fallback to English if not found in the current language
    const fallbackTranslations = translations.en;
    if (fallbackTranslations && typeof fallbackTranslations[key] === 'string') {
        return fallbackTranslations[key];
    }
    
    // If not found anywhere, return the key
    return key;
  };
  
  const value = useMemo(() => ({ language, setLanguage, t }), [language, translations]);
  
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
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};