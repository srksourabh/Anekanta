import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const debateId = params.id;

  // Get all teams for debate with member counts
  const teams = await db.prepare(`
    SELECT
      t.*,
      COUNT(DISTINCT tm.user_id) as member_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.debate_id = ?
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all(debateId) as any[];

  // Get members for each team
  const teamsWithMembers = await Promise.all(
    teams.map(async (team) => {
      const members = await db.prepare(`
        SELECT tm.*, u.display_name, u.avatar_color
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY tm.role DESC, tm.joined_at ASC
      `).all(team.id) as any[];

      return { ...team, members };
    })
  );

  return NextResponse.json(teamsWithMembers);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;
  const { name, description, stance } = await req.json();

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Team name required' }, { status: 400 });
  }

  if (!['pro', 'con', 'neutral'].includes(stance)) {
    return NextResponse.json({ error: 'Stance must be pro, con, or neutral' }, { status: 400 });
  }

  // Create team
  const teamId = nanoid();
  await db.prepare(`
    INSERT INTO teams (id, debate_id, name, description, stance, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(teamId, debateId, name.trim(), description?.trim() || '', stance, user.id);

  // Auto-join creator as leader
  await db.prepare(`
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (?, ?, 'leader')
  `).run(teamId, user.id);

  const team = await db.prepare(`
    SELECT t.*, COUNT(DISTINCT tm.user_id) as member_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.id = ?
    GROUP BY t.id
  `).get(teamId);

  return NextResponse.json(team);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const { teamId, action } = await req.json();

  if (!teamId || !action) {
    return NextResponse.json({ error: 'teamId and action required' }, { status: 400 });
  }

  const team = await db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const userMember = await db.prepare(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?'
  ).get(teamId, user.id) as any;

  if (action === 'join') {
    // Check if already member
    if (userMember) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    await db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(teamId, user.id);

    return NextResponse.json({ success: true });
  }

  if (action === 'leave') {
    if (!userMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 400 });
    }

    if (userMember.role === 'leader') {
      return NextResponse.json({ error: 'Leaders cannot leave' }, { status: 400 });
    }

    await db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?')
      .run(teamId, user.id);

    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    // Only leader or admin can delete
    if (userMember?.role !== 'leader' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId);
    await db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
