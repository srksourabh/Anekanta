'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import type { GlobalRole } from '@/lib/types';
import { GLOBAL_ROLES } from '@/lib/types';

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

interface UserWithRoles {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  role: string;
  globalRoles: string[];
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [flagged, setFlagged] = useState<FlaggedItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'moderation' | 'roles'>('overview');
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRoles[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

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

  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      setUsersWithRoles(data.users || []);
    } catch { /* ignore */ }
    setRolesLoading(false);
  };

  useEffect(() => {
    if (tab === 'roles' && usersWithRoles.length === 0) {
      loadRoles();
    }
  }, [tab]);

  const toggleRole = async (userId: string, role: string, hasRole: boolean) => {
    setRoleUpdating(`${userId}-${role}`);
    try {
      if (hasRole) {
        await fetch(`/api/admin/roles?userId=${userId}&role=${role}`, { method: 'DELETE' });
        setUsersWithRoles(prev => prev.map(u =>
          u.id === userId ? { ...u, globalRoles: u.globalRoles.filter(r => r !== role) } : u
        ));
      } else {
        await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role }),
        });
        setUsersWithRoles(prev => prev.map(u =>
          u.id === userId ? { ...u, globalRoles: [...u.globalRoles, role] } : u
        ));
      }
    } catch { /* ignore */ }
    setRoleUpdating(null);
  };

  const handleAction = async (id: string, action: 'dismissed' | 'actioned') => {
    await fetch('/api/admin/flagged', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: action }),
    });
    setFlagged(prev => prev.map(f => f.id === id ? { ...f, status: action } : f));
  };

  if (loading) return <div className="max-w-4xl mx-auto p-8 text-center text-earth-500">{t('loading')}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-earth-900 mb-6">{t('admin_title')}</h1>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'overview' ? 'bg-saffron-600 text-white' : 'bg-earth-100 text-earth-700'}`}>
          {t('admin_overview')}
        </button>
        <button onClick={() => setTab('moderation')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'moderation' ? 'bg-saffron-600 text-white' : 'bg-earth-100 text-earth-700'}`}>
          {t('admin_moderation')} {flagged.filter(f => f.status === 'pending').length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{flagged.filter(f => f.status === 'pending').length}</span>}
        </button>
        <button onClick={() => setTab('roles')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'roles' ? 'bg-saffron-600 text-white' : 'bg-earth-100 text-earth-700'}`}>
          {t('admin_roles_tab')}
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
                  <span className="ml-2 text-xs text-earth-500">{t('admin_score')} {(item.score ?? 0).toFixed(2)}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${item.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : item.status === 'actioned' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{item.status}</span>
                </div>
                <span className="text-xs text-earth-400">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-earth-700 mb-2">{item.reason}</p>
              {item.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(item.id, 'dismissed')} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">{t('admin_dismiss')}</button>
                  <button onClick={() => handleAction(item.id, 'actioned')} className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">{t('admin_take_action')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'roles' && (
        <div>
          <p className="text-sm text-earth-500 mb-4">{t('admin_roles_desc')}</p>
          <input
            type="text"
            placeholder={t('roles_search_users')}
            value={roleSearch}
            onChange={e => setRoleSearch(e.target.value)}
            className="input-field mb-4 max-w-md"
          />
          {rolesLoading ? (
            <p className="text-earth-500">{t('loading')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-earth-200">
                    <th className="text-left py-3 px-3 text-earth-600 font-medium">{t('display_name')}</th>
                    {GLOBAL_ROLES.map(role => (
                      <th key={role} className="text-center py-3 px-3 text-earth-600 font-medium">
                        {t(`role_global_${role}` as any)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersWithRoles
                    .filter(u => u.display_name.toLowerCase().includes(roleSearch.toLowerCase()) || u.username.toLowerCase().includes(roleSearch.toLowerCase()))
                    .map(user => (
                      <tr key={user.id} className="border-b border-earth-100 hover:bg-earth-50/50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: user.avatar_color }}
                            >
                              {user.display_name[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-earth-800">{user.display_name}</span>
                              {user.role === 'admin' && (
                                <span className="ml-2 text-[10px] bg-saffron-100 text-saffron-700 px-1.5 py-0.5 rounded">admin</span>
                              )}
                            </div>
                          </div>
                        </td>
                        {GLOBAL_ROLES.map(role => {
                          const hasRole = user.globalRoles.includes(role);
                          const isUpdating = roleUpdating === `${user.id}-${role}`;
                          return (
                            <td key={role} className="text-center py-3 px-3">
                              <button
                                onClick={() => toggleRole(user.id, role, hasRole)}
                                disabled={isUpdating}
                                className={`w-6 h-6 rounded border-2 transition-all inline-flex items-center justify-center
                                  ${hasRole
                                    ? 'bg-saffron-500 border-saffron-600 text-white'
                                    : 'border-earth-300 hover:border-saffron-400'
                                  }
                                  ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                                `}
                              >
                                {hasRole && (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
