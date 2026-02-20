'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArgumentNode } from '@/components/ArgumentNode';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useLanguage } from '@/components/LanguageProvider';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function DebatePage() {
  const params = useParams();
  const debateId = params.id as string;
  const { t, getCategoryLabel } = useLanguage();
  const [debate, setDebate] = useState<any>(null);
  const [thesis, setThesis] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tree' | 'activity'>('tree');

  const loadDebate = useCallback(async () => {
    const res = await fetch(`/api/debates/${debateId}`);
    if (res.ok) {
      const data = await res.json();
      setDebate(data.debate);
      setThesis(data.thesis);
    }
    setLoading(false);
  }, [debateId]);

  useEffect(() => {
    loadDebate();
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setUser).catch(() => {});
  }, [loadDebate]);

  const handleAddArgument = async (parentId: string, content: string, type: 'pro' | 'con') => {
    const res = await fetch(`/api/debates/${debateId}/arguments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, content, type }),
    });
    if (res.ok) {
      await loadDebate(); // Reload tree
    }
  };

  const handleVote = async (argId: string, value: number) => {
    await fetch(`/api/arguments/${argId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    await loadDebate();
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-stone-400">Loading debate...</div>;
  if (!debate) return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-stone-500">Debate not found</div>;

  const proCount = thesis?.children?.filter((c: any) => c.type === 'pro').length || 0;
  const conCount = thesis?.children?.filter((c: any) => c.type === 'con').length || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/debates" className="text-sm text-stone-500 hover:text-stone-700 mb-2 inline-block">&larr; All debates</Link>
        <div className="flex items-start gap-2 mb-2">
          <span className="badge bg-earth-100 text-earth-700 text-[10px] capitalize mt-1">{getCategoryLabel(debate.category)}</span>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-stone-800">{debate.title}</h1>
        </div>
        {debate.description && <p className="text-stone-500 mb-3 max-w-3xl">{debate.description}</p>}
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span>{t('debates_by')} <span className="font-medium" style={{ color: debate.author_color }}>{debate.author_name}</span></span>
          <span>{formatDistanceToNow(new Date(debate.created_at), { addSuffix: true })}</span>
          <span>{debate.argument_count} {t('debates_arguments')}</span>
          <span>{debate.vote_count} {t('debates_votes')}</span>
        </div>
      </div>

      {/* Pro/Con summary bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm font-medium text-green-700">{proCount} {t('debate_pro_count')}</span>
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden flex">
            {(proCount + conCount) > 0 && (
              <>
                <div className="bg-green-500 h-full transition-all" style={{ width: `${(proCount / (proCount + conCount)) * 100}%` }} />
                <div className="bg-red-500 h-full transition-all" style={{ width: `${(conCount / (proCount + conCount)) * 100}%` }} />
              </>
            )}
          </div>
          <span className="text-sm font-medium text-red-700">{conCount} {t('debate_con_count')}</span>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-lg p-1 w-fit">
        <button onClick={() => setView('tree')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'tree' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
          {t('debate_arguments_tab')}
        </button>
        <button onClick={() => setView('activity')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'activity' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
          {t('debate_activity')}
        </button>
      </div>

      {/* Content */}
      {view === 'tree' ? (
        <div>
          {!user && (
            <div className="bg-saffron-50 border border-saffron-200 rounded-lg p-3 mb-4 text-sm text-saffron-800">
              <Link href="/auth/login" className="font-medium underline">Sign in</Link> to add arguments, vote, and comment.
            </div>
          )}
          {thesis ? (
            <ArgumentNode
              arg={thesis}
              debateId={debateId}
              onAddArgument={handleAddArgument}
              onVote={handleVote}
              isLoggedIn={!!user}
            />
          ) : (
            <p className="text-stone-400">No thesis found.</p>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ActivityFeed debateId={debateId} limit={30} />
        </div>
      )}
    </div>
  );
}
