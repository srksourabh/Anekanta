import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasGlobalRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const isReviewer = await hasGlobalRole(user.id, 'reviewer');
  if (!isReviewer && user.role !== 'admin') {
    return NextResponse.json({ error: 'Reviewer role required' }, { status: 403 });
  }

  const db = await getDb();
  const journal = await db.prepare('SELECT * FROM journals WHERE id = ?').get(id) as any;
  if (!journal) return NextResponse.json({ error: 'Journal not found' }, { status: 404 });

  if (journal.status !== 'under_review') {
    return NextResponse.json({ error: 'Journal is not under review' }, { status: 400 });
  }

  const { action, notes } = await req.json();
  if (!action || !['approve', 'request_changes'].includes(action)) {
    return NextResponse.json({ error: 'action must be "approve" or "request_changes"' }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    await db.prepare(
      'UPDATE journals SET status = ?, published_at = ?, reviewer_id = ?, updated_at = ? WHERE id = ?'
    ).run('published', now, user.id, now, id);
  } else {
    await db.prepare(
      'UPDATE journals SET status = ?, review_notes = ?, reviewer_id = ?, updated_at = ? WHERE id = ?'
    ).run('draft', notes || '', user.id, now, id);
  }

  const updated = await db.prepare('SELECT * FROM journals WHERE id = ?').get(id);
  return NextResponse.json(updated);
}
