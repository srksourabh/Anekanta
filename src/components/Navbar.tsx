'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageProvider';

export function Navbar() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setUser).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#1a3a3a] via-[#1a4a4a] to-[#1a3a3a] shadow-md">
      {/* Subtle decorative top border — saffron/gold */}
      <div className="h-1 bg-gradient-to-r from-transparent via-saffron-500 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 relative">
                <Image src="/logo.png" alt="Anekanta" width={40} height={40} className="drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-heading font-bold text-amber-100 leading-tight tracking-wide">
                  Anekanta
                </span>
                <span className="text-[10px] text-teal-300/70 tracking-[0.2em] uppercase leading-none hidden sm:block">
                  Many-Sided Truth
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/debates">{t('nav_debates')}</NavLink>
              <NavLink href="/debates/new">{t('nav_new_debate')}</NavLink>
              <NavLink href="/community">{t('nav_community')}</NavLink>
              {user?.role === 'admin' && (
                <NavLink href="/admin">{t('nav_admin')}</NavLink>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-amber-400/40" style={{ backgroundColor: user.avatar_color }}>
                    {user.display_name[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-teal-100 text-sm">{user.display_name}</span>
                  <svg className="w-4 h-4 text-teal-300/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-200 py-1 z-50 overflow-hidden">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-sm font-medium text-stone-800">{user.display_name}</p>
                        <p className="text-xs text-stone-400">{user.email}</p>
                      </div>
                      <Link href={`/profile/${user.id}`} className="flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setMenuOpen(false)}>
                        <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {t('nav_profile')}
                      </Link>
                      <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setMenuOpen(false)}>
                        <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {t('settings_title')}
                      </Link>
                      <button onClick={logout} className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        {t('nav_logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="text-sm text-teal-200 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
                  {t('nav_login')}
                </Link>
                <Link href="/auth/register" className="text-sm bg-saffron-600 text-white px-4 py-1.5 rounded-lg hover:bg-saffron-500 transition-colors font-medium shadow-sm">
                  {t('nav_register')}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-teal-700/30 bg-[#1a3a3a]/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink href="/debates" onClick={() => setMobileOpen(false)}>{t('nav_debates')}</MobileNavLink>
            <MobileNavLink href="/debates/new" onClick={() => setMobileOpen(false)}>{t('nav_new_debate')}</MobileNavLink>
            <MobileNavLink href="/community" onClick={() => setMobileOpen(false)}>{t('nav_community')}</MobileNavLink>
            {user?.role === 'admin' && (
              <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)}>{t('nav_admin')}</MobileNavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-teal-200/90 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block text-teal-200 hover:text-white text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  );
}
