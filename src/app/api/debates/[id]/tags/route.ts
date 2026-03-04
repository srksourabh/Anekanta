import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// GET: List tags for a debate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const tags = await db.prepare('SELECT * FROM debate_tags WHERE debate_id = ? ORDER BY created_at')
    .all(params.id);
  return NextResponse.json({ tags });
}

// POST: Add a tag to a debate
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(params.id) as any;
  if (!debate || (debate.author_id !== user.id && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only debate creator can add tags' }, { status: 403 });
  }

  const { tag } = await req.json();
  if (!tag || tag.trim().length === 0 || tag.length > 50) {
    return NextResponse.json({ error: 'Tag must be 1-50 characters' }, { status: 400 });
  }

  // Check for duplicate
  const existing = await db.prepare('SELECT id FROM debate_tags WHERE debate_id = ? AND tag = ?')
    .get(params.id, tag.trim().toLowerCase()) as any;
  if (existing) return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });

  const id = nanoid();
  await db.prepare('INSERT INTO debate_tags (id, debate_id, tag, created_at) VALUES (?, ?, ?, datetime(\'now\'))')
    .run(id, params.id, tag.trim().toLowerCase());

  return NextResponse.json({ id, tag: tag.trim().toLowerCase() });
}

// DELETE: Remove a tag
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(params.id) as any;
  if (!debate || (debate.author_id !== user.id && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tagId = searchParams.get('tagId');
  if (!tagId) return NextResponse.json({ error: 'tagId required' }, { status: 400 });

  await db.prepare('DELETE FROM debate_tags WHERE id = ? AND debate_id = ?').run(tagId, params.id);
  return NextResponse.json({ success: true });
}
