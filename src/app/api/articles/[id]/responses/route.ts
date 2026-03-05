import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const article = await db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const responses = await db.prepare(`
    SELECT r.*, u.display_name as author_name, u.avatar_color as author_color
    FROM article_responses r
    JOIN users u ON r.author_id = u.id
    WHERE r.article_id = ?
    ORDER BY r.created_at ASC
  `).all(id);

  return NextResponse.json({ responses });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const article = await db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const { content, type, parent_id } = await req.json();
  if (!content || !type) {
    return NextResponse.json({ error: 'Content and type are required' }, { status: 400 });
  }

  const validTypes = ['agree', 'disagree', 'question', 'elaboration'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  if (parent_id) {
    const parent = await db.prepare('SELECT id FROM article_responses WHERE id = ? AND article_id = ?').get(parent_id, id);
    if (!parent) return NextResponse.json({ error: 'Parent response not found' }, { status: 404 });
  }

  const responseId = nanoid();
  await db.prepare(`
    INSERT INTO article_responses (id, article_id, parent_id, author_id, content, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(responseId, id, parent_id || null, user.id, content, type);

  const response = await db.prepare(`
    SELECT r.*, u.display_name as author_name, u.avatar_color as author_color
    FROM article_responses r
    JOIN users u ON r.author_id = u.id
    WHERE r.id = ?
  `).get(responseId);

  return NextResponse.json(response);
}
