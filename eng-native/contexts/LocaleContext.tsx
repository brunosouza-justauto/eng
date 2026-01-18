import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import i18n, {
  SupportedLocale,
  supportedLocales,
  getStoredLocale,
  setStoredLocale,
  getInitialLocale,
} from '../lib/i18n';

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  supportedLocales: typeof supportedLocales;
  isInitialized: boolean;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load stored locale on mount
  useEffect(() => {
    async function loadStoredLocale() {
      const stored = await getStoredLocale();
      if (stored && stored !== locale) {
        setLocaleState(stored);
        i18n.changeLanguage(stored);
      }
      setIsInitialized(true);
    }
    loadStoredLocale();
  }, []);

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    await setStoredLocale(newLocale);
    await i18n.changeLanguage(newLocale);
  }, []);

  // Keep i18n in sync with locale state
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, supportedLocales, isInitialized }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

export default LocaleContext;
