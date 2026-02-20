import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { display_name, bio } = await req.json();

  if (!display_name || display_name.trim().length < 1 || display_name.trim().length > 50) {
    return NextResponse.json({ error: 'Display name must be 1-50 characters' }, { status: 400 });
  }

  const db = await getDb();
  await db.prepare(`UPDATE users SET display_name = ?, bio = ? WHERE id = ?`)
    .run(display_name.trim(), (bio || '').trim().slice(0, 500), user.id);

  return NextResponse.json({ success: true });
}
