import { describe, it, expect, beforeEach } from "vitest"
import Database from "better-sqlite3"
import { HealthStore } from "./health-store.js"
import { initSchema } from "./db.js"

describe("HealthStore", () => {
  let store: HealthStore

  beforeEach(() => {
    const db = new Database(":memory:")
    initSchema(db)
    store = new HealthStore()
    ;(store as any).db = db
  })

  it("records a success", () => {
    store.recordSuccess("test-cli", 500)
    const health = store.getHealth("test-cli")
    expect(health).not.toBeNull()
    expect(health!.successCount).toBe(1)
    expect(health!.totalLatencyMs).toBe(500)
  })

  it("records a failure", () => {
    store.recordFailure("test-cli", 200)
    const health = store.getHealth("test-cli")
    expect(health).not.toBeNull()
    expect(health!.failureCount).toBe(1)
  })

  it("increments counts on multiple records", () => {
    store.recordSuccess("test-cli", 100)
    store.recordSuccess("test-cli", 200)
    const health = store.getHealth("test-cli")
    expect(health!.successCount).toBe(2)
    expect(health!.totalLatencyMs).toBe(300)
  })

  it("returns null for unknown provider", () => {
    expect(store.getHealth("unknown")).toBeNull()
  })

  it("considers unknown provider healthy", () => {
    expect(store.isHealthy("unknown")).toBe(true)
  })

  it("marks provider unhealthy after 3+ failures without recovery", () => {
    store.recordFailure("test-cli", 100)
    store.recordFailure("test-cli", 100)
    store.recordFailure("test-cli", 100)
    store.recordFailure("test-cli", 100)
    expect(store.isHealthy("test-cli")).toBe(false)
  })

  it("provider recovers after a success", () => {
    store.recordFailure("test-cli", 100)
    store.recordFailure("test-cli", 100)
    store.recordFailure("test-cli", 100)
    store.recordFailure("test-cli", 100)
    store.recordSuccess("test-cli", 50)
    expect(store.isHealthy("test-cli")).toBe(true)
  })

  it("returns all health records", () => {
    store.recordSuccess("a", 100)
    store.recordSuccess("b", 200)
    const all = store.getAllHealth()
    expect(Object.keys(all)).toHaveLength(2)
  })
})
