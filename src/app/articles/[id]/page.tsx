'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { formatDistanceToNow } from 'date-fns';
import type { ArticleAttachment } from '@/lib/types';

interface Article {
  id: string;
  title: string;
  content: string;
  summary?: string;
  author_id: string;
  author_name?: string;
  author_color?: string;
  category?: string;
  status: string;
  cover_image_url?: string;
  read_time_minutes?: number;
  created_at: string;
  response_count?: number;
  attachments?: ArticleAttachment[];
}

interface ArticleResponse {
  id: string;
  article_id: string;
  author_id: string;
  author_name?: string;
  author_color?: string;
  content: string;
  type: 'agree' | 'disagree' | 'question' | 'elaboration';
  created_at: string;
}

interface User {
  id: string;
  display_name: string;
  username: string;
  role?: string;
}

const RESPONSE_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  agree: { bg: 'bg-green-100', text: 'text-green-700' },
  disagree: { bg: 'bg-red-100', text: 'text-red-700' },
  question: { bg: 'bg-blue-100', text: 'text-blue-700' },
  elaboration: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, getCategoryLabel } = useLanguage();

  const [article, setArticle] = useState<Article | null>(null);
  const [responses, setResponses] = useState<ArticleResponse[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Response form state
  const [responseContent, setResponseContent] = useState('');
  const [responseType, setResponseType] = useState<'agree' | 'disagree' | 'question' | 'elaboration'>('agree');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.id) setUser(data);
      })
      .catch(() => {});
  }, []);

  const fetchArticle = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/articles/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setArticle(data))
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchResponses = useCallback(() => {
    if (!id) return;
    fetch(`/api/articles/${id}/responses`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setResponses(Array.isArray(data) ? data : data.responses || []))
      .catch(() => setResponses([]));
  }, [id]);

  useEffect(() => {
    fetchArticle();
    fetchResponses();
  }, [fetchArticle, fetchResponses]);

  const handleDelete = async () => {
    if (!confirm(t('article_confirm_delete'))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/articles');
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseContent.trim()) return;
    setSubmittingResponse(true);
    try {
      const res = await fetch(`/api/articles/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: responseContent, type: responseType }),
      });
      if (res.ok) {
        setResponseContent('');
        setResponseType('agree');
        fetchResponses();
      }
    } catch {
      // ignore
    } finally {
      setSubmittingResponse(false);
    }
  };

  const canEdit = user && article && (user.id === article.author_id || user.role === 'admin');

  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-400">
        {t('loading')}
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-500 mb-4">{t('article_no_content')}</p>
        <Link href="/articles" className="text-earth-600 hover:underline">
          {t('all_debates_link').replace('debates', 'articles')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        href="/articles"
        className="inline-flex items-center gap-1.5 text-sm text-earth-600 hover:text-earth-800 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('all_debates_link').replace('debates', 'articles')}
      </Link>

      {/* Article header */}
      <article className="card overflow-hidden">
        {/* Cover image */}
        {article.cover_image_url && (
          <div className="w-full h-64 sm:h-80 relative">
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-stone-800 mb-4 leading-tight">
            {article.title}
          </h1>

          {/* Author + date + category + read time */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: article.author_color || '#a97847' }}
              >
                {article.author_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <span className="text-sm font-medium text-stone-700">
                  {article.author_name || t('debate_anonymous')}
                </span>
                <span className="text-stone-300 mx-2">·</span>
                <span className="text-sm text-stone-400">
                  {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {article.category && (
              <span className="badge bg-earth-100 text-earth-700 text-xs">
                {getCategoryLabel(article.category)}
              </span>
            )}

            {article.read_time_minutes != null && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {article.read_time_minutes} {t('articles_read_time')}
              </span>
            )}
          </div>

          {/* View only notice */}
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm mb-6 border border-blue-100">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('article_view_only')}
          </div>

          {/* Summary */}
          {article.summary && (
            <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-100">
              <p className="text-sm text-stone-600 italic leading-relaxed">{article.summary}</p>
            </div>
          )}

          {/* Article content */}
          <div className="prose prose-stone max-w-none mb-8">
            <div className="whitespace-pre-wrap text-stone-700 leading-relaxed">
              {article.content || t('article_no_content')}
            </div>
          </div>

          {/* Attachments */}
          {article.attachments && article.attachments.length > 0 && (
            <div className="border-t pt-6 mb-6">
              <h2 className="text-lg font-heading font-semibold text-stone-800 mb-4">
                {t('article_attachments')}
              </h2>
              <div className="space-y-5">
                {article.attachments.map((att) => (
                  <div key={att.id} className="rounded-lg border border-stone-200 overflow-hidden">
                    {att.type === 'youtube' && (() => {
                      const ytId = extractYouTubeId(att.url);
                      return ytId ? (
                        <div className="aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            title={att.title || t('article_attachment_youtube')}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 text-earth-600 hover:underline"
                        >
                          {att.url}
                        </a>
                      );
                    })()}

                    {att.type === 'image' && (
                      <div className="flex justify-center bg-stone-50 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt={att.title || t('article_attachment_image')}
                          className="max-w-full max-h-[500px] object-contain rounded select-none"
                          onContextMenu={(e) => e.preventDefault()}
                          draggable={false}
                        />
                      </div>
                    )}

                    {att.type === 'link' && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 hover:bg-stone-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-earth-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="text-earth-600 hover:underline text-sm truncate">
                          {att.title || att.url}
                        </span>
                      </a>
                    )}

                    {/* Attachment title and description */}
                    {(att.title || att.description) && (
                      <div className="px-4 py-3 bg-stone-50 border-t border-stone-100">
                        {att.title && (
                          <p className="text-sm font-medium text-stone-700">{att.title}</p>
                        )}
                        {att.description && (
                          <p className="text-xs text-stone-500 mt-0.5">{att.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit / Delete buttons */}
          {canEdit && (
            <div className="flex items-center gap-3 border-t pt-6 mb-6">
              <Link
                href={`/articles/${id}/edit`}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('article_edit')}
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('article_delete')}
                </span>
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Responses section */}
      <div className="mt-8">
        <h2 className="text-xl font-heading font-bold text-stone-800 mb-4">
          {t('article_responses')}
          {responses.length > 0 && (
            <span className="text-stone-400 font-normal ml-2 text-base">({responses.length})</span>
          )}
        </h2>

        {/* Existing responses */}
        {responses.length > 0 ? (
          <div className="space-y-4 mb-8">
            {responses.map((resp) => {
              const style = RESPONSE_TYPE_STYLES[resp.type] || RESPONSE_TYPE_STYLES.agree;
              const typeKey = `article_response_${resp.type}` as 'article_response_agree' | 'article_response_disagree' | 'article_response_question' | 'article_response_elaboration';
              return (
                <div key={resp.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: resp.author_color || '#a97847' }}
                    >
                      {resp.author_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-stone-700">
                      {resp.author_name || t('debate_anonymous')}
                    </span>
                    <span className={`badge text-[10px] ${style.bg} ${style.text}`}>
                      {t(typeKey)}
                    </span>
                    <span className="text-xs text-stone-400 ml-auto">
                      {formatDistanceToNow(new Date(resp.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
                    {resp.content}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-stone-400 mb-8">{t('no_comments_yet')}</p>
        )}

        {/* Add response form */}
        {user ? (
          <form onSubmit={handleSubmitResponse} className="card p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">{t('article_add_response')}</h3>

            {/* Type selector */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(['agree', 'disagree', 'question', 'elaboration'] as const).map((type) => {
                const style = RESPONSE_TYPE_STYLES[type];
                const typeKey = `article_response_${type}` as 'article_response_agree' | 'article_response_disagree' | 'article_response_question' | 'article_response_elaboration';
                const isSelected = responseType === type;
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                      isSelected
                        ? `${style.bg} ${style.text} border-current`
                        : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="response_type"
                      value={type}
                      checked={isSelected}
                      onChange={() => setResponseType(type)}
                      className="sr-only"
                    />
                    {t(typeKey)}
                  </label>
                );
              })}
            </div>

            <textarea
              value={responseContent}
              onChange={(e) => setResponseContent(e.target.value)}
              placeholder={t('article_add_response')}
              className="input-field w-full mb-3"
              rows={4}
              disabled={submittingResponse}
            />

            <button
              type="submit"
              disabled={submittingResponse || !responseContent.trim()}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-saffron-600 hover:bg-saffron-700 active:bg-saffron-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingResponse ? t('arg_submitting') : t('debate_submit')}
            </button>
          </form>
        ) : (
          <div className="card p-4 text-center text-sm text-stone-500">
            <Link href="/auth/login" className="text-earth-600 hover:underline font-medium">
              {t('sign_in_prompt')}
            </Link>
            {' '}
            {t('sign_in_to_participate')}
          </div>
        )}
      </div>
    </div>
  );
}
