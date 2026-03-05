'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageProvider';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-stone-50 border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Anekanta" width={36} height={36} />
              <span className="text-lg font-heading font-bold text-stone-800">Anekanta</span>
            </Link>
            <p className="text-sm text-stone-500 max-w-xs text-center md:text-left">
              {t('footer_tagline')}
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <Link href="/debates" className="text-stone-500 hover:text-teal-600 transition-colors">{t('nav_debates')}</Link>
              <Link href="/debates/new" className="text-stone-500 hover:text-teal-600 transition-colors">{t('nav_new_debate')}</Link>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/auth/login" className="text-stone-500 hover:text-teal-600 transition-colors">{t('nav_login')}</Link>
              <Link href="/auth/register" className="text-stone-500 hover:text-teal-600 transition-colors">{t('nav_register')}</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-stone-200 text-center">
          <p className="text-xs text-stone-400">
            &copy; {new Date().getFullYear()} {t('footer_copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
