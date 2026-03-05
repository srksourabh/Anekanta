import { createClient, type Client, type Row } from '@libsql/client';

let client: Client | null = null;
let db: CompatDb | null = null;

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL environment variable is required');
    client = createClient({ url, authToken: authToken || undefined });
  }
  return client;
}

/**
 * Convert a libsql Row (array-like with column info) to a plain object.
 */
function rowToObject(row: Row, columns: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[i];
  }
  return obj;
}

/**
 * Compatibility wrapper around @libsql/client that mimics the synchronous
 * prepare().run/get/all() API used throughout the codebase.
 *
 * Since libsql is async but our route handlers already await getDb(),
 * we make CompatStatement methods async-behind-sync by storing promises
 * and resolving them. The caller pattern `db.prepare(sql).run(...)` becomes
 * `await db.prepare(sql).run(...)` — but since all our callers already
 * use async functions, this works with minimal changes.
 *
 * IMPORTANT: All .run(), .get(), .all() calls now return Promises.
 * Existing code must `await` them.
 */
class CompatStatement {
  private client: Client;
  private sql: string;

  constructor(client: Client, sql: string) {
    this.client = client;
    this.sql = sql;
  }

  async run(...params: any[]): Promise<{ changes: number }> {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const result = await this.client.execute({ sql: this.sql, args: flat });
    return { changes: result.rowsAffected };
  }

  async get(...params: any[]): Promise<any> {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const result = await this.client.execute({ sql: this.sql, args: flat });
    if (result.rows.length === 0) return undefined;
    const columns = result.columns;
    const row = result.rows[0];
    const obj: any = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i];
    }
    return obj;
  }

  async all(...params: any[]): Promise<any[]> {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const result = await this.client.execute({ sql: this.sql, args: flat });
    const columns = result.columns;
    return result.rows.map(row => {
      const obj: any = {};
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i];
      }
      return obj;
    });
  }
}

class CompatDb {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  prepare(sql: string): CompatStatement {
    return new CompatStatement(this.client, sql);
  }

  async exec(sql: string) {
    // Split multiple statements and execute them via batch
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await this.client.execute(stmt);
    }
  }

  async pragma(pragma: string) {
    try {
      await this.client.execute(`PRAGMA ${pragma}`);
    } catch {
      // Turso may not support all pragmas — ignore silently
    }
  }
}

let initPromise: Promise<CompatDb> | null = null;

export async function getDb(): Promise<CompatDb> {
  if (db) return db;

  if (!initPromise) {
    initPromise = (async () => {
      const c = getClient();
      db = new CompatDb(c);
      await db.pragma('foreign_keys = ON');
      await initializeSchema(db);
      return db;
    })();
  }

  return initPromise;
}

async function initializeSchema(database: CompatDb) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      display_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_color TEXT DEFAULT '#0f766e',
      role TEXT DEFAULT 'user',
      oauth_provider TEXT,
      oauth_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS debates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      thesis TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT DEFAULT 'active',
      is_anonymous INTEGER DEFAULT 0,
      tagline TEXT DEFAULT '',
      conclusion TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS arguments (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES arguments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      depth INTEGER DEFAULT 0,
      vote_score INTEGER DEFAULT 0,
      is_anonymous INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      value INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(argument_id, user_id)
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_anonymous INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS flagged_content (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      flagged_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      resolved_by TEXT
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(argument_id, user_id, emoji)
    )
  `);

  // New tables for enhanced features
  await database.exec(`
    CREATE TABLE IF NOT EXISTS claim_edits (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      old_content TEXT NOT NULL,
      new_content TEXT NOT NULL,
      edit_type TEXT DEFAULT 'edit',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS claim_sources (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      quote TEXT DEFAULT '',
      added_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      stance TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (team_id, user_id)
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS last_seen (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      seen_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, argument_id)
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, argument_id)
    )
  `);

  // New tables for Kialo-style features

  await database.exec(`
    CREATE TABLE IF NOT EXISTS pending_claims (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      parent_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS anonymous_identities (
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      anonymous_name TEXT NOT NULL,
      anonymous_color TEXT NOT NULL,
      PRIMARY KEY (debate_id, user_id)
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL REFERENCES users(id),
      assigned_to TEXT REFERENCES users(id),
      task_type TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT DEFAULT '',
      author_id TEXT NOT NULL REFERENCES users(id),
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT DEFAULT 'published',
      cover_image_url TEXT DEFAULT '',
      read_time_minutes INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS article_responses (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES article_responses(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'agree',
      vote_score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS debate_follows (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      followed_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, debate_id)
    )
  `);

  // Debate roles (moderator/editor per-debate)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS debate_roles (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      assigned_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(debate_id, user_id, role)
    )
  `);

  // Editorial notes (editor annotations on arguments)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS editorial_notes (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      editor_id TEXT NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      note_type TEXT DEFAULT 'note',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Add new columns to debates (safe with IF NOT EXISTS pattern via try/catch)
  try { await database.exec(`ALTER TABLE debates ADD COLUMN requires_approval INTEGER DEFAULT 0`); } catch {}
  try { await database.exec(`ALTER TABLE debates ADD COLUMN anonymous_mode TEXT DEFAULT 'off'`); } catch {}
  try { await database.exec(`ALTER TABLE debates ADD COLUMN who_can_post TEXT DEFAULT 'anyone'`); } catch {}
  try { await database.exec(`ALTER TABLE debates ADD COLUMN max_argument_depth INTEGER DEFAULT 10`); } catch {}
  try { await database.exec(`ALTER TABLE debates ADD COLUMN argument_time_limit TEXT DEFAULT NULL`); } catch {}
  try { await database.exec(`ALTER TABLE debates ADD COLUMN max_arguments_per_user INTEGER DEFAULT NULL`); } catch {}

  // Add new columns to arguments
  try { await database.exec(`ALTER TABLE arguments ADD COLUMN is_pinned INTEGER DEFAULT 0`); } catch {}
  try { await database.exec(`ALTER TABLE arguments ADD COLUMN is_highlighted INTEGER DEFAULT 0`); } catch {}
  try { await database.exec(`ALTER TABLE arguments ADD COLUMN perspective TEXT DEFAULT ''`); } catch {}
  try { await database.exec(`ALTER TABLE arguments ADD COLUMN origin TEXT DEFAULT 'direct'`); } catch {}

  // Add sub_category to debates
  try { await database.exec(`ALTER TABLE debates ADD COLUMN sub_category TEXT DEFAULT ''`); } catch {}

  // Global user roles (editor, reviewer, moderator, translator)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      assigned_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, role)
    )
  `);

  // Article attachments (YouTube, images, links)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS article_attachments (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Journals (compiled publications from debates)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS journals (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id),
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      editor_id TEXT NOT NULL REFERENCES users(id),
      reviewer_id TEXT REFERENCES users(id),
      review_notes TEXT DEFAULT '',
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Journal sections
  await database.exec(`
    CREATE TABLE IF NOT EXISTS journal_sections (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
      section_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Debate tags table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS debate_tags (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS argument_summaries (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      argument_id TEXT REFERENCES arguments(id) ON DELETE CASCADE,
      summary_type TEXT NOT NULL CHECK(summary_type IN ('key_takeaway', 'group_label', 'debate_summary')),
      content TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Indexes - each as separate statement for Turso compatibility
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_arguments_debate ON arguments(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_arguments_parent ON arguments(parent_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_votes_argument ON votes(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_comments_argument ON comments(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_activity_debate ON activity(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_debates_category ON debates(category)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_flagged_status ON flagged_content(status)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_reactions_argument ON reactions(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_claim_edits_argument ON claim_edits(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_claim_sources_argument ON claim_sources(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_teams_debate ON teams(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`);

  // New indexes for Kialo-style features
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_pending_debate ON pending_claims(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_debate ON tasks(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(assigned_to)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_article_responses_article ON article_responses(article_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_debate_roles_debate ON debate_roles(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_debate_roles_user ON debate_roles(user_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_editorial_notes_arg ON editorial_notes(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_debate_tags_debate ON debate_tags(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_debate_tags_tag ON debate_tags(tag)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_argument_summaries_debate ON argument_summaries(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_argument_summaries_argument ON argument_summaries(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_article_attachments_article ON article_attachments(article_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_journals_debate ON journals(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_journals_editor ON journals(editor_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_journals_status ON journals(status)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_journal_sections_journal ON journal_sections(journal_id)`);
  // Migration: add OAuth columns to existing users table
  try {
    await database.exec(`ALTER TABLE users ADD COLUMN oauth_provider TEXT`);
  } catch { /* column already exists */ }
  try {
    await database.exec(`ALTER TABLE users ADD COLUMN oauth_id TEXT`);
  } catch { /* column already exists */ }
  await database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL`);

  // Notifications table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_debate ON notifications(debate_id)`);
}
