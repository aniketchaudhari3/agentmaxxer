import { describe, it, expect, vi, beforeEach } from "vitest"
import * as childProcess from "node:child_process"
import { DetectionEngine } from "./detection.js"
import type { RegistryClient } from "@agentmaxxer/registry"
import type { RegistryProvider } from "@agentmaxxer/types"

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof childProcess>()
  return {
    ...actual,
    exec: vi.fn(),
    execSync: vi.fn(),
  }
})

type ExecMock = ReturnType<typeof vi.fn>
type ExecCallback = (err: Error | null, res: { stdout: string }) => void

function mockExecCommands(
  mock: ExecMock,
  outputs: Record<string, string>
) {
  mock.mockImplementation(
    (cmd: string, _opts: unknown, cb: ExecCallback) => {
      const stdout = outputs[cmd]
      if (stdout === undefined) {
        cb(new Error(`command not found: ${cmd}`), { stdout: "" })
      } else {
        cb(null, { stdout })
      }
    }
  )
}

function mockExecFailure(mock: ExecMock) {
  mock.mockImplementation(
    (_cmd: string, _opts: unknown, cb: ExecCallback) => {
      cb(new Error("command not found"), { stdout: "" })
    }
  )
}

function createMockRegistry(providers: RegistryProvider[]): RegistryClient {
  return {
    fetchProviders: vi.fn().mockResolvedValue(providers),
    fetchProvider: vi.fn(),
    refresh: vi.fn()
  } as unknown as RegistryClient
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

describe("DetectionEngine", () => {
  it("detects an installed provider with version", async () => {
    mockExecCommands(vi.mocked(childProcess.exec) as unknown as ExecMock, {
      "which test-cli": "/usr/bin/test-cli\n",
      "test-cli --version": "1.2.3\n"
    })

    const registry = createMockRegistry([mockProvider])
    const engine = new DetectionEngine(registry)

    const results = await engine.detectAll()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe("test-cli")
    expect(results[0].installed).toBe(true)
    expect(results[0].path).toBe("/usr/bin/test-cli")
    expect(results[0].version).toBe("1.2.3")
  })

  it("reports auth status from env var", async () => {
    const providerWithAuth: RegistryProvider = {
      ...mockProvider,
      auth: { envVar: "TEST_API_KEY" }
    }

    mockExecCommands(vi.mocked(childProcess.exec) as unknown as ExecMock, {
      "which test-cli": "/usr/bin/test-cli\n",
      "test-cli --version": "1.2.3\n"
    })

    const registry = createMockRegistry([providerWithAuth])
    const engine = new DetectionEngine(registry)

    vi.stubEnv("TEST_API_KEY", "sk-123")

    const results = await engine.detectAll()
    expect(results[0].installed).toBe(true)
    expect(results[0].auth).toBe(true)
  })

  it("reports missing auth when env var not set", async () => {
    const providerWithAuth: RegistryProvider = {
      ...mockProvider,
      auth: { envVar: "TEST_API_KEY" }
    }

    mockExecCommands(vi.mocked(childProcess.exec) as unknown as ExecMock, {
      "which test-cli": "/usr/bin/test-cli\n",
      "test-cli --version": "1.2.3\n"
    })

    const registry = createMockRegistry([providerWithAuth])
    const engine = new DetectionEngine(registry)

    vi.unstubAllEnvs()

    const results = await engine.detectAll()
    expect(results[0].installed).toBe(true)
    expect(results[0].auth).toBe(false)
  })

  it("handles non-installed providers", async () => {
    const execMock = vi.mocked(childProcess.exec)
    mockExecFailure(execMock as unknown as ExecMock)

    const registry = createMockRegistry([mockProvider])
    const engine = new DetectionEngine(registry)

    const result = await engine.detectOne(mockProvider)
    expect(result.installed).toBe(false)
    expect(result.path).toBeUndefined()
  })

  it("fetches providers from registry", async () => {
    mockExecFailure(vi.mocked(childProcess.exec) as unknown as ExecMock)

    const registry = createMockRegistry([mockProvider])
    const engine = new DetectionEngine(registry)

    await engine.detectAll()
    expect(registry.fetchProviders).toHaveBeenCalledOnce()
  })
})