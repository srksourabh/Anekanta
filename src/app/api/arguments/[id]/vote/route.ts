import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { value } = await req.json();
  if (![0, 1, 2, 3, 4].includes(value)) {
    return NextResponse.json({ error: 'Vote value must be 0-4' }, { status: 400 });
  }

  const db = await getDb();
  const argId = params.id;
  const arg = await db.prepare('SELECT * FROM arguments WHERE id = ?').get(argId) as any;
  if (!arg) return NextResponse.json({ error: 'Argument not found' }, { status: 404 });

  // Upsert vote
  const existing = await db.prepare('SELECT * FROM votes WHERE argument_id = ? AND user_id = ?').get(argId, user.id) as any;
  if (existing) {
    if (value === 0) {
      await db.prepare('DELETE FROM votes WHERE id = ?').run(existing.id);
    } else {
      await db.prepare('UPDATE votes SET value = ? WHERE id = ?').run(value, existing.id);
    }
  } else if (value !== 0) {
    await db.prepare('INSERT INTO votes (id, argument_id, user_id, value) VALUES (?, ?, ?, ?)').run(nanoid(), argId, user.id, value);
  }

  // Recalculate score
  const scoreRow = await db.prepare('SELECT COALESCE(AVG(value), 0) as avg_score, COUNT(*) as count FROM votes WHERE argument_id = ?').get(argId) as any;
  const score = Math.round(scoreRow.avg_score * scoreRow.count);
  await db.prepare('UPDATE arguments SET vote_score = ? WHERE id = ?').run(score, argId);

  return NextResponse.json({ vote_score: score, user_vote: value === 0 ? null : value, vote_count: scoreRow.count });
}
