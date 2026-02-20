'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-4">
          <Image src="/logo.png" alt="Anekanta" width={56} height={56} className="mx-auto" />
        </Link>
        <h1 className="text-2xl font-heading font-bold text-stone-800">{t('auth_welcome_back')}</h1>
        <p className="text-sm text-stone-500 mt-1">{t('auth_login_subtitle')}</p>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth_email')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">{t('auth_password')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? t('auth_signing_in') : t('nav_login')}
        </button>
        <p className="text-center text-sm text-stone-500">
          {t('auth_new_here')} <Link href="/auth/register" className="text-saffron-600 hover:underline">{t('auth_create_account')}</Link>
        </p>
      </form>
    </div>
  );
}
