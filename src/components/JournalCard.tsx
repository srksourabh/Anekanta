'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/components/LanguageProvider';
import type { Journal } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const colors: Record<string, string> = {
    draft: 'bg-stone-200 text-stone-600',
    under_review: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
  };
  const labels: Record<string, string> = {
    draft: 'journal_status_draft',
    under_review: 'journal_status_review',
    published: 'journal_status_published',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || colors.draft}`}>
      {t(labels[status] || 'journal_status_draft')}
    </span>
  );
}

export function JournalCard({ journal }: { journal: Journal }) {
  const { t } = useLanguage();

  return (
    <Link href={`/journals/${journal.id}`} className="card p-5 hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge status={journal.status} />
            {journal.section_count !== undefined && (
              <span className="text-[10px] text-stone-400">{journal.section_count} sections</span>
            )}
          </div>
          <h3 className="font-heading font-semibold text-stone-800 text-lg mb-1 line-clamp-2">{journal.title}</h3>
          {journal.debate_title && (
            <p className="text-sm text-stone-500 mb-2 line-clamp-1">
              {t('journal_debate_source')}: {journal.debate_title}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-stone-400">
            <span>
              {t('journal_editor')}: <span className="font-medium" style={{ color: journal.editor_color || '#a97847' }}>{journal.editor_name}</span>
            </span>
            {journal.published_at ? (
              <span>{t('journal_published_on')} {new Date(journal.published_at).toLocaleDateString()}</span>
            ) : (
              <span>{formatDistanceToNow(new Date(journal.created_at), { addSuffix: true })}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
