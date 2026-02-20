'use client';

import { useState, useEffect } from 'react';
import { DebateCard } from '@/components/DebateCard';
import { useLanguage } from '@/components/LanguageProvider';
import { CATEGORIES } from '@/lib/types';
import Link from 'next/link';

export default function DebatesPage() {
  const { t, getCategoryLabel } = useLanguage();
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    params.set('sort', sort);
    params.set('page', String(page));

    fetch(`/api/debates?${params}`)
      .then(r => r.json())
      .then(data => {
        setDebates(data.debates);
        setTotalPages(data.pages);
      })
      .finally(() => setLoading(false));
  }, [category, sort, search, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-stone-800">{t('debates_title')}</h1>
        <Link href="/debates/new" className="btn-primary">{t('start_debate_btn')}</Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('debates_search')}
            className="input-field max-w-xs text-sm"
          />
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="input-field w-auto text-sm">
            <option value="all">{t('debates_all_categories')}</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{getCategoryLabel(c)}</option>)}
          </select>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="input-field w-auto text-sm">
            <option value="recent">{t('debates_sort_recent')}</option>
            <option value="popular">{t('debates_sort_popular')}</option>
            <option value="active">{t('debates_sort_active')}</option>
          </select>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => { setCategory('all'); setPage(1); }} className={`badge cursor-pointer transition-colors ${category === 'all' ? 'bg-earth-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
          {t('debates_all_categories')}
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => { setCategory(c); setPage(1); }} className={`badge cursor-pointer capitalize transition-colors ${category === c ? 'bg-earth-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {getCategoryLabel(c)}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">{t('loading')}</div>
      ) : debates.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-stone-500 mb-4">{t('debates_no_results')}{search ? ` "${search}"` : ''}</p>
          <Link href="/debates/new" className="btn-primary">{t('start_one')}</Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {debates.map(d => <DebateCard key={d.id} debate={d} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm ${p === page ? 'bg-earth-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
