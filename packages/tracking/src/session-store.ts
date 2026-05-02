import Database from "better-sqlite3"
import type { AgentEvent } from "@agentmaxxer/types"
import { getDb, initSchema } from "./db.js"

export interface Session {
  id: string
  createdAt: string
  updatedAt: string
  provider: string | null
  mode: string | null
  taskCount: number
  totalTokens: number
  projectId: string | null
  title: string | null
}

export interface SessionMessage {
  id: number
  sessionId: string
  role: "user" | "assistant" | "system"
  content: string
  provider: string | null
  createdAt: string
}

interface SessionRow {
  id: string
  created_at: string
  updated_at: string
  provider: string | null
  mode: string | null
  task_count: number
  total_tokens: number
  project_id: string | null
  title: string | null
}

interface MessageRow {
  id: number
  session_id: string
  role: string
  content: string
  provider: string | null
  created_at: string
}

interface SessionEventRow {
  id: number
  session_id: string
  sequence: number
  event_type: string
  content: string | null
  tool_call_name: string | null
  tool_call_input: string | null
  tool_call_id: string | null
  tool_result_output: string | null
  tool_result_is_error: number | null
  provider: string | null
  model: string | null
  created_at: string
}

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provider: row.provider,
    mode: row.mode,
    taskCount: row.task_count,
    totalTokens: row.total_tokens,
    projectId: row.project_id,
    title: row.title,
  }
}

function mapMessage(row: MessageRow): SessionMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role as SessionMessage["role"],
    content: row.content,
    provider: row.provider,
    createdAt: row.created_at,
  }
}

export class SessionStore {
  private db: Database.Database

  constructor(dbPath?: string) {
    this.db = getDb(dbPath)
    initSchema(this.db)
  }

  createSession(provider?: string, mode?: string, projectId?: string): Session {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO sessions (id, created_at, updated_at, provider, mode, project_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, now, now, provider ?? null, mode ?? null, projectId ?? null)
    return { id, createdAt: now, updatedAt: now, provider: provider ?? null, mode: mode ?? null, taskCount: 0, totalTokens: 0, projectId: projectId ?? null, title: null }
  }

  getSession(id: string): Session | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined
    return row ? mapSession(row) : null
  }

  listSessions(limit?: number): Session[] {
    const rows = this.db.prepare(
      "SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?"
    ).all(limit ?? 20) as SessionRow[]
    return rows.map(mapSession)
  }

  listByProject(projectId: string): Session[] {
    const rows = this.db.prepare(
      "SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at DESC"
    ).all(projectId) as SessionRow[]
    return rows.map(mapSession)
  }

  updateSession(id: string, updates: Partial<Pick<Session, "provider" | "mode" | "taskCount" | "totalTokens" | "title">>): void {
    const sets: string[] = ["updated_at = ?"]
    const params: unknown[] = [new Date().toISOString()]
    if (updates.provider !== undefined) { sets.push("provider = ?"); params.push(updates.provider) }
    if (updates.mode !== undefined) { sets.push("mode = ?"); params.push(updates.mode) }
    if (updates.taskCount !== undefined) { sets.push("task_count = ?"); params.push(updates.taskCount) }
    if (updates.totalTokens !== undefined) { sets.push("total_tokens = ?"); params.push(updates.totalTokens) }
    if (updates.title !== undefined) { sets.push("title = ?"); params.push(updates.title) }
    params.push(id)
    this.db.prepare(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`).run(...params)
  }

  setSessionTitle(id: string, title: string): void {
    this.updateSession(id, { title })
  }

  addMessage(sessionId: string, role: string, content: string, provider?: string): void {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO messages (session_id, role, content, provider, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, role, content, provider ?? null, now)
  }

  getMessages(sessionId: string): SessionMessage[] {
    const rows = this.db.prepare(
      "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC"
    ).all(sessionId) as MessageRow[]
    return rows.map(mapMessage)
  }

  getLastAssistantMessage(sessionId: string): SessionMessage | null {
    const rows = this.db.prepare(
      "SELECT * FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1"
    ).all(sessionId) as MessageRow[]
    return rows.length > 0 ? mapMessage(rows[0]) : null
  }

  updateLastAssistantMessage(sessionId: string, content: string): void {
    const last = this.getLastAssistantMessage(sessionId)
    if (last) {
      this.db.prepare("UPDATE messages SET content = ? WHERE id = ?").run(content, last.id)
    } else {
      this.addMessage(sessionId, "assistant", content)
    }
  }

  deleteSession(id: string): void {
    this.db.prepare("DELETE FROM messages WHERE session_id = ?").run(id)
    this.db.prepare("DELETE FROM session_events WHERE session_id = ?").run(id)
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(id)
  }

  appendEvent(sessionId: string, event: AgentEvent): void {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO session_events (session_id, sequence, event_type, content, tool_call_name, tool_call_input, tool_call_id, tool_result_output, tool_result_is_error, provider, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      event.sequence,
      event.type,
      event.content || null,
      event.toolUse?.name || null,
      event.toolUse?.input ? JSON.stringify(event.toolUse.input) : null,
      event.toolUse?.callId || event.toolResult?.callId || null,
      event.toolResult?.output || null,
      event.toolResult?.isError ? 1 : 0,
      event.provider,
      event.model || null,
      now,
    )
  }

  getEvents(sessionId: string, afterSequence?: number): AgentEvent[] {
    let rows: SessionEventRow[]
    if (afterSequence !== undefined) {
      rows = this.db.prepare(
        "SELECT * FROM session_events WHERE session_id = ? AND sequence > ? ORDER BY sequence ASC"
      ).all(sessionId, afterSequence) as SessionEventRow[]
    } else {
      rows = this.db.prepare(
        "SELECT * FROM session_events WHERE session_id = ? ORDER BY sequence ASC"
      ).all(sessionId) as SessionEventRow[]
    }
    return rows.map(this.mapEventRow)
  }

  getLastSequence(sessionId: string): number {
    const row = this.db.prepare(
      "SELECT COALESCE(MAX(sequence), 0) as max_seq FROM session_events WHERE session_id = ?"
    ).get(sessionId) as { max_seq: number } | undefined
    return row?.max_seq ?? 0
  }

  private mapEventRow(row: SessionEventRow): AgentEvent {
    const base = {
      id: `${row.session_id}-${row.sequence}`,
      sequence: row.sequence,
      provider: row.provider ?? "",
      model: row.model ?? undefined,
      timestamp: new Date(row.created_at).getTime(),
      metadata: undefined,
    }

    switch (row.event_type) {
      case "tool_use":
        return {
          ...base,
          type: "tool_use",
          content: "",
          toolUse: {
            name: row.tool_call_name ?? "",
            input: row.tool_call_input ? JSON.parse(row.tool_call_input) : {},
            callId: row.tool_call_id ?? "",
          },
        }
      case "tool_result":
        return {
          ...base,
          type: "tool_result",
          content: "",
          toolResult: {
            callId: row.tool_call_id ?? "",
            output: row.tool_result_output ?? "",
            isError: !!row.tool_result_is_error,
          },
        }
      case "reasoning":
        return { ...base, type: "reasoning", content: row.content ?? "" }
      case "error":
        return { ...base, type: "error", content: row.content ?? "" }
      case "done":
        return { ...base, type: "done", content: "" }
      default:
        return { ...base, type: "text_delta", content: row.content ?? "" }
    }
  }
}
