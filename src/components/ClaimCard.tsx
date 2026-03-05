'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { VoteSegmentBar } from './VoteSegmentBar';
import { PerspectiveTag } from './PerspectiveTag';
import { ImpactIndicator } from './ImpactIndicator';
import { InlineProConColumns } from './InlineProConColumns';
import { useLanguage } from '@/components/LanguageProvider';
import { TranslateButton } from '@/components/TranslateButton';
import type { Argument } from '@/lib/types';

interface ClaimCardProps {
  arg: Argument;
  debateId: string;
  onDrillDown: (argId: string) => void;
  onVote: (argId: string, value: number) => Promise<void>;
  onEdit?: (argId: string, content: string) => Promise<void>;
  onDelete?: (argId: string) => Promise<void>;
  onAddArgument?: (parentId: string, content: string, type: 'pro' | 'con') => Promise<void>;
  onRefresh?: () => Promise<void>;
  onOpenPanel?: (argId: string, tab: 'comments' | 'history' | 'sources' | 'stats' | 'resources') => void;
  onToggleHidden?: (argId: string, hidden: boolean) => Promise<void>;
  isLoggedIn: boolean;
  canModify: boolean;
  isModerator?: boolean;
  impactScore?: number;
  impactScores?: Record<string, number>;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  depth?: number;
  maxInlineDepth?: number;
  sortBy?: 'votes' | 'recent';
}

export function ClaimCard({
  arg, debateId, onDrillDown, onVote, onEdit, onDelete,
  onAddArgument, onRefresh, onOpenPanel, onToggleHidden,
  isLoggedIn, canModify, isModerator,
  impactScore, impactScores,
  currentUserId, currentUserRole,
  depth = 0, maxInlineDepth = 3, sortBy = 'votes',
}: ClaimCardProps) {
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(arg.content);
  const [expanded, setExpanded] = useState(false);
  const [inlineExpanded, setInlineExpanded] = useState(false);

  const proCount = (arg.children || []).filter(c => c.type === 'pro').length;
  const conCount = (arg.children || []).filter(c => c.type === 'con').length;
  const hasChildren = proCount > 0 || conCount > 0;

  const borderClass = arg.type === 'pro' ? 'claim-card-pro' : 'claim-card-con';
  const authorLabel = arg.is_anonymous ? t('debate_anonymous') : arg.author_name;
  const shouldTruncate = arg.content.length > 150 && !expanded;
  const perspective = arg.perspective;
  const isPinned = arg.is_pinned === 1;
  const isHighlighted = arg.is_highlighted === 1;
  const isHidden = arg.is_hidden === 1;
  const canExpandInline = depth < maxInlineDepth && hasChildren;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent.length > 500) return;
    if (onEdit) await onEdit(arg.id, editContent.trim());
    setEditMode(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this argument?')) return;
    if (onDelete) await onDelete(arg.id);
  };

  return (
    <div>
      <div
        className={`card ${borderClass} p-4 hover:shadow-md transition-shadow group ${isHighlighted ? 'ring-1 ring-amber-200 bg-amber-50/30' : ''}`}
        onClick={() => onDrillDown(arg.id)}
        role="button"
        tabIndex={0}
      >
        {/* Hidden indicator (only visible to moderators) */}
        {isHidden && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium mb-1.5 bg-amber-50 px-2 py-1 rounded">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
            {t('mod_hidden_by_moderator')}
          </div>
        )}

        {/* Pinned indicator */}
        {isPinned && (
          <div className="flex items-center gap-1 text-[10px] text-teal-600 font-medium mb-1.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm6 6a1 1 0 10-2 0v5a1 1 0 102 0v-5z"/></svg>
            {t('pinned')}
          </div>
        )}

        {/* Header row: author + vote segment bar + actions */}
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: arg.author_color || '#0f766e' }}
          >
            {(authorLabel || '?')[0].toUpperCase()}
          </div>
          <span className="text-xs font-medium" style={{ color: arg.author_color }}>{authorLabel}</span>
          {perspective && <PerspectiveTag perspective={perspective} size="sm" />}

          <div className="ml-auto flex items-center gap-2">
            <VoteSegmentBar
              argId={arg.id}
              score={arg.vote_score}
              userVote={arg.user_vote ?? null}
              type={arg.type}
              onVote={onVote}
              isLoggedIn={isLoggedIn}
              compact
            />
            {canModify && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-1 text-stone-400 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditMode(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                      >Edit</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >Delete</button>
                      {isModerator && onToggleHidden && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleHidden(arg.id, !isHidden); setShowMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50"
                        >{isHidden ? t('mod_unhide') : t('mod_hide')}</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {onOpenPanel && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenPanel(arg.id, 'resources'); }}
                className="p-1 text-stone-400 hover:text-teal-600 transition-colors"
                title={t('learn_more')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
            )}
            {/* Blue dot indicator when has children */}
            {hasChildren && (
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                arg.type === 'pro' ? 'bg-blue-500' : 'bg-blue-500'
              }`} />
            )}
          </div>
        </div>

        {/* Content */}
        {editMode ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="input-field text-sm"
              rows={3}
              maxLength={500}
            />
            <div className="flex items-center gap-2">
              <button onClick={handleSaveEdit} className="btn-primary text-xs px-3 py-1">Save</button>
              <button onClick={() => { setEditMode(false); setEditContent(arg.content); }} className="text-xs text-stone-500">Cancel</button>
              <span className="text-[10px] text-stone-400 ml-auto">{editContent.length}/500</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-stone-800 text-sm leading-relaxed">
              {shouldTruncate ? arg.content.slice(0, 150) + '...' : arg.content}
              <TranslateButton text={arg.content} />
            </p>
            {shouldTruncate && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                className="text-xs text-teal-600 hover:text-teal-700 mt-1"
              >
                {t('claim_show_more')}
              </button>
            )}
          </div>
        )}

        {/* Footer: impact + expand/focus indicators */}
        {(impactScore || hasChildren) && (
          <div className="flex items-center gap-3 mt-3 text-xs text-stone-500">
            {impactScore !== undefined && impactScore > 0 && (
              <ImpactIndicator score={impactScore} size="sm" />
            )}

            {hasChildren && canExpandInline && (
              <button
                onClick={(e) => { e.stopPropagation(); setInlineExpanded(!inlineExpanded); }}
                className="flex items-center gap-1.5 hover:text-teal-600 transition-colors"
                title={inlineExpanded ? t('view_collapse_inline') : t('view_expand_inline')}
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${inlineExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {proCount > 0 && <span className="text-green-600 font-medium">{proCount} {t('claim_pro_count')}</span>}
                {proCount > 0 && conCount > 0 && <span className="text-stone-300">/</span>}
                {conCount > 0 && <span className="text-red-600 font-medium">{conCount} {t('claim_con_count')}</span>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline expanded sub-columns */}
      {inlineExpanded && hasChildren && (
        <InlineProConColumns
          node={arg}
          debateId={debateId}
          onDrillDown={onDrillDown}
          onVote={onVote}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddArgument={onAddArgument}
          onRefresh={onRefresh}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          depth={depth + 1}
          maxInlineDepth={maxInlineDepth}
          sortBy={sortBy}
          impactScores={impactScores}
        />
      )}
    </div>
  );
}
