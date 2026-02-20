'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/components/LanguageProvider';
import { TranslateButton } from '@/components/TranslateButton';

interface CommentSectionProps {
  argumentId: string;
  isLoggedIn: boolean;
}

export function CommentSection({ argumentId, isLoggedIn }: CommentSectionProps) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/arguments/${argumentId}/comments`)
      .then(r => r.json())
      .then(setComments)
      .finally(() => setLoading(false));
  }, [argumentId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/arguments/${argumentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment.trim() }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
    setSubmitting(false);
  };

  const authorLabel = (c: any) => c.is_anonymous ? t('debate_anonymous') : c.author_name;

  return (
    <div className="mt-3 pt-3 border-t border-stone-200">
      {loading ? (
        <p className="text-xs text-stone-400">{t('loading_comments')}</p>
      ) : (
        <>
          {comments.length === 0 && <p className="text-xs text-stone-400 mb-2">{t('no_comments_yet')}</p>}
          <div className="space-y-2 mb-3">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: c.author_color }}>
                  {c.author_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: c.author_color }}>{authorLabel(c)}</span>
                    <span className="text-[10px] text-stone-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-stone-700 mt-0.5">
                    {c.content}
                    <TranslateButton text={c.content} />
                  </p>
                </div>
              </div>
            ))}
          </div>
          {isLoggedIn && (
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={t('debate_add_comment')}
                className="input-field text-xs py-1.5"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button onClick={handleSubmit} disabled={submitting || !newComment.trim()} className="btn-primary text-xs py-1.5 px-3">
                {t('debate_submit')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
