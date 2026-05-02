import Database from "better-sqlite3"
import { getDb, initSchema } from "./db.js"

export interface Project {
  id: string
  name: string
  path: string
  createdAt: number
  updatedAt: number
}

interface ProjectRow {
  id: string
  name: string
  path: string
  created_at: number
  updated_at: number
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ProjectStore {
  private db: Database.Database

  constructor(dbPath?: string) {
    this.db = getDb(dbPath)
    initSchema(this.db)
  }

  createProject(name: string, path: string): Project {
    const id = crypto.randomUUID()
    const now = Date.now()
    this.db.prepare(`
      INSERT INTO projects (id, name, path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, path, now, now)
    return { id, name, path, createdAt: now, updatedAt: now }
  }

  listProjects(): Project[] {
    const rows = this.db.prepare(
      "SELECT * FROM projects ORDER BY updated_at DESC"
    ).all() as ProjectRow[]
    return rows.map(mapProject)
  }

  getProject(id: string): Project | null {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined
    return row ? mapProject(row) : null
  }

  getProjectByPath(path: string): Project | null {
    const row = this.db.prepare("SELECT * FROM projects WHERE path = ?").get(path) as ProjectRow | undefined
    return row ? mapProject(row) : null
  }

  updateProject(id: string, updates: Partial<Pick<Project, "name" | "path">>): void {
    const sets: string[] = ["updated_at = ?"]
    const params: unknown[] = [Date.now()]
    if (updates.name !== undefined) { sets.push("name = ?"); params.push(updates.name) }
    if (updates.path !== undefined) { sets.push("path = ?"); params.push(updates.path) }
    params.push(id)
    this.db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...params)
  }

  deleteProject(id: string): void {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE project_id = ?)").run(id)
      this.db.prepare("DELETE FROM sessions WHERE project_id = ?").run(id)
      this.db.prepare("DELETE FROM projects WHERE id = ?").run(id)
    })()
  }
}
