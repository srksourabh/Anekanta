import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const journal = await db.prepare(`
    SELECT j.*, u.display_name as editor_name, u.avatar_color as editor_color,
      d.title as debate_title
    FROM journals j
    JOIN users u ON j.editor_id = u.id
    JOIN debates d ON j.debate_id = d.id
    WHERE j.id = ?
  `).get(id) as any;

  if (!journal) {
    return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
  }

  const sections = await db.prepare(`
    SELECT * FROM journal_sections WHERE journal_id = ? ORDER BY sort_order
  `).all(id);

  return NextResponse.json({ ...journal, sections });
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

  const { title } = await req.json();
  const now = new Date().toISOString();

  if (title) {
    await db.prepare('UPDATE journals SET title = ?, updated_at = ? WHERE id = ?').run(title, now, id);
  }

  const updated = await db.prepare(`
    SELECT j.*, u.display_name as editor_name, u.avatar_color as editor_color,
      d.title as debate_title
    FROM journals j
    JOIN users u ON j.editor_id = u.id
    JOIN debates d ON j.debate_id = d.id
    WHERE j.id = ?
  `).get(id);

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const journal = await db.prepare('SELECT * FROM journals WHERE id = ?').get(id) as any;
  if (!journal) return NextResponse.json({ error: 'Journal not found' }, { status: 404 });

  if (journal.editor_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (journal.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft journals can be deleted' }, { status: 400 });
  }

  await db.prepare('DELETE FROM journal_sections WHERE journal_id = ?').run(id);
  await db.prepare('DELETE FROM journals WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}
