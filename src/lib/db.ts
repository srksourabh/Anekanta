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
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_color TEXT DEFAULT '#a97847',
      role TEXT DEFAULT 'user',
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

  // Indexes - each as separate statement for Turso compatibility
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_arguments_debate ON arguments(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_arguments_parent ON arguments(parent_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_votes_argument ON votes(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_comments_argument ON comments(argument_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_activity_debate ON activity(debate_id)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_debates_category ON debates(category)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_flagged_status ON flagged_content(status)`);
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_reactions_argument ON reactions(argument_id)`);
}
