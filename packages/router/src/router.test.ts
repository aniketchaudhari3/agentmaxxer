import { describe, it, expect, vi } from "vitest"
import { RoutingEngine } from "./router.js"
import type { RegistryClient } from "@agentmaxxer/registry"
import type { DetectionEngine } from "@agentmaxxer/providers"
import type { RegistryProvider, DetectionResult } from "@agentmaxxer/types"

function mockRegistry(providers: RegistryProvider[]): RegistryClient {
  return {
    fetchProviders: vi.fn().mockResolvedValue(providers),
    fetchProvider: vi.fn(),
    refresh: vi.fn()
  } as unknown as RegistryClient
}

function mockDetection(results: DetectionResult[]): DetectionEngine {
  return {
    detectAll: vi.fn().mockResolvedValue(results),
    detectOne: vi.fn()
  } as unknown as DetectionEngine
}

const paidProvider: RegistryProvider = {
  id: "paid-cli", name: "Paid CLI", type: "paid",
  detection: { binary: "paid-cli", versionFlag: "--version", versionRegex: "(\\d+\\.\\d+\\.\\d+)" },
  exec: { template: "{binary} {task}", shell: false },
  auth: { envVar: "PAID_KEY" }, install: { command: "" },
  quota: { exitCodes: [1], errorPatterns: [] }
}

const freeProvider: RegistryProvider = {
  id: "free-cli", name: "Free CLI", type: "free",
  detection: { binary: "free-cli", versionFlag: "--version", versionRegex: "(\\d+\\.\\d+\\.\\d+)" },
  exec: { template: "{binary} {task}", shell: false },
  auth: { envVar: null }, install: { command: "" },
  quota: { exitCodes: [1], errorPatterns: [] }
}

describe("RoutingEngine", () => {
  it("prefers paid providers with auth", async () => {
    const registry = mockRegistry([paidProvider, freeProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, path: "/usr/bin/paid-cli", version: "1.0", type: "paid", auth: true },
      { id: "free-cli", name: "Free CLI", installed: true, path: "/usr/bin/free-cli", version: "1.0", type: "free", auth: true }
    ])

    const engine = new RoutingEngine(detection, registry)
    const { adapter, reason } = await engine.selectProvider()
    expect(adapter.meta.id).toBe("paid-cli")
    expect(reason).toContain("Paid")
  })

  it("prefers paid over free even without auth", async () => {
    const registry = mockRegistry([paidProvider, freeProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, path: "/usr/bin/paid-cli", version: "1.0", type: "paid", auth: false },
      { id: "free-cli", name: "Free CLI", installed: true, path: "/usr/bin/free-cli", version: "1.0", type: "free", auth: true }
    ])

    const engine = new RoutingEngine(detection, registry)
    const { adapter, reason } = await engine.selectProvider()
    expect(adapter.meta.id).toBe("paid-cli")
    expect(reason).toMatch(/paid/i)
  })

  it("tries paid without auth as last resort", async () => {
    const registry = mockRegistry([paidProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, path: "/usr/bin/paid-cli", version: "1.0", type: "paid", auth: false }
    ])

    const engine = new RoutingEngine(detection, registry)
    const { adapter, reason } = await engine.selectProvider()
    expect(adapter.meta.id).toBe("paid-cli")
    expect(reason).toContain("no auth")
  })

  it("excludes already-used providers", async () => {
    const registry = mockRegistry([paidProvider, freeProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, path: "/usr/bin/paid-cli", version: "1.0", type: "paid", auth: true },
      { id: "free-cli", name: "Free CLI", installed: true, path: "/usr/bin/free-cli", version: "1.0", type: "free", auth: true }
    ])

    const engine = new RoutingEngine(detection, registry)
    const { adapter } = await engine.selectProvider(["paid-cli"])
    expect(adapter.meta.id).toBe("free-cli")
  })

  it("throws if no provider available", async () => {
    const registry = mockRegistry([])
    const detection = mockDetection([])

    const engine = new RoutingEngine(detection, registry)
    await expect(engine.selectProvider()).rejects.toThrow("No provider available")
  })

  it("respects health store", async () => {
    const registry = mockRegistry([paidProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, path: "/usr/bin/paid-cli", version: "1.0", type: "paid", auth: true }
    ])
    const healthStore = { isHealthy: vi.fn().mockReturnValue(false) }

    const engine = new RoutingEngine(detection, registry, healthStore)
    await expect(engine.selectProvider()).rejects.toThrow("No provider available")
  })

  it("free-first prefers free providers with auth", async () => {
    const registry = mockRegistry([paidProvider, freeProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, type: "paid", auth: true },
      { id: "free-cli", name: "Free CLI", installed: true, type: "free", auth: true }
    ])

    const engine = new RoutingEngine(detection, registry, undefined, "free-first")
    const { adapter, reason } = await engine.selectProvider()
    expect(adapter.meta.id).toBe("free-cli")
    expect(reason).toContain("Free")
  })

  it("free-first falls back to paid if no free with auth", async () => {
    const registry = mockRegistry([paidProvider, freeProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, type: "paid", auth: true },
      { id: "free-cli", name: "Free CLI", installed: true, type: "free", auth: false }
    ])

    const engine = new RoutingEngine(detection, registry, undefined, "free-first")
    const { adapter, reason } = await engine.selectProvider()
    expect(adapter.meta.id).toBe("free-cli")
    expect(reason).toContain("Free")
  })

  it("free-first tries paid if no free providers", async () => {
    const registry = mockRegistry([paidProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, type: "paid", auth: true }
    ])

    const engine = new RoutingEngine(detection, registry, undefined, "free-first")
    const { adapter, reason } = await engine.selectProvider()
    expect(adapter.meta.id).toBe("paid-cli")
    expect(reason).toContain("Paid")
  })

  it("round-robin cycles through providers", async () => {
    const registry = mockRegistry([paidProvider, freeProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, type: "paid", auth: true },
      { id: "free-cli", name: "Free CLI", installed: true, type: "free", auth: true }
    ])

    const engine = new RoutingEngine(detection, registry, undefined, "round-robin")
    const result1 = await engine.selectProvider()
    expect(result1.adapter.meta.id).toBe("paid-cli")
    const result2 = await engine.selectProvider()
    expect(result2.adapter.meta.id).toBe("free-cli")
    const result3 = await engine.selectProvider()
    expect(result3.adapter.meta.id).toBe("paid-cli")
  })

  it("setStrategy switches strategy at runtime", async () => {
    const registry = mockRegistry([paidProvider, freeProvider])
    const detection = mockDetection([
      { id: "paid-cli", name: "Paid CLI", installed: true, type: "paid", auth: true },
      { id: "free-cli", name: "Free CLI", installed: true, type: "free", auth: true }
    ])

    const engine = new RoutingEngine(detection, registry)
    expect(engine.getStrategy()).toBe("paid-first")
    engine.setStrategy("free-first")
    expect(engine.getStrategy()).toBe("free-first")
    const { adapter } = await engine.selectProvider()
    expect(adapter.meta.id).toBe("free-cli")
  })
})
