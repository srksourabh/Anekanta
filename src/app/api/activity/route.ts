import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = await getDb();
  const url = new URL(req.url);
  const debateId = url.searchParams.get('debateId');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  let query: string;
  let params: any[];

  if (debateId) {
    query = `
      SELECT a.*, u.display_name as user_name, u.avatar_color as user_color, d.title as debate_title
      FROM activity a
      JOIN users u ON a.user_id = u.id
      JOIN debates d ON a.debate_id = d.id
      WHERE a.debate_id = ?
      ORDER BY a.created_at DESC LIMIT ?
    `;
    params = [debateId, limit];
  } else {
    query = `
      SELECT a.*, u.display_name as user_name, u.avatar_color as user_color, d.title as debate_title
      FROM activity a
      JOIN users u ON a.user_id = u.id
      JOIN debates d ON a.debate_id = d.id
      ORDER BY a.created_at DESC LIMIT ?
    `;
    params = [limit];
  }

  const activities = await db.prepare(query).all(...params);
  return NextResponse.json(activities);
}
