import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both passwords required' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const db = await getDb();
  const row = await db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(user.id) as any;
  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });

  const hash = await bcrypt.hash(newPassword, 12);
  await db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, user.id);

  return NextResponse.json({ success: true });
}
