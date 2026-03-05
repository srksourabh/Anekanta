'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';

export default function JournalEditPage() {
  const params = useParams();
  const router = useRouter();
  const journalId = params.id as string;
  const { t } = useLanguage();

  const [journal, setJournal] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitting, setSubmitting] = useState(false);

  const loadJournal = useCallback(async () => {
    const res = await fetch(`/api/journals/${journalId}`);
    if (res.ok) {
      const data = await res.json();
      setJournal(data);
      setTitle(data.title);
      setSections(data.sections || []);
    }
    setLoading(false);
  }, [journalId]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const saveSection = async (sectionId: string, field: 'title' | 'content', value: string) => {
    setSaveStatus('saving');
    const body: any = { sectionId };
    body[field] = value;

    await fetch(`/api/journals/${journalId}/sections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const saveTitle = async () => {
    if (!title || title === journal?.title) return;
    setSaveStatus('saving');
    await fetch(`/api/journals/${journalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSubmitForReview = async () => {
    if (!confirm('Submit this journal for review? You will not be able to edit until the reviewer responds.')) return;
    setSubmitting(true);
    const res = await fetch(`/api/journals/${journalId}/submit`, {
      method: 'POST',
    });
    if (res.ok) {
      router.push(`/journals/${journalId}`);
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this draft journal? This cannot be undone.')) return;
    const res = await fetch(`/api/journals/${journalId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/journals');
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-400">{t('loading')}</div>;
  if (!journal) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">Journal not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link href={`/journals/${journalId}`} className="text-sm text-stone-500 hover:text-stone-700">
          {t('journal_back')}
        </Link>
        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <span className="text-xs text-stone-400">
            {saveStatus === 'saving' && t('journal_saving')}
            {saveStatus === 'saved' && t('journal_saved')}
          </span>

          {journal.status === 'draft' && (
            <>
              <button
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {submitting ? '...' : t('journal_submit_review')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Review Notes */}
      {journal.review_notes && journal.status === 'draft' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-amber-800 mb-1">{t('journal_review_notes')}</h3>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{journal.review_notes}</p>
        </div>
      )}

      {/* Status indicator */}
      {journal.status === 'under_review' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700">This journal is currently under review. Editing is disabled until the reviewer responds.</p>
        </div>
      )}
      {journal.status === 'published' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-green-700">This journal has been published.</p>
        </div>
      )}

      {/* Editable Title */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={saveTitle}
        disabled={journal.status !== 'draft'}
        className="w-full text-3xl font-heading font-bold text-stone-800 bg-transparent border-b-2 border-transparent hover:border-stone-200 focus:border-saffron-400 focus:outline-none pb-2 mb-2 transition-colors disabled:hover:border-transparent"
        placeholder="Journal title..."
      />
      <p className="text-sm text-stone-400 mb-8">
        {t('journal_debate_source')}: {journal.debate_title}
      </p>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((section: any, idx: number) => (
          <div key={section.id} className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                {section.section_type.replace('_', ' ')}
              </span>
            </div>
            <input
              type="text"
              value={section.title}
              onChange={e => {
                const updated = [...sections];
                updated[idx] = { ...updated[idx], title: e.target.value };
                setSections(updated);
              }}
              onBlur={e => saveSection(section.id, 'title', e.target.value)}
              disabled={journal.status !== 'draft'}
              className="w-full text-lg font-heading font-semibold text-stone-800 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-saffron-400 focus:outline-none pb-1 mb-3 transition-colors disabled:hover:border-transparent"
            />
            <textarea
              value={section.content}
              onChange={e => {
                const updated = [...sections];
                updated[idx] = { ...updated[idx], content: e.target.value };
                setSections(updated);
              }}
              onBlur={e => saveSection(section.id, 'content', e.target.value)}
              disabled={journal.status !== 'draft'}
              rows={6}
              className="w-full text-stone-600 font-body leading-relaxed bg-transparent border border-transparent rounded-lg hover:border-stone-200 focus:border-saffron-400 focus:outline-none p-2 resize-y transition-colors disabled:hover:border-transparent"
              placeholder="Write this section..."
            />
          </div>
        ))}
      </div>
    </div>
  );
}
