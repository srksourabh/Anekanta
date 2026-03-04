'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { VoteBar } from './VoteBar';
import { useLanguage } from '@/components/LanguageProvider';
import { TranslateButton } from '@/components/TranslateButton';
import type { Argument } from '@/lib/types';

interface FocusedClaimHeaderProps {
  arg: Argument;
  debateId: string;
  onVote: (argId: string, value: number) => Promise<void>;
  onAddArgument: (parentId: string, content: string, type: 'pro' | 'con') => Promise<void>;
  onGoBack: () => void;
  onOpenPanel?: (panel: 'comments' | 'history' | 'sources' | 'stats') => void;
  isLoggedIn: boolean;
  isRoot: boolean;
}

export function FocusedClaimHeader({
  arg, debateId, onVote, onAddArgument, onGoBack, onOpenPanel, isLoggedIn, isRoot
}: FocusedClaimHeaderProps) {
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState<'pro' | 'con' | null>(null);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const typeColor = arg.type === 'pro' ? 'text-green-700 bg-green-100' :
    arg.type === 'con' ? 'text-red-700 bg-red-100' :
    'text-earth-700 bg-earth-100';

  const borderColor = arg.type === 'pro' ? 'border-green-300' :
    arg.type === 'con' ? 'border-red-300' :
    'border-earth-300';

  const authorLabel = arg.is_anonymous ? t('debate_anonymous') : arg.author_name;

  const handleSubmit = async (type: 'pro' | 'con') => {
    if (!newContent.trim() || newContent.length > 500) return;
    setSubmitting(true);
    await onAddArgument(arg.id, newContent.trim(), type);
    setNewContent('');
    setShowAddForm(null);
    setSubmitting(false);
  };

  return (
    <div className={`card p-5 mb-6 border-l-4 ${borderColor}`}>
      {/* Back button + type badge */}
      <div className="flex items-center gap-3 mb-3">
        {!isRoot && (
          <button
            onClick={onGoBack}
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-saffron-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('view_back')}
          </button>
        )}
        <span className={`badge ${typeColor} text-[10px] uppercase tracking-wider`}>
          {arg.type === 'thesis' ? t('debate_thesis') : arg.type === 'pro' ? t('debate_pro') : t('debate_con')}
        </span>
      </div>

      {/* Content */}
      <p className="text-stone-800 text-base leading-relaxed mb-3">
        {arg.content}
        <TranslateButton text={arg.content} />
      </p>

      {/* Author + timestamp */}
      <div className="flex items-center gap-2 mb-3 text-xs text-stone-500">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
          style={{ backgroundColor: arg.author_color || '#a97847' }}
        >
          {(authorLabel || '?')[0].toUpperCase()}
        </div>
        <span className="font-medium" style={{ color: arg.author_color }}>{authorLabel}</span>
        <span className="text-stone-300">&middot;</span>
        <span>{formatDistanceToNow(new Date(arg.created_at), { addSuffix: true })}</span>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <VoteBar
          argId={arg.id}
          score={arg.vote_score}
          userVote={arg.user_vote ?? null}
          onVote={onVote}
          isLoggedIn={isLoggedIn}
        />

        {isLoggedIn && (
          <>
            <button
              onClick={() => { setShowAddForm(showAddForm === 'pro' ? null : 'pro'); }}
              className="btn-pro text-xs"
            >
              + {t('view_add_pro')}
            </button>
            <button
              onClick={() => { setShowAddForm(showAddForm === 'con' ? null : 'con'); }}
              className="btn-con text-xs"
            >
              + {t('view_add_con')}
            </button>
          </>
        )}

        {onOpenPanel && (
          <button
            onClick={() => onOpenPanel('comments')}
            className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {(arg.comment_count ?? 0) > 0 ? `${arg.comment_count} ${t('debate_comments')}` : t('debate_add_comment')}
          </button>
        )}
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
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
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit(showAddForm)}
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
    </div>
  );
}
