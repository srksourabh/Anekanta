import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { moderateContent } from '@/lib/moderation';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const comments = db.prepare(`
    SELECT c.*, u.display_name as author_name, u.avatar_color as author_color
    FROM comments c JOIN users u ON c.author_id = u.id
    WHERE c.argument_id = ?
    ORDER BY c.created_at ASC
  `).all(params.id);

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

  const modResult = moderateContent(content.trim());
  if (modResult.action === 'block') {
    return NextResponse.json({ error: 'Content violates moderation policy' }, { status: 400 });
  }

  const db = await getDb();
  const arg = db.prepare('SELECT * FROM arguments WHERE id = ?').get(params.id) as any;
  if (!arg) return NextResponse.json({ error: 'Argument not found' }, { status: 404 });

  const id = nanoid();
  db.prepare('INSERT INTO comments (id, argument_id, author_id, content) VALUES (?, ?, ?, ?)')
    .run(id, params.id, user.id, content.trim());

  if (modResult.flags.length > 0) {
    db.prepare('INSERT INTO flagged_content (id, content_type, content_id, author_id, reason, flags, score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(nanoid(), 'comment', id, user.id, modResult.flags[0].detail, JSON.stringify(modResult.flags), modResult.score, 'pending');
  }

  db.prepare(`INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, 'commented', 'argument', ?, ?)`)
    .run(nanoid(), arg.debate_id, user.id, params.id, JSON.stringify({}));

  const comment = db.prepare(`
    SELECT c.*, u.display_name as author_name, u.avatar_color as author_color
    FROM comments c JOIN users u ON c.author_id = u.id WHERE c.id = ?
  `).get(id);

  return NextResponse.json(comment);
}
