'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...form }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-4">
          <Image src="/logo.png" alt="Anekanta" width={56} height={56} className="mx-auto" />
        </Link>
        <h1 className="text-2xl font-heading font-bold text-stone-800">{t('auth_join')}</h1>
        <p className="text-sm text-stone-500 mt-1">{t('auth_register_subtitle')}</p>
      </div>
      <div className="card p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <a
            href="/api/auth/oauth/google"
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-stone-300 rounded-lg bg-white hover:bg-stone-50 transition-colors text-sm font-medium text-stone-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth_google')}
          </a>
          <a
            href="/api/auth/oauth/github"
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-stone-700 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors text-sm font-medium text-white"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
            </svg>
            {t('auth_github')}
          </a>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400 uppercase">{t('auth_or_divider')}</span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth_display_name')}</label>
            <input value={form.displayName} onChange={e => update('displayName', e.target.value)} className="input-field" placeholder={t('auth_display_name_hint')} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth_username')}</label>
            <input value={form.username} onChange={e => update('username', e.target.value)} className="input-field" placeholder={t('auth_username_hint')} required minLength={3} maxLength={30} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth_email')}</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth_password')}</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input-field" required minLength={6} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? t('auth_creating') : t('auth_create_account')}
          </button>
        </form>
        <p className="text-center text-sm text-stone-500">
          {t('auth_have_account')} <Link href="/auth/login" className="text-teal-600 hover:underline">{t('nav_login')}</Link>
        </p>
      </div>
    </div>
  );
}
