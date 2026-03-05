'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';

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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
      {t(labels[status] || 'journal_status_draft')}
    </span>
  );
}

export default function JournalViewPage() {
  const params = useParams();
  const router = useRouter();
  const journalId = params.id as string;
  const { t } = useLanguage();

  const [journal, setJournal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isReviewer, setIsReviewer] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'request_changes' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/journals/${journalId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setJournal(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        setUser(u);
        if (u) {
          // globalRoles is now included in /api/auth/me response
          if (u.globalRoles?.includes('reviewer') || u.role === 'admin') {
            setIsReviewer(true);
          }
        }
      })
      .catch(() => {});
  }, [journalId]);

  const handleReview = async (action: 'approve' | 'request_changes') => {
    setSubmitting(true);
    const res = await fetch(`/api/journals/${journalId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes: reviewNotes }),
    });
    if (res.ok) {
      // Reload journal
      const data = await fetch(`/api/journals/${journalId}`).then(r => r.json());
      setJournal(data);
      setReviewAction(null);
      setReviewNotes('');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-400">{t('loading')}</div>;
  if (!journal) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">Journal not found</div>;

  const isEditor = user && journal.editor_id === user.id;
  const sections = journal.sections || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation */}
      <Link href="/journals" className="text-sm text-stone-500 hover:text-stone-700 mb-4 inline-block">
        {t('journal_back')}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <StatusBadge status={journal.status} />
          {isEditor && journal.status === 'draft' && (
            <Link
              href={`/journals/${journalId}/edit`}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              {t('journal_edit')}
            </Link>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-stone-800 mb-4">{journal.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
          <span>
            {t('journal_editor')}: <span className="font-medium" style={{ color: journal.editor_color || '#0f766e' }}>{journal.editor_name}</span>
          </span>
          <Link href={`/debates/${journal.debate_id}`} className="text-teal-600 hover:underline">
            {t('journal_debate_source')}: {journal.debate_title}
          </Link>
          {journal.published_at && (
            <span>{t('journal_published_on')} {new Date(journal.published_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Review Notes (shown to editor when reviewer sent back changes) */}
      {journal.review_notes && journal.status === 'draft' && isEditor && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-amber-800 mb-1">{t('journal_review_notes')}</h3>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{journal.review_notes}</p>
        </div>
      )}

      {/* Reviewer Actions */}
      {journal.status === 'under_review' && isReviewer && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-teal-800 mb-3">Review this journal</h3>
          {!reviewAction ? (
            <div className="flex gap-3">
              <button
                onClick={() => setReviewAction('approve')}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('journal_approve')}
              </button>
              <button
                onClick={() => setReviewAction('request_changes')}
                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
              >
                {t('journal_request_changes')}
              </button>
            </div>
          ) : (
            <div>
              {reviewAction === 'request_changes' && (
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Notes for the editor..."
                  className="input-field w-full mb-3 text-sm"
                  rows={3}
                />
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => handleReview(reviewAction)}
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? '...' : reviewAction === 'approve' ? t('journal_approve') : t('journal_request_changes')}
                </button>
                <button
                  onClick={() => { setReviewAction(null); setReviewNotes(''); }}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((section: any) => (
          <section key={section.id} className="border-b border-stone-100 pb-8 last:border-b-0">
            <h2 className="text-xl font-heading font-semibold text-stone-800 mb-3">{section.title}</h2>
            {section.content ? (
              <div className="text-stone-600 font-body leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            ) : (
              <p className="text-stone-400 text-sm italic">No content yet.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
