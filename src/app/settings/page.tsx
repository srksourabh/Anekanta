'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (!u) { router.push('/auth/login'); return; }
        setUser(u);
        setDisplayName(u.display_name);
        setBio(u.bio || '');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg('');
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, bio }),
    });
    if (res.ok) setProfileMsg(t('settings_saved'));
    else setProfileMsg((await res.json()).error || 'Error');
    setProfileSaving(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { setPasswordMsg(t('settings_password_mismatch')); return; }
    setPasswordSaving(true);
    setPasswordMsg('');
    const res = await fetch('/api/user/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setPasswordMsg(t('settings_password_updated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg((await res.json()).error || 'Error');
    }
    setPasswordSaving(false);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    const res = await fetch('/api/user/delete', { method: 'DELETE' });
    if (res.ok) {
      router.push('/');
      router.refresh();
    }
    setDeleting(false);
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-stone-400">{t('loading')}</div>;
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-heading font-bold text-stone-800 mb-8">{t('settings_title')}</h1>

      {/* Profile Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-heading font-bold text-stone-700 mb-4">{t('settings_profile')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">{t('settings_display_name')}</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input-field" maxLength={50} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">{t('settings_bio')}</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} className="input-field" rows={3} maxLength={500} placeholder={t('settings_bio_placeholder')} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveProfile} disabled={profileSaving} className="btn-primary text-sm">
              {profileSaving ? '...' : t('settings_save')}
            </button>
            {profileMsg && <span className="text-sm text-green-600">{profileMsg}</span>}
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-heading font-bold text-stone-700 mb-4">{t('settings_password')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">{t('settings_current_password')}</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">{t('settings_new_password')}</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">{t('settings_confirm_password')}</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={changePassword} disabled={passwordSaving || !currentPassword || !newPassword} className="btn-primary text-sm">
              {passwordSaving ? '...' : t('settings_update_password')}
            </button>
            {passwordMsg && <span className={`text-sm ${passwordMsg.includes('incorrect') || passwordMsg.includes('mismatch') ? 'text-red-600' : 'text-green-600'}`}>{passwordMsg}</span>}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-red-200">
        <h2 className="text-lg font-heading font-bold text-red-700 mb-2">{t('settings_danger')}</h2>
        <p className="text-sm text-stone-500 mb-4">{t('settings_delete_warning')}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">{t('settings_delete_confirm')}</label>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} className="input-field" placeholder="DELETE" />
          </div>
          <button onClick={deleteAccount} disabled={deleting || deleteConfirm !== 'DELETE'} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
            {deleting ? '...' : t('settings_delete_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
