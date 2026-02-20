'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageProvider';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-gradient-to-r from-[#1a3a3a] via-[#1a4a4a] to-[#1a3a3a] border-t border-teal-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Anekanta" width={36} height={36} />
              <span className="text-lg font-heading font-bold text-amber-100">Anekanta</span>
            </Link>
            <p className="text-sm text-teal-300/60 max-w-xs text-center md:text-left">
              {t('footer_tagline')}
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <Link href="/debates" className="text-teal-200/80 hover:text-white transition-colors">{t('nav_debates')}</Link>
              <Link href="/debates/new" className="text-teal-200/80 hover:text-white transition-colors">{t('nav_new_debate')}</Link>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/auth/login" className="text-teal-200/80 hover:text-white transition-colors">{t('nav_login')}</Link>
              <Link href="/auth/register" className="text-teal-200/80 hover:text-white transition-colors">{t('nav_register')}</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-teal-700/30 text-center">
          <p className="text-xs text-teal-300/40">
            &copy; {new Date().getFullYear()} {t('footer_copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
