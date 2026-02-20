'use client';

import { formatDistanceToNow } from 'date-fns';
import { DebateCard } from '@/components/DebateCard';
import { useLanguage } from '@/components/LanguageProvider';

interface ProfileContentProps {
  user: {
    id: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_color: string;
    created_at: string;
  };
  stats: { debates: number; arguments: number; votes: number; comments: number };
  debates: any[];
}

export function ProfileContent({ user, stats, debates }: ProfileContentProps) {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: user.avatar_color }}>
            {user.display_name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-stone-800">{user.display_name}</h1>
            <p className="text-sm text-stone-500">@{user.username}</p>
            <p className="text-xs text-stone-400 mt-1">{t('profile_joined')} {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</p>
          </div>
        </div>
        {user.bio && <p className="text-sm text-stone-600 mt-4">{user.bio}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-stone-200 text-center">
          {[
            { label: t('stats_debates'), value: stats.debates },
            { label: t('stats_arguments'), value: stats.arguments },
            { label: t('stats_votes'), value: stats.votes },
            { label: t('profile_stat_comments'), value: stats.comments },
          ].map(s => (
            <div key={s.label}>
              <div className="text-lg font-heading font-bold text-earth-700">{s.value}</div>
              <div className="text-xs text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* User's debates */}
      <h2 className="text-lg font-heading font-bold text-stone-800 mb-4">{t('profile_debates_started')}</h2>
      {debates.length === 0 ? (
        <p className="text-stone-400 text-sm">{t('profile_no_debates')}</p>
      ) : (
        <div className="space-y-3">
          {debates.map((d: any) => <DebateCard key={d.id} debate={d} />)}
        </div>
      )}
    </div>
  );
}
