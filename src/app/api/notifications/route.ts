import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const db = await getDb();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const unreadOnly = url.searchParams.get('unread_only') === 'true';

  const whereClause = unreadOnly
    ? 'WHERE n.user_id = ? AND n.read_at IS NULL'
    : 'WHERE n.user_id = ?';

  const notifications = await db.prepare(`
    SELECT n.*, u.display_name as actor_name, u.avatar_color as actor_color, d.title as debate_title
    FROM notifications n
    JOIN users u ON n.actor_id = u.id
    JOIN debates d ON n.debate_id = d.id
    ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ?
  `).all(user.id, limit);

  const unreadCount = await db.prepare(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL`
  ).get(user.id) as { count: number };

  return NextResponse.json({ notifications, unread_count: unreadCount.count });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { action, ids } = await req.json();
  const db = await getDb();

  if (action === 'mark_all_read') {
    await db.prepare(
      `UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL`
    ).run(user.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'mark_read' && Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(
      `UPDATE notifications SET read_at = datetime('now') WHERE id IN (${placeholders}) AND user_id = ?`
    ).run(...ids, user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
