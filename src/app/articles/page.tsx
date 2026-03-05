'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { ArticleCard } from '@/components/ArticleCard';
import Link from 'next/link';

interface User {
  id: string;
  display_name: string;
  username: string;
}

export default function ArticlesPage() {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.id) setUser(data);
      })
      .catch(() => {});
  }, []);

  const fetchArticles = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter === 'mine' && user) params.set('author', user.id);
    params.set('page', String(page));

    fetch(`/api/articles?${params}`)
      .then(r => r.json())
      .then(data => {
        setArticles(data.articles || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {
        setArticles([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [search, filter, page, user]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-stone-800">{t('articles_title')}</h1>
        {user && (
          <Link href="/articles/new" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('articles_write')}
          </Link>
        )}
      </div>

      {/* Search and filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('articles_search')}
              className="input-field pl-10 text-sm"
            />
          </div>

          {user && (
            <div className="flex rounded-lg border border-stone-200 overflow-hidden">
              <button
                onClick={() => { setFilter('all'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-earth-600 text-white'
                    : 'bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                {t('article_all')}
              </button>
              <button
                onClick={() => { setFilter('mine'); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-stone-200 ${
                  filter === 'mine'
                    ? 'bg-earth-600 text-white'
                    : 'bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                {t('article_my_articles')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Articles grid */}
      {loading ? (
        <div className="text-center py-16 text-stone-400">{t('loading')}</div>
      ) : articles.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-stone-300 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <p className="text-stone-500 mb-4">{t('articles_no_results')}</p>
          {user && (
            <Link href="/articles/new" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('articles_write')}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &larr;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                    p === page
                      ? 'bg-earth-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
