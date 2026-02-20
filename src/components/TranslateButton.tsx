'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface TranslateButtonProps {
  text: string;
  className?: string;
}

const LANG_CODES: Record<string, string> = {
  en: 'en',
  bn: 'bn',
  hi: 'hi',
};

export function TranslateButton({ text, className = '' }: TranslateButtonProps) {
  const { locale } = useLanguage();
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (locale === 'en') return null; // No need to translate if UI is in English (most content is English)

  const handleTranslate = async () => {
    if (translated) {
      setTranslated(null);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const target = LANG_CODES[locale] || 'en';
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|${target}`
      );
      const data = await res.json();
      if (data.responseData?.translatedText) {
        setTranslated(data.responseData.translatedText);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <span className={className}>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="text-[10px] text-saffron-600 hover:text-saffron-700 hover:underline ml-1"
        title={translated ? 'Show original' : 'Translate'}
      >
        {loading ? '...' : translated ? '↩' : '🌐'}
      </button>
      {translated && (
        <span className="block text-xs text-stone-500 italic mt-0.5">{translated}</span>
      )}
      {error && (
        <span className="block text-[10px] text-red-400 mt-0.5">Translation unavailable</span>
      )}
    </span>
  );
}
