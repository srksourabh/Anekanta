import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'recent';

  const db = await getDb();

  // Community stats
  const totalMembers = (await db.prepare(`SELECT COUNT(*) as c FROM users`).get() as any)?.c || 0;
  const totalDebates = (await db.prepare(`SELECT COUNT(*) as c FROM debates`).get() as any)?.c || 0;
  const totalArguments = (await db.prepare(`SELECT COUNT(*) as c FROM arguments`).get() as any)?.c || 0;
  const totalVotes = (await db.prepare(`SELECT COUNT(*) as c FROM votes`).get() as any)?.c || 0;

  // Members with stats
  let orderBy = 'u.created_at DESC';
  if (sort === 'active') orderBy = '(debate_count + argument_count + vote_count) DESC';

  let whereClause = '';
  const params: any[] = [];
  if (search) {
    whereClause = `WHERE (u.display_name LIKE ? OR u.username LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  const members = await db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_color, u.created_at,
      (SELECT COUNT(*) FROM debates WHERE created_by = u.id) as debate_count,
      (SELECT COUNT(*) FROM arguments WHERE user_id = u.id) as argument_count,
      (SELECT COUNT(*) FROM votes WHERE user_id = u.id) as vote_count,
      (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count
    FROM users u
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT 50
  `).all(...params);

  // Leaderboard: top 10 by total contributions
  const leaderboard = await db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_color,
      (SELECT COUNT(*) FROM debates WHERE created_by = u.id) as debate_count,
      (SELECT COUNT(*) FROM arguments WHERE user_id = u.id) as argument_count,
      (SELECT COUNT(*) FROM votes WHERE user_id = u.id) as vote_count,
      (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count
    FROM users u
    ORDER BY (debate_count + argument_count + vote_count + comment_count) DESC
    LIMIT 10
  `).all();

  return NextResponse.json({ stats: { totalMembers, totalDebates, totalArguments, totalVotes }, members, leaderboard });
}
