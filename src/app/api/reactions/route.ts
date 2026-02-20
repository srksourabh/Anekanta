import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const argumentId = searchParams.get('argumentId');
  if (!argumentId) return NextResponse.json({ error: 'argumentId required' }, { status: 400 });
  const db = await getDb();
  const reactions = await db.prepare('SELECT type, COUNT(*) as count FROM reactions WHERE argument_id = ? GROUP BY type').all(argumentId);
  const user = await getCurrentUser();
  let userReactions: string[] = [];
  if (user) {
    userReactions = (await db.prepare('SELECT type FROM reactions WHERE argument_id = ? AND user_id = ?').all(argumentId, user.id) as any[]).map(r => r.type);
  }
  return NextResponse.json({ reactions, userReactions });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { argumentId, type } = await request.json();
  if (!argumentId || !type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!['insightful', 'agree', 'disagree', 'thought_provoking'].includes(type)) {
    return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
  }
  const db = await getDb();
  const existing = await db.prepare('SELECT id FROM reactions WHERE argument_id = ? AND user_id = ? AND type = ?').get(argumentId, user.id, type);
  if (existing) {
    await db.prepare('DELETE FROM reactions WHERE argument_id = ? AND user_id = ? AND type = ?').run(argumentId, user.id, type);
    return NextResponse.json({ toggled: 'off' });
  }
  await db.prepare('INSERT INTO reactions (id, argument_id, user_id, type) VALUES (?, ?, ?, ?)').run(nanoid(), argumentId, user.id, type);
  return NextResponse.json({ toggled: 'on' });
}
