import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateAnonymousIdentity } from '@/lib/anonymous';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const { id } = params;
  const user = await getCurrentUser();

  const debate = await db.prepare(`
    SELECT d.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM arguments WHERE debate_id = d.id) as argument_count,
      (SELECT COUNT(*) FROM votes v JOIN arguments a ON v.argument_id = a.id WHERE a.debate_id = d.id) as vote_count
    FROM debates d JOIN users u ON d.author_id = u.id
    WHERE d.id = ?
  `).get(id);

  if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get all arguments for this debate
  const args = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM comments WHERE argument_id = a.id) as comment_count
    FROM arguments a JOIN users u ON a.author_id = u.id
    WHERE a.debate_id = ?
    ORDER BY a.is_pinned DESC, a.vote_score DESC, a.created_at ASC
  `).all(id) as any[];

  // Get user's votes if logged in
  let userVotes: Record<string, number> = {};
  if (user) {
    const votes = await db.prepare(`
      SELECT v.argument_id, v.value FROM votes v
      JOIN arguments a ON v.argument_id = a.id
      WHERE a.debate_id = ? AND v.user_id = ?
    `).all(id, user.id) as any[];
    for (const v of votes) userVotes[v.argument_id] = v.value;
  }

  // Build tree
  const argMap = new Map<string, any>();
  for (const a of args) {
    a.children = [];
    a.user_vote = userVotes[a.id] ?? null;
    argMap.set(a.id, a);
  }

  let thesis: any = null;
  for (const a of args) {
    if (a.type === 'thesis' && !a.parent_id) {
      thesis = a;
    } else if (a.parent_id && argMap.has(a.parent_id)) {
      argMap.get(a.parent_id).children.push(a);
    }
  }

  // Enforce anonymous mode: replace author info with anonymous identities
  const debateData = debate as any;
  const anonMode = debateData.anonymous_mode;
  const isOwnerOrAdmin = user && (debateData.author_id === user.id || user.role === 'admin');

  if (anonMode && anonMode !== 'none') {
    for (const a of args) {
      // Debate owner/admin can always see real identities
      if (isOwnerOrAdmin) continue;
      if (anonMode === 'animal') {
        const identity = generateAnonymousIdentity(id, a.author_id);
        a.author_name = identity.name;
        a.author_color = identity.color;
      } else if (anonMode === 'full') {
        a.author_name = 'Anonymous';
        a.author_color = '#9ca3af';
      }
    }
  }

  return NextResponse.json({ debate, thesis, arguments: args });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;
  const body = await req.json();

  const debate = await db.prepare('SELECT * FROM debates WHERE id = ?').get(debateId) as any;
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 });

  // Check author or admin
  if (debate.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, description, thesis, category, tagline, conclusion, status } = body;

  // Update debate
  const updates: string[] = [];
  const params_list: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params_list.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params_list.push(description);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params_list.push(category);
  }
  if (tagline !== undefined) {
    updates.push('tagline = ?');
    params_list.push(tagline);
  }
  if (conclusion !== undefined) {
    updates.push('conclusion = ?');
    params_list.push(conclusion);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params_list.push(status);
  }

  // If thesis content changed, update the thesis argument
  if (thesis !== undefined) {
    const thesisArg = await db.prepare('SELECT * FROM arguments WHERE debate_id = ? AND type = ? AND parent_id IS NULL')
      .get(debateId, 'thesis') as any;
    if (thesisArg && thesisArg.content !== thesis) {
      await db.prepare('UPDATE arguments SET content = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(thesis, thesisArg.id);
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = datetime(\'now\')');
    params_list.push(debateId);
    const sql = `UPDATE debates SET ${updates.join(', ')} WHERE id = ?`;
    await db.prepare(sql).run(...params_list);
  }

  const updated = await db.prepare('SELECT * FROM debates WHERE id = ?').get(debateId);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const debateId = params.id;

  const debate = await db.prepare('SELECT * FROM debates WHERE id = ?').get(debateId) as any;
  if (!debate) return NextResponse.json({ error: 'Debate not found' }, { status: 404 });

  // Check author or admin
  if (debate.author_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Cascade delete: votes, comments, activity, arguments, then debate
  const allArguments = await db.prepare('SELECT id FROM arguments WHERE debate_id = ?').all(debateId) as any[];

  for (const arg of allArguments) {
    await db.prepare('DELETE FROM votes WHERE argument_id = ?').run(arg.id);
    await db.prepare('DELETE FROM comments WHERE argument_id = ?').run(arg.id);
    await db.prepare('DELETE FROM reactions WHERE argument_id = ?').run(arg.id);
    await db.prepare('DELETE FROM claim_edits WHERE argument_id = ?').run(arg.id);
    await db.prepare('DELETE FROM claim_sources WHERE argument_id = ?').run(arg.id);
    await db.prepare('DELETE FROM bookmarks WHERE argument_id = ?').run(arg.id);
    await db.prepare('DELETE FROM last_seen WHERE argument_id = ?').run(arg.id);
  }

  await db.prepare('DELETE FROM arguments WHERE debate_id = ?').run(debateId);
  await db.prepare('DELETE FROM activity WHERE debate_id = ?').run(debateId);
  await db.prepare('DELETE FROM teams WHERE debate_id = ?').run(debateId);
  await db.prepare('DELETE FROM debates WHERE id = ?').run(debateId);

  return NextResponse.json({ success: true });
}
