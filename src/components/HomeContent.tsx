'use client';

import Link from 'next/link';
import Image from 'next/image';
import { DebateCard } from '@/components/DebateCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useLanguage } from '@/components/LanguageProvider';

interface HomeContentProps {
  featured: any[];
  stats: { debates: number; arguments: number; votes: number; users: number };
}

export function HomeContent({ featured, stats }: HomeContentProps) {
  const { t } = useLanguage();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-earth-50 to-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <Image src="/logo.png" alt="Anekanta" width={64} height={64} className="drop-shadow-md" />
              <div>
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-earth-900 leading-tight">
                  {t('hero_title')}
                </h1>
                <p className="text-sm text-earth-600/70 tracking-[0.15em] uppercase font-medium">{t('hero_subtitle')}</p>
              </div>
            </div>
            <p className="text-lg text-stone-600 mb-2">
              <em className="text-earth-700">Anekantavada</em> — {t('home_anekantavada')}
            </p>
            <p className="text-stone-500 mb-8 max-w-xl">
              {t('home_structured')}
            </p>
            <div className="flex gap-3">
              <Link href="/debates" className="btn-primary text-base px-6 py-3">{t('hero_explore')}</Link>
              <Link href="/debates/new" className="btn-secondary text-base px-6 py-3">{t('hero_start')}</Link>
            </div>
          </div>
        </div>
        {/* Decorative mandala */}
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 400 400" className="w-[500px] h-[500px]">
            <circle cx="200" cy="200" r="180" stroke="#a97847" strokeWidth="1" fill="none" />
            <circle cx="200" cy="200" r="140" stroke="#a97847" strokeWidth="1" fill="none" />
            <circle cx="200" cy="200" r="100" stroke="#a97847" strokeWidth="1" fill="none" />
            <circle cx="200" cy="200" r="60" stroke="#a97847" strokeWidth="1" fill="none" />
            {[0,30,60,90,120,150].map(angle => (
              <line key={angle} x1="200" y1="20" x2="200" y2="380" stroke="#a97847" strokeWidth="0.5" transform={`rotate(${angle} 200 200)`} />
            ))}
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: t('stats_debates'), value: stats.debates },
              { label: t('stats_arguments'), value: stats.arguments },
              { label: t('stats_votes'), value: stats.votes },
              { label: t('stats_users'), value: stats.users },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-heading font-bold text-earth-700">{s.value.toLocaleString()}</div>
                <div className="text-xs text-stone-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-bold text-stone-800">{t('recent_debates')}</h2>
              <Link href="/debates" className="text-sm text-saffron-600 hover:underline">{t('view_all')}</Link>
            </div>
            {featured.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-stone-500 mb-4">{t('home_no_debates')}</p>
                <Link href="/debates/new" className="btn-primary">{t('hero_start')}</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {featured.map((d: any) => <DebateCard key={d.id} debate={d} />)}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-stone-800 mb-4">{t('recent_activity')}</h2>
            <div className="card overflow-hidden">
              <ActivityFeed limit={15} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
