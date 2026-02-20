import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import { DebateCard } from '@/components/DebateCard';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const db = await getDb();
  const user = await db.prepare('SELECT id, username, display_name, bio, avatar_color, created_at FROM users WHERE id = ?').get(params.id) as any;
  if (!user) notFound();

  const stats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM debates WHERE author_id = ?) as debates,
      (SELECT COUNT(*) FROM arguments WHERE author_id = ?) as arguments,
      (SELECT COUNT(*) FROM votes WHERE user_id = ?) as votes,
      (SELECT COUNT(*) FROM comments WHERE author_id = ?) as comments
  `).get(user.id, user.id, user.id, user.id) as any;

  const debates = await db.prepare(`
    SELECT d.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM arguments WHERE debate_id = d.id) as argument_count,
      (SELECT COUNT(*) FROM votes v JOIN arguments a ON v.argument_id = a.id WHERE a.debate_id = d.id) as vote_count
    FROM debates d JOIN users u ON d.author_id = u.id
    WHERE d.author_id = ?
    ORDER BY d.created_at DESC LIMIT 10
  `).all(user.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: user.avatar_color }}>
            {user.display_name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-stone-800">{user.display_name}</h1>
            <p className="text-sm text-stone-500">@{user.username}</p>
            <p className="text-xs text-stone-400 mt-1">Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</p>
          </div>
        </div>
        {user.bio && <p className="text-sm text-stone-600 mt-4">{user.bio}</p>}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-stone-200 text-center">
          {[
            { label: 'Debates', value: stats.debates },
            { label: 'Arguments', value: stats.arguments },
            { label: 'Votes', value: stats.votes },
            { label: 'Comments', value: stats.comments },
          ].map(s => (
            <div key={s.label}>
              <div className="text-lg font-heading font-bold text-earth-700">{s.value}</div>
              <div className="text-xs text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* User's debates */}
      <h2 className="text-lg font-heading font-bold text-stone-800 mb-4">Debates Started</h2>
      {debates.length === 0 ? (
        <p className="text-stone-400 text-sm">No debates yet.</p>
      ) : (
        <div className="space-y-3">
          {debates.map((d: any) => <DebateCard key={d.id} debate={d} />)}
        </div>
      )}
    </div>
  );
}
