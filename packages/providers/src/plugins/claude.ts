import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentOutput } from "@agentmaxxer/schemas"
import type { RegistryProvider } from "@agentmaxxer/types"
import type { ProviderPlugin, SessionHandle, OpenSessionInput, SubmitInput } from "../plugin.js"

export class ClaudePlugin implements ProviderPlugin {
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
    const child = spawn("claude", ["--print", input.task], {
      stdio: ["inherit", "pipe", "pipe"],
      signal: input.signal,
    })

    this.processes.set(input.threadId, child)
    const seq = [0]

    const reader = createInterface({ input: child.stdout!, crlfDelay: Infinity })
    for await (const raw of reader) {
      const trimmed = raw.trim()
      if (!trimmed) continue
      seq[0]++

      let parsed: Record<string, unknown> | null = null
      try {
        parsed = JSON.parse(trimmed) as Record<string, unknown>
      } catch {
        // not JSON → emit as text
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

      const type = parsed.type as string | undefined
      if (type === "tool_use" && typeof parsed.name === "string") {
        seq[0]++
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "tool.invoke",
          name: parsed.name as string,
          args: parsed.input,
        } as AgentOutput
        continue
      }

      if (type === "tool_result" && typeof parsed.callId === "string") {
        seq[0]++
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "tool.result",
          name: "",
          output: typeof parsed.output === "string" ? parsed.output : JSON.stringify(parsed.output),
          failed: !!parsed.isError,
        } as AgentOutput
        continue
      }

      if (type === "text" && typeof parsed.text === "string") {
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "text.chunk",
          kind: "reply",
          text: parsed.text as string,
        } as AgentOutput
        continue
      }

      if (type === "reasoning" && typeof parsed.content === "string") {
        yield {
          id: `${input.threadId}-${seq[0]}`,
          provider: this.meta.id,
          threadId: input.threadId,
          ts: new Date().toISOString(),
          seq: seq[0],
          type: "text.chunk",
          kind: "think",
          text: parsed.content as string,
        } as AgentOutput
        continue
      }

      // unknown JSON shape → emit as text
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
