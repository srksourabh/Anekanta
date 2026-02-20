import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const { id } = params;
  const user = await getCurrentUser();

  const debate = db.prepare(`
    SELECT d.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM arguments WHERE debate_id = d.id) as argument_count,
      (SELECT COUNT(*) FROM votes v JOIN arguments a ON v.argument_id = a.id WHERE a.debate_id = d.id) as vote_count
    FROM debates d JOIN users u ON d.author_id = u.id
    WHERE d.id = ?
  `).get(id);

  if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get all arguments for this debate
  const args = db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM comments WHERE argument_id = a.id) as comment_count
    FROM arguments a JOIN users u ON a.author_id = u.id
    WHERE a.debate_id = ?
    ORDER BY a.vote_score DESC, a.created_at ASC
  `).all(id) as any[];

  // Get user's votes if logged in
  let userVotes: Record<string, number> = {};
  if (user) {
    const votes = db.prepare(`
      SELECT v.argument_id, v.value FROM votes v
      JOIN arguments a ON v.argument_id = a.id
      WHERE a.debate_id = ? AND v.user_id = ?
    `).all(id, user.id) as any[];
    for (const v of votes) userVotes[v.argument_id] = v.value;
  }

  // Build tree
  const argMap = new Map<string, any>();
  for (const a of args) {
    a.children = [];
    a.user_vote = userVotes[a.id] ?? null;
    argMap.set(a.id, a);
  }

  let thesis: any = null;
  for (const a of args) {
    if (a.type === 'thesis' && !a.parent_id) {
      thesis = a;
    } else if (a.parent_id && argMap.has(a.parent_id)) {
      argMap.get(a.parent_id).children.push(a);
    }
  }

  return NextResponse.json({ debate, thesis, arguments: args });
}
