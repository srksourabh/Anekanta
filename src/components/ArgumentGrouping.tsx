'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { PerspectiveTag, PERSPECTIVES } from '@/components/PerspectiveTag';

interface ArgumentGroupingProps {
  onFilterChange: (perspective: string | null) => void;
  activeFilter: string | null;
  counts: Record<string, number>;
}

export function ArgumentGrouping({ onFilterChange, activeFilter, counts }: ArgumentGroupingProps) {
  const { t } = useLanguage();
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onFilterChange(null)}
        className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
          activeFilter === null
            ? 'bg-stone-700 text-white'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        {t('filter_all')} ({total})
      </button>
      {PERSPECTIVES.map(p => {
        const count = counts[p] || 0;
        if (count === 0) return null;
        return (
          <button
            key={p}
            onClick={() => onFilterChange(activeFilter === p ? null : p)}
            className={`transition-opacity ${activeFilter && activeFilter !== p ? 'opacity-40' : ''}`}
          >
            <PerspectiveTag perspective={p} size="sm" />
            <span className="text-[9px] text-stone-400 ml-0.5">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
