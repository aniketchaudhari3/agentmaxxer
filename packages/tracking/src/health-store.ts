import Database from "better-sqlite3"
import type { HealthRecord } from "@agentmaxxer/types"
import { getDb, initSchema } from "./db.js"

interface HealthRow {
  provider_id: string
  success_count: number
  failure_count: number
  total_latency_ms: number
  last_success_at: number | null
  last_failure_at: number | null
  updated_at: number
}

function mapRow(row: HealthRow): HealthRecord {
  return {
    providerId: row.provider_id,
    successCount: row.success_count,
    failureCount: row.failure_count,
    totalLatencyMs: row.total_latency_ms,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at
  }
}

export class HealthStore {
  private db: Database.Database

  constructor(dbPath?: string) {
    this.db = getDb(dbPath)
    initSchema(this.db)
  }

  recordSuccess(providerId: string, latencyMs: number): void {
    this.db.prepare(`
      INSERT INTO provider_health (provider_id, success_count, failure_count, total_latency_ms, last_success_at, updated_at)
      VALUES (?, 1, 0, ?, ?, ?)
      ON CONFLICT(provider_id) DO UPDATE SET
        success_count = success_count + 1,
        total_latency_ms = total_latency_ms + ?,
        last_success_at = ?,
        updated_at = ?
    `).run(providerId, latencyMs, Date.now(), Date.now(), latencyMs, Date.now(), Date.now())
  }

  recordFailure(providerId: string, latencyMs: number): void {
    this.db.prepare(`
      INSERT INTO provider_health (provider_id, success_count, failure_count, total_latency_ms, last_failure_at, updated_at)
      VALUES (?, 0, 1, ?, ?, ?)
      ON CONFLICT(provider_id) DO UPDATE SET
        failure_count = failure_count + 1,
        total_latency_ms = total_latency_ms + ?,
        last_failure_at = ?,
        updated_at = ?
    `).run(providerId, latencyMs, Date.now(), Date.now(), latencyMs, Date.now(), Date.now())
  }

  getHealth(providerId: string): HealthRecord | null {
    const row = this.db.prepare(
      "SELECT * FROM provider_health WHERE provider_id = ?"
    ).get(providerId) as HealthRow | undefined
    return row ? mapRow(row) : null
  }

  getAllHealth(): Record<string, HealthRecord> {
    const rows = this.db.prepare("SELECT * FROM provider_health").all() as HealthRow[]
    return Object.fromEntries(rows.map(r => [r.provider_id, mapRow(r)]))
  }

  isHealthy(providerId: string): boolean {
    const h = this.getHealth(providerId)
    if (!h) return true
    if (h.failureCount > 3 && (h.lastFailureAt ?? 0) > (h.lastSuccessAt ?? 0)) {
      return false
    }
    return true
  }
}
