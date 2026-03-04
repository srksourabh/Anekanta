import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const db = await getDb();

  // Get all users with stats
  const users = await db.prepare(`
    SELECT
      u.*,
      (SELECT COUNT(*) FROM debates WHERE author_id = u.id) as debates_count,
      (SELECT COUNT(*) FROM arguments WHERE author_id = u.id) as arguments_count,
      (SELECT COUNT(*) FROM votes WHERE user_id = u.id) as votes_count
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const db = await getDb();
  const { userId, action } = await req.json();

  if (!userId || !action) {
    return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
  }

  // Cannot modify own account
  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
  }

  const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (action === 'ban') {
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run('banned', userId);
    return NextResponse.json({ success: true });
  }

  if (action === 'unban') {
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run('user', userId);
    return NextResponse.json({ success: true });
  }

  if (action === 'make_admin') {
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', userId);
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_admin') {
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run('user', userId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
