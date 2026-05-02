import Database from "better-sqlite3"
import type { UsageRecord } from "@agentmaxxer/types"
import { getDb, initSchema } from "./db.js"

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface UsageRow {
  provider_id: string
  date: string
  requests: number
  failovers_from: number
  failovers_to: number
  estimated_tokens: number
  estimated_savings_cents: number
}

interface DailyRow {
  date: string
  total_requests: number
  total_failovers: number
  total_tokens: number
  total_savings_cents: number
}

export interface ProviderUsage {
  providerId: string
  requests: number
  failoversFrom: number
  failoversTo: number
  estimatedTokens: number
  estimatedSavingsCents: number
}

export interface DailySummary {
  date: string
  totalRequests: number
  totalFailovers: number
  totalTokens: number
  totalSavingsCents: number
}

export class UsageStore {
  private db: Database.Database

  constructor(dbPath?: string) {
    this.db = getDb(dbPath)
    initSchema(this.db)
  }

  recordRequest(providerId: string): void {
    const d = today()
    this.db.prepare(`
      INSERT INTO usage_stats (provider_id, date, requests)
      VALUES (?, ?, 1)
      ON CONFLICT(provider_id, date) DO UPDATE SET
        requests = requests + 1
    `).run(providerId, d)

    this.db.prepare(`
      INSERT INTO daily_summary (date, total_requests)
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET
        total_requests = total_requests + 1
    `).run(d)
  }

  recordFailover(from: string, to: string): void {
    const d = today()
    this.db.prepare(`
      INSERT INTO usage_stats (provider_id, date, failovers_from)
      VALUES (?, ?, 1)
      ON CONFLICT(provider_id, date) DO UPDATE SET
        failovers_from = failovers_from + 1
    `).run(from, d)

    this.db.prepare(`
      INSERT INTO usage_stats (provider_id, date, failovers_to)
      VALUES (?, ?, 1)
      ON CONFLICT(provider_id, date) DO UPDATE SET
        failovers_to = failovers_to + 1
    `).run(to, d)

    this.db.prepare(`
      INSERT INTO daily_summary (date, total_failovers)
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET
        total_failovers = total_failovers + 1
    `).run(d)
  }

  recordTokens(providerId: string, count: number): void {
    const d = today()
    this.db.prepare(`
      INSERT INTO usage_stats (provider_id, date, estimated_tokens)
      VALUES (?, ?, ?)
      ON CONFLICT(provider_id, date) DO UPDATE SET
        estimated_tokens = estimated_tokens + ?
    `).run(providerId, d, count, count)

    this.db.prepare(`
      INSERT INTO daily_summary (date, total_tokens)
      VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_tokens = total_tokens + ?
    `).run(d, count, count)
  }

  getProviderStats(providerId: string): ProviderUsage | null {
    const d = today()
    const row = this.db.prepare(
      "SELECT * FROM usage_stats WHERE provider_id = ? AND date = ?"
    ).get(providerId, d) as UsageRow | undefined
    if (!row) return null
    return {
      providerId: row.provider_id,
      requests: row.requests,
      failoversFrom: row.failovers_from,
      failoversTo: row.failovers_to,
      estimatedTokens: row.estimated_tokens,
      estimatedSavingsCents: row.estimated_savings_cents
    }
  }

  getDailySummary(): DailySummary | null {
    const d = today()
    const row = this.db.prepare(
      "SELECT * FROM daily_summary WHERE date = ?"
    ).get(d) as DailyRow | undefined
    if (!row) return null
    return {
      date: row.date,
      totalRequests: row.total_requests,
      totalFailovers: row.total_failovers,
      totalTokens: row.total_tokens,
      totalSavingsCents: row.total_savings_cents
    }
  }

  getTotalUsage(): { totalTokens: number; perProvider: Array<{ providerId: string; tokens: number }> } {
    const providers = this.db.prepare(
      "SELECT provider_id, SUM(estimated_tokens) as tokens FROM usage_stats GROUP BY provider_id"
    ).all() as Array<{ provider_id: string; tokens: number }>

    const totalRow = this.db.prepare(
      "SELECT COALESCE(SUM(total_tokens), 0) as total FROM daily_summary"
    ).get() as { total: number }

    return {
      totalTokens: totalRow.total,
      perProvider: providers.map(p => ({
        providerId: p.provider_id,
        tokens: p.tokens,
      })),
    }
  }
}
