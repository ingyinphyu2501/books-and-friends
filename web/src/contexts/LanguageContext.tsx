import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import en from '../locales/en.json';
import my from '../locales/my.json';

type Translations = typeof en;

type Language = 'en' | 'my';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, variables?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = { en, my };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (path: string, variables?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let value: any = translations[language];

    for (const key of keys) {
      if (value[key] === undefined) {
        return path;
      }
      value = value[key];
    }

    if (typeof value !== 'string') return path;

    if (variables) {
      Object.entries(variables).forEach(([key, val]) => {
        value = (value as string).replace(`{{${key}}}`, String(val));
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
