import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentOutput } from "@agentmaxxer/schemas"
import type { RegistryProvider } from "@agentmaxxer/types"
import type { ProviderPlugin, SessionHandle, OpenSessionInput, SubmitInput } from "../plugin.js"

export class OpenCodePlugin implements ProviderPlugin {
  readonly meta: RegistryProvider
  private processes = new Map<string, ReturnType<typeof spawn>>()

  constructor(meta: RegistryProvider) {
    this.meta = meta
  }

  async open(input: OpenSessionInput): Promise<SessionHandle> {
    return { pid: null, provider: this.meta.id, threadId: input.threadId }
  }

  attach(handle: SessionHandle): void {}

  async *submit(input: SubmitInput): AsyncGenerator<AgentOutput> {
    const child = spawn("opencode", [input.task], {
      stdio: ["inherit", "pipe", "pipe"],
      signal: input.signal,
    })

    this.processes.set(input.threadId, child)
    const seq = [0]

    const reader = createInterface({ input: child.stdout!, crlfDelay: Infinity })
    for await (const raw of reader) {
      const text = raw.trim()
      if (!text) continue
      seq[0]++
      yield {
        id: `${input.threadId}-${seq[0]}`,
        provider: this.meta.id,
        threadId: input.threadId,
        ts: new Date().toISOString(),
        seq: seq[0],
        type: "text.chunk",
        kind: "reply",
        text,
      } as AgentOutput
    }

    this.processes.delete(input.threadId)
    seq[0]++
    yield {
      id: `${input.threadId}-${seq[0]}`,
      provider: this.meta.id,
      threadId: input.threadId,
      ts: new Date().toISOString(),
      seq: seq[0],
      type: "turn.finished",
      status: "ok",
    } as AgentOutput
  }

  async halt(threadId: string): Promise<void> {
    const proc = this.processes.get(threadId)
    if (proc) {
      proc.kill("SIGTERM")
      this.processes.delete(threadId)
    }
  }

  async close(threadId: string): Promise<void> {
    await this.halt(threadId)
  }
}
