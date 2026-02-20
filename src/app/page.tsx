import Link from 'next/link';
import Image from 'next/image';
import { getDb } from '@/lib/db';
import { DebateCard } from '@/components/DebateCard';
import { ActivityFeed } from '@/components/ActivityFeed';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await getDb();

  const featured = db.prepare(`
    SELECT d.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM arguments WHERE debate_id = d.id) as argument_count,
      (SELECT COUNT(*) FROM votes v JOIN arguments a ON v.argument_id = a.id WHERE a.debate_id = d.id) as vote_count
    FROM debates d JOIN users u ON d.author_id = u.id
    WHERE d.status = 'active'
    ORDER BY d.updated_at DESC LIMIT 6
  `).all();

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM debates) as debates,
      (SELECT COUNT(*) FROM arguments) as arguments,
      (SELECT COUNT(*) FROM votes) as votes,
      (SELECT COUNT(*) FROM users) as users
  `).get() as any;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-earth-50 to-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-6">
              <Image src="/logo.svg" alt="Anekanta" width={64} height={64} className="drop-shadow-md" />
              <div>
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-earth-900 leading-tight">
                  Anekanta
                </h1>
                <p className="text-sm text-earth-600/70 tracking-[0.15em] uppercase font-medium">Many-Sided Truth</p>
              </div>
            </div>
            <p className="text-lg text-stone-600 mb-2">
              <em className="text-earth-700">Anekantavada</em> — the Jain doctrine of many-sidedness.
            </p>
            <p className="text-stone-500 mb-8 max-w-xl">
              Structured debate for deeper understanding. Add pro and con arguments, vote on impact, and explore the full topology of any question.
            </p>
            <div className="flex gap-3">
              <Link href="/debates" className="btn-primary text-base px-6 py-3">Explore Debates</Link>
              <Link href="/debates/new" className="btn-secondary text-base px-6 py-3">Start a Debate</Link>
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
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'Debates', value: stats.debates },
              { label: 'Arguments', value: stats.arguments },
              { label: 'Votes', value: stats.votes },
              { label: 'Thinkers', value: stats.users },
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
              <h2 className="text-xl font-heading font-bold text-stone-800">Recent Debates</h2>
              <Link href="/debates" className="text-sm text-saffron-600 hover:underline">View all</Link>
            </div>
            {featured.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-stone-500 mb-4">No debates yet. Be the first to start one.</p>
                <Link href="/debates/new" className="btn-primary">Start a Debate</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {featured.map((d: any) => <DebateCard key={d.id} debate={d} />)}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-stone-800 mb-4">Recent Activity</h2>
            <div className="card overflow-hidden">
              <ActivityFeed limit={15} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
