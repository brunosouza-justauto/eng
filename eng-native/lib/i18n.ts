import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import pt from '../locales/pt.json';

const LOCALE_KEY = '@app/locale';

export type SupportedLocale = 'en' | 'pt';

export const supportedLocales: { code: SupportedLocale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
];

/**
 * Get device locale, defaulting to English if not Portuguese
 */
function getDeviceLocale(): SupportedLocale {
  const locales = Localization.getLocales();
  const deviceLocale = locales[0]?.languageCode || 'en';
  if (deviceLocale === 'pt') return 'pt';
  return 'en';
}

/**
 * Get stored locale from AsyncStorage (async)
 */
export async function getStoredLocale(): Promise<SupportedLocale | null> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'pt') return stored;
    return null;
  } catch {
    return null;
  }
}

/**
 * Save locale preference to AsyncStorage
 */
export async function setStoredLocale(locale: SupportedLocale): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCALE_KEY, locale);
  } catch (error) {
    console.error('[i18n] Error saving locale:', error);
  }
}

/**
 * Get initial locale - device locale for first run
 */
export function getInitialLocale(): SupportedLocale {
  return getDeviceLocale();
}

/**
 * Initialize i18n and load stored locale if available
 */
export async function initializeI18n(): Promise<void> {
  const storedLocale = await getStoredLocale();
  if (storedLocale && i18n.language !== storedLocale) {
    await i18n.changeLanguage(storedLocale);
  }
}

// Initialize i18n with device locale, will be updated after checking storage
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: getInitialLocale(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
