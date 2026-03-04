import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// GET: List all roles for a debate
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const debateId = params.id;

  const roles = await db.prepare(`
    SELECT dr.id, dr.user_id, dr.role, dr.created_at,
      u.display_name as user_name, u.avatar_color as user_color, u.username
    FROM debate_roles dr
    JOIN users u ON dr.user_id = u.id
    WHERE dr.debate_id = ?
    ORDER BY dr.role, dr.created_at
  `).all(debateId);

  return NextResponse.json({ roles });
}

// POST: Assign a role to a user for this debate
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;

  // Only debate owner or admin can assign roles
  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(debateId) as any;
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
  if (debate.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Only the debate creator or admin can assign roles' }, { status: 403 });
  }

  const { userId, role } = await req.json();
  if (!userId || !role || !['moderator', 'editor'].includes(role)) {
    return NextResponse.json({ error: 'Valid userId and role (moderator/editor) required' }, { status: 400 });
  }

  // Check target user exists
  const targetUser = await db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Check if already assigned
  const existing = await db.prepare(
    'SELECT id FROM debate_roles WHERE debate_id = ? AND user_id = ? AND role = ?'
  ).get(debateId, userId, role) as any;
  if (existing) return NextResponse.json({ error: 'Role already assigned' }, { status: 409 });

  const id = nanoid();
  await db.prepare(
    'INSERT INTO debate_roles (id, debate_id, user_id, role, assigned_by, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
  ).run(id, debateId, userId, role, user.id);

  return NextResponse.json({ id, success: true });
}

// DELETE: Remove a role assignment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;

  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(debateId) as any;
  if (!debate || (debate.author_id !== user.id && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const roleId = searchParams.get('roleId');
  if (!roleId) return NextResponse.json({ error: 'roleId required' }, { status: 400 });

  await db.prepare('DELETE FROM debate_roles WHERE id = ? AND debate_id = ?').run(roleId, debateId);
  return NextResponse.json({ success: true });
}
