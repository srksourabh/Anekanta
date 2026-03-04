'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface VoteSegmentBarProps {
  argId: string;
  score: number;
  userVote: number | null;
  type: string;
  onVote: (argId: string, value: number) => Promise<void>;
  isLoggedIn: boolean;
  compact?: boolean;
}

const TYPE_COLORS: Record<string, { filled: string; light: string }> = {
  thesis: { filled: '#2563eb', light: '#bfdbfe' },
  pro: { filled: '#16a34a', light: '#bbf7d0' },
  con: { filled: '#dc2626', light: '#fecaca' },
};

/**
 * A horizontal segment bar showing vote score.
 * Each segment is clickable (0-4 vote scale).
 * Filled segments represent the score, colored by argument type.
 */
export function VoteSegmentBar({
  argId, score, userVote, type, onVote, isLoggedIn, compact = false,
}: VoteSegmentBarProps) {
  const { t } = useLanguage();
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [currentVote, setCurrentVote] = useState(userVote);

  const colors = TYPE_COLORS[type] || TYPE_COLORS.thesis;
  const VOTE_LABELS = ['No impact', t('vote_low'), t('vote_medium'), t('vote_high'), t('vote_decisive')];

  // Score determines how many segments are "filled"
  // We show 8 segments total; fill proportional to score
  const totalSegments = 8;
  const maxScore = 20; // rough max expected score
  const filledCount = Math.min(totalSegments, Math.max(0, Math.ceil((score / maxScore) * totalSegments)));

  const handleVote = async (value: number) => {
    if (!isLoggedIn) return;
    const newValue = currentVote === value ? 0 : value;
    setCurrentVote(newValue === 0 ? null : newValue);
    await onVote(argId, newValue);
  };

  const segHeight = compact ? 'h-2' : 'h-2.5';
  const segWidth = compact ? 'w-3' : 'w-4';

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex gap-[2px]"
        onMouseLeave={() => setHoveredValue(null)}
      >
        {Array.from({ length: totalSegments }).map((_, i) => {
          // Map segment index to vote value (0-4) — first 2 segments = vote 1, next 2 = vote 2, etc.
          const voteValue = Math.min(4, Math.floor((i / totalSegments) * 5) + 1);
          const isFilled = i < filledCount;
          const isHoverFilled = hoveredValue !== null && voteValue <= hoveredValue;
          const isUserVoted = currentVote !== null && voteValue <= currentVote;

          return (
            <button
              key={i}
              onClick={() => handleVote(voteValue)}
              onMouseEnter={() => setHoveredValue(voteValue)}
              disabled={!isLoggedIn}
              className={`${segWidth} ${segHeight} rounded-[2px] transition-all ${!isLoggedIn ? 'cursor-default' : 'cursor-pointer'}`}
              style={{
                backgroundColor: isUserVoted
                  ? colors.filled
                  : isHoverFilled
                    ? colors.light
                    : isFilled
                      ? colors.filled
                      : '#e7e5e4',
                opacity: isUserVoted ? 1 : isFilled ? (0.5 + (i / totalSegments) * 0.5) : 0.6,
              }}
              title={isLoggedIn ? VOTE_LABELS[voteValue] : 'Sign in to vote'}
            />
          );
        })}
      </div>
      {hoveredValue !== null && (
        <span className="text-[10px] text-stone-500 whitespace-nowrap">{VOTE_LABELS[hoveredValue]}</span>
      )}
    </div>
  );
}
