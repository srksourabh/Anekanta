'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageProvider';
import { formatDistanceToNow } from 'date-fns';

export function Navbar() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setUser).catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications?limit=10')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread_count || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Poll notifications every 30s when logged in
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
  };

  const markOneRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', ids: [id] }),
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="sticky top-3 z-50 mx-3 sm:mx-4 max-w-7xl xl:mx-auto bg-[#1c2e2e]/90 backdrop-blur-md shadow-lg rounded-2xl border border-teal-700/20">
      <div className="px-4 sm:px-6 lg:px-8">
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
              <NavLink href="/articles">{t('nav_articles')}</NavLink>
              <NavLink href="/journals">{t('nav_journals')}</NavLink>
              {user?.role === 'admin' && (
                <NavLink href="/admin">{t('nav_admin')}</NavLink>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Notification Bell — visible when logged in */}
            <div className={`relative ${user ? '' : 'hidden'}`}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
                className="relative text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-stone-800">{t('notifications_title')}</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-saffron-600 hover:underline">
                          {t('notifications_mark_all_read')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-stone-400">
                          {t('notifications_empty')}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <Link
                            key={n.id}
                            href={`/debates/${n.debate_id}`}
                            onClick={() => {
                              if (!n.read_at) markOneRead(n.id);
                              setNotifOpen(false);
                            }}
                            className={`block px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 ${!n.read_at ? 'bg-saffron-50/50' : ''}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                                style={{ backgroundColor: n.actor_color || '#6b7280' }}
                              >
                                {n.actor_name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-stone-700">
                                  <span className="font-medium">{n.actor_name}</span>
                                  {' '}
                                  {n.action === 'added_argument' ? t('notification_added_argument') : t('notification_commented')}
                                  {' '}{t('notification_in')}{' '}
                                  <span className="font-medium">{n.debate_title}</span>
                                </p>
                                <p className="text-xs text-stone-400 mt-0.5">
                                  {formatDistanceToNow(new Date(n.created_at + 'Z'), { addSuffix: true })}
                                </p>
                              </div>
                              {!n.read_at && (
                                <div className="w-2 h-2 rounded-full bg-saffron-500 shrink-0 mt-1.5" />
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Menu — visible when logged in */}
            <div className={`relative ${user ? '' : 'hidden'}`}>
              <button
                onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-amber-400/40" style={{ backgroundColor: user?.avatar_color || '#6b7280' }}>
                  {user?.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="hidden sm:inline text-teal-100 text-sm">{user?.display_name || ''}</span>
                <svg className="w-4 h-4 text-teal-300/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && user && (
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

            {/* Login/Register — visible when logged out */}
            <div className={`flex items-center gap-2 ${user ? 'hidden' : ''}`}>
              <Link href="/auth/login" className="text-sm text-teal-200 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
                {t('nav_login')}
              </Link>
              <Link href="/auth/register" className="text-sm bg-saffron-600 text-white px-4 py-1.5 rounded-lg hover:bg-saffron-500 transition-colors font-medium shadow-sm border border-saffron-500/30">
                {t('nav_register')}
              </Link>
            </div>

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
        <div className="md:hidden border-t border-teal-700/20">
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink href="/debates" onClick={() => setMobileOpen(false)}>{t('nav_debates')}</MobileNavLink>
            <MobileNavLink href="/debates/new" onClick={() => setMobileOpen(false)}>{t('nav_new_debate')}</MobileNavLink>
            <MobileNavLink href="/community" onClick={() => setMobileOpen(false)}>{t('nav_community')}</MobileNavLink>
            <MobileNavLink href="/articles" onClick={() => setMobileOpen(false)}>{t('nav_articles')}</MobileNavLink>
            <MobileNavLink href="/journals" onClick={() => setMobileOpen(false)}>{t('nav_journals')}</MobileNavLink>
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
