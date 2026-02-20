import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const db = await getDb();
  const items = await db.prepare('SELECT * FROM flagged_content ORDER BY created_at DESC LIMIT 50').all();
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { id, status } = await request.json();
  if (!['reviewed', 'dismissed', 'actioned'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const db = await getDb();
  await db.prepare('UPDATE flagged_content SET status = ? WHERE id = ?').run(status, id);
  return NextResponse.json({ success: true });
}
