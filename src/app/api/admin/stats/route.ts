import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const db = await getDb();
  const totalUsers = (await db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const totalDebates = (await db.prepare('SELECT COUNT(*) as c FROM debates').get() as any).c;
  const totalArguments = (await db.prepare('SELECT COUNT(*) as c FROM arguments').get() as any).c;
  const pendingFlags = (await db.prepare("SELECT COUNT(*) as c FROM flagged_content WHERE status='pending'").get() as any).c;
  return NextResponse.json({ totalUsers, totalDebates, totalArguments, pendingFlags });
}
