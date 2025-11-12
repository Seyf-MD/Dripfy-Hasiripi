import * as React from 'react';
import { Language } from '../i18n/LanguageContext';
import { footerContent, FooterContent } from '../data/footerContent';
import { legalContent, LegalPageKey } from '../data/legalContent';

interface WebsiteCopyData {
  legalContent: Record<LegalPageKey, Record<Language, string>>;
  footer: FooterContent;
}

const defaultCopy: WebsiteCopyData = {
  legalContent,
  footer: footerContent,
};

interface WebsiteCopyContextValue {
  copy: WebsiteCopyData;
  refresh: () => Promise<void>;
  ready: boolean;
}

const WebsiteCopyContext = React.createContext<WebsiteCopyContextValue | undefined>(undefined);

export const WebsiteCopyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [copy, setCopy] = React.useState<WebsiteCopyData>(defaultCopy);
  const [ready, setReady] = React.useState(false);

  const loadCopy = React.useCallback(async () => {
    try {
      const response = await fetch('/api/legal-copy', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to load legal copy');
      }
      const data = await response.json();
      if (data?.ok && data.data) {
        setCopy(data.data);
      }
    } catch (error) {
      console.error('[website-copy] Unable to load copy:', error);
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    loadCopy();
  }, [loadCopy]);

  const refresh = React.useCallback(async () => {
    await loadCopy();
  }, [loadCopy]);

  return (
    <WebsiteCopyContext.Provider value={{ copy, refresh, ready }}>
      {children}
    </WebsiteCopyContext.Provider>
  );
};

export function useWebsiteCopy() {
  const context = React.useContext(WebsiteCopyContext);
  if (!context) {
    throw new Error('useWebsiteCopy must be used within a WebsiteCopyProvider');
  }
  return context;
}
