import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canModerate } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET: Get debate environment settings
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const debateId = params.id;

  const debate = await db.prepare(`
    SELECT requires_approval, anonymous_mode, who_can_post,
           max_argument_depth, argument_time_limit, max_arguments_per_user, is_locked
    FROM debates WHERE id = ?
  `).get(debateId) as any;

  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
  return NextResponse.json({ settings: debate });
}

// PUT: Update debate environment settings
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;

  // Owner, admin, or moderator can change settings
  const debate = await db.prepare('SELECT author_id FROM debates WHERE id = ?').get(debateId) as any;
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
  const isModerator = await canModerate(user, debateId);
  if (debate.author_id !== user.id && user.role !== 'admin' && !isModerator) {
    return NextResponse.json({ error: 'Only the debate creator or moderator can change settings' }, { status: 403 });
  }

  const body = await req.json();
  const updates: string[] = [];
  const values: any[] = [];

  if (body.requires_approval !== undefined) {
    updates.push('requires_approval = ?');
    values.push(body.requires_approval ? 1 : 0);
  }
  if (body.anonymous_mode !== undefined && ['off', 'animal', 'full'].includes(body.anonymous_mode)) {
    updates.push('anonymous_mode = ?');
    values.push(body.anonymous_mode);
  }
  if (body.who_can_post !== undefined && ['anyone', 'approved_users', 'team_members'].includes(body.who_can_post)) {
    updates.push('who_can_post = ?');
    values.push(body.who_can_post);
  }
  if (body.max_argument_depth !== undefined) {
    updates.push('max_argument_depth = ?');
    values.push(body.max_argument_depth || null);
  }
  if (body.argument_time_limit !== undefined) {
    updates.push('argument_time_limit = ?');
    values.push(body.argument_time_limit || null);
  }
  if (body.max_arguments_per_user !== undefined) {
    updates.push('max_arguments_per_user = ?');
    values.push(body.max_arguments_per_user || null);
  }
  if (body.is_locked !== undefined) {
    updates.push('is_locked = ?');
    values.push(body.is_locked ? 1 : 0);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid settings to update' }, { status: 400 });
  }

  updates.push('updated_at = datetime(\'now\')');
  values.push(debateId);

  await db.prepare(`UPDATE debates SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return NextResponse.json({ success: true });
}
