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

  const attachments = await db.prepare(`
    SELECT * FROM article_attachments WHERE article_id = ? ORDER BY sort_order ASC
  `).all(id);

  return NextResponse.json({ attachments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  if (article.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { type, url, title, description } = await req.json();
  if (!type || !url) {
    return NextResponse.json({ error: 'Type and url are required' }, { status: 400 });
  }

  const validTypes = ['youtube', 'image', 'link'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const maxOrder = await db.prepare(
    'SELECT MAX(sort_order) as max_order FROM article_attachments WHERE article_id = ?'
  ).get(id) as any;
  const nextOrder = (maxOrder?.max_order ?? -1) + 1;

  const attachmentId = nanoid();
  await db.prepare(`
    INSERT INTO article_attachments (id, article_id, type, url, title, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(attachmentId, id, type, url, title || '', description || '', nextOrder);

  const attachment = await db.prepare('SELECT * FROM article_attachments WHERE id = ?').get(attachmentId);

  return NextResponse.json(attachment);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  if (article.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const attachmentId = url.searchParams.get('attachmentId');
  if (!attachmentId) {
    return NextResponse.json({ error: 'attachmentId query parameter is required' }, { status: 400 });
  }

  const attachment = await db.prepare(
    'SELECT id FROM article_attachments WHERE id = ? AND article_id = ?'
  ).get(attachmentId, id);
  if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });

  await db.prepare('DELETE FROM article_attachments WHERE id = ?').run(attachmentId);

  return NextResponse.json({ success: true });
}
