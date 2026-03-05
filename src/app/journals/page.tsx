'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { JournalCard } from '@/components/JournalCard';
import Link from 'next/link';

export default function JournalsPage() {
  const { t } = useLanguage();
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'published' | 'drafts'>('published');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));

    if (tab === 'drafts' && user) {
      params.set('editor', user.id);
      // Show all statuses for own drafts
    } else {
      params.set('status', 'published');
    }

    if (search) params.set('search', search);

    fetch(`/api/journals?${params}`)
      .then(r => r.json())
      .then(data => {
        setJournals(data.journals || []);
        setTotalPages(data.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [tab, search, page, user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-heading font-bold text-stone-800">{t('journals_title')}</h1>
        {user && (
          <Link href="/debates" className="btn-primary text-sm">
            {t('journal_create')}
          </Link>
        )}
      </div>
      <p className="text-stone-500 text-sm mb-6">{t('journals_subtitle')}</p>

      {/* Tabs */}
      {user && (
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => { setTab('published'); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'published' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            {t('journal_status_published')}
          </button>
          <button
            onClick={() => { setTab('drafts'); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'drafts' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
          >
            {t('journal_my_drafts')}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="card p-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search journals..."
          className="input-field max-w-xs text-sm"
        />
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">{t('loading')}</div>
      ) : journals.length === 0 ? (
        <div className="text-center py-12 text-stone-400">{t('journals_no_results')}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journals.map((j: any) => (
            <JournalCard key={j.id} journal={j} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-stone-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
