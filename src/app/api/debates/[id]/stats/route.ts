import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const debateId = params.id;

  // Total arguments
  const totalArgs = await db.prepare('SELECT COUNT(*) as count FROM arguments WHERE debate_id = ?').get(debateId) as any;

  // Pro and Con counts
  const proCon = await db.prepare(
    'SELECT type, COUNT(*) as count FROM arguments WHERE debate_id = ? AND type IN ("pro", "con") GROUP BY type'
  ).all(debateId) as any[];

  const proCount = proCon.find((r) => r.type === 'pro')?.count || 0;
  const conCount = proCon.find((r) => r.type === 'con')?.count || 0;

  // Total votes
  const votes = await db.prepare(`
    SELECT COUNT(*) as count FROM votes v
    JOIN arguments a ON v.argument_id = a.id
    WHERE a.debate_id = ?
  `).get(debateId) as any;

  // Total comments
  const comments = await db.prepare(`
    SELECT COUNT(*) as count FROM comments c
    JOIN arguments a ON c.argument_id = a.id
    WHERE a.debate_id = ?
  `).get(debateId) as any;

  // Max depth
  const depth = await db.prepare(
    'SELECT MAX(depth) as max_depth FROM arguments WHERE debate_id = ?'
  ).get(debateId) as any;

  // Average vote score
  const avgVote = await db.prepare(`
    SELECT AVG(vote_score) as avg_vote FROM arguments WHERE debate_id = ?
  `).get(debateId) as any;

  // Unique participants
  const participants = await db.prepare(`
    SELECT COUNT(DISTINCT author_id) as count FROM arguments WHERE debate_id = ?
  `).get(debateId) as any;

  // Top contributors
  const topContributors = await db.prepare(`
    SELECT
      u.id,
      u.display_name,
      u.avatar_color,
      COUNT(a.id) as argument_count
    FROM arguments a
    JOIN users u ON a.author_id = u.id
    WHERE a.debate_id = ? AND a.type != 'thesis'
    GROUP BY u.id
    ORDER BY argument_count DESC
    LIMIT 5
  `).all(debateId) as any[];

  return NextResponse.json({
    total_arguments: totalArgs?.count || 0,
    pro_count: proCount,
    con_count: conCount,
    total_votes: votes?.count || 0,
    total_comments: comments?.count || 0,
    max_depth: depth?.max_depth || 0,
    avg_vote_score: avgVote?.avg_vote || 0,
    unique_participants: participants?.count || 0,
    top_contributors: topContributors,
  });
}
