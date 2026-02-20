import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { moderateContent } from '@/lib/moderation';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { parentId, content, type, is_anonymous } = await req.json();
  if (!content || !type || !['pro', 'con'].includes(type)) {
    return NextResponse.json({ error: 'Content and valid type (pro/con) required' }, { status: 400 });
  }
  if (!parentId) {
    return NextResponse.json({ error: 'Parent argument required' }, { status: 400 });
  }

  const modResult = moderateContent(content);
  if (modResult.action === 'block') {
    return NextResponse.json({ error: 'Content violates moderation policy' }, { status: 400 });
  }

  const db = await getDb();
  const debateId = params.id;

  const parent = await db.prepare('SELECT * FROM arguments WHERE id = ? AND debate_id = ?').get(parentId, debateId) as any;
  if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });

  const id = nanoid();
  const depth = parent.depth + 1;

  await db.prepare(`INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, debateId, parentId, user.id, content, type, depth, is_anonymous ? 1 : 0);

  if (modResult.flags.length > 0) {
    await db.prepare('INSERT INTO flagged_content (id, content_type, content_id, author_id, reason, flags, score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(nanoid(), 'argument', id, user.id, modResult.flags[0].detail, JSON.stringify(modResult.flags), modResult.score, 'pending');
  }

  await db.prepare(`UPDATE debates SET updated_at = datetime('now') WHERE id = ?`).run(debateId);

  await db.prepare(`INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, 'added_argument', 'argument', ?, ?)`)
    .run(nanoid(), debateId, user.id, id, JSON.stringify({ type, parentId }));

  const newArg = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color
    FROM arguments a JOIN users u ON a.author_id = u.id WHERE a.id = ?
  `).get(id);

  return NextResponse.json(newArg);
}
