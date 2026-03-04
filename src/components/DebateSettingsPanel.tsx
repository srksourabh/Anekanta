'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface DebateSettingsPanelProps {
  debateId: string;
  onClose: () => void;
}

export function DebateSettingsPanel({ debateId, onClose }: DebateSettingsPanelProps) {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/debates/${debateId}/settings`)
      .then(r => r.json())
      .then(data => { setSettings(data.settings); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debateId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/debates/${debateId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setMessage(t('settings_saved'));
    } else {
      const data = await res.json();
      setMessage(data.error || 'Failed to save');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="side-panel">
      <div className="p-4 text-stone-400 text-sm">{t('loading')}</div>
    </div>
  );

  if (!settings) return null;

  return (
    <div className="side-panel">
      <div className="sticky top-0 bg-white border-b border-stone-200 p-4 flex items-center justify-between z-10">
        <h2 className="font-heading font-bold text-stone-800 text-lg">{t('debate_settings_title')}</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-5">
        {message && (
          <div className={`text-xs p-2 rounded ${message === t('settings_saved') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}

        {/* Require Approval */}
        <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
          <input
            type="checkbox"
            checked={!!settings.requires_approval}
            onChange={e => setSettings({ ...settings, requires_approval: e.target.checked ? 1 : 0 })}
            className="mt-0.5 rounded"
          />
          <div>
            <div className="text-sm font-medium text-stone-700">{t('new_debate_require_approval')}</div>
            <div className="text-xs text-stone-400 mt-0.5">{t('new_debate_require_approval_hint')}</div>
          </div>
        </div>

        {/* Anonymous Mode */}
        <div className="p-3 bg-stone-50 rounded-lg">
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('new_debate_anonymous_mode')}</label>
          <select
            value={settings.anonymous_mode || 'off'}
            onChange={e => setSettings({ ...settings, anonymous_mode: e.target.value })}
            className="input-field text-sm"
          >
            <option value="off">{t('anon_mode_off')}</option>
            <option value="animal">{t('anon_mode_animal')}</option>
            <option value="full">{t('anon_mode_full')}</option>
          </select>
        </div>

        {/* Who Can Post */}
        <div className="p-3 bg-stone-50 rounded-lg">
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('settings_who_can_post')}</label>
          <select
            value={settings.who_can_post || 'anyone'}
            onChange={e => setSettings({ ...settings, who_can_post: e.target.value })}
            className="input-field text-sm"
          >
            <option value="anyone">{t('settings_anyone')}</option>
            <option value="team_members">{t('settings_team_members')}</option>
          </select>
        </div>

        {/* Max Arguments Per User */}
        <div className="p-3 bg-stone-50 rounded-lg">
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('settings_max_args')}</label>
          <p className="text-xs text-stone-400 mb-2">{t('settings_max_args_hint')}</p>
          <input
            type="number"
            min="0"
            value={settings.max_arguments_per_user || ''}
            onChange={e => setSettings({ ...settings, max_arguments_per_user: e.target.value ? parseInt(e.target.value) : null })}
            className="input-field text-sm w-32"
            placeholder="No limit"
          />
        </div>

        {/* Argument Time Limit */}
        <div className="p-3 bg-stone-50 rounded-lg">
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('settings_time_limit')}</label>
          <p className="text-xs text-stone-400 mb-2">{t('settings_time_limit_hint')}</p>
          <input
            type="datetime-local"
            value={settings.argument_time_limit || ''}
            onChange={e => setSettings({ ...settings, argument_time_limit: e.target.value || null })}
            className="input-field text-sm"
          />
        </div>

        {/* Max Depth */}
        <div className="p-3 bg-stone-50 rounded-lg">
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('settings_max_depth')}</label>
          <input
            type="number"
            min="1"
            max="20"
            value={settings.max_argument_depth || 10}
            onChange={e => setSettings({ ...settings, max_argument_depth: parseInt(e.target.value) || 10 })}
            className="input-field text-sm w-32"
          />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-2.5 text-sm">
          {saving ? t('saving') : t('save_settings')}
        </button>
      </div>
    </div>
  );
}
