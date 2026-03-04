'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { ClaimCard } from './ClaimCard';
import { ClaimBreadcrumb } from './ClaimBreadcrumb';
import { FocusedClaimHeader } from './FocusedClaimHeader';
import { findNodeByPath, getAncestorChain, getProConChildren } from '@/lib/treeUtils';
import type { Argument } from '@/lib/types';

interface DualColumnTreeProps {
  thesis: Argument;
  debateId: string;
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  onAddArgument: (parentId: string, content: string, type: 'pro' | 'con') => Promise<void>;
  onVote: (argId: string, value: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenPanel?: (argId: string, panel: 'comments' | 'history' | 'sources' | 'stats') => void;
  isLoggedIn: boolean;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  sortBy: 'votes' | 'recent';
  impactScores?: Record<string, number>;
}

export function DualColumnTree({
  thesis, debateId, currentPath, onNavigate,
  onAddArgument, onVote, onRefresh, onOpenPanel,
  isLoggedIn, currentUserId, currentUserRole, sortBy, impactScores
}: DualColumnTreeProps) {
  const { t } = useLanguage();

  const focusedNode = useMemo(() => {
    return findNodeByPath(thesis, currentPath) || thesis;
  }, [thesis, currentPath]);

  const ancestors = useMemo(() => {
    return getAncestorChain(thesis, focusedNode.id);
  }, [thesis, focusedNode.id]);

  const { pros, cons } = useMemo(() => {
    return getProConChildren(focusedNode, sortBy);
  }, [focusedNode, sortBy]);

  const isRoot = focusedNode.id === thesis.id;

  const handleDrillDown = (argId: string) => {
    onNavigate([...currentPath, argId]);
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
    !!currentUserId && (currentUserId === arg.author_id || currentUserRole === 'admin');

  return (
    <div>
      {/* Breadcrumb navigation */}
      <ClaimBreadcrumb ancestors={ancestors} onNavigate={onNavigate} />

      {/* Focused claim header */}
      <FocusedClaimHeader
        arg={focusedNode}
        debateId={debateId}
        onVote={onVote}
        onAddArgument={onAddArgument}
        onGoBack={handleGoBack}
        onOpenPanel={onOpenPanel ? (panel) => onOpenPanel(focusedNode.id, panel) : undefined}
        isLoggedIn={isLoggedIn}
        isRoot={isRoot}
      />

      {/* Pro/Con dual columns */}
      {pros.length === 0 && cons.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">{t('view_no_responses')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pro column */}
          <div>
            <div className="column-header-pro rounded-t-lg px-4 py-2.5 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-semibold">{t('view_pro_arguments')}</span>
                <span className="badge bg-green-200 text-green-800 text-[10px]">{pros.length}</span>
              </div>
              {isLoggedIn && (
                <button
                  onClick={() => onAddArgument(focusedNode.id, '', 'pro')}
                  className="text-green-600 hover:text-green-800 transition-colors hidden"
                  title={t('view_add_pro')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
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
                  isLoggedIn={isLoggedIn}
                  canModify={canModify(arg)}
                  impactScore={impactScores?.[arg.id]}
                />
              ))}
              {pros.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-sm border-2 border-dashed border-stone-200 rounded-lg">
                  {t('view_no_responses')}
                </div>
              )}
            </div>
          </div>

          {/* Con column */}
          <div>
            <div className="column-header-con rounded-t-lg px-4 py-2.5 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-semibold">{t('view_con_arguments')}</span>
                <span className="badge bg-red-200 text-red-800 text-[10px]">{cons.length}</span>
              </div>
            </div>
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
                  isLoggedIn={isLoggedIn}
                  canModify={canModify(arg)}
                  impactScore={impactScores?.[arg.id]}
                />
              ))}
              {cons.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-sm border-2 border-dashed border-stone-200 rounded-lg">
                  {t('view_no_responses')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
