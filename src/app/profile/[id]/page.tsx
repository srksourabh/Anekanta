import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProfileContent } from '@/components/ProfileContent';

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

  return <ProfileContent user={user} stats={stats} debates={debates} />;
}
