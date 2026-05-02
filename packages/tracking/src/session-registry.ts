import Database from "better-sqlite3"
import { getDb } from "./db.js"

export interface SessionBinding {
  threadId: string
  provider: string
  status: "active" | "idle" | "dead" | "error"
  mode: "full" | "supervised"
  created: string
  updated: string
}

interface BindingRow {
  thread_id: string
  provider: string
  status: string
  mode: string
  created: string
  updated: string
}

function mapBinding(row: BindingRow): SessionBinding {
  return {
    threadId: row.thread_id,
    provider: row.provider,
    status: row.status as SessionBinding["status"],
    mode: row.mode as SessionBinding["mode"],
    created: row.created,
    updated: row.updated,
  }
}

export class SessionRegistry {
  private db: Database.Database

  constructor(db?: Database.Database) {
    this.db = db ?? getDb()
    this.ensureTable()
  }

  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_bindings (
        thread_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        mode TEXT NOT NULL DEFAULT 'full',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `)
  }

  create(threadId: string, provider: string, mode: "full" | "supervised" = "full"): SessionBinding {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO session_bindings (thread_id, provider, status, mode, created, updated)
      VALUES (?, ?, 'active', ?, ?, ?)
    `).run(threadId, provider, mode, now, now)
    return this.get(threadId)!
  }

  get(threadId: string): SessionBinding | null {
    const row = this.db.prepare("SELECT * FROM session_bindings WHERE thread_id = ?").get(threadId) as BindingRow | undefined
    return row ? mapBinding(row) : null
  }

  delete(threadId: string): void {
    this.db.prepare("DELETE FROM session_bindings WHERE thread_id = ?").run(threadId)
  }
}