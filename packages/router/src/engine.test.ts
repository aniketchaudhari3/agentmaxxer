import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ExecutionEngine } from "./engine.js"
import { GenericAdapter } from "@agentmaxxer/providers"
import type { RegistryProvider, AgentEvent } from "@agentmaxxer/types"

let sequence = 0

function makeEvent(
  type: AgentEvent["type"],
  content: string,
  overrides: Partial<AgentEvent> = {}
): AgentEvent {
  return {
    id: `evt-${++sequence}`,
    type,
    content,
    provider: "test-cli",
    sequence,
    timestamp: Date.now(),
    ...overrides,
  }
}

function createMockAdapter(events: AgentEvent[]): GenericAdapter {
  const provider: RegistryProvider = {
    id: "test-cli",
    name: "Test CLI",
    type: "free",
    detection: {
      binary: "test-cli",
      versionFlag: "--version",
      versionRegex: "(\\d+\\.\\d+\\.\\d+)"
    },
    exec: {
      template: "{binary} {task}",
      shell: false
    },
    auth: { envVar: null },
    install: { command: "npm install -g test-cli" },
    quota: { exitCodes: [1], errorPatterns: [] }
  }

  return {
    meta: provider,
    execute: vi.fn().mockImplementation(async function* () {
      for (const event of events) {
        yield event
      }
    }),
    install: vi.fn()
  } as unknown as GenericAdapter
}

beforeEach(() => {
  sequence = 0
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("ExecutionEngine", () => {
  it("returns success result on done event", async () => {
    const adapter = createMockAdapter([
      makeEvent("text_delta", "hello", { timestamp: 1000 }),
      makeEvent("done", "", { timestamp: 2000, metadata: { durationMs: 1000 } })
    ])

    const engine = new ExecutionEngine()
    const result = await engine.execute(adapter, "test task")

    expect(result.success).toBe(true)
    expect(result.output).toBe("hello")
    expect(result.duration).toBe(1000)
    expect(result.events).toHaveLength(2)
  })

  it("returns failure result on error event", async () => {
    const adapter = createMockAdapter([
      makeEvent("text_delta", "partial", { timestamp: 1000 }),
      makeEvent("error", "Exit code 1: partial", { timestamp: 2000 })
    ])

    const engine = new ExecutionEngine()
    const result = await engine.execute(adapter, "test task")

    expect(result.success).toBe(false)
    expect(result.output).toBe("Exit code 1: partial")
    expect(result.events).toHaveLength(2)
  })

  it("calls onEvent callback for each event", async () => {
    const adapter = createMockAdapter([
      makeEvent("text_delta", "a"),
      makeEvent("text_delta", "b"),
      makeEvent("done", "")
    ])

    const onEvent = vi.fn()
    const engine = new ExecutionEngine()
    await engine.execute(adapter, "test", { onEvent })

    expect(onEvent).toHaveBeenCalledTimes(3)
    expect(onEvent.mock.calls[0][0].content).toBe("a")
    expect(onEvent.mock.calls[1][0].content).toBe("b")
    expect(onEvent.mock.calls[2][0].type).toBe("done")
  })

  it("aborts after timeout", async () => {
    const provider: RegistryProvider = {
      id: "test-cli", name: "Test CLI", type: "free",
      detection: { binary: "test-cli", versionFlag: "--version", versionRegex: "(\\d+\\.\\d+\\.\\d+)" },
      exec: { template: "{binary} {task}", shell: false },
      auth: { envVar: null }, install: { command: "" },
      quota: { exitCodes: [], errorPatterns: [] }
    }

    const adapter = {
      meta: provider,
      execute: vi.fn().mockImplementation(async function* (_task: string, signal?: AbortSignal) {
        yield makeEvent("text_delta", "starting...", { timestamp: 1 })
        await new Promise<void>((resolve) => {
          if (signal?.aborted) return resolve()
          signal?.addEventListener("abort", () => resolve(), { once: true })
        })
        throw new Error("Aborted by signal")
      }),
      install: vi.fn()
    } as unknown as GenericAdapter

    const engine = new ExecutionEngine()
    const executePromise = engine.execute(adapter, "test", { timeout: 100 })

    vi.advanceTimersByTime(101)

    const result = await executePromise
    expect(result.success).toBe(false)
    expect(result.output).toBe("Aborted by signal")
  })

  it("uses default 5 min timeout", async () => {
    const adapter = createMockAdapter([
      { id: "evt-1", type: "done", content: "ok", provider: "test-cli", sequence: 1, timestamp: 1000 }
    ])

    const engine = new ExecutionEngine()
    // Should resolve without aborting
    const result = await engine.execute(adapter, "test")

    expect(result.success).toBe(true)
    expect(result.output).toBe("")
  })
})