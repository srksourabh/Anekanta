'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { TranslateButton } from '@/components/TranslateButton';

interface GuidedVotingProps {
  debateId: string;
  onVote: (argId: string, value: number) => Promise<void>;
  onClose: () => void;
}

export function GuidedVoting({ debateId, onVote, onClose }: GuidedVotingProps) {
  const { t } = useLanguage();
  const [claims, setClaims] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    fetch(`/api/debates/${debateId}/unvoted`)
      .then(r => r.ok ? r.json() : { claims: [] })
      .then(data => setClaims(data.claims || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debateId]);

  const currentClaim = claims[currentIndex];
  const remaining = claims.length - currentIndex;

  const handleVote = async (value: number) => {
    if (!currentClaim || voting) return;
    setVoting(true);
    await onVote(currentClaim.id, value);
    setVoting(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const VOTE_LABELS = ['No Impact', t('vote_low'), t('vote_medium'), t('vote_high'), t('vote_decisive')];
  const VOTE_COLORS = ['bg-stone-200', 'bg-teal-200', 'bg-teal-300', 'bg-teal-400', 'bg-teal-600'];
  const VOTE_TEXT_COLORS = ['text-stone-600', 'text-teal-700', 'text-teal-800', 'text-white', 'text-white'];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-stone-500">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-bold text-stone-800">{t('guided_voting')}</h2>
            <p className="text-xs text-stone-500">{t('guided_voting_desc')}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2 bg-stone-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-stone-500">
              {claims.length > 0 ? currentIndex + 1 : 0} / {claims.length}
            </span>
            <span className="text-xs text-stone-500">
              {remaining > 0 ? `${remaining} ${t('guided_remaining')}` : ''}
            </span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${claims.length > 0 ? (currentIndex / claims.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!currentClaim ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-green-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-heading font-bold text-stone-800 mb-2">{t('guided_done')}</p>
              <button onClick={onClose} className="btn-primary mt-4">{t('guided_exit')}</button>
            </div>
          ) : (
            <>
              {/* Claim type badge */}
              <div className="mb-3">
                <span className={`badge text-[10px] uppercase tracking-wider ${
                  currentClaim.type === 'pro' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {currentClaim.type === 'pro' ? t('debate_pro') : t('debate_con')}
                </span>
              </div>

              {/* Claim content */}
              <div className="card p-4 mb-6">
                <p className="text-stone-800 text-base leading-relaxed">
                  {currentClaim.content}
                  <TranslateButton text={currentClaim.content} />
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-stone-400">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: currentClaim.author_color || '#0f766e' }}
                  >
                    {(currentClaim.author_name || '?')[0].toUpperCase()}
                  </div>
                  <span>{currentClaim.author_name}</span>
                </div>
              </div>

              {/* Vote buttons */}
              <p className="text-xs text-stone-500 uppercase tracking-wider font-medium mb-3 text-center">
                Rate Claim&apos;s Impact
              </p>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map(v => (
                  <button
                    key={v}
                    onClick={() => handleVote(v)}
                    disabled={voting}
                    className={`w-full py-3 rounded-lg font-medium text-sm transition-all ${VOTE_COLORS[v]} ${VOTE_TEXT_COLORS[v]} hover:opacity-90 disabled:opacity-50`}
                  >
                    {v} — {VOTE_LABELS[v]}
                  </button>
                ))}
              </div>

              {/* Skip button */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleSkip}
                  className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
                >
                  {t('guided_skip')} &rarr;
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
