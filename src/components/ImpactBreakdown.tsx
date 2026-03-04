'use client';

import { useLanguage } from '@/components/LanguageProvider';

interface ImpactBreakdownProps {
  impact: {
    score: number;
    voteWeight: number;
    responseDepth: number;
    engagement: number;
    descendants: number;
  };
}

export function ImpactBreakdown({ impact }: ImpactBreakdownProps) {
  const { t } = useLanguage();

  const factors = [
    { label: t('impact_vote_weight'), value: impact.voteWeight, max: 40, color: '#0d9488' },
    { label: t('impact_response_depth'), value: impact.responseDepth, max: 20, color: '#c47a2e' },
    { label: t('impact_engagement'), value: impact.engagement, max: 20, color: '#6366f1' },
    { label: t('impact_descendants'), value: impact.descendants, max: 20, color: '#ec4899' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">{t('impact_score')}</span>
        <span className="text-lg font-bold" style={{ color: impact.score >= 50 ? '#0d9488' : '#9ca3af' }}>
          {impact.score}
        </span>
      </div>

      <div className="space-y-2">
        {factors.map(f => (
          <div key={f.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-stone-500">{f.label}</span>
              <span className="text-xs font-medium text-stone-600">{Math.round(f.value)}/{f.max}</span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(f.value / f.max) * 100}%`, backgroundColor: f.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
