import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const db = await getDb();
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const totalDebates = (db.prepare('SELECT COUNT(*) as c FROM debates').get() as any).c;
  const totalArguments = (db.prepare('SELECT COUNT(*) as c FROM arguments').get() as any).c;
  const pendingFlags = (db.prepare("SELECT COUNT(*) as c FROM flagged_content WHERE status='pending'").get() as any).c;
  return NextResponse.json({ totalUsers, totalDebates, totalArguments, pendingFlags });
}
