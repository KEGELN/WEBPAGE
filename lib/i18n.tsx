'use client';
// lib/i18n.tsx
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Import translation files
import enTranslations from '@/translations/en.json';
import deTranslations from '@/translations/de.json';

type Language = 'en' | 'de';
type Translations = typeof enTranslations;

const translations: Record<Language, Translations> = {
  en: enTranslations,
  de: deTranslations,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    // Check for saved language in localStorage or default to 'en'
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language');
      if (savedLang && (savedLang === 'en' || savedLang === 'de')) {
        return savedLang as Language;
      }
    }
    return 'en'; // Default language
  });

  // Update HTML lang attribute when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      localStorage.setItem('language', language);
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    if (typeof value === 'string') {
      return value;
    }

    // If translation not found in current language, try English as fallback
    if (language !== 'en') {
      value = translations['en'];
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }
      if (typeof value === 'string') {
        return value;
      }
    }

    return fallback || key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export { type Language };
