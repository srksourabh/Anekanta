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
  oauth_provider?: string | null;
  oauth_id?: string | null;
  created_at: string;
}

const USER_COLUMNS = 'id, username, email, display_name, bio, avatar_color, role, oauth_provider, oauth_id, created_at';

export async function createUser(username: string, email: string, password: string, displayName: string, role: string = 'user'): Promise<User> {
  const db = await getDb();
  const id = nanoid();
  const hash = await bcrypt.hash(password, 12);
  const colors = ['#0f766e', '#115e59', '#be185d', '#14b8a6', '#7b4d33', '#ec4899', '#ff7a0f', '#059669'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  await db.prepare(`INSERT INTO users (id, username, email, password_hash, display_name, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, username.toLowerCase(), email.toLowerCase(), hash, displayName, color, role);

  return { id, username: username.toLowerCase(), email: email.toLowerCase(), display_name: displayName, bio: '', avatar_color: color, role, created_at: new Date().toISOString() };
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const db = await getDb();
  const row = await db.prepare(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`).get(email.toLowerCase()) as any;
  if (!row || !row.password_hash) return null;
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  const { password_hash: _, ...user } = row;
  return user as User;
}

export async function findOrCreateOAuthUser(
  provider: 'google' | 'github',
  oauthId: string,
  email: string,
  displayName: string
): Promise<User> {
  const db = await getDb();

  // 1. Check if OAuth account already linked
  const existing = await db.prepare(
    `SELECT ${USER_COLUMNS} FROM users WHERE oauth_provider = ? AND oauth_id = ?`
  ).get(provider, oauthId) as User | undefined;
  if (existing) return existing;

  // 2. Check if email already exists (link OAuth to existing account)
  const byEmail = await db.prepare(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = ?`
  ).get(email.toLowerCase()) as User | undefined;
  if (byEmail) {
    await db.prepare(`UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?`)
      .run(provider, oauthId, byEmail.id);
    return { ...byEmail, oauth_provider: provider, oauth_id: oauthId };
  }

  // 3. Create new user (no password)
  const id = nanoid();
  const colors = ['#0f766e', '#115e59', '#be185d', '#14b8a6', '#7b4d33', '#ec4899', '#ff7a0f', '#059669'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  // Generate unique username from display name
  const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';
  let username = baseUsername;
  let attempt = 0;
  while (true) {
    const taken = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!taken) break;
    attempt++;
    username = `${baseUsername}${attempt}`;
  }

  await db.prepare(
    `INSERT INTO users (id, username, email, display_name, avatar_color, role, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, 'user', ?, ?)`
  ).run(id, username, email.toLowerCase(), displayName, color, provider, oauthId);

  return { id, username, email: email.toLowerCase(), display_name: displayName, bio: '', avatar_color: color, role: 'user', oauth_provider: provider, oauth_id: oauthId, created_at: new Date().toISOString() };
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
    const row = await db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(userId);
    return row as User | null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
