'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { ClaimCard } from './ClaimCard';
import { getProConChildren } from '@/lib/treeUtils';
import type { Argument } from '@/lib/types';

interface InlineProConColumnsProps {
  node: Argument;
  debateId: string;
  onDrillDown: (argId: string) => void;
  onVote: (argId: string, value: number) => Promise<void>;
  onEdit?: (argId: string, content: string) => Promise<void>;
  onDelete?: (argId: string) => Promise<void>;
  onAddArgument?: (parentId: string, content: string, type: 'pro' | 'con') => Promise<void>;
  onRefresh?: () => Promise<void>;
  isLoggedIn: boolean;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  depth: number;
  maxInlineDepth: number;
  sortBy: 'votes' | 'recent';
  impactScores?: Record<string, number>;
}

export function InlineProConColumns({
  node, debateId, onDrillDown, onVote, onEdit, onDelete,
  onAddArgument, onRefresh, isLoggedIn, currentUserId, currentUserRole,
  depth, maxInlineDepth, sortBy, impactScores,
}: InlineProConColumnsProps) {
  const { t } = useLanguage();

  const { pros, cons } = useMemo(() => {
    return getProConChildren(node, sortBy);
  }, [node, sortBy]);

  const canModify = (arg: Argument) =>
    !!currentUserId && (currentUserId === arg.author_id || currentUserRole === 'admin');

  // At depth >= 2, stack columns vertically to avoid squeezing
  const gridClass = depth >= 2 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';

  if (pros.length === 0 && cons.length === 0) {
    return (
      <div className="mt-2 ml-1 pl-3 border-l-2 border-stone-200/60 py-2">
        <p className="text-xs text-stone-400 italic">{t('view_no_responses')}</p>
      </div>
    );
  }

  return (
    <div className="mt-2 ml-1 pl-3 border-l-2 border-stone-200/60">
      <div className={`grid ${gridClass} gap-3`}>
        {/* Pro column */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-[11px] font-medium text-green-700">{t('view_pro_arguments')}</span>
            <span className="text-[10px] text-green-500">({pros.length})</span>
          </div>
          <div className="space-y-2">
            {pros.map(arg => (
              <ClaimCard
                key={arg.id}
                arg={arg}
                debateId={debateId}
                onDrillDown={onDrillDown}
                onVote={onVote}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddArgument={onAddArgument}
                onRefresh={onRefresh}
                isLoggedIn={isLoggedIn}
                canModify={canModify(arg)}
                impactScore={impactScores?.[arg.id]}
                impactScores={impactScores}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                depth={depth}
                maxInlineDepth={maxInlineDepth}
                sortBy={sortBy}
              />
            ))}
          </div>
        </div>

        {/* Con column */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-[11px] font-medium text-red-700">{t('view_con_arguments')}</span>
            <span className="text-[10px] text-red-500">({cons.length})</span>
          </div>
          <div className="space-y-2">
            {cons.map(arg => (
              <ClaimCard
                key={arg.id}
                arg={arg}
                debateId={debateId}
                onDrillDown={onDrillDown}
                onVote={onVote}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddArgument={onAddArgument}
                onRefresh={onRefresh}
                isLoggedIn={isLoggedIn}
                canModify={canModify(arg)}
                impactScore={impactScores?.[arg.id]}
                impactScores={impactScores}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                depth={depth}
                maxInlineDepth={maxInlineDepth}
                sortBy={sortBy}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
