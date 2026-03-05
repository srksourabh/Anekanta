import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = await getDb();
  const user = await getCurrentUser();
  const url = new URL(req.url);

  const statusParam = url.searchParams.get('status') || 'published';
  const search = url.searchParams.get('search');
  const author = url.searchParams.get('author');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  // If filtering by author and that author is the current user, show all statuses;
  // otherwise default to published only
  if (author) {
    where += ' AND a.author_id = ?';
    params.push(author);
    if (user && user.id === author) {
      // Author viewing own articles — apply explicit status filter if provided
      if (url.searchParams.has('status')) {
        where += ' AND a.status = ?';
        params.push(statusParam);
      }
    } else {
      where += ' AND a.status = ?';
      params.push('published');
    }
  } else {
    where += ' AND a.status = ?';
    params.push(statusParam);
  }

  if (search) {
    where += ' AND (a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const articles = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color,
      (SELECT COUNT(*) FROM article_responses WHERE article_id = a.id) as response_count
    FROM articles a
    JOIN users u ON a.author_id = u.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const totalRow = await db.prepare(
    `SELECT COUNT(*) as count FROM articles a ${where}`
  ).get(...params) as any;
  const total = totalRow?.count || 0;

  return NextResponse.json({
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { title, content, summary, category, status, cover_image_url } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
  }

  const db = await getDb();
  const id = nanoid();
  const readTime = Math.ceil(content.split(/\s+/).length / 200);

  await db.prepare(`
    INSERT INTO articles (id, title, content, summary, author_id, category, status, cover_image_url, read_time_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, content, summary || '', user.id, category || 'general', status || 'published', cover_image_url || '', readTime);

  const article = await db.prepare(`
    SELECT a.*, u.display_name as author_name, u.avatar_color as author_color
    FROM articles a JOIN users u ON a.author_id = u.id
    WHERE a.id = ?
  `).get(id);

  return NextResponse.json(article);
}
