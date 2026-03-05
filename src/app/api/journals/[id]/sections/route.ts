import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const sections = await db.prepare(`
    SELECT * FROM journal_sections WHERE journal_id = ? ORDER BY sort_order
  `).all(id);

  return NextResponse.json({ sections });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const journal = await db.prepare('SELECT * FROM journals WHERE id = ?').get(id) as any;
  if (!journal) return NextResponse.json({ error: 'Journal not found' }, { status: 404 });

  if (journal.editor_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { sectionId, title, content } = await req.json();
  if (!sectionId) {
    return NextResponse.json({ error: 'sectionId is required' }, { status: 400 });
  }

  const section = await db.prepare(
    'SELECT * FROM journal_sections WHERE id = ? AND journal_id = ?'
  ).get(sectionId, id) as any;
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  const now = new Date().toISOString();

  const updates: string[] = [];
  const updateParams: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    updateParams.push(title);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    updateParams.push(content);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    updateParams.push(now);

    await db.prepare(
      `UPDATE journal_sections SET ${updates.join(', ')} WHERE id = ?`
    ).run(...updateParams, sectionId);

    // Also update journal's updated_at
    await db.prepare('UPDATE journals SET updated_at = ? WHERE id = ?').run(now, id);
  }

  const updated = await db.prepare('SELECT * FROM journal_sections WHERE id = ?').get(sectionId);
  return NextResponse.json(updated);
}
