'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { VoteBar } from './VoteBar';
import { PerspectiveTag } from './PerspectiveTag';
import { ImpactIndicator } from './ImpactIndicator';
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
  isLoggedIn: boolean;
  canModify: boolean;
  impactScore?: number;
}

export function ClaimCard({
  arg, debateId, onDrillDown, onVote, onEdit, onDelete, isLoggedIn, canModify, impactScore
}: ClaimCardProps) {
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(arg.content);
  const [expanded, setExpanded] = useState(false);

  const proCount = (arg.children || []).filter(c => c.type === 'pro').length;
  const conCount = (arg.children || []).filter(c => c.type === 'con').length;
  const hasChildren = proCount > 0 || conCount > 0;

  const borderClass = arg.type === 'pro' ? 'claim-card-pro' : 'claim-card-con';
  const authorLabel = arg.is_anonymous ? t('debate_anonymous') : arg.author_name;
  const shouldTruncate = arg.content.length > 150 && !expanded;
  const perspective = arg.perspective;
  const isPinned = arg.is_pinned === 1;
  const isHighlighted = arg.is_highlighted === 1;

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
    <div className={`card ${borderClass} p-4 hover:shadow-md transition-shadow group ${isHighlighted ? 'ring-1 ring-amber-200 bg-amber-50/30' : ''}`}>
      {/* Pinned indicator */}
      {isPinned && (
        <div className="flex items-center gap-1 text-[10px] text-saffron-600 font-medium mb-1.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm6 6a1 1 0 10-2 0v5a1 1 0 102 0v-5z"/></svg>
          {t('pinned')}
        </div>
      )}
      {/* Header: author + vote + menu */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: arg.author_color || '#a97847' }}
        >
          {(authorLabel || '?')[0].toUpperCase()}
        </div>
        <span className="text-xs text-stone-500">
          <span className="font-medium" style={{ color: arg.author_color }}>{authorLabel}</span>
          <span className="mx-1.5 text-stone-300">&middot;</span>
          {formatDistanceToNow(new Date(arg.created_at), { addSuffix: true })}
        </span>
        {perspective && <PerspectiveTag perspective={perspective} size="sm" />}

        <div className="ml-auto flex items-center gap-2">
          <VoteBar
            argId={arg.id}
            score={arg.vote_score}
            userVote={arg.user_vote ?? null}
            onVote={onVote}
            isLoggedIn={isLoggedIn}
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
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20">
                    <button
                      onClick={() => { setEditMode(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                    >Edit</button>
                    <button
                      onClick={() => { handleDelete(); setShowMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >Delete</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {editMode ? (
        <div className="space-y-2 mb-2">
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
        <div
          className="cursor-pointer"
          onClick={() => hasChildren ? onDrillDown(arg.id) : undefined}
        >
          <p className="text-stone-800 text-sm leading-relaxed">
            {shouldTruncate ? arg.content.slice(0, 150) + '...' : arg.content}
            <TranslateButton text={arg.content} />
          </p>
          {shouldTruncate && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="text-xs text-saffron-600 hover:text-saffron-700 mt-1"
            >
              {t('claim_show_more')}
            </button>
          )}
        </div>
      )}

      {/* Footer: child counts + comment count + impact */}
      <div className="flex items-center gap-3 mt-3 text-xs text-stone-500">
        {impactScore !== undefined && impactScore > 0 && (
          <ImpactIndicator score={impactScore} size="sm" />
        )}
        {hasChildren && (
          <button
            onClick={() => onDrillDown(arg.id)}
            className="flex items-center gap-1.5 hover:text-saffron-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {proCount > 0 && <span className="text-green-600 font-medium">{proCount} {t('claim_pro_count')}</span>}
            {proCount > 0 && conCount > 0 && <span className="text-stone-300">/</span>}
            {conCount > 0 && <span className="text-red-600 font-medium">{conCount} {t('claim_con_count')}</span>}
          </button>
        )}
        {(arg.comment_count ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {arg.comment_count}
          </span>
        )}
      </div>
    </div>
  );
}
