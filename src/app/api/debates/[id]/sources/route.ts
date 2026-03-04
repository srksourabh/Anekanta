import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const debateId = params.id;

  const sources = await db.prepare(`
    SELECT
      cs.*,
      u.display_name as added_by_name,
      a.content as argument_content
    FROM claim_sources cs
    JOIN users u ON cs.added_by = u.id
    JOIN arguments a ON cs.argument_id = a.id
    WHERE a.debate_id = ?
    ORDER BY cs.created_at DESC
  `).all(debateId);

  return NextResponse.json(sources);
}
