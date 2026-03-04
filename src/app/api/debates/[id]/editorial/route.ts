import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// GET: List editorial notes for arguments in this debate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const debateId = params.id;
  const { searchParams } = new URL(req.url);
  const argumentId = searchParams.get('argumentId');

  let notes;
  if (argumentId) {
    notes = await db.prepare(`
      SELECT en.*, u.display_name as editor_name, u.avatar_color as editor_color
      FROM editorial_notes en
      JOIN users u ON en.editor_id = u.id
      WHERE en.argument_id = ?
      ORDER BY en.created_at DESC
    `).all(argumentId);
  } else {
    // Get all editorial notes for arguments in this debate
    notes = await db.prepare(`
      SELECT en.*, u.display_name as editor_name, u.avatar_color as editor_color
      FROM editorial_notes en
      JOIN users u ON en.editor_id = u.id
      JOIN arguments a ON en.argument_id = a.id
      WHERE a.debate_id = ?
      ORDER BY en.created_at DESC
    `).all(debateId);
  }

  return NextResponse.json({ notes });
}

// POST: Add an editorial note, pin, or highlight
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debateId = params.id;
  const canEditDebate = await canEdit(user, debateId);
  if (!canEditDebate) {
    return NextResponse.json({ error: 'Only editors can add editorial notes' }, { status: 403 });
  }

  const { argumentId, note, noteType } = await req.json();
  if (!argumentId) return NextResponse.json({ error: 'argumentId required' }, { status: 400 });
  if (!noteType || !['note', 'highlight', 'pin'].includes(noteType)) {
    return NextResponse.json({ error: 'Valid noteType (note/highlight/pin) required' }, { status: 400 });
  }

  const db = await getDb();

  // Verify argument belongs to this debate
  const arg = await db.prepare('SELECT id FROM arguments WHERE id = ? AND debate_id = ?').get(argumentId, debateId) as any;
  if (!arg) return NextResponse.json({ error: 'Argument not found in this debate' }, { status: 404 });

  if (noteType === 'pin') {
    // Toggle pin status on the argument
    const current = await db.prepare('SELECT is_pinned FROM arguments WHERE id = ?').get(argumentId) as any;
    const newValue = current?.is_pinned ? 0 : 1;
    await db.prepare('UPDATE arguments SET is_pinned = ? WHERE id = ?').run(newValue, argumentId);
    return NextResponse.json({ success: true, is_pinned: newValue });
  }

  if (noteType === 'highlight') {
    // Toggle highlight status on the argument
    const current = await db.prepare('SELECT is_highlighted FROM arguments WHERE id = ?').get(argumentId) as any;
    const newValue = current?.is_highlighted ? 0 : 1;
    await db.prepare('UPDATE arguments SET is_highlighted = ? WHERE id = ?').run(newValue, argumentId);
    return NextResponse.json({ success: true, is_highlighted: newValue });
  }

  // Regular note
  if (!note || note.trim().length === 0) {
    return NextResponse.json({ error: 'Note content required' }, { status: 400 });
  }

  const id = nanoid();
  await db.prepare(
    'INSERT INTO editorial_notes (id, argument_id, editor_id, note, note_type, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
  ).run(id, argumentId, user.id, note.trim(), noteType);

  return NextResponse.json({ id, success: true });
}

// DELETE: Remove an editorial note
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debateId = params.id;
  const canEditDebate = await canEdit(user, debateId);
  if (!canEditDebate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get('noteId');
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 });

  const db = await getDb();
  await db.prepare('DELETE FROM editorial_notes WHERE id = ?').run(noteId);
  return NextResponse.json({ success: true });
}
