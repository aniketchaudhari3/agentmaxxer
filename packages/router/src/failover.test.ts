import { describe, it, expect, vi } from "vitest"
import { FailoverEngine } from "./failover.js"
import type { RegistryProvider, ExecutionResult, DetectionResult } from "@agentmaxxer/types"
import type { RoutingEngine } from "./router.js"
import type { ExecutionEngine } from "./engine.js"
import type { QuotaEngine } from "./quota.js"

function setupMocks(results: Array<{
  providerId: string
  success: boolean
  quotaExhausted?: boolean
}>) {
  let callCount = 0

  const routing = {
    selectProvider: vi.fn().mockImplementation(async (exclude: string[]) => {
      const idx = callCount % results.length
      callCount++
      const r = results[idx]
      return {
        adapter: {
          meta: { id: r.providerId, name: r.providerId, type: r.providerId === "paid" ? "paid" : "free" } as RegistryProvider,
          execute: vi.fn(),
          install: vi.fn()
        },
        reason: `Selected ${r.providerId}`
      }
    }),
    getAvailableProviders: vi.fn().mockResolvedValue(results.map(r => ({ id: r.providerId })))
  } as unknown as RoutingEngine

  const execution = {
    execute: vi.fn().mockImplementation(async () => {
      const r = results[callCount - 1]
      return {
        success: r.success,
        output: r.success ? "done" : "failed",
        events: [],
        duration: 100
      } as ExecutionResult
    })
  } as unknown as ExecutionEngine

  const quota = {
    assess: vi.fn().mockImplementation(() => {
      const r = results[callCount - 1]
      return {
        exhausted: r.quotaExhausted ?? false,
        reason: r.quotaExhausted ? "Quota exhausted" : null,
        provider: r.providerId
      }
    })
  } as unknown as QuotaEngine

  return { routing, execution, quota }
}

describe("FailoverEngine", () => {
  it("returns result on first success", async () => {
    const mocks = setupMocks([{ providerId: "paid", success: true }])
    const engine = new FailoverEngine(mocks.routing, mocks.execution, mocks.quota)
    const { result, failovers, finalProvider } = await engine.executeWithFailover("test")
    expect(result.success).toBe(true)
    expect(failovers).toHaveLength(0)
    expect(finalProvider).toBe("paid")
  })

  it("fails over on quota exhaustion", async () => {
    const mocks = setupMocks([
      { providerId: "paid", success: false, quotaExhausted: true },
      { providerId: "free", success: true }
    ])
    const engine = new FailoverEngine(mocks.routing, mocks.execution, mocks.quota)
    const { result, failovers, finalProvider } = await engine.executeWithFailover("test")
    expect(result.success).toBe(true)
    expect(failovers).toHaveLength(1)
    expect(failovers[0].from).toBe("paid")
    expect(finalProvider).toBe("free")
  })

  it("stops on non-quota error", async () => {
    const mocks = setupMocks([
      { providerId: "paid", success: false, quotaExhausted: false }
    ])
    const engine = new FailoverEngine(mocks.routing, mocks.execution, mocks.quota)
    const { result, failovers } = await engine.executeWithFailover("test")
    expect(result.success).toBe(false)
    expect(failovers).toHaveLength(0)
  })

  it("records failover history", async () => {
    const mocks = setupMocks([
      { providerId: "paid", success: false, quotaExhausted: true },
      { providerId: "free", success: true }
    ])
    const engine = new FailoverEngine(mocks.routing, mocks.execution, mocks.quota)
    await engine.executeWithFailover("test")
    expect(engine.getFailoverHistory()).toHaveLength(1)
  })
})
