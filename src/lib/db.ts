import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/anekanta.db';

let db: CompatDb | null = null;
let initPromise: Promise<CompatDb> | null = null;

/**
 * Compatibility wrapper around sql.js that mimics better-sqlite3's synchronous API.
 * All existing code using db.prepare().run/get/all() and db.exec() works unchanged.
 */
class CompatStatement {
  private sqlDb: SqlJsDatabase;
  private sql: string;
  private saveFn: () => void;

  constructor(sqlDb: SqlJsDatabase, sql: string, saveFn: () => void) {
    this.sqlDb = sqlDb;
    this.sql = sql;
    this.saveFn = saveFn;
  }

  run(...params: any[]) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this.sqlDb.run(this.sql, flat.length > 0 ? flat : undefined);
    this.saveFn();
    return { changes: this.sqlDb.getRowsModified() };
  }

  get(...params: any[]): any {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this.sqlDb.prepare(this.sql);
    if (flat.length > 0) stmt.bind(flat);
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      stmt.free();
      const row: any = {};
      for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params: any[]): any[] {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const results: any[] = [];
    const stmt = this.sqlDb.prepare(this.sql);
    if (flat.length > 0) stmt.bind(flat);
    while (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      const row: any = {};
      for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
      results.push(row);
    }
    stmt.free();
    return results;
  }
}

class CompatDb {
  private sqlDb: SqlJsDatabase;
  private dbPath: string;

  constructor(sqlDb: SqlJsDatabase, dbPath: string) {
    this.sqlDb = sqlDb;
    this.dbPath = dbPath;
  }

  prepare(sql: string): CompatStatement {
    return new CompatStatement(this.sqlDb, sql, () => this.save());
  }

  exec(sql: string) {
    this.sqlDb.exec(sql);
    this.save();
  }

  pragma(pragma: string) {
    this.sqlDb.exec(`PRAGMA ${pragma}`);
  }

  save() {
    const data = this.sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  close() {
    this.save();
    this.sqlDb.close();
  }
}

export async function getDb(): Promise<CompatDb> {
  if (db) return db;

  if (!initPromise) {
    initPromise = (async () => {
      const SQL = await initSqlJs();
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let sqlDb: SqlJsDatabase;
      if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(buffer);
      } else {
        sqlDb = new SQL.Database();
      }

      db = new CompatDb(sqlDb, DB_PATH);
      db.pragma('foreign_keys = ON');
      initializeSchema(db);
      return db;
    })();
  }

  return initPromise;
}

function initializeSchema(database: CompatDb) {
  database.exec(`
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
    );

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
    );

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
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      value INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(argument_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_anonymous INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

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
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      argument_id TEXT NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(argument_id, user_id, emoji)
    );

    CREATE INDEX IF NOT EXISTS idx_arguments_debate ON arguments(debate_id);
    CREATE INDEX IF NOT EXISTS idx_arguments_parent ON arguments(parent_id);
    CREATE INDEX IF NOT EXISTS idx_votes_argument ON votes(argument_id);
    CREATE INDEX IF NOT EXISTS idx_comments_argument ON comments(argument_id);
    CREATE INDEX IF NOT EXISTS idx_activity_debate ON activity(debate_id);
    CREATE INDEX IF NOT EXISTS idx_debates_category ON debates(category);
    CREATE INDEX IF NOT EXISTS idx_flagged_status ON flagged_content(status);
    CREATE INDEX IF NOT EXISTS idx_reactions_argument ON reactions(argument_id);
  `);
}
