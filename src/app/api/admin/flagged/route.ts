import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isGlobalModerator } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const isAllowed = user.role === 'admin' || await isGlobalModerator(user.id);
  if (!isAllowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const db = await getDb();
  const items = await db.prepare('SELECT * FROM flagged_content ORDER BY created_at DESC LIMIT 50').all();
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const isAllowed = user.role === 'admin' || await isGlobalModerator(user.id);
  if (!isAllowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id, status } = await request.json();
  if (!['reviewed', 'dismissed', 'actioned'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const db = await getDb();
  await db.prepare('UPDATE flagged_content SET status = ? WHERE id = ?').run(status, id);
  return NextResponse.json({ success: true });
}
