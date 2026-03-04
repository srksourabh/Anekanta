import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;

  const unvoted = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color
    FROM arguments a
    JOIN users u ON a.author_id = u.id
    LEFT JOIN votes v ON v.argument_id = a.id AND v.user_id = ?
    WHERE a.debate_id = ? AND a.type != 'thesis' AND v.id IS NULL
    ORDER BY a.depth ASC, a.created_at ASC
  `).all(user.id, debateId);

  return NextResponse.json({ claims: unvoted });
}
