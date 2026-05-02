import Database from "better-sqlite3"
import { homedir } from "node:os"
import { join } from "node:path"
import { mkdirSync } from "node:fs"

export function getDb(dbPath?: string): Database.Database {
  const resolved = dbPath ?? join(homedir(), ".agentmaxxer", "data.db")
  mkdirSync(join(homedir(), ".agentmaxxer"), { recursive: true })
  const db = new Database(resolved)
  db.pragma("journal_mode = WAL")
  return db
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>
  return cols.some(c => c.name === column)
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_health (
      provider_id TEXT PRIMARY KEY,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      total_latency_ms INTEGER DEFAULT 0,
      last_success_at INTEGER,
      last_failure_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS usage_stats (
      provider_id TEXT,
      date TEXT,
      requests INTEGER DEFAULT 0,
      failovers_from INTEGER DEFAULT 0,
      failovers_to INTEGER DEFAULT 0,
      estimated_tokens INTEGER DEFAULT 0,
      estimated_savings_cents INTEGER DEFAULT 0,
      PRIMARY KEY (provider_id, date)
    );

    CREATE TABLE IF NOT EXISTS daily_summary (
      date TEXT PRIMARY KEY,
      total_requests INTEGER DEFAULT 0,
      total_failovers INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      total_savings_cents INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      provider TEXT,
      mode TEXT,
      task_count INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      provider TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, created_at);
  `)

  if (!hasColumn(db, "sessions", "project_id")) {
    db.exec("ALTER TABLE sessions ADD COLUMN project_id TEXT REFERENCES projects(id)")
  }
  if (!hasColumn(db, "sessions", "title")) {
    db.exec("ALTER TABLE sessions ADD COLUMN title TEXT")
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      content TEXT,
      tool_call_name TEXT,
      tool_call_input TEXT,
      tool_call_id TEXT,
      tool_result_output TEXT,
      tool_result_is_error INTEGER,
      provider TEXT,
      model TEXT,
      created_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_session_event_seq
      ON session_events(session_id, sequence)
  `)

  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id)")
}
