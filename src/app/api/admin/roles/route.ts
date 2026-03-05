import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { GLOBAL_ROLES } from '@/lib/types';
import type { GlobalRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET — List all users with their global roles (admin only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = await getDb();
  const users = await db.prepare(
    `SELECT id, username, display_name, avatar_color, role FROM users ORDER BY display_name ASC`
  ).all() as any[];

  const roles = await db.prepare(
    `SELECT user_id, role FROM user_roles`
  ).all() as any[];

  // Group roles by user
  const roleMap: Record<string, string[]> = {};
  for (const r of roles) {
    if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
    roleMap[r.user_id].push(r.role);
  }

  const result = users.map(u => ({
    ...u,
    globalRoles: roleMap[u.id] || [],
  }));

  return NextResponse.json({ users: result });
}

// POST — Assign a global role to a user (admin only)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId, role } = await request.json();

  if (!userId || !role || !GLOBAL_ROLES.includes(role as GlobalRole)) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
  }

  const db = await getDb();

  // Check user exists
  const targetUser = await db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Insert (ignore if already exists due to UNIQUE constraint)
  try {
    await db.prepare(
      'INSERT INTO user_roles (id, user_id, role, assigned_by) VALUES (?, ?, ?, ?)'
    ).run(nanoid(), userId, role, user.id);
  } catch {
    // Already has this role — that's fine
  }

  return NextResponse.json({ success: true });
}

// DELETE — Remove a global role from a user (admin only)
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const role = url.searchParams.get('role');

  if (!userId || !role) {
    return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
  }

  const db = await getDb();
  await db.prepare(
    'DELETE FROM user_roles WHERE user_id = ? AND role = ?'
  ).run(userId, role);

  return NextResponse.json({ success: true });
}
