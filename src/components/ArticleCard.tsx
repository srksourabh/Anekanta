'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/components/LanguageProvider';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    summary?: string;
    cover_image_url?: string;
    category?: string;
    status: string;
    read_time_minutes?: number;
    response_count?: number;
    author_id: string;
    author_name?: string;
    author_color?: string;
    created_at: string;
  };
}

export function ArticleCard({ article }: ArticleCardProps) {
  const { t, getCategoryLabel } = useLanguage();

  const fallbackGradient = (color?: string) => {
    const base = color || '#a97847';
    return `linear-gradient(135deg, ${base}22 0%, ${base}44 100%)`;
  };

  const statusBadge = (status: string) => {
    if (status === 'published') return null;
    const colors: Record<string, string> = {
      draft: 'bg-amber-100 text-amber-700',
      archived: 'bg-stone-200 text-stone-600',
    };
    const labels: Record<string, string> = {
      draft: t('article_draft'),
      archived: t('article_archived'),
    };
    return (
      <span className={`badge text-[10px] ${colors[status] || 'bg-stone-100 text-stone-500'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <Link
      href={`/articles/${article.id}`}
      className="card overflow-hidden hover:shadow-md transition-shadow group"
    >
      {/* Cover / gradient area */}
      <div
        className="h-40 relative"
        style={{
          background: article.cover_image_url
            ? `url(${article.cover_image_url}) center/cover no-repeat`
            : fallbackGradient(article.author_color),
        }}
      >
        {article.category && (
          <span className="absolute top-3 left-3 badge bg-white/90 text-earth-700 backdrop-blur-sm text-[11px] shadow-sm">
            {getCategoryLabel(article.category)}
          </span>
        )}
        {article.status !== 'published' && (
          <span className="absolute top-3 right-3">
            {statusBadge(article.status)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-heading font-bold text-stone-800 group-hover:text-earth-700 transition-colors line-clamp-2 mb-2">
          {article.title}
        </h3>

        {article.summary && (
          <p className="text-sm text-stone-500 line-clamp-2 mb-3 leading-relaxed">
            {article.summary}
          </p>
        )}

        {/* Author + date */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: article.author_color || '#a97847' }}
          >
            {article.author_name?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-xs text-stone-600 truncate">
            {article.author_name || t('debate_anonymous')}
          </span>
          <span className="text-stone-300 text-xs">&middot;</span>
          <span className="text-xs text-stone-400 flex-shrink-0">
            {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Read time + responses */}
        <div className="flex items-center gap-3 text-xs text-stone-400">
          {article.read_time_minutes != null && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {article.read_time_minutes} {t('articles_read_time')}
            </span>
          )}
          {article.response_count != null && article.response_count > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {article.response_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
