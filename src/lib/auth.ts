import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb } from './db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
const COOKIE_NAME = 'anekanta-session';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  avatar_color: string;
  role: string;
  created_at: string;
}

export async function createUser(username: string, email: string, password: string, displayName: string, role: string = 'user'): Promise<User> {
  const db = await getDb();
  const id = nanoid();
  const hash = await bcrypt.hash(password, 12);
  const colors = ['#a97847', '#0f766e', '#be185d', '#c74707', '#7b4d33', '#14b8a6', '#ec4899', '#ff7a0f'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  db.prepare(`INSERT INTO users (id, username, email, password_hash, display_name, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, username.toLowerCase(), email.toLowerCase(), hash, displayName, color, role);

  return { id, username: username.toLowerCase(), email: email.toLowerCase(), display_name: displayName, bio: '', avatar_color: color, role, created_at: new Date().toISOString() };
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const db = await getDb();
  const row = db.prepare(`SELECT id, username, email, display_name, bio, avatar_color, role, created_at FROM users WHERE email = ?`).get(email.toLowerCase()) as any;
  if (!row) return null;
  const stored = db.prepare(`SELECT password_hash FROM users WHERE email = ?`).get(email.toLowerCase()) as any;
  if (!stored) return null;
  const valid = await bcrypt.compare(password, stored.password_hash);
  if (!valid) return null;
  return row as User;
}

export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({ userId: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return token;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as string;

    const db = await getDb();
    const row = db.prepare(`SELECT id, username, email, display_name, bio, avatar_color, role, created_at FROM users WHERE id = ?`).get(userId);
    return row as User | null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
