'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArgumentNode } from '@/components/ArgumentNode';
import { DualColumnTree } from '@/components/DualColumnTree';
import { ActivityFeed } from '@/components/ActivityFeed';
import { TeamsPanel } from '@/components/TeamsPanel';
import { SourcesPanel } from '@/components/SourcesPanel';
import { DebateStatsModal } from '@/components/DebateStatsModal';
import { PerspectivesPanel } from '@/components/PerspectivesPanel';
import { GuidedVoting } from '@/components/GuidedVoting';
import { PendingClaimsPanel } from '@/components/PendingClaimsPanel';
import { ClaimSidePanel } from '@/components/ClaimSidePanel';
import { RolesPanel } from '@/components/RolesPanel';
import { DebateSettingsPanel } from '@/components/DebateSettingsPanel';
import { StructuredDebateLayout } from '@/components/StructuredDebateLayout';
import { DebateSummaryPanel } from '@/components/DebateSummaryPanel';
import { SunburstView } from '@/components/SunburstView';
import { HierarchyView } from '@/components/HierarchyView';
import { useLanguage } from '@/components/LanguageProvider';
import { getPathIds } from '@/lib/treeUtils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type ViewMode = 'dual' | 'tree' | 'activity' | 'sunburst' | 'hierarchy';

export default function DebatePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debateId = params.id as string;
  const { t, getCategoryLabel } = useLanguage();

  const [debate, setDebate] = useState<any>(null);
  const [thesis, setThesis] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('dual');
  const [showTeams, setShowTeams] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPerspectives, setShowPerspectives] = useState(false);
  const [showGuidedVoting, setShowGuidedVoting] = useState(false);
  const [showPendingClaims, setShowPendingClaims] = useState(false);
  const [sidePanelArg, setSidePanelArg] = useState<string | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<'comments' | 'history' | 'sources' | 'stats'>('comments');
  const [showEditDebate, setShowEditDebate] = useState(false);
  const [showDebateMenu, setShowDebateMenu] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [showDebateSettings, setShowDebateSettings] = useState(false);
  const [editFields, setEditFields] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');
  const [tags, setTags] = useState<{ id: string; tag: string }[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [impactScores, setImpactScores] = useState<Record<string, number>>({});
  const [creatingJournal, setCreatingJournal] = useState(false);

  // URL-as-state: current path through the argument tree
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  // Initialize path from URL
  useEffect(() => {
    const pathParam = searchParams.get('path');
    if (pathParam) {
      setCurrentPath(pathParam.split(','));
    }
  }, [searchParams]);

  // Update URL when path changes
  const handleNavigate = useCallback((path: string[]) => {
    setCurrentPath(path);
    const url = new URL(window.location.href);
    if (path.length > 1) {
      url.searchParams.set('path', path.join(','));
    } else {
      url.searchParams.delete('path');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  const loadDebate = useCallback(async () => {
    const res = await fetch(`/api/debates/${debateId}`);
    if (res.ok) {
      const data = await res.json();
      setDebate(data.debate);
      setThesis(data.thesis);
      // Set initial path to thesis if not already set
      if (currentPath.length === 0 && data.thesis) {
        setCurrentPath([data.thesis.id]);
      }
    }
    setLoading(false);
  }, [debateId, currentPath.length]);

  useEffect(() => {
    loadDebate();
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setUser).catch(() => {});
    fetch(`/api/debates/${debateId}/tags`).then(r => r.ok ? r.json() : { tags: [] }).then(d => setTags(d.tags || [])).catch(() => {});
    fetch(`/api/debates/${debateId}/impact`).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.impacts) {
        const map: Record<string, number> = {};
        for (const i of d.impacts) map[i.id] = i.score;
        setImpactScores(map);
      }
    }).catch(() => {});
  }, [loadDebate]);

  useEffect(() => {
    if (debate) {
      setEditFields({
        title: debate.title,
        description: debate.description,
        thesis: debate.thesis,
        category: debate.category,
        tagline: debate.tagline,
        conclusion: debate.conclusion,
        status: debate.status,
      });
    }
  }, [debate]);

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleAddArgument = async (parentId: string, content: string, type: 'pro' | 'con') => {
    if (!content) return;
    const res = await fetch(`/api/debates/${debateId}/arguments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, content, type }),
    });
    if (res.status === 202) {
      // Claim was submitted for approval
      setPendingMessage(t('suggestions_submitted'));
      setTimeout(() => setPendingMessage(null), 3000);
    } else if (res.ok) {
      await loadDebate();
    }
  };

  const handleOpenPanel = useCallback((argId: string, tab: 'comments' | 'history' | 'sources' | 'stats') => {
    setSidePanelArg(argId);
    setSidePanelTab(tab);
  }, []);

  const handleVote = async (argId: string, value: number) => {
    await fetch(`/api/arguments/${argId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    await loadDebate();
  };

  const handleEditDebate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/debates/${debateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editFields),
    });

    if (res.ok) {
      setShowEditDebate(false);
      await loadDebate();
    }
  };

  const handleDeleteDebate = async () => {
    if (!confirm('Are you sure you want to delete this debate? This action cannot be undone.')) return;

    const res = await fetch(`/api/debates/${debateId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      router.push('/debates');
    }
  };

  const handleCloseReopenDebate = async () => {
    const newStatus = debate.status === 'active' ? 'closed' : 'active';
    const res = await fetch(`/api/debates/${debateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      await loadDebate();
      setShowDebateMenu(false);
    }
  };

  const handleCreateJournal = async () => {
    if (!debate) return;
    setCreatingJournal(true);
    const res = await fetch('/api/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debateId: debate.id, title: `Journal: ${debate.title}` }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/journals/${data.id}/edit`);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed to create journal');
    }
    setCreatingJournal(false);
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-stone-400">{t('loading_debate')}</div>;
  if (!debate) return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-stone-500">{t('debate_not_found')}</div>;

  const proCount = thesis?.children?.filter((c: any) => c.type === 'pro').length || 0;
  const conCount = thesis?.children?.filter((c: any) => c.type === 'con').length || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/debates" className="text-sm text-stone-500 hover:text-stone-700 mb-2 inline-block">{t('all_debates_link')}</Link>
        <div className="flex items-start gap-2 mb-2">
          <span className="badge bg-earth-100 text-earth-700 text-[10px] capitalize mt-1">{getCategoryLabel(debate.category)}</span>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-stone-800">{debate.title}</h1>
        </div>
        {debate.description && <p className="text-stone-500 mb-3 max-w-3xl">{debate.description}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
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

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {/* View mode tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          <button onClick={() => setView('dual')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'dual' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            {t('view_dual_column')}
          </button>
          <button onClick={() => setView('tree')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'tree' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            {t('view_classic_tree')}
          </button>
          <button onClick={() => setView('activity')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'activity' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            {t('debate_activity')}
          </button>
          <button onClick={() => setView('sunburst')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'sunburst' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            {t('view_sunburst')}
          </button>
          <button onClick={() => setView('hierarchy')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'hierarchy' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
            {t('view_hierarchy')}
          </button>
        </div>

        {/* Sort toggle (for tree views) */}
        {(view === 'dual' || view === 'tree' || view === 'sunburst' || view === 'hierarchy') && (
          <div className="flex gap-1 bg-stone-100 rounded-lg p-1 ml-auto">
            <button onClick={() => setSortBy('votes')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === 'votes' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
              Top Votes
            </button>
            <button onClick={() => setSortBy('recent')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === 'recent' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
              Recent
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setShowTeams(true)} className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            Teams
          </button>
          <button onClick={() => setShowSources(true)} className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            Sources
          </button>
          <button onClick={() => setShowStats(true)} className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            Stats
          </button>
          <button onClick={() => setShowPerspectives(true)} className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            Perspectives
          </button>
          {user && (
            <button onClick={() => setShowGuidedVoting(true)} className="px-3 py-1.5 rounded-lg text-sm bg-saffron-100 text-saffron-700 hover:bg-saffron-200 transition-colors">
              {t('guided_voting_title')}
            </button>
          )}
          <button onClick={() => setShowSummary(true)} className="px-3 py-1.5 rounded-lg text-sm bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors">
            {t('understanding_btn')}
          </button>
          {user && (
            <button
              onClick={handleCreateJournal}
              disabled={creatingJournal}
              className="px-3 py-1.5 rounded-lg text-sm bg-earth-100 text-earth-700 hover:bg-earth-200 transition-colors disabled:opacity-50"
            >
              {creatingJournal ? '...' : t('journal_from_debate')}
            </button>
          )}
          {user && debate && (debate.author_id === user.id || user.role === 'admin') && debate.requires_approval === 1 && (
            <button onClick={() => setShowPendingClaims(true)} className="px-3 py-1.5 rounded-lg text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
              {t('suggestions_pending')}
            </button>
          )}
          {user && (debate.author_id === user.id || user.role === 'admin') && (
            <>
              <button onClick={() => setShowRoles(true)} className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
                {t('roles_title')}
              </button>
              <button onClick={() => setShowDebateSettings(true)} className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
                {t('debate_settings_title')}
              </button>
            </>
          )}

          {user && (debate.author_id === user.id || user.role === 'admin') && (
            <div className="relative">
              <button onClick={() => setShowDebateMenu(!showDebateMenu)} className="px-3 py-1.5 rounded-lg text-sm bg-earth-100 text-earth-700 hover:bg-earth-200 transition-colors">
                ⋮
              </button>
              {showDebateMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-stone-200 z-40">
                  <button
                    onClick={() => setShowEditDebate(true)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-stone-100 border-b border-stone-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleCloseReopenDebate}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-stone-100 border-b border-stone-100"
                  >
                    {debate.status === 'active' ? 'Close' : 'Reopen'}
                  </button>
                  <button
                    onClick={handleDeleteDebate}
                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {debate?.status !== 'active' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          This debate is {debate?.status}
        </div>
      )}

      {/* Content */}
      {view === 'dual' ? (
        <StructuredDebateLayout debate={debate} tags={tags}>
          {!user && (
            <div className="bg-saffron-50 border border-saffron-200 rounded-lg p-3 mb-4 text-sm text-saffron-800">
              <Link href="/auth/login" className="font-medium underline">{t('sign_in_prompt')}</Link> {t('sign_in_to_participate')}
            </div>
          )}
          {thesis ? (
            <DualColumnTree
              thesis={thesis}
              debateId={debateId}
              currentPath={currentPath}
              onNavigate={handleNavigate}
              onAddArgument={handleAddArgument}
              onVote={handleVote}
              onRefresh={loadDebate}
              onOpenPanel={handleOpenPanel}
              isLoggedIn={!!user}
              currentUserId={user?.id}
              currentUserRole={user?.role}
              sortBy={sortBy}
              impactScores={impactScores}
            />
          ) : (
            <p className="text-stone-400">{t('no_thesis_found')}</p>
          )}
        </StructuredDebateLayout>
      ) : view === 'tree' ? (
        <div>
          {!user && (
            <div className="bg-saffron-50 border border-saffron-200 rounded-lg p-3 mb-4 text-sm text-saffron-800">
              <Link href="/auth/login" className="font-medium underline">{t('sign_in_prompt')}</Link> {t('sign_in_to_participate')}
            </div>
          )}
          {thesis ? (
            <ArgumentNode
              arg={thesis}
              debateId={debateId}
              onAddArgument={handleAddArgument}
              onVote={handleVote}
              isLoggedIn={!!user}
              currentUserId={user?.id}
              currentUserRole={user?.role}
              sortBy={sortBy}
              onRefresh={loadDebate}
            />
          ) : (
            <p className="text-stone-400">{t('no_thesis_found')}</p>
          )}
        </div>
      ) : view === 'hierarchy' ? (
        thesis ? (
          <HierarchyView
            thesis={thesis}
            onDrillDown={(argId) => {
              const path = getPathIds(thesis, argId);
              if (path.length > 0) {
                setView('dual');
                handleNavigate(path);
              }
            }}
          />
        ) : (
          <p className="text-stone-400">{t('no_thesis_found')}</p>
        )
      ) : view === 'sunburst' ? (
        <div className="card p-6">
          {thesis ? (
            <SunburstView
              thesis={thesis}
              onDrillDown={(argId) => {
                // Switch to dual-column view focused on the clicked node
                const path = getPathIds(thesis, argId);
                if (path.length > 0) {
                  setView('dual');
                  handleNavigate(path);
                }
              }}
            />
          ) : (
            <p className="text-stone-400">{t('no_thesis_found')}</p>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ActivityFeed debateId={debateId} limit={30} />
        </div>
      )}

      {/* Edit Debate Modal */}
      {showEditDebate && editFields && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-heading font-bold text-stone-800">Edit Debate</h2>
              <button onClick={() => setShowEditDebate(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditDebate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editFields.title}
                  onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={editFields.description}
                  onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                  className="input-field resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Thesis</label>
                <textarea
                  value={editFields.thesis}
                  onChange={(e) => setEditFields({ ...editFields, thesis: e.target.value })}
                  className="input-field resize-none"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Conclusion</label>
                <textarea
                  value={editFields.conclusion}
                  onChange={(e) => setEditFields({ ...editFields, conclusion: e.target.value })}
                  className="input-field resize-none"
                  rows={2}
                />
              </div>
              <button type="submit" className="btn-primary w-full py-2">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pending claim submission toast */}
      {pendingMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg shadow-lg text-sm z-50 border border-amber-200">
          {pendingMessage}
        </div>
      )}

      {/* Panels */}
      {showTeams && <TeamsPanel debateId={debateId} currentUserId={user?.id} onClose={() => setShowTeams(false)} />}
      {showSources && <SourcesPanel debateId={debateId} onClose={() => setShowSources(false)} />}
      {showPerspectives && <PerspectivesPanel onClose={() => setShowPerspectives(false)} />}
      {showGuidedVoting && <GuidedVoting debateId={debateId} onVote={handleVote} onClose={() => setShowGuidedVoting(false)} />}
      {showPendingClaims && <PendingClaimsPanel debateId={debateId} onClose={() => setShowPendingClaims(false)} onRefresh={loadDebate} />}
      {sidePanelArg && (
        <ClaimSidePanel
          argumentId={sidePanelArg}
          debateId={debateId}
          isLoggedIn={!!user}
          initialTab={sidePanelTab}
          onClose={() => setSidePanelArg(null)}
        />
      )}
      <DebateStatsModal debateId={debateId} isOpen={showStats} onClose={() => setShowStats(false)} />
      {showRoles && <RolesPanel debateId={debateId} onClose={() => setShowRoles(false)} />}
      {showDebateSettings && <DebateSettingsPanel debateId={debateId} onClose={() => setShowDebateSettings(false)} />}
      {showSummary && <DebateSummaryPanel debateId={debateId} onClose={() => setShowSummary(false)} />}
    </div>
  );
}
