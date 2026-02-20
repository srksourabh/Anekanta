import { NextResponse } from 'next/server';
import { getCurrentUser, destroySession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();

  // Cascade delete all user data
  await db.prepare(`DELETE FROM reactions WHERE user_id = ?`).run(user.id);
  await db.prepare(`DELETE FROM flagged_content WHERE reported_by = ?`).run(user.id);
  await db.prepare(`DELETE FROM activity WHERE user_id = ?`).run(user.id);
  await db.prepare(`DELETE FROM comments WHERE user_id = ?`).run(user.id);
  await db.prepare(`DELETE FROM votes WHERE user_id = ?`).run(user.id);
  await db.prepare(`DELETE FROM arguments WHERE user_id = ?`).run(user.id);
  await db.prepare(`DELETE FROM debates WHERE created_by = ?`).run(user.id);
  await db.prepare(`DELETE FROM users WHERE id = ?`).run(user.id);

  await destroySession();

  return NextResponse.json({ success: true });
}
