import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || email.trim().length === 0) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()) as any;

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  // Store in password_resets table
  await db.prepare(`
    INSERT INTO password_resets (id, user_id, token, expires_at, used)
    VALUES (?, ?, ?, ?, 0)
  `).run(nanoid(), user.id, token, expiresAt);

  // For MVP, return reset_url (in production, send via email)
  const reset_url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

  return NextResponse.json({
    success: true,
    message: 'If an account exists with this email, a reset link has been sent.',
    reset_url, // For MVP only - in production, send via email instead
  });
}

export async function PUT(req: NextRequest) {
  const { token, newPassword } = await req.json();

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const db = await getDb();

  // Look up password reset token
  const reset = await db.prepare(`
    SELECT * FROM password_resets WHERE token = ?
  `).get(token) as any;

  if (!reset) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  // Check if token is not used and not expired
  if (reset.used === 1) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400 });
  }

  if (new Date(reset.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 });
  }

  // Hash new password
  const hash = await bcrypt.hash(newPassword, 12);

  // Update user password
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(hash, reset.user_id);

  // Mark token as used
  await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?')
    .run(reset.id);

  return NextResponse.json({ success: true, message: 'Password reset successfully' });
}
