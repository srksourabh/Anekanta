import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const argumentId = params.id;

  const articles = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color
    FROM articles a
    JOIN users u ON a.author_id = u.id
    WHERE a.argument_id = ? AND a.status = 'published'
    ORDER BY a.created_at DESC
  `).all(argumentId);

  return NextResponse.json({ articles });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const argumentId = params.id;

  // Verify argument exists and get debate_id
  const argument = await db.prepare('SELECT debate_id FROM arguments WHERE id = ?').get(argumentId) as any;
  if (!argument) return NextResponse.json({ error: 'Argument not found' }, { status: 404 });

  const { title, content, summary, category } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
  }

  const id = nanoid();
  const readTime = Math.ceil(content.split(/\s+/).length / 200);

  await db.prepare(`
    INSERT INTO articles (id, title, content, summary, author_id, category, status, read_time_minutes, debate_id, argument_id)
    VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `).run(id, title, content, summary || '', user.id, category || 'general', readTime, argument.debate_id, argumentId);

  const article = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color
    FROM articles a JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(id);

  return NextResponse.json(article);
}
