'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { moderateContent, ModerationResult } from '@/lib/moderation';
import { CATEGORIES } from '@/lib/types';

interface ArgumentField {
  content: string;
}

interface ModerationState {
  title?: ModerationResult;
  tagline?: ModerationResult;
  thesis?: ModerationResult;
  argument1?: ModerationResult;
  argument2?: ModerationResult;
  argument3?: ModerationResult;
  conclusion?: ModerationResult;
}

export default function NewDebatePage() {
  const router = useRouter();
  const { t, getCategoryLabel } = useLanguage();
  
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [thesis, setThesis] = useState('');
  const [argument1, setArgument1] = useState('');
  const [argument2, setArgument2] = useState('');
  const [argument3, setArgument3] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [category, setCategory] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  const [moderation, setModeration] = useState<ModerationState>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Run moderation on field changes
  useEffect(() => {
    const updateModeration = () => {
      const newMod: ModerationState = {};
      if (title) newMod.title = moderateContent(title);
      if (tagline) newMod.tagline = moderateContent(tagline);
      if (thesis) newMod.thesis = moderateContent(thesis);
      if (argument1) newMod.argument1 = moderateContent(argument1);
      if (argument2) newMod.argument2 = moderateContent(argument2);
      if (argument3) newMod.argument3 = moderateContent(argument3);
      if (conclusion) newMod.conclusion = moderateContent(conclusion);
      setModeration(newMod);
    };
    updateModeration();
  }, [title, tagline, thesis, argument1, argument2, argument3, conclusion]);

  const hasBlockedContent = Object.values(moderation).some(m => m && m.action === 'block');
  const hasWarnings = Object.values(moderation).some(m => m && (m.action === 'warn' || m.action === 'review'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !tagline.trim() || !thesis.trim()) {
      setError(t('error_required_fields'));
      return;
    }

    if (hasBlockedContent) {
      setError(t('error_blocked_content'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create debate first
      const debateRes = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          tagline,
          thesis,
          conclusion,
          category,
          is_anonymous: isAnonymous,
          moderation_score: Math.max(
            moderation.title?.score || 0,
            moderation.tagline?.score || 0,
            moderation.thesis?.score || 0,
            moderation.conclusion?.score || 0,
          ),
        }),
      });

      if (!debateRes.ok) {
        const data = await debateRes.json();
        setError(data.error || 'Failed to create debate');
        setSubmitting(false);
        return;
      }

      const { id: debateId } = await debateRes.json();

      // Submit arguments if provided
      const arguments_to_submit = [argument1, argument2, argument3].filter(a => a.trim());
      if (arguments_to_submit.length > 0) {
        await Promise.all(
          arguments_to_submit.map(content =>
            fetch(`/api/debates/${debateId}/arguments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content,
                is_anonymous: isAnonymous,
                moderation_score: moderateContent(content).score,
              }),
            })
          )
        );
      }

      router.push(`/debates/${debateId}`);
    } catch (err) {
      setError(t('error_unexpected'));
      setSubmitting(false);
    }
  };

  const renderModerationWarning = (field: string, result?: ModerationResult) => {
    if (!result) return null;
    if (result.action === 'allow') return null;

    return (
      <div className={`mt-2 p-2 rounded text-sm ${
        result.action === 'block' ? 'bg-red-50 text-red-700 border border-red-200' :
        result.action === 'review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
        'bg-yellow-50 text-yellow-700 border border-yellow-200'
      }`}>
        <div className="font-medium">
          {result.action === 'block' ? t('mod_content_blocked') :
           result.action === 'review' ? t('mod_flagged_review') :
           t('mod_warning_label')}
        </div>
        <ul className="mt-1 text-xs space-y-0.5">
          {result.flags.map((flag, i) => (
            <li key={i}>{flag.detail} ({flag.severity})</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-heading font-bold text-earth-900 mb-2">{t('new_debate_title')}</h1>
      <p className="text-earth-500 mb-6 text-sm">{t('new_debate_subtitle')}</p>
      
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">{t('new_debate_form_title')} *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field w-full"
            placeholder={t('new_debate_form_title_ph')}
            maxLength={200}
            disabled={submitting}
          />
          <p className="text-xs text-earth-400 mt-1">{t('new_debate_hint_title')}</p>
          {renderModerationWarning('title', moderation.title)}
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">{t('new_debate_form_tagline')} *</label>
          <textarea
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            className="input-field w-full"
            rows={3}
            placeholder={t('new_debate_form_tagline_ph')}
            maxLength={500}
            disabled={submitting}
          />
          <p className="text-xs text-earth-400 mt-1">{t('new_debate_hint_tagline')}</p>
          {renderModerationWarning('tagline', moderation.tagline)}
        </div>

        {/* Thesis */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">{t('new_debate_form_thesis')} *</label>
          <textarea
            value={thesis}
            onChange={e => setThesis(e.target.value)}
            className="input-field w-full"
            rows={4}
            placeholder={t('new_debate_form_thesis_ph')}
            maxLength={1000}
            disabled={submitting}
          />
          <p className="text-xs text-earth-400 mt-1">{t('new_debate_hint_thesis')}</p>
          {renderModerationWarning('thesis', moderation.thesis)}
        </div>

        {/* Arguments */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-earth-900 mb-4">{t('new_debate_supporting_args')}</h2>
          <p className="text-xs text-earth-500 mb-4">{t('new_debate_supporting_args_hint')}</p>

          {[
            { num: 1, value: argument1, setter: setArgument1, mod: moderation.argument1, key: 'new_debate_form_arg1' },
            { num: 2, value: argument2, setter: setArgument2, mod: moderation.argument2, key: 'new_debate_form_arg2' },
            { num: 3, value: argument3, setter: setArgument3, mod: moderation.argument3, key: 'new_debate_form_arg3' },
          ].map(arg => (
            <div key={arg.num} className="mb-5">
              <label className="block text-sm font-medium text-earth-700 mb-1">
                {t(arg.key as any)}
              </label>
              <textarea
                value={arg.value}
                onChange={e => arg.setter(e.target.value)}
                className="input-field w-full"
                rows={3}
                placeholder={t((arg.key + '_ph') as any)}
                maxLength={800}
                disabled={submitting}
              />
              {renderModerationWarning(`argument${arg.num}`, arg.mod)}
            </div>
          ))}
        </div>

        {/* Conclusion */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">{t('new_debate_form_conclusion')}</label>
          <textarea
            value={conclusion}
            onChange={e => setConclusion(e.target.value)}
            className="input-field w-full"
            rows={3}
            placeholder={t('new_debate_form_conclusion_ph')}
            maxLength={800}
            disabled={submitting}
          />
          <p className="text-xs text-earth-400 mt-1">{t('new_debate_hint_conclusion')}</p>
          {renderModerationWarning('conclusion', moderation.conclusion)}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">{t('new_debate_form_category')}</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input-field w-full capitalize"
            disabled={submitting}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c} className="capitalize">
                {getCategoryLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Anonymous toggle */}
        <div className="flex items-center gap-3 p-3 bg-earth-50 rounded-lg">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            disabled={submitting}
            className="rounded"
          />
          <label htmlFor="anonymous" className="text-sm font-medium text-earth-700 cursor-pointer">
            {t('new_debate_form_anonymous')}
          </label>
        </div>

        {/* Warnings indicator */}
        {hasWarnings && !hasBlockedContent && (
          <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
            {t('mod_content_flagged')}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || hasBlockedContent}
          className={`w-full py-3 rounded-lg font-medium text-white transition ${
            hasBlockedContent
              ? 'bg-red-400 cursor-not-allowed'
              : submitting
              ? 'bg-saffron-400 cursor-wait'
              : 'bg-saffron-600 hover:bg-saffron-700 active:bg-saffron-800'
          }`}
        >
          {submitting ? t('new_debate_form_submitting') : t('new_debate_form_submit')}
        </button>
      </form>
    </div>
  );
}
