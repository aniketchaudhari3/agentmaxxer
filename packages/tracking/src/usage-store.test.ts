import { describe, it, expect, beforeEach } from "vitest"
import Database from "better-sqlite3"
import { UsageStore } from "./usage-store.js"
import { initSchema } from "./db.js"

describe("UsageStore", () => {
  let store: UsageStore

  beforeEach(() => {
    const db = new Database(":memory:")
    initSchema(db)
    store = new UsageStore()
    ;(store as any).db = db
  })

  it("records a request", () => {
    store.recordRequest("test-cli")
    const stats = store.getProviderStats("test-cli")
    expect(stats).not.toBeNull()
    expect(stats!.requests).toBe(1)
  })

  it("increments request count", () => {
    store.recordRequest("test-cli")
    store.recordRequest("test-cli")
    expect(store.getProviderStats("test-cli")!.requests).toBe(2)
  })

  it("records failover", () => {
    store.recordFailover("paid-cli", "free-cli")
    const fromStats = store.getProviderStats("paid-cli")
    const toStats = store.getProviderStats("free-cli")
    expect(fromStats!.failoversFrom).toBe(1)
    expect(toStats!.failoversTo).toBe(1)
  })

  it("records tokens", () => {
    store.recordTokens("test-cli", 500)
    expect(store.getProviderStats("test-cli")!.estimatedTokens).toBe(500)
  })

  it("returns daily summary", () => {
    store.recordRequest("a")
    store.recordRequest("b")
    store.recordFailover("a", "b")
    const summary = store.getDailySummary()
    expect(summary).not.toBeNull()
    expect(summary!.totalRequests).toBe(2)
    expect(summary!.totalFailovers).toBe(1)
  })

  it("returns null for unknown provider", () => {
    expect(store.getProviderStats("unknown")).toBeNull()
  })
})
