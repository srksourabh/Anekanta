'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import type { ArticleAttachmentType } from '@/lib/types';

interface AttachmentField {
  type: ArticleAttachmentType;
  url: string;
  title: string;
}

interface User {
  id: string;
  display_name: string;
  username: string;
}

const CATEGORIES = ['general', 'philosophy', 'science', 'politics', 'technology', 'culture', 'other'] as const;

export default function NewArticlePage() {
  const router = useRouter();
  const { t, getCategoryLabel } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [attachments, setAttachments] = useState<AttachmentField[]>([]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.id) {
          setUser(data);
        } else {
          router.push('/auth/login');
        }
      })
      .catch(() => {
        router.push('/auth/login');
      })
      .finally(() => setAuthChecked(true));
  }, [router]);

  const addAttachment = () => {
    setAttachments(prev => [...prev, { type: 'youtube', url: '', title: '' }]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const updateAttachment = (index: number, field: keyof AttachmentField, value: string) => {
    setAttachments(prev => prev.map((att, i) =>
      i === index ? { ...att, [field]: value } : att
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError(t('error_required_fields'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create the article
      const articleRes = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          summary,
          content,
          cover_image_url: coverImageUrl || undefined,
          status: 'published',
        }),
      });

      if (!articleRes.ok) {
        const data = await articleRes.json();
        setError(data.error || 'Failed to create article');
        setSubmitting(false);
        return;
      }

      const { id: articleId } = await articleRes.json();

      // Post each attachment
      const validAttachments = attachments.filter(att => att.url.trim());
      if (validAttachments.length > 0) {
        await Promise.all(
          validAttachments.map((att, index) =>
            fetch(`/api/articles/${articleId}/attachments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: att.type,
                url: att.url,
                title: att.title || undefined,
                sort_order: index,
              }),
            })
          )
        );
      }

      router.push(`/articles/${articleId}`);
    } catch {
      setError(t('error_unexpected'));
      setSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-stone-400">
        {t('loading')}
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-heading font-bold text-earth-900 mb-2">
        {t('article_new_title')}
      </h1>
      <p className="text-earth-500 mb-6 text-sm">
        {t('articles_write')}
      </p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            {t('article_form_title')} *
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field w-full"
            placeholder={t('article_form_title')}
            maxLength={200}
            disabled={submitting}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            {t('new_debate_form_category')}
          </label>
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

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            {t('article_form_summary')}
          </label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            className="input-field w-full"
            rows={3}
            placeholder={t('article_form_summary')}
            maxLength={500}
            disabled={submitting}
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            {t('article_form_content')} *
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="input-field w-full"
            rows={12}
            placeholder={t('article_form_content')}
            disabled={submitting}
          />
        </div>

        {/* Cover image URL */}
        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            {t('article_attachment_image')}
          </label>
          <input
            value={coverImageUrl}
            onChange={e => setCoverImageUrl(e.target.value)}
            className="input-field w-full"
            placeholder={t('article_attachment_url')}
            disabled={submitting}
          />
          <p className="text-xs text-earth-400 mt-1">Optional cover image URL</p>
        </div>

        {/* Attachments */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-earth-900 mb-4">
            {t('article_attachments')}
          </h2>

          {attachments.length > 0 && (
            <div className="space-y-4 mb-4">
              {attachments.map((att, index) => (
                <div key={index} className="p-4 bg-earth-50 rounded-lg border border-earth-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-earth-700">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Type selector */}
                  <div className="flex gap-2 mb-3">
                    {(['youtube', 'image', 'link'] as const).map(type => {
                      const typeKey = `article_attachment_${type}` as 'article_attachment_youtube' | 'article_attachment_image' | 'article_attachment_link';
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateAttachment(index, 'type', type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            att.type === type
                              ? 'bg-earth-600 text-white'
                              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {t(typeKey)}
                        </button>
                      );
                    })}
                  </div>

                  {/* URL input */}
                  <input
                    value={att.url}
                    onChange={e => updateAttachment(index, 'url', e.target.value)}
                    className="input-field w-full mb-2"
                    placeholder={t('article_attachment_url')}
                    disabled={submitting}
                  />

                  {/* Title input */}
                  <input
                    value={att.title}
                    onChange={e => updateAttachment(index, 'title', e.target.value)}
                    className="input-field w-full"
                    placeholder={t('article_attachment_title')}
                    disabled={submitting}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addAttachment}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-earth-600 bg-earth-50 hover:bg-earth-100 border border-earth-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('article_add_attachment')}
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded-lg font-medium text-white transition ${
            submitting
              ? 'bg-saffron-400 cursor-wait'
              : 'bg-saffron-600 hover:bg-saffron-700 active:bg-saffron-800'
          }`}
        >
          {submitting ? t('new_debate_form_submitting') : t('article_form_submit')}
        </button>
      </form>
    </div>
  );
}
