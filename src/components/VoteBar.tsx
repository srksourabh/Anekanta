'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface VoteBarProps {
  argId: string;
  score: number;
  userVote: number | null;
  onVote: (argId: string, value: number) => Promise<void>;
  isLoggedIn: boolean;
}

export function VoteBar({ argId, score, userVote, onVote, isLoggedIn }: VoteBarProps) {
  const { t } = useLanguage();
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [currentVote, setCurrentVote] = useState(userVote);
  const [currentScore, setCurrentScore] = useState(score);

  const VOTE_LABELS = ['No impact', t('vote_low'), t('vote_medium'), t('vote_high'), t('vote_decisive')];

  const handleVote = async (value: number) => {
    if (!isLoggedIn) return;
    const newValue = currentVote === value ? 0 : value;
    setCurrentVote(newValue === 0 ? null : newValue);
    await onVote(argId, newValue);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-500 font-medium w-6 text-right">{currentScore}</span>
      <div className="flex gap-0.5" onMouseLeave={() => setHoveredValue(null)}>
        {[1, 2, 3, 4].map(v => (
          <button
            key={v}
            onClick={() => handleVote(v)}
            onMouseEnter={() => setHoveredValue(v)}
            disabled={!isLoggedIn}
            className={`w-5 h-5 rounded-sm transition-all text-[9px] font-bold
              ${currentVote === v
                ? 'bg-saffron-500 text-white'
                : hoveredValue && v <= hoveredValue
                  ? 'bg-saffron-200 text-saffron-700'
                  : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
              }
              ${!isLoggedIn ? 'cursor-default' : 'cursor-pointer'}
            `}
            title={isLoggedIn ? VOTE_LABELS[v] : 'Sign in to vote'}
          >
            {v}
          </button>
        ))}
      </div>
      {hoveredValue && (
        <span className="text-[10px] text-stone-500">{VOTE_LABELS[hoveredValue]}</span>
      )}
    </div>
  );
}
