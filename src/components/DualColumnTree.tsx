'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { ClaimCard } from './ClaimCard';
import { MiniTreeMap } from './MiniTreeMap';
import { VoteSegmentBar } from './VoteSegmentBar';
import { TranslateButton } from '@/components/TranslateButton';
import { findNodeByPath, getAncestorChain, getProConChildren, getPathIds } from '@/lib/treeUtils';
import type { Argument } from '@/lib/types';

interface DualColumnTreeProps {
  thesis: Argument;
  debateId: string;
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  onAddArgument: (parentId: string, content: string, type: 'pro' | 'con') => Promise<void>;
  onVote: (argId: string, value: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenPanel?: (argId: string, panel: 'comments' | 'history' | 'sources' | 'stats' | 'resources') => void;
  isLoggedIn: boolean;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  sortBy: 'votes' | 'recent';
  impactScores?: Record<string, number>;
  isModerator?: boolean;
  isLocked?: boolean;
}

export function DualColumnTree({
  thesis, debateId, currentPath, onNavigate,
  onAddArgument, onVote, onRefresh, onOpenPanel,
  isLoggedIn, currentUserId, currentUserRole, sortBy, impactScores,
  isModerator, isLocked,
}: DualColumnTreeProps) {
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState<'pro' | 'con' | null>(null);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const focusedNode = useMemo(() => {
    return findNodeByPath(thesis, currentPath) || thesis;
  }, [thesis, currentPath]);

  const ancestors = useMemo(() => {
    return getAncestorChain(thesis, focusedNode.id);
  }, [thesis, focusedNode.id]);

  const { pros, cons } = useMemo(() => {
    const { pros: allPros, cons: allCons } = getProConChildren(focusedNode, sortBy);
    // Filter hidden arguments for regular users (moderators can see them)
    if (isModerator) return { pros: allPros, cons: allCons };
    return {
      pros: allPros.filter(a => !a.is_hidden),
      cons: allCons.filter(a => !a.is_hidden),
    };
  }, [focusedNode, sortBy, isModerator]);

  const isRoot = focusedNode.id === thesis.id;

  const handleDrillDown = (argId: string) => {
    const path = getPathIds(thesis, argId);
    if (path.length > 0) {
      onNavigate(path);
    }
  };

  const handleGoBack = () => {
    if (currentPath.length > 1) {
      onNavigate(currentPath.slice(0, -1));
    }
  };

  const handleEdit = async (argId: string, content: string) => {
    await fetch(`/api/arguments/${argId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    await onRefresh();
  };

  const handleDelete = async (argId: string) => {
    await fetch(`/api/arguments/${argId}`, { method: 'DELETE' });
    await onRefresh();
  };

  const canModify = (arg: Argument) =>
    !!currentUserId && (currentUserId === arg.author_id || currentUserRole === 'admin' || !!isModerator);

  const handleToggleHidden = async (argId: string, hidden: boolean) => {
    await fetch(`/api/arguments/${argId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_hidden: hidden }),
    });
    await onRefresh();
  };

  const handleSubmitNew = async (type: 'pro' | 'con') => {
    if (!newContent.trim() || newContent.length > 500) return;
    setSubmitting(true);
    await onAddArgument(focusedNode.id, newContent.trim(), type);
    setNewContent('');
    setShowAddForm(null);
    setSubmitting(false);
  };

  const focusedAuthor = focusedNode.is_anonymous ? t('debate_anonymous') : focusedNode.author_name;

  return (
    <div>
      {/* Locked debate banner */}
      {isLocked && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {t('debate_locked')}
        </div>
      )}

      {/* Mini tree map */}
      <MiniTreeMap
        thesis={thesis}
        focusedId={focusedNode.id}
        onNavigate={onNavigate}
      />

      {/* Thesis card (always visible at top when not at root) */}
      {!isRoot && (
        <>
          <div
            className="card p-4 mb-2 border-2 border-blue-200 cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => onNavigate([thesis.id])}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: thesis.author_color || '#2563eb' }}
              >
                {(thesis.is_anonymous ? '?' : (thesis.author_name || '?')[0]).toUpperCase()}
              </div>
              <span className="text-xs font-medium" style={{ color: thesis.author_color || '#2563eb' }}>
                {thesis.is_anonymous ? t('debate_anonymous') : thesis.author_name}
              </span>

              <div className="ml-auto flex items-center gap-2">
                <VoteSegmentBar
                  argId={thesis.id}
                  score={thesis.vote_score}
                  userVote={thesis.user_vote ?? null}
                  type="thesis"
                  onVote={onVote}
                  isLoggedIn={isLoggedIn}
                  compact
                />
                {onOpenPanel && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenPanel(thesis.id, 'comments'); }}
                    className="p-1 text-stone-400 hover:text-stone-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <p className="text-stone-800 text-sm leading-relaxed">{thesis.content}</p>
          </div>

          {/* Connector arrow */}
          <div className="flex justify-center my-1">
            <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </>
      )}

      {/* Focused argument card */}
      <div className={`card p-5 mb-6 border-l-4 ${
        focusedNode.type === 'pro' ? 'border-green-400' :
        focusedNode.type === 'con' ? 'border-red-400' :
        'border-blue-400'
      }`}>
        {/* Back button */}
        {!isRoot && (
          <button
            onClick={handleGoBack}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-teal-600 transition-colors mb-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('view_back')}
          </button>
        )}

        {/* Author row */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: focusedNode.author_color || '#0f766e' }}
          >
            {(focusedAuthor || '?')[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium" style={{ color: focusedNode.author_color }}>{focusedAuthor}</span>

          <div className="ml-auto flex items-center gap-3">
            <VoteSegmentBar
              argId={focusedNode.id}
              score={focusedNode.vote_score}
              userVote={focusedNode.user_vote ?? null}
              type={focusedNode.type}
              onVote={onVote}
              isLoggedIn={isLoggedIn}
            />
            {canModify(focusedNode) && (
              <button className="p-1 text-stone-400 hover:text-stone-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            )}
            {onOpenPanel && (
              <button
                onClick={() => onOpenPanel(focusedNode.id, 'comments')}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content — large text */}
        <p className="text-stone-800 text-lg leading-relaxed">
          {focusedNode.content}
          <TranslateButton text={focusedNode.content} />
        </p>
      </div>

      {/* Pro/Con column headers with + buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center justify-center gap-3 bg-white border border-stone-200 rounded-xl py-3 px-4">
          <span className="text-sm font-semibold text-green-700">{t('view_pro_arguments')}</span>
          {isLoggedIn && !isLocked && (
            <button
              onClick={() => { setShowAddForm(showAddForm === 'pro' ? null : 'pro'); }}
              className="w-8 h-8 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-sm"
              title={t('view_add_pro')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 bg-white border border-stone-200 rounded-xl py-3 px-4">
          <span className="text-sm font-semibold text-red-700">{t('view_con_arguments')}</span>
          {isLoggedIn && !isLocked && (
            <button
              onClick={() => { setShowAddForm(showAddForm === 'con' ? null : 'con'); }}
              className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm"
              title={t('view_add_con')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge ${showAddForm === 'pro' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-xs`}>
              {t('debate_add_arg_ph')} {showAddForm === 'pro' ? t('debate_pro') : t('debate_con')}
            </span>
            <span className="text-[10px] text-stone-400 ml-auto">{newContent.length}/500</span>
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder={t('debate_add_arg_ph')}
            className="input-field text-sm mb-2"
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmitNew(showAddForm)}
              disabled={submitting || !newContent.trim()}
              className={showAddForm === 'pro' ? 'btn-pro' : 'btn-con'}
            >
              {submitting ? t('arg_submitting') : t('debate_submit')}
            </button>
            <button
              onClick={() => { setShowAddForm(null); setNewContent(''); }}
              className="text-xs text-stone-500 hover:text-stone-700"
            >
              {t('debate_cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Pro/Con dual columns */}
      {pros.length === 0 && cons.length === 0 && !showAddForm ? (
        <div className="text-center py-12 text-stone-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">{t('view_no_responses')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pro column */}
          <div className="space-y-3">
            {pros.map(arg => (
              <ClaimCard
                key={arg.id}
                arg={arg}
                debateId={debateId}
                onDrillDown={handleDrillDown}
                onVote={onVote}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddArgument={onAddArgument}
                onRefresh={onRefresh}
                onOpenPanel={onOpenPanel}
                onToggleHidden={isModerator ? handleToggleHidden : undefined}
                isLoggedIn={isLoggedIn}
                canModify={canModify(arg)}
                isModerator={isModerator}
                impactScore={impactScores?.[arg.id]}
                impactScores={impactScores}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                depth={0}
                maxInlineDepth={3}
                sortBy={sortBy}
              />
            ))}
            {pros.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm border-2 border-dashed border-stone-200 rounded-lg">
                {t('view_no_responses')}
              </div>
            )}
          </div>

          {/* Con column */}
          <div className="space-y-3">
            {cons.map(arg => (
              <ClaimCard
                key={arg.id}
                arg={arg}
                debateId={debateId}
                onDrillDown={handleDrillDown}
                onVote={onVote}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddArgument={onAddArgument}
                onRefresh={onRefresh}
                onOpenPanel={onOpenPanel}
                onToggleHidden={isModerator ? handleToggleHidden : undefined}
                isLoggedIn={isLoggedIn}
                canModify={canModify(arg)}
                isModerator={isModerator}
                impactScore={impactScores?.[arg.id]}
                impactScores={impactScores}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                depth={0}
                maxInlineDepth={3}
                sortBy={sortBy}
              />
            ))}
            {cons.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm border-2 border-dashed border-stone-200 rounded-lg">
                {t('view_no_responses')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
