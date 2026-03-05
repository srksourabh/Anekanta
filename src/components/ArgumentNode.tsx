'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { VoteBar } from './VoteBar';
import { CommentSection } from './CommentSection';
import { useLanguage } from '@/components/LanguageProvider';
import { TranslateButton } from '@/components/TranslateButton';

interface ArgumentNodeProps {
  arg: any;
  debateId: string;
  onAddArgument: (parentId: string, content: string, type: 'pro' | 'con') => Promise<void>;
  onVote: (argId: string, value: number) => Promise<void>;
  isLoggedIn: boolean;
  depth?: number;
  currentUserId?: string | null;
  currentUserRole?: string | null;
  sortBy?: 'votes' | 'recent';
  onRefresh?: () => Promise<void>;
}

export function ArgumentNode({ arg, debateId, onAddArgument, onVote, isLoggedIn, depth = 0, currentUserId, currentUserRole, sortBy = 'votes', onRefresh }: ArgumentNodeProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(depth < 2);
  const [showAddPro, setShowAddPro] = useState(false);
  const [showAddCon, setShowAddCon] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(arg.content);
  const [currentContent, setCurrentContent] = useState(arg.content);

  const canModify = currentUserId && (currentUserId === arg.author_id || currentUserRole === 'admin');

  const handleEdit = async () => {
    if (!editContent.trim() || editContent.length > 500) return;
    const res = await fetch(`/api/arguments/${arg.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    if (res.ok) {
      setCurrentContent(editContent.trim());
      setEditMode(false);
      if (onRefresh) await onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this argument?')) return;
    const res = await fetch(`/api/arguments/${arg.id}`, { method: 'DELETE' });
    if (res.ok && onRefresh) await onRefresh();
  };

  const sortFn = (a: any, b: any) => sortBy === 'votes' ? (b.vote_score - a.vote_score) : (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const proChildren = (arg.children || []).filter((c: any) => c.type === 'pro').sort(sortFn);
  const conChildren = (arg.children || []).filter((c: any) => c.type === 'con').sort(sortFn);
  const hasChildren = proChildren.length > 0 || conChildren.length > 0;

  const borderClass = arg.type === 'pro' ? 'tree-line-pro' : arg.type === 'con' ? 'tree-line-con' : 'tree-line-thesis';
  const bgClass = arg.type === 'pro' ? 'bg-green-50/50' : arg.type === 'con' ? 'bg-red-50/50' : 'bg-teal-50/30';
  const labelColor = arg.type === 'pro' ? 'text-green-700 bg-green-100' : arg.type === 'con' ? 'text-red-700 bg-red-100' : 'text-teal-700 bg-teal-100';

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
    <div className={`${depth > 0 ? borderClass + ' pl-2 sm:pl-4 ml-1 sm:ml-2' : ''}`}>
      <div className={`card ${bgClass} p-4 mb-2`}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5">
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
              {canModify && arg.type !== 'thesis' && (
                <div className="relative ml-auto">
                  <button onClick={() => setShowMenu(!showMenu)} className="p-0.5 text-stone-400 hover:text-stone-600">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20">
                        <button onClick={() => { setEditMode(true); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50">Edit</button>
                        <button onClick={() => { handleDelete(); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {editMode ? (
              <div className="space-y-2">
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="input-field text-sm" rows={3} maxLength={500} />
                <div className="flex items-center gap-2">
                  <button onClick={handleEdit} className="btn-primary text-xs px-3 py-1">Save</button>
                  <button onClick={() => { setEditMode(false); setEditContent(currentContent); }} className="text-xs text-stone-500">Cancel</button>
                  <span className="text-[10px] text-stone-400 ml-auto">{editContent.length}/500</span>
                </div>
              </div>
            ) : (
              <p className="text-stone-800 text-[15px] leading-relaxed">
                {currentContent}
                <TranslateButton text={currentContent} />
              </p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <VoteBar
                argId={arg.id}
                score={arg.vote_score}
                userVote={arg.user_vote}
                onVote={onVote}
                isLoggedIn={isLoggedIn}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
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
                    {expanded ? t('arg_collapse') : `${t('arg_expand')} (${proChildren.length + conChildren.length})`}
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
                {submitting ? t('arg_submitting') : t('debate_submit')}
              </button>
              <button onClick={() => { setShowAddPro(false); setShowAddCon(false); setNewContent(''); }} className="text-xs text-stone-500 hover:text-stone-700">{t('debate_cancel')}</button>
            </div>
          </div>
        )}

        {showComments && <CommentSection argumentId={arg.id} debateId={debateId} isLoggedIn={isLoggedIn} />}
      </div>

      {expanded && hasChildren && (
        <div className="mt-1">
          {proChildren.map((child: any) => (
            <ArgumentNode key={child.id} arg={child} debateId={debateId} onAddArgument={onAddArgument} onVote={onVote} isLoggedIn={isLoggedIn} depth={depth + 1} currentUserId={currentUserId} currentUserRole={currentUserRole} sortBy={sortBy} onRefresh={onRefresh} />
          ))}
          {conChildren.map((child: any) => (
            <ArgumentNode key={child.id} arg={child} debateId={debateId} onAddArgument={onAddArgument} onVote={onVote} isLoggedIn={isLoggedIn} depth={depth + 1} currentUserId={currentUserId} currentUserRole={currentUserRole} sortBy={sortBy} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
