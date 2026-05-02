import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentOutput } from "@agentmaxxer/schemas"
import type { RegistryProvider } from "@agentmaxxer/types"
import type { ProviderPlugin, SessionHandle, OpenSessionInput, SubmitInput } from "../plugin.js"

interface JsonRpcMessage {
  jsonrpc: "2.0"
  method?: string
  params?: unknown
  result?: unknown
  error?: { code: number; message: string }
  id?: number | string | null
}

export class CodexPlugin implements ProviderPlugin {
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
    const child = spawn("codex", ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      signal: input.signal,
    })

    this.processes.set(input.threadId, child)
    const seq = [0]

    const reader = createInterface({ input: child.stdout!, crlfDelay: Infinity })
    for await (const raw of reader) {
      const trimmed = raw.trim()
      if (!trimmed) continue
      seq[0]++

      let msg: JsonRpcMessage
      try {
        msg = JSON.parse(trimmed) as JsonRpcMessage
      } catch {
        // not valid JSON-RPC → treat as text
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "text.chunk",
          kind: "reply",
          text: trimmed,
        } as AgentOutput
        continue
      }

      if (msg.method && msg.params) {
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "tool.invoke",
          name: msg.method,
          args: msg.params,
        } as AgentOutput
        continue
      }

      if (msg.result) {
        const resultStr = typeof msg.result === "string" ? msg.result : JSON.stringify(msg.result)
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "text.chunk",
          kind: "reply",
          text: resultStr,
        } as AgentOutput
        continue
      }

      if (msg.error) {
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "output.error",
          code: `JSONRPC_${msg.error.code}`,
          message: msg.error.message,
        } as AgentOutput
        continue
      }

      yield {
        id: `${input.threadId}-${seq[0]}`,
        provider: this.meta.id,
        threadId: input.threadId,
        ts: new Date().toISOString(),
        seq: seq[0],
        type: "text.chunk",
        kind: "reply",
        text: trimmed,
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
