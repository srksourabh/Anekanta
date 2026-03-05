'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface TranslateButtonProps {
  text: string;
  className?: string;
}

export function TranslateButton({ text, className = '' }: TranslateButtonProps) {
  const { locale } = useLanguage();
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (!text || text.length < 10) return null;

  const handleTranslate = async () => {
    if (translated) {
      setTranslated(null);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const target = locale === 'en' ? 'bn' : locale;
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target }),
      });
      const data = await res.json();
      if (data.translated) {
        setTranslated(data.translated);
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
        className="text-[10px] text-teal-600 hover:text-teal-700 hover:underline ml-1"
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
