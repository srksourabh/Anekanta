'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CommentSection } from './CommentSection';
import { useLanguage } from '@/components/LanguageProvider';

type PanelTab = 'comments' | 'history' | 'sources' | 'stats';

interface ClaimSidePanelProps {
  argumentId: string;
  debateId: string;
  isLoggedIn: boolean;
  initialTab?: PanelTab;
  onClose: () => void;
}

export function ClaimSidePanel({ argumentId, debateId, isLoggedIn, initialTab = 'comments', onClose }: ClaimSidePanelProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<PanelTab>(initialTab);

  const tabs: { key: PanelTab; label: string; icon: string }[] = [
    { key: 'comments', label: t('panel_comments'), icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { key: 'history', label: t('panel_history'), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'sources', label: t('panel_sources'), icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { key: 'stats', label: t('panel_vote_stats'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  return (
    <div className="side-panel">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-stone-200 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-800">Claim Details</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors
                ${activeTab === tab.key
                  ? 'text-saffron-600 border-b-2 border-saffron-500'
                  : 'text-stone-500 hover:text-stone-700'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'comments' && (
          <CommentSection argumentId={argumentId} isLoggedIn={isLoggedIn} />
        )}
        {activeTab === 'history' && (
          <EditHistoryTab argumentId={argumentId} />
        )}
        {activeTab === 'sources' && (
          <SourcesTab argumentId={argumentId} debateId={debateId} />
        )}
        {activeTab === 'stats' && (
          <VoteStatsTab argumentId={argumentId} />
        )}
      </div>

      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 -z-10" onClick={onClose} />
    </div>
  );
}

// --- Sub-components for each tab ---

function EditHistoryTab({ argumentId }: { argumentId: string }) {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/arguments/${argumentId}/history`)
      .then(r => r.ok ? r.json() : null)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [argumentId]);

  if (loading) return <div className="text-sm text-stone-400 py-4 text-center">Loading...</div>;
  if (!history) return <div className="text-sm text-stone-400 py-4 text-center">No history available</div>;

  return (
    <div className="space-y-4">
      {/* Creation event */}
      {history.created && (
        <div className="border-l-2 border-earth-300 pl-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-earth-100 text-earth-700 text-[10px]">Created</span>
            <span className="text-xs text-stone-500">
              {history.created.author_name}
              {history.created.created_at && (
                <> &middot; {formatDistanceToNow(new Date(history.created.created_at), { addSuffix: true })}</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Edit events */}
      {(history.edits || []).map((edit: any) => (
        <div key={edit.id} className="border-l-2 border-saffron-300 pl-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-saffron-100 text-saffron-700 text-[10px]">Edited</span>
            <span className="text-xs text-stone-500">
              {edit.author_name}
              {edit.created_at && (
                <> &middot; {formatDistanceToNow(new Date(edit.created_at), { addSuffix: true })}</>
              )}
            </span>
          </div>
          <div className="text-xs space-y-1">
            <p className="text-red-600 line-through bg-red-50 px-2 py-1 rounded">{edit.old_content}</p>
            <p className="text-green-600 bg-green-50 px-2 py-1 rounded">{edit.new_content}</p>
          </div>
        </div>
      ))}

      {(history.edits || []).length === 0 && (
        <p className="text-sm text-stone-400 text-center py-4">No edits have been made</p>
      )}
    </div>
  );
}

function SourcesTab({ argumentId, debateId }: { argumentId: string; debateId: string }) {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/debates/${debateId}/sources`)
      .then(r => r.ok ? r.json() : { sources: [] })
      .then(data => {
        // Filter to sources for this specific argument
        const filtered = (data.sources || []).filter((s: any) => s.argument_id === argumentId);
        setSources(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [argumentId, debateId]);

  if (loading) return <div className="text-sm text-stone-400 py-4 text-center">Loading...</div>;

  return (
    <div className="space-y-3">
      {sources.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-4">No sources cited for this claim</p>
      ) : (
        sources.map((source: any) => (
          <div key={source.id} className="card p-3 border-l-2 border-earth-300">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-saffron-600 hover:text-saffron-700 break-all"
            >
              {source.url}
            </a>
            {source.quote && (
              <p className="text-xs text-stone-500 italic mt-1">&ldquo;{source.quote}&rdquo;</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function VoteStatsTab({ argumentId }: { argumentId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/arguments/${argumentId}/vote-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [argumentId]);

  if (loading) return <div className="text-sm text-stone-400 py-4 text-center">Loading...</div>;
  if (!stats) return <div className="text-sm text-stone-400 py-4 text-center">No vote data</div>;

  const labels = ['No Impact', 'Low', 'Medium', 'High', 'Decisive'];
  const maxCount = Math.max(...stats.distribution, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-stone-700">{stats.total} total votes</span>
        <span className="text-sm text-stone-500">Avg: {stats.average}</span>
      </div>

      {/* Bar chart */}
      <div className="space-y-2">
        {stats.distribution.map((count: number, idx: number) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-stone-500 w-16 text-right">{labels[idx]}</span>
            <div className="flex-1 h-6 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-saffron-500"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-stone-600 font-medium w-6">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
