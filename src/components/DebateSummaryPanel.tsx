'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { PerspectiveTag } from '@/components/PerspectiveTag';

interface SummaryData {
  topPro: { id: string; content: string; score: number; perspective?: string }[];
  topCon: { id: string; content: string; score: number; perspective?: string }[];
  perspectiveBreakdown: { perspective: string; count: number }[];
  stats: {
    totalArguments: number;
    totalVotes: number;
    totalParticipants: number;
    avgDepth: number;
    proCount: number;
    conCount: number;
  };
  takeaways: { id: string; content: string; author_name?: string }[];
}

interface DebateSummaryPanelProps {
  debateId: string;
  onClose: () => void;
}

export function DebateSummaryPanel({ debateId, onClose }: DebateSummaryPanelProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/debates/${debateId}/impact`).then(r => r.ok ? r.json() : null),
      fetch(`/api/debates/${debateId}/summaries`).then(r => r.ok ? r.json() : { summaries: [] }),
    ]).then(([impactData, summariesData]) => {
      if (impactData) {
        setData({
          ...impactData,
          takeaways: (summariesData.summaries || []).filter((s: any) => s.summary_type === 'key_takeaway'),
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [debateId]);

  if (loading) {
    return (
      <div className="side-panel">
        <div className="p-4 text-center text-stone-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="side-panel">
        <div className="p-4 text-center text-stone-400 text-sm">{t('summary_no_data')}</div>
      </div>
    );
  }

  return (
    <div className="side-panel">
      <div className="sticky top-0 bg-white border-b border-stone-200 p-4 flex items-center justify-between z-10">
        <h2 className="font-heading font-bold text-stone-800 text-lg">{t('summary_title')}</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-stone-50 rounded-lg">
            <div className="text-lg font-bold text-stone-800">{data.stats.totalArguments}</div>
            <div className="text-[10px] text-stone-500">{t('summary_arguments')}</div>
          </div>
          <div className="text-center p-3 bg-stone-50 rounded-lg">
            <div className="text-lg font-bold text-stone-800">{data.stats.totalVotes}</div>
            <div className="text-[10px] text-stone-500">{t('summary_votes')}</div>
          </div>
          <div className="text-center p-3 bg-stone-50 rounded-lg">
            <div className="text-lg font-bold text-stone-800">{data.stats.totalParticipants}</div>
            <div className="text-[10px] text-stone-500">{t('summary_participants')}</div>
          </div>
        </div>

        {/* Pro/Con Balance */}
        <div>
          <h3 className="text-sm font-medium text-stone-700 mb-2">{t('summary_balance')}</h3>
          <div className="flex h-3 rounded-full overflow-hidden bg-stone-100">
            {data.stats.proCount > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(data.stats.proCount / data.stats.totalArguments) * 100}%` }}
              />
            )}
            {data.stats.conCount > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(data.stats.conCount / data.stats.totalArguments) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1 text-[10px]">
            <span className="text-green-600 font-medium">{data.stats.proCount} Pro</span>
            <span className="text-red-600 font-medium">{data.stats.conCount} Con</span>
          </div>
        </div>

        {/* Top Pro Arguments */}
        <div>
          <h3 className="text-sm font-medium text-green-700 mb-2">{t('summary_top_pro')}</h3>
          {data.topPro.length === 0 ? (
            <p className="text-xs text-stone-400 italic">{t('summary_none')}</p>
          ) : (
            <div className="space-y-2">
              {data.topPro.map((a, i) => (
                <div key={a.id} className="p-2.5 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-green-600">#{i + 1}</span>
                    <span className="text-[10px] text-stone-400">Impact: {a.score}</span>
                    {a.perspective && <PerspectiveTag perspective={a.perspective} size="sm" />}
                  </div>
                  <p className="text-xs text-stone-700 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Con Arguments */}
        <div>
          <h3 className="text-sm font-medium text-red-700 mb-2">{t('summary_top_con')}</h3>
          {data.topCon.length === 0 ? (
            <p className="text-xs text-stone-400 italic">{t('summary_none')}</p>
          ) : (
            <div className="space-y-2">
              {data.topCon.map((a, i) => (
                <div key={a.id} className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold text-red-600">#{i + 1}</span>
                    <span className="text-[10px] text-stone-400">Impact: {a.score}</span>
                    {a.perspective && <PerspectiveTag perspective={a.perspective} size="sm" />}
                  </div>
                  <p className="text-xs text-stone-700 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Perspective Breakdown */}
        {data.perspectiveBreakdown.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-2">{t('summary_perspectives')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.perspectiveBreakdown.map(p => (
                <div key={p.perspective} className="flex items-center gap-1">
                  <PerspectiveTag perspective={p.perspective} size="sm" />
                  <span className="text-[10px] text-stone-500">({p.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Takeaways */}
        {data.takeaways.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-2">{t('summary_takeaways')}</h3>
            <div className="space-y-2">
              {data.takeaways.map(tk => (
                <div key={tk.id} className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs text-stone-700">{tk.content}</p>
                  {tk.author_name && (
                    <p className="text-[10px] text-stone-400 mt-1">— {tk.author_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Depth Info */}
        <div className="text-xs text-stone-400 border-t border-stone-100 pt-3">
          {t('summary_avg_depth')}: {data.stats.avgDepth.toFixed(1)}
        </div>
      </div>

      <div className="fixed inset-0 bg-black/20 -z-10" onClick={onClose} />
    </div>
  );
}
