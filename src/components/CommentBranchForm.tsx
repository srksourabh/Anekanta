'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { PERSPECTIVES } from '@/components/PerspectiveTag';

interface CommentBranchFormProps {
  argumentId: string;
  debateId: string;
  onAddArgument: (parentId: string, content: string, type: 'pro' | 'con', perspective?: string) => void;
  onAddComment: (content: string) => void;
  onCancel: () => void;
}

export function CommentBranchForm({ argumentId, debateId, onAddArgument, onAddComment, onCancel }: CommentBranchFormProps) {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'pro' | 'con' | 'comment'>('comment');
  const [perspective, setPerspective] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    if (mode === 'pro' || mode === 'con') {
      onAddArgument(argumentId, content, mode, perspective || undefined);
    } else {
      onAddComment(content);
    }
    setContent('');
    setPerspective('');
  };

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setMode('pro')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === 'pro' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {t('comment_branch_pro')}
        </button>
        <button
          type="button"
          onClick={() => setMode('con')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === 'con' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {t('comment_branch_con')}
        </button>
        <button
          type="button"
          onClick={() => setMode('comment')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === 'comment' ? 'bg-stone-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {t('comment_branch_discuss')}
        </button>
      </div>

      {/* Perspective selector (only for pro/con branches) */}
      {(mode === 'pro' || mode === 'con') && (
        <select
          value={perspective}
          onChange={e => setPerspective(e.target.value)}
          className="input-field text-xs w-auto"
        >
          <option value="">{t('perspective_optional')}</option>
          {PERSPECTIVES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      {/* Content */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
          mode === 'pro' ? t('comment_branch_pro_ph') :
          mode === 'con' ? t('comment_branch_con_ph') :
          t('debate_add_comment')
        }
        className="input-field text-sm w-full"
        rows={3}
      />

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5">
          {t('debate_cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim()}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
            mode === 'pro' ? 'bg-green-600 hover:bg-green-700' :
            mode === 'con' ? 'bg-red-600 hover:bg-red-700' :
            'bg-stone-600 hover:bg-stone-700'
          }`}
        >
          {mode === 'pro' ? t('comment_branch_add_pro') :
           mode === 'con' ? t('comment_branch_add_con') :
           t('debate_submit')}
        </button>
      </div>
    </div>
  );
}
