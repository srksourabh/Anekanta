'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, LOCALE_NAMES, t as translate, getCategoryLabel as getCatLabel } from '@/lib/i18n';

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  getCategoryLabel: (cat: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
  getCategoryLabel: (c) => c,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('anekanta-lang') as Locale;
    if (saved && ['en', 'bn', 'hi'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('anekanta-lang', l);
    document.documentElement.lang = l;
  };

  return (
    <LanguageContext.Provider value={{
      locale,
      setLocale,
      t: (key: string) => translate(locale, key as any),
      getCategoryLabel: (cat: string) => getCatLabel(locale, cat),
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  return (
    <div className="flex items-center gap-1">
      {(Object.entries(LOCALE_NAMES) as [Locale, string][]).map(([code, name]) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            locale === code
              ? 'bg-saffron-600 text-white font-bold'
              : 'bg-earth-100 text-earth-700 hover:bg-saffron-100'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
