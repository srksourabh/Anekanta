import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const article = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM article_responses WHERE article_id = a.id) as response_count
    FROM articles a
    JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(id);

  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const attachments = await db.prepare(`
    SELECT * FROM article_attachments WHERE article_id = ? ORDER BY sort_order ASC
  `).all(id);

  return NextResponse.json({ ...(article as any), attachments });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  if (article.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updates: string[] = [];
  const values: any[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
  if (body.content !== undefined) {
    updates.push('content = ?'); values.push(body.content);
    const readTime = Math.ceil(body.content.split(/\s+/).length / 200);
    updates.push('read_time_minutes = ?'); values.push(readTime);
  }
  if (body.summary !== undefined) { updates.push('summary = ?'); values.push(body.summary); }
  if (body.category !== undefined) { updates.push('category = ?'); values.push(body.category); }
  if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
  if (body.cover_image_url !== undefined) { updates.push('cover_image_url = ?'); values.push(body.cover_image_url); }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color
    FROM articles a JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(id);

  return NextResponse.json(updated);
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

  await db.prepare('DELETE FROM article_attachments WHERE article_id = ?').run(id);
  await db.prepare('DELETE FROM article_responses WHERE article_id = ?').run(id);
  await db.prepare('DELETE FROM articles WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}
