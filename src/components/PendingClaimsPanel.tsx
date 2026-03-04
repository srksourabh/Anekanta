'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/components/LanguageProvider';

interface PendingClaimsPanelProps {
  debateId: string;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function PendingClaimsPanel({ debateId, onClose, onRefresh }: PendingClaimsPanelProps) {
  const { t } = useLanguage();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadPending = async () => {
    const res = await fetch(`/api/debates/${debateId}/pending`);
    if (res.ok) {
      const data = await res.json();
      setClaims(data.claims || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadPending(); }, [debateId]);

  const handleAction = async (claimId: string, action: 'approve' | 'reject') => {
    setProcessing(claimId);
    const res = await fetch(`/api/debates/${debateId}/pending`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId, action }),
    });
    if (res.ok) {
      await loadPending();
      if (action === 'approve') await onRefresh();
    }
    setProcessing(null);
  };

  return (
    <div className="side-panel">
      <div className="sticky top-0 bg-white border-b border-stone-200 z-10 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-800">{t('suggestions_pending')}</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        {loading && <p className="text-sm text-stone-400 text-center py-4">{t('loading')}...</p>}

        {!loading && claims.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-8">No pending claims</p>
        )}

        {claims.map(claim => (
          <div key={claim.id} className={`card p-4 border-l-4 ${claim.type === 'pro' ? 'border-green-400' : 'border-red-400'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge text-[10px] uppercase ${
                claim.type === 'pro' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {claim.type === 'pro' ? t('debate_pro') : t('debate_con')}
              </span>
              <span className="text-xs text-stone-400">
                {claim.author_name} &middot; {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-stone-700 mb-3">{claim.content}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(claim.id, 'approve')}
                disabled={processing === claim.id}
                className="btn-pro text-xs"
              >
                {t('suggestions_approve')}
              </button>
              <button
                onClick={() => handleAction(claim.id, 'reject')}
                disabled={processing === claim.id}
                className="btn-con text-xs"
              >
                {t('suggestions_reject')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed inset-0 bg-black/20 -z-10" onClick={onClose} />
    </div>
  );
}
