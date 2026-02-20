'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/components/LanguageProvider';

export function DebateCard({ debate }: { debate: any }) {
  const { t, getCategoryLabel } = useLanguage();

  return (
    <Link href={`/debates/${debate.id}`} className="card p-5 hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge bg-earth-100 text-earth-700 text-[10px] capitalize">{getCategoryLabel(debate.category)}</span>
          </div>
          <h3 className="font-heading font-semibold text-stone-800 text-lg mb-1 line-clamp-2">{debate.title}</h3>
          <p className="text-sm text-stone-500 line-clamp-2 mb-3">{debate.thesis}</p>
          <div className="flex items-center gap-4 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {debate.argument_count} {t('debates_arguments')}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              {debate.vote_count} {t('debates_votes')}
            </span>
            <span>
              {t('debates_by')} <span className="font-medium" style={{ color: debate.author_color }}>{debate.author_name}</span>
            </span>
            <span>{formatDistanceToNow(new Date(debate.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
