import { getDb } from '@/lib/db';
import { HomeContent } from '@/components/HomeContent';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await getDb();

  const featured = await db.prepare(`
    SELECT d.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM arguments WHERE debate_id = d.id) as argument_count,
      (SELECT COUNT(*) FROM votes v JOIN arguments a ON v.argument_id = a.id WHERE a.debate_id = d.id) as vote_count
    FROM debates d JOIN users u ON d.author_id = u.id
    WHERE d.status = 'active'
    ORDER BY d.updated_at DESC LIMIT 6
  `).all();

  const stats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM debates) as debates,
      (SELECT COUNT(*) FROM arguments) as arguments,
      (SELECT COUNT(*) FROM votes) as votes,
      (SELECT COUNT(*) FROM users) as users
  `).get() as any;

  return <HomeContent featured={featured} stats={stats} />;
}
