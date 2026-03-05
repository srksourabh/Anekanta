import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasGlobalRole } from '@/lib/permissions';
import { nanoid } from 'nanoid';
import type { JournalSectionType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = await getDb();
  const user = await getCurrentUser();
  const url = new URL(req.url);

  const statusParam = url.searchParams.get('status') || 'published';
  const editor = url.searchParams.get('editor');
  const search = url.searchParams.get('search');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (editor) {
    where += ' AND j.editor_id = ?';
    params.push(editor);
    if (user && user.id === editor) {
      // Editor viewing own journals — apply explicit status filter if provided
      if (url.searchParams.has('status')) {
        where += ' AND j.status = ?';
        params.push(statusParam);
      }
    } else {
      where += ' AND j.status = ?';
      params.push('published');
    }
  } else {
    where += ' AND j.status = ?';
    params.push(statusParam);
  }

  if (search) {
    where += ' AND (j.title LIKE ? OR d.title LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const journals = await db.prepare(`
    SELECT j.*, u.display_name as editor_name, u.avatar_color as editor_color,
      d.title as debate_title,
      (SELECT COUNT(*) FROM journal_sections WHERE journal_id = j.id) as section_count
    FROM journals j
    JOIN users u ON j.editor_id = u.id
    JOIN debates d ON j.debate_id = d.id
    ${where}
    ORDER BY j.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const totalRow = await db.prepare(
    `SELECT COUNT(*) as count FROM journals j JOIN debates d ON j.debate_id = d.id ${where}`
  ).get(...params) as any;
  const total = totalRow?.count || 0;

  return NextResponse.json({
    journals,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const isEditor = await hasGlobalRole(user.id, 'editor');
  if (!isEditor && user.role !== 'admin') {
    return NextResponse.json({ error: 'Editor role required' }, { status: 403 });
  }

  const { debateId, title } = await req.json();
  if (!debateId || !title) {
    return NextResponse.json({ error: 'debateId and title are required' }, { status: 400 });
  }

  const db = await getDb();

  // Check debate exists
  const debate = await db.prepare('SELECT id, title, thesis FROM debates WHERE id = ?').get(debateId) as any;
  if (!debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
  }

  const journalId = nanoid();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO journals (id, debate_id, title, status, editor_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', ?, ?, ?)
  `).run(journalId, debateId, title, user.id, now, now);

  // Define default sections
  const sectionDefs: { type: JournalSectionType; title: string; order: number }[] = [
    { type: 'abstract', title: 'Abstract', order: 0 },
    { type: 'thesis_analysis', title: 'Thesis Analysis', order: 1 },
    { type: 'pro_synthesis', title: 'Pro Arguments Synthesis', order: 2 },
    { type: 'con_synthesis', title: 'Con Arguments Synthesis', order: 3 },
    { type: 'conclusion', title: 'Conclusion', order: 4 },
    { type: 'references', title: 'References', order: 5 },
  ];

  // Pre-fill thesis_analysis with debate thesis
  const thesisContent = debate.thesis || '';

  // Get top 5 pro arguments
  const proArgs = await db.prepare(`
    SELECT content FROM arguments
    WHERE debate_id = ? AND type = 'pro'
    ORDER BY vote_score DESC
    LIMIT 5
  `).all(debateId) as any[];

  const proContent = proArgs.length > 0
    ? proArgs.map((a: any) => `- ${a.content}`).join('\n')
    : '';

  // Get top 5 con arguments
  const conArgs = await db.prepare(`
    SELECT content FROM arguments
    WHERE debate_id = ? AND type = 'con'
    ORDER BY vote_score DESC
    LIMIT 5
  `).all(debateId) as any[];

  const conContent = conArgs.length > 0
    ? conArgs.map((a: any) => `- ${a.content}`).join('\n')
    : '';

  // Create sections
  for (const sec of sectionDefs) {
    const secId = nanoid();
    let content = '';
    if (sec.type === 'thesis_analysis') content = thesisContent;
    if (sec.type === 'pro_synthesis') content = proContent;
    if (sec.type === 'con_synthesis') content = conContent;

    await db.prepare(`
      INSERT INTO journal_sections (id, journal_id, section_type, title, content, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(secId, journalId, sec.type, sec.title, content, sec.order, now, now);
  }

  // Return the created journal with sections
  const journal = await db.prepare(`
    SELECT j.*, u.display_name as editor_name, u.avatar_color as editor_color,
      d.title as debate_title
    FROM journals j
    JOIN users u ON j.editor_id = u.id
    JOIN debates d ON j.debate_id = d.id
    WHERE j.id = ?
  `).get(journalId) as any;

  const sections = await db.prepare(`
    SELECT * FROM journal_sections WHERE journal_id = ? ORDER BY sort_order
  `).all(journalId);

  return NextResponse.json({ ...journal, sections });
}
