'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface Role {
  id: string;
  user_id: string;
  role: 'moderator' | 'editor';
  user_name: string;
  user_color: string;
  username: string;
  created_at: string;
}

interface RolesPanelProps {
  debateId: string;
  onClose: () => void;
}

export function RolesPanel({ debateId, onClose }: RolesPanelProps) {
  const { t } = useLanguage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState<'moderator' | 'editor'>('moderator');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRoles = async () => {
    const res = await fetch(`/api/debates/${debateId}/roles`);
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, [debateId]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!username.trim()) return;

    // First find user by username
    const searchRes = await fetch(`/api/community?search=${encodeURIComponent(username.trim())}`);
    if (!searchRes.ok) { setError('Failed to search users'); return; }
    const searchData = await searchRes.json();
    const foundUser = searchData.members?.find((m: any) =>
      m.username === username.trim().toLowerCase()
    );
    if (!foundUser) { setError('User not found. Enter the exact username.'); return; }

    const res = await fetch(`/api/debates/${debateId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: foundUser.id, role: selectedRole }),
    });

    if (res.ok) {
      setSuccess(`${selectedRole} role assigned to ${foundUser.display_name}`);
      setUsername('');
      fetchRoles();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to assign role');
    }
  };

  const handleRemove = async (roleId: string) => {
    const res = await fetch(`/api/debates/${debateId}/roles?roleId=${roleId}`, { method: 'DELETE' });
    if (res.ok) fetchRoles();
  };

  const moderators = roles.filter(r => r.role === 'moderator');
  const editors = roles.filter(r => r.role === 'editor');

  return (
    <div className="side-panel">
      <div className="sticky top-0 bg-white border-b border-stone-200 p-4 flex items-center justify-between z-10">
        <h2 className="font-heading font-bold text-stone-800 text-lg">{t('roles_title')}</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Assign Role Form */}
        <form onSubmit={handleAssign} className="space-y-3">
          <h3 className="text-sm font-medium text-stone-700">{t('roles_assign')}</h3>
          {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="text-xs text-green-600 bg-green-50 p-2 rounded">{success}</div>}
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder={t('roles_username_placeholder')}
            className="input-field text-sm"
          />
          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as 'moderator' | 'editor')}
              className="input-field text-sm flex-1"
            >
              <option value="moderator">{t('role_moderator')}</option>
              <option value="editor">{t('role_editor')}</option>
            </select>
            <button type="submit" className="btn-primary text-sm px-4">
              {t('roles_assign_btn')}
            </button>
          </div>
        </form>

        {/* Moderators */}
        <div>
          <h3 className="text-sm font-medium text-stone-700 mb-2">{t('role_moderators')} ({moderators.length})</h3>
          <p className="text-xs text-stone-400 mb-3">{t('role_moderator_desc')}</p>
          {moderators.length === 0 ? (
            <p className="text-xs text-stone-400 italic">{t('roles_none')}</p>
          ) : (
            <div className="space-y-2">
              {moderators.map(r => (
                <div key={r.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: r.user_color }}>
                    {r.user_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-700 truncate">{r.user_name}</div>
                    <div className="text-xs text-stone-400">@{r.username}</div>
                  </div>
                  <button onClick={() => handleRemove(r.id)} className="text-xs text-red-500 hover:text-red-700">
                    {t('roles_remove')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editors */}
        <div>
          <h3 className="text-sm font-medium text-stone-700 mb-2">{t('role_editors')} ({editors.length})</h3>
          <p className="text-xs text-stone-400 mb-3">{t('role_editor_desc')}</p>
          {editors.length === 0 ? (
            <p className="text-xs text-stone-400 italic">{t('roles_none')}</p>
          ) : (
            <div className="space-y-2">
              {editors.map(r => (
                <div key={r.id} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: r.user_color }}>
                    {r.user_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-700 truncate">{r.user_name}</div>
                    <div className="text-xs text-stone-400">@{r.username}</div>
                  </div>
                  <button onClick={() => handleRemove(r.id)} className="text-xs text-red-500 hover:text-red-700">
                    {t('roles_remove')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
