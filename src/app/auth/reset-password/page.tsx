'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageProvider';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16 text-center text-stone-400">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const token = searchParams.get('token');

  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setMode('reset');
    } else {
      setMode('request');
    }
  }, [token]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setSuccess('If an account exists with that email, you will receive a reset link.');
      setEmail('');
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to request reset');
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth/reset-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (res.ok) {
      setSuccess('Password reset successfully. Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to reset password');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-4">
          <Image src="/logo.png" alt="Anekanta" width={56} height={56} className="mx-auto" />
        </Link>
        <h1 className="text-2xl font-heading font-bold text-stone-800">
          {mode === 'request' ? 'Reset Password' : 'Create New Password'}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {mode === 'request' ? 'Enter your email to receive a reset link' : 'Enter your new password'}
        </p>
      </div>

      <form
        onSubmit={mode === 'request' ? handleRequestReset : handleReset}
        className="card p-6 space-y-4"
      >
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>
        )}

        {mode === 'request' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}

        <p className="text-center text-sm text-stone-500">
          <Link href="/auth/login" className="text-teal-600 hover:underline">
            Back to Login
          </Link>
        </p>
      </form>
    </div>
  );
}
