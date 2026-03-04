import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { moderateContent } from '@/lib/moderation';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const argumentId = params.id;
  const { content } = await req.json();

  if (!content || content.trim().length === 0 || content.length > 500) {
    return NextResponse.json({ error: 'Content must be 1-500 characters' }, { status: 400 });
  }

  const argument = await db.prepare('SELECT * FROM arguments WHERE id = ?').get(argumentId) as any;
  if (!argument) return NextResponse.json({ error: 'Argument not found' }, { status: 404 });

  // Check author or admin
  if (argument.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Run moderation
  const modResult = moderateContent(content);
  if (modResult.action === 'block') {
    return NextResponse.json({ error: 'Content violates moderation policy' }, { status: 400 });
  }

  // Log edit to claim_edits table
  await db.prepare(`
    INSERT INTO claim_edits (id, argument_id, author_id, old_content, new_content, edit_type, created_at)
    VALUES (?, ?, ?, ?, ?, 'edit', datetime('now'))
  `).run(nanoid(), argumentId, user.id, argument.content, content);

  // Update argument
  await db.prepare('UPDATE arguments SET content = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(content, argumentId);

  const updated = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color
    FROM arguments a JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(argumentId);

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const argumentId = params.id;

  const argument = await db.prepare('SELECT * FROM arguments WHERE id = ?').get(argumentId) as any;
  if (!argument) return NextResponse.json({ error: 'Argument not found' }, { status: 404 });

  // Cannot delete thesis arguments
  if (argument.type === 'thesis') {
    return NextResponse.json({ error: 'Cannot delete thesis argument' }, { status: 400 });
  }

  // Check author or admin
  if (argument.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if argument has children
  const children = await db.prepare('SELECT COUNT(*) as count FROM arguments WHERE parent_id = ?')
    .get(argumentId) as any;

  if (children.count > 0) {
    // Soft delete: update content to '[removed]' and author_id to 'deleted'
    await db.prepare('UPDATE arguments SET content = ?, author_id = ? WHERE id = ?')
      .run('[removed]', 'deleted', argumentId);
  } else {
    // Hard delete: delete votes, comments, reactions, edits, sources, bookmarks, last_seen
    await db.prepare('DELETE FROM votes WHERE argument_id = ?').run(argumentId);
    await db.prepare('DELETE FROM comments WHERE argument_id = ?').run(argumentId);
    await db.prepare('DELETE FROM reactions WHERE argument_id = ?').run(argumentId);
    await db.prepare('DELETE FROM claim_edits WHERE argument_id = ?').run(argumentId);
    await db.prepare('DELETE FROM claim_sources WHERE argument_id = ?').run(argumentId);
    await db.prepare('DELETE FROM bookmarks WHERE argument_id = ?').run(argumentId);
    await db.prepare('DELETE FROM last_seen WHERE argument_id = ?').run(argumentId);
    await db.prepare('DELETE FROM arguments WHERE id = ?').run(argumentId);
  }

  return NextResponse.json({ success: true });
}
