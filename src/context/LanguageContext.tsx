import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../utils/translations';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    if (user && (user as any).language && Object.keys(translations).includes((user as any).language)) {
      setLanguageState((user as any).language as Language);
    } else {
      const savedLang = localStorage.getItem('taskops_language') as Language;
      if (savedLang && Object.keys(translations).includes(savedLang)) {
        setLanguageState(savedLang);
      }
    }
  }, [user]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('taskops_language', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations['en'][key] || key;
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
