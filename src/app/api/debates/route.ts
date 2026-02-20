import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { moderateContent } from '@/lib/moderation';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = await getDb();
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const sort = url.searchParams.get('sort') || 'recent';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = 'WHERE d.status = ?';
  const params: any[] = ['active'];

  if (category && category !== 'all') {
    where += ' AND d.category = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND (d.title LIKE ? OR d.thesis LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  let orderBy = 'ORDER BY d.created_at DESC';
  if (sort === 'popular') orderBy = 'ORDER BY argument_count DESC';
  if (sort === 'active') orderBy = 'ORDER BY d.updated_at DESC';

  const debates = await db.prepare(`
    SELECT d.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM arguments WHERE debate_id = d.id) as argument_count,
      (SELECT COUNT(*) FROM votes v JOIN arguments a ON v.argument_id = a.id WHERE a.debate_id = d.id) as vote_count
    FROM debates d
    JOIN users u ON d.author_id = u.id
    ${where}
    ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = await db.prepare(`SELECT COUNT(*) as count FROM debates d ${where}`).get(...params) as any;

  return NextResponse.json({ debates, total: total.count, page, pages: Math.ceil(total.count / limit) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { title, description, thesis, category, tagline, conclusion, is_anonymous } = await req.json();
  if (!title || !thesis) {
    return NextResponse.json({ error: 'Title and thesis required' }, { status: 400 });
  }

  const modResult = moderateContent(`${title} ${thesis} ${description || ''}`);
  if (modResult.action === 'block') {
    return NextResponse.json({ error: 'Content violates moderation policy' }, { status: 400 });
  }

  const db = await getDb();
  const debateId = nanoid();
  const thesisId = nanoid();

  await db.prepare(`INSERT INTO debates (id, title, description, thesis, author_id, category, tagline, conclusion, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(debateId, title, description || '', thesis, user.id, category || 'general', tagline || '', conclusion || '', is_anonymous ? 1 : 0);

  await db.prepare(`INSERT INTO arguments (id, debate_id, parent_id, author_id, content, type, depth) VALUES (?, ?, NULL, ?, ?, 'thesis', 0)`)
    .run(thesisId, debateId, user.id, thesis);

  if (modResult.flags.length > 0) {
    await db.prepare('INSERT INTO flagged_content (id, content_type, content_id, author_id, reason, flags, score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(nanoid(), 'debate', debateId, user.id, modResult.flags[0].detail, JSON.stringify(modResult.flags), modResult.score, 'pending');
  }

  await db.prepare(`INSERT INTO activity (id, debate_id, user_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, 'created', 'debate', ?, ?)`)
    .run(nanoid(), debateId, user.id, debateId, JSON.stringify({ title }));

  return NextResponse.json({ id: debateId });
}
