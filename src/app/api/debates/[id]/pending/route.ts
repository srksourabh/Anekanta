import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canModerate } from '@/lib/permissions';
import { nanoid } from 'nanoid';
import { moderateContent } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;

  // Check if user is debate owner, admin, or moderator
  const isModerator = await canModerate(user, debateId);

  let claims;
  if (isModerator) {
    claims = await db.prepare(`
      SELECT pc.*, u.display_name as author_name, u.avatar_color as author_color
      FROM pending_claims pc
      JOIN users u ON pc.author_id = u.id
      WHERE pc.debate_id = ? AND pc.status = 'pending'
      ORDER BY pc.created_at ASC
    `).all(debateId);
  } else {
    claims = await db.prepare(`
      SELECT pc.*, u.display_name as author_name, u.avatar_color as author_color
      FROM pending_claims pc
      JOIN users u ON pc.author_id = u.id
      WHERE pc.debate_id = ? AND pc.author_id = ?
      ORDER BY pc.created_at DESC
    `).all(debateId, user.id);
  }

  return NextResponse.json({ claims });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;
  const { parentId, content, type } = await req.json();

  if (!content || content.trim().length === 0 || content.length > 500) {
    return NextResponse.json({ error: 'Content must be 1-500 characters' }, { status: 400 });
  }

  const modResult = moderateContent(content);
  if (modResult.action === 'block') {
    return NextResponse.json({ error: 'Content violates moderation policy' }, { status: 400 });
  }

  const id = nanoid();
  await db.prepare(`
    INSERT INTO pending_claims (id, debate_id, parent_id, author_id, content, type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, debateId, parentId, user.id, content.trim(), type);

  return NextResponse.json({ id, status: 'pending' }, { status: 202 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;
  const { claimId, action } = await req.json();

  // Check ownership or moderator role
  const isModerator = await canModerate(user, debateId);
  if (!isModerator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pending = await db.prepare('SELECT * FROM pending_claims WHERE id = ? AND debate_id = ?')
    .get(claimId, debateId) as any;
  if (!pending) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

  if (action === 'approve') {
    // Get parent depth
    const parent = await db.prepare('SELECT depth FROM arguments WHERE id = ?').get(pending.parent_id) as any;
    const depth = parent ? parent.depth + 1 : 1;

    // Insert into arguments
    const argId = nanoid();
    await db.prepare(`
      INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(argId, debateId, pending.parent_id, pending.author_id, pending.content, pending.type, depth);

    // Update debate
    await db.prepare('UPDATE debates SET updated_at = datetime(\'now\') WHERE id = ?').run(debateId);

    // Log activity
    await db.prepare(`
      INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, created_at)
      VALUES (?, ?, ?, 'added_argument', 'argument', ?, datetime('now'))
    `).run(nanoid(), debateId, pending.author_id, argId);

    // Update pending status
    await db.prepare(`
      UPDATE pending_claims SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?
    `).run(user.id, claimId);

    return NextResponse.json({ success: true, argumentId: argId });
  } else if (action === 'reject') {
    await db.prepare(`
      UPDATE pending_claims SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?
    `).run(user.id, claimId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
