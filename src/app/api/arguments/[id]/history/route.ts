import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const argumentId = params.id;

  const edits = await db.prepare(`
    SELECT ce.*, u.display_name as author_name, u.avatar_color as author_color
    FROM claim_edits ce
    JOIN users u ON ce.author_id = u.id
    WHERE ce.argument_id = ?
    ORDER BY ce.created_at DESC
  `).all(argumentId);

  // Also get creation info
  const argument = await db.prepare(`
    SELECT a.content, a.created_at, u.display_name as author_name, u.avatar_color as author_color
    FROM arguments a
    JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(argumentId) as any;

  return NextResponse.json({
    edits,
    created: argument ? {
      content: argument.content,
      created_at: argument.created_at,
      author_name: argument.author_name,
      author_color: argument.author_color,
    } : null,
  });
}
