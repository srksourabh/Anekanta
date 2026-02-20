'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { VoteBar } from './VoteBar';
import { CommentSection } from './CommentSection';
import { useLanguage } from '@/components/LanguageProvider';

interface ArgumentNodeProps {
  arg: any;
  debateId: string;
  onAddArgument: (parentId: string, content: string, type: 'pro' | 'con') => Promise<void>;
  onVote: (argId: string, value: number) => Promise<void>;
  isLoggedIn: boolean;
  depth?: number;
}

export function ArgumentNode({ arg, debateId, onAddArgument, onVote, isLoggedIn, depth = 0 }: ArgumentNodeProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(depth < 2);
  const [showAddPro, setShowAddPro] = useState(false);
  const [showAddCon, setShowAddCon] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const proChildren = (arg.children || []).filter((c: any) => c.type === 'pro');
  const conChildren = (arg.children || []).filter((c: any) => c.type === 'con');
  const hasChildren = proChildren.length > 0 || conChildren.length > 0;

  const borderClass = arg.type === 'pro' ? 'tree-line-pro' : arg.type === 'con' ? 'tree-line-con' : 'tree-line-thesis';
  const bgClass = arg.type === 'pro' ? 'bg-green-50/50' : arg.type === 'con' ? 'bg-red-50/50' : 'bg-earth-50/30';
  const labelColor = arg.type === 'pro' ? 'text-green-700 bg-green-100' : arg.type === 'con' ? 'text-red-700 bg-red-100' : 'text-earth-700 bg-earth-100';

  const handleSubmit = async (type: 'pro' | 'con') => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    await onAddArgument(arg.id, newContent.trim(), type);
    setNewContent('');
    setShowAddPro(false);
    setShowAddCon(false);
    setSubmitting(false);
  };

  const authorLabel = arg.is_anonymous ? t('debate_anonymous') : arg.author_name;

  return (
    <div className={`${depth > 0 ? borderClass + ' pl-4 ml-2' : ''}`}>
      <div className={`card ${bgClass} p-4 mb-2`}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {arg.type !== 'thesis' && (
                <span className={`badge ${labelColor} text-[10px] uppercase tracking-wider`}>
                  {arg.type === 'pro' ? t('debate_pro') : t('debate_con')}
                </span>
              )}
              {arg.type === 'thesis' && (
                <span className={`badge ${labelColor} text-[10px] uppercase tracking-wider`}>
                  {t('debate_thesis')}
                </span>
              )}
              <span className="text-xs text-stone-400">
                {t('debates_by')} <span className="font-medium" style={{ color: arg.author_color }}>{authorLabel}</span>
              </span>
              <span className="text-xs text-stone-400">
                {formatDistanceToNow(new Date(arg.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-stone-800 text-[15px] leading-relaxed">{arg.content}</p>
            <div className="flex items-center gap-4 mt-3">
              <VoteBar
                argId={arg.id}
                score={arg.vote_score}
                userVote={arg.user_vote}
                onVote={onVote}
                isLoggedIn={isLoggedIn}
              />
              <div className="flex items-center gap-2 text-xs">
                {isLoggedIn && (
                  <>
                    <button onClick={() => { setShowAddPro(!showAddPro); setShowAddCon(false); }} className="btn-pro">+ {t('debate_pro')}</button>
                    <button onClick={() => { setShowAddCon(!showAddCon); setShowAddPro(false); }} className="btn-con">+ {t('debate_con')}</button>
                  </>
                )}
                <button onClick={() => setShowComments(!showComments)} className="text-stone-500 hover:text-stone-700 text-xs">
                  {arg.comment_count > 0 ? `${arg.comment_count} ${t('debate_comments')}` : t('debate_add_comment')}
                </button>
                {hasChildren && (
                  <button onClick={() => setExpanded(!expanded)} className="text-stone-500 hover:text-stone-700 text-xs">
                    {expanded ? 'Collapse' : `Expand (${proChildren.length + conChildren.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {(showAddPro || showAddCon) && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-stone-200">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${showAddPro ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-xs`}>
                {t('debate_add_arg_ph')} {showAddPro ? t('debate_pro') : t('debate_con')}
              </span>
            </div>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder={`${t('debate_add_arg_ph')}`}
              className="input-field text-sm mb-2"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit(showAddPro ? 'pro' : 'con')}
                disabled={submitting || !newContent.trim()}
                className={showAddPro ? 'btn-pro' : 'btn-con'}
              >
                {submitting ? 'Submitting...' : t('debate_submit')}
              </button>
              <button onClick={() => { setShowAddPro(false); setShowAddCon(false); setNewContent(''); }} className="text-xs text-stone-500 hover:text-stone-700">{t('debate_cancel')}</button>
            </div>
          </div>
        )}

        {showComments && <CommentSection argumentId={arg.id} isLoggedIn={isLoggedIn} />}
      </div>

      {expanded && hasChildren && (
        <div className="mt-1">
          {proChildren.map((child: any) => (
            <ArgumentNode key={child.id} arg={child} debateId={debateId} onAddArgument={onAddArgument} onVote={onVote} isLoggedIn={isLoggedIn} depth={depth + 1} />
          ))}
          {conChildren.map((child: any) => (
            <ArgumentNode key={child.id} arg={child} debateId={debateId} onAddArgument={onAddArgument} onVote={onVote} isLoggedIn={isLoggedIn} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
