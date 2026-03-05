import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const journal = await db.prepare('SELECT * FROM journals WHERE id = ?').get(id) as any;
  if (!journal) return NextResponse.json({ error: 'Journal not found' }, { status: 404 });

  if (journal.editor_id !== user.id) {
    return NextResponse.json({ error: 'Only the editor can submit for review' }, { status: 403 });
  }

  if (journal.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft journals can be submitted for review' }, { status: 400 });
  }

  const now = new Date().toISOString();
  await db.prepare(
    'UPDATE journals SET status = ?, updated_at = ? WHERE id = ?'
  ).run('under_review', now, id);

  return NextResponse.json({ success: true, status: 'under_review' });
}
