'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';

export default function CommunityPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('sort', sort);
    fetch(`/api/community?${params}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [search, sort]);

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-stone-400">{t('loading')}</div>;
  if (!data) return null;

  const { stats, members, leaderboard } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-stone-800">{t('community_title')}</h1>
        <p className="text-stone-500 mt-1">{t('community_subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('community_total_members'), value: stats.totalMembers },
          { label: t('community_total_debates'), value: stats.totalDebates },
          { label: t('community_total_arguments'), value: stats.totalArguments },
          { label: t('community_total_votes'), value: stats.totalVotes },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl font-heading font-bold text-earth-700">{s.value}</div>
            <div className="text-xs text-stone-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-heading font-bold text-stone-700 mb-4">{t('community_leaderboard')}</h2>
        <div className="space-y-3">
          {leaderboard.map((m: any, i: number) => {
            const total = (m.debate_count || 0) + (m.argument_count || 0) + (m.vote_count || 0) + (m.comment_count || 0);
            return (
              <div key={m.id} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold text-stone-400">{i + 1}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: m.avatar_color }}>
                  {m.display_name?.[0]?.toUpperCase()}
                </div>
                <Link href={`/profile/${m.id}`} className="flex-1 text-sm font-medium text-stone-800 hover:text-earth-700">
                  {m.display_name}
                  <span className="text-stone-400 ml-1">@{m.username}</span>
                </Link>
                <span className="text-xs text-stone-500">{total} contributions</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Members */}
      <div className="mb-4">
        <h2 className="text-lg font-heading font-bold text-stone-700 mb-4">{t('community_members')}</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('community_search')}
            className="input-field max-w-xs text-sm"
          />
          <select value={sort} onChange={e => setSort(e.target.value)} className="input-field w-auto text-sm">
            <option value="recent">{t('community_sort_recent')}</option>
            <option value="active">{t('community_sort_active')}</option>
          </select>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-stone-400 text-sm">{t('community_no_members')}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {members.map((m: any) => (
            <Link key={m.id} href={`/profile/${m.id}`} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: m.avatar_color }}>
                {m.display_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-800 text-sm">{m.display_name}</div>
                <div className="text-xs text-stone-400">@{m.username}</div>
              </div>
              <div className="text-right text-xs text-stone-400 flex-shrink-0">
                <div>{m.debate_count}d {m.argument_count}a {m.vote_count}v</div>
                <div>{t('community_joined')} {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
