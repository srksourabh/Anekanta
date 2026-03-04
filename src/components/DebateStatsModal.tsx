'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';

interface DebateStatsModalProps {
  debateId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DebateStatsModal({ debateId, isOpen, onClose }: DebateStatsModalProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, debateId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-heading font-bold text-stone-800">Debate Statistics</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-stone-400 py-8">Loading stats...</div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold text-stone-800">{stats.total_arguments}</p>
                  <p className="text-xs text-stone-500 mt-1">Claims</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold text-stone-800">{stats.total_votes}</p>
                  <p className="text-xs text-stone-500 mt-1">Votes</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold text-stone-800">{stats.total_comments}</p>
                  <p className="text-xs text-stone-500 mt-1">Comments</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold text-stone-800">{stats.unique_participants}</p>
                  <p className="text-xs text-stone-500 mt-1">Contributors</p>
                </div>
              </div>

              {/* Pro/Con Ratio */}
              <div className="card p-4">
                <p className="text-sm font-medium text-stone-700 mb-3">Pro vs Con</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden flex">
                    {(stats.pro_count + stats.con_count) > 0 && (
                      <>
                        <div
                          className="bg-green-500 h-full"
                          style={{ width: `${(stats.pro_count / (stats.pro_count + stats.con_count)) * 100}%` }}
                        />
                        <div
                          className="bg-red-500 h-full"
                          style={{ width: `${(stats.con_count / (stats.pro_count + stats.con_count)) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-700 font-medium">Pro: {stats.pro_count}</span>
                  <span className="text-red-700 font-medium">Con: {stats.con_count}</span>
                </div>
              </div>

              {/* Depth Info */}
              <div className="card p-4">
                <p className="text-sm font-medium text-stone-700 mb-2">Debate Depth</p>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Max depth:</span>
                  <span className="font-medium text-stone-800">{stats.max_depth} levels</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-stone-600">Avg votes/claim:</span>
                  <span className="font-medium text-stone-800">{(stats.avg_vote_score ?? 0).toFixed(1)}</span>
                </div>
              </div>

              {/* Top Contributors */}
              {stats.top_contributors && stats.top_contributors.length > 0 && (
                <div className="card p-4">
                  <p className="text-sm font-medium text-stone-700 mb-3">Top Contributors</p>
                  <div className="space-y-2">
                    {stats.top_contributors.slice(0, 5).map((contributor: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: contributor.avatar_color }}
                          />
                          <span className="text-stone-700 truncate">{contributor.display_name}</span>
                        </div>
                        <span className="text-xs text-stone-500">{contributor.argument_count} claims</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-stone-400 py-8">Failed to load stats</div>
          )}
        </div>
      </div>
    </div>
  );
}
