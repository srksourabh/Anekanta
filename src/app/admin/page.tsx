'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface FlaggedItem {
  id: string;
  content_type: string;
  content_id: string;
  author_id: string;
  reason: string;
  flags: string;
  score: number;
  status: string;
  created_at: string;
  author_name?: string;
  content_preview?: string;
}

interface Stats {
  totalUsers: number;
  totalDebates: number;
  totalArguments: number;
  pendingFlags: number;
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [flagged, setFlagged] = useState<FlaggedItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'moderation'>('overview');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/flagged').then(r => r.json()),
    ]).then(([s, f]) => {
      setStats(s);
      setFlagged(f.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: 'dismissed' | 'actioned') => {
    await fetch('/api/admin/flagged', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: action }),
    });
    setFlagged(prev => prev.map(f => f.id === id ? { ...f, status: action } : f));
  };

  if (loading) return <div className="max-w-4xl mx-auto p-8 text-center text-earth-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-earth-900 mb-6">{t('admin_title')}</h1>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'overview' ? 'bg-saffron-600 text-white' : 'bg-earth-100 text-earth-700'}`}>
          Overview
        </button>
        <button onClick={() => setTab('moderation')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'moderation' ? 'bg-saffron-600 text-white' : 'bg-earth-100 text-earth-700'}`}>
          {t('admin_moderation')} {flagged.filter(f => f.status === 'pending').length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{flagged.filter(f => f.status === 'pending').length}</span>}
        </button>
      </div>

      {tab === 'overview' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('admin_total_users'), value: stats.totalUsers, color: 'bg-teal-50 text-teal-700 border-teal-200' },
            { label: t('admin_total_debates'), value: stats.totalDebates, color: 'bg-saffron-50 text-saffron-700 border-saffron-200' },
            { label: t('admin_total_arguments'), value: stats.totalArguments, color: 'bg-earth-50 text-earth-700 border-earth-200' },
            { label: t('admin_flagged_count'), value: stats.pendingFlags, color: 'bg-red-50 text-red-700 border-red-200' },
          ].map(s => (
            <div key={s.label} className={`p-4 rounded-xl border ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'moderation' && (
        <div className="space-y-4">
          {flagged.length === 0 ? (
            <p className="text-earth-500">{t('admin_no_flagged')}</p>
          ) : flagged.map(item => (
            <div key={item.id} className={`p-4 rounded-xl border ${item.status === 'pending' ? 'border-red-200 bg-red-50' : 'border-earth-200 bg-earth-50'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-medium uppercase bg-earth-200 text-earth-700 px-2 py-0.5 rounded">{item.content_type}</span>
                  <span className="ml-2 text-xs text-earth-500">Score: {item.score.toFixed(2)}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${item.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : item.status === 'actioned' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{item.status}</span>
                </div>
                <span className="text-xs text-earth-400">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-earth-700 mb-2">{item.reason}</p>
              {item.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(item.id, 'dismissed')} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Dismiss</button>
                  <button onClick={() => handleAction(item.id, 'actioned')} className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Take Action</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
