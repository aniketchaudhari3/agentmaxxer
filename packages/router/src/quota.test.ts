import { describe, it, expect } from "vitest"
import { QuotaEngine } from "./quota.js"
import type { RegistryProvider } from "@agentmaxxer/types"

const provider: RegistryProvider = {
  id: "test-cli", name: "Test CLI", type: "free",
  detection: { binary: "test-cli", versionFlag: "--version", versionRegex: "(\\d+\\.\\d+\\.\\d+)" },
  exec: { template: "{binary} {task}", shell: false },
  auth: { envVar: null }, install: { command: "" },
  quota: { exitCodes: [1, 137], errorPatterns: ["quota exhausted", "rate limit"] }
}

describe("QuotaEngine", () => {
  it("classifies matching exit code as exhausted", () => {
    const engine = new QuotaEngine()
    const result = engine.assess(provider, new Error("failed"), 1)
    expect(result.exhausted).toBe(true)
    expect(result.reason).toContain("Exit code 1")
  })

  it("classifies non-matching exit code as not exhausted", () => {
    const engine = new QuotaEngine()
    const result = engine.assess(provider, new Error("failed"), 2)
    expect(result.exhausted).toBe(false)
  })

  it("classifies matching error pattern as exhausted", () => {
    const engine = new QuotaEngine()
    const result = engine.assess(provider, new Error("quota exhausted"), null)
    expect(result.exhausted).toBe(true)
    expect(result.reason).toContain("quota exhausted")
  })

  it("is case-insensitive when matching patterns", () => {
    const engine = new QuotaEngine()
    const result = engine.assess(provider, new Error("Quota Exhausted"), null)
    expect(result.exhausted).toBe(true)
  })

  it("returns not exhausted when nothing matches", () => {
    const engine = new QuotaEngine()
    const result = engine.assess(provider, new Error("unknown error"), 0)
    expect(result.exhausted).toBe(false)
    expect(result.reason).toBeNull()
  })
})
