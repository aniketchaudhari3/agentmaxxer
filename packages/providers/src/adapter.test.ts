import { describe, it, expect, vi, beforeEach } from "vitest"
import { spawn, execSync } from "node:child_process"
import { Readable } from "node:stream"
import { EventEmitter } from "node:events"
import { GenericAdapter } from "./adapter.js"
import type { RegistryProvider } from "@agentmaxxer/types"

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual("node:child_process")
  return { ...actual as any, spawn: vi.fn(), execSync: vi.fn() }
})

function mockProcess(opts: {
  stdout?: string[]
  stderr?: string[]
  exitCode?: number
}) {
  let stdoutIdx = 0
  const stdout = new Readable({
    read() {
      const chunks = opts.stdout ?? ["output"]
      if (stdoutIdx < chunks.length) {
        this.push(chunks[stdoutIdx++])
      } else {
        this.push(null)
      }
    }
  })

  let stderrIdx = 0
  const stderr = new Readable({
    read() {
      const chunks = opts.stderr ?? []
      if (stderrIdx < chunks.length) {
        this.push(chunks[stderrIdx++])
      } else {
        this.push(null)
      }
    }
  })

  const emitter = new EventEmitter()
  const proc = Object.assign(emitter, { stdout, stderr, pid: 12345 })

  setImmediate(() => emitter.emit("close", opts.exitCode ?? 0))

  return proc
}

const mockProvider: RegistryProvider = {
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

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("GenericAdapter", () => {
  it("yields text_delta events and done on success", async () => {
    const proc = mockProcess({ stdout: ["hello\n", "world\n"] })
    vi.mocked(spawn).mockReturnValue(proc as any)

    const adapter = new GenericAdapter(mockProvider)
    const events: any[] = []
    for await (const event of adapter.execute("test task")) {
      events.push(event)
    }

    expect(spawn).toHaveBeenCalledWith(
      "test-cli",
      ["test task"],
      expect.objectContaining({ shell: false })
    )

    const textEvents = events.filter(e => e.type === "text_delta")
    expect(textEvents).toHaveLength(2)
    expect(textEvents[0].content).toBe("hello")
    expect(textEvents[1].content).toBe("world")

    const doneEvent = events.find(e => e.type === "done")
    expect(doneEvent).toBeDefined()
  })

  it("does not yield stderr as events but still completes", async () => {
    const proc = mockProcess({ stderr: ["warning: something"] })
    vi.mocked(spawn).mockReturnValue(proc as any)

    const adapter = new GenericAdapter(mockProvider)
    const events: any[] = []
    for await (const event of adapter.execute("test")) {
      events.push(event)
    }

    expect(events.some(e => e.type === "stderr")).toBe(false)
    expect(events.some(e => e.type === "done")).toBe(true)
  })

  it("yields error event on non-zero exit", async () => {
    const proc = mockProcess({ stdout: ["partial output"], exitCode: 1 })
    vi.mocked(spawn).mockReturnValue(proc as any)

    const adapter = new GenericAdapter(mockProvider)
    const events: any[] = []
    for await (const event of adapter.execute("test")) {
      events.push(event)
    }

    const errorEvent = events.find(e => e.type === "error")
    expect(errorEvent).toBeDefined()
    expect(errorEvent!.content).toContain("Process exited with code 1")
  })

  it("uses shell when provider exec.shell is true", async () => {
    const provider: RegistryProvider = {
      ...mockProvider,
      exec: { template: "{binary} -p {task}", shell: true }
    }
    const proc = mockProcess({})
    vi.mocked(spawn).mockReturnValue(proc as any)

    const adapter = new GenericAdapter(provider)
    const events: any[] = []
    for await (const event of adapter.execute("my task")) {
      events.push(event)
    }

    expect(spawn).toHaveBeenCalledWith(
      "test-cli -p my task",
      expect.objectContaining({ shell: true })
    )
  })

  it("runs install command via execSync", async () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(""))

    const adapter = new GenericAdapter(mockProvider)
    await adapter.install()

    expect(execSync).toHaveBeenCalledWith(
      "npm install -g test-cli",
      { stdio: "inherit" }
    )
  })
})