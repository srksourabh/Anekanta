import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// GET: List summaries for a debate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const summaries = await db.prepare(`
    SELECT s.*, u.display_name as author_name
    FROM argument_summaries s
    JOIN users u ON s.author_id = u.id
    WHERE s.debate_id = ?
    ORDER BY s.created_at DESC
  `).all(params.id);
  return NextResponse.json({ summaries });
}

// POST: Add a summary (editors and owners only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await canEdit(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Only editors can add summaries' }, { status: 403 });

  const { argumentId, summaryType, content } = await req.json();
  if (!summaryType || !content || content.trim().length === 0) {
    return NextResponse.json({ error: 'summaryType and content required' }, { status: 400 });
  }

  const validTypes = ['key_takeaway', 'group_label', 'debate_summary'];
  if (!validTypes.includes(summaryType)) {
    return NextResponse.json({ error: 'Invalid summary type' }, { status: 400 });
  }

  const db = await getDb();
  const id = nanoid();
  await db.prepare(`
    INSERT INTO argument_summaries (id, debate_id, argument_id, summary_type, content, author_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, params.id, argumentId || null, summaryType, content.trim(), user.id);

  return NextResponse.json({ id, summaryType, content: content.trim() });
}

// DELETE: Remove a summary
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await canEdit(user, params.id);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const summaryId = searchParams.get('summaryId');
  if (!summaryId) return NextResponse.json({ error: 'summaryId required' }, { status: 400 });

  const db = await getDb();
  await db.prepare('DELETE FROM argument_summaries WHERE id = ? AND debate_id = ?').run(summaryId, params.id);
  return NextResponse.json({ success: true });
}
