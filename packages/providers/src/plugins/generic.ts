import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import type { AgentOutput } from "@agentmaxxer/schemas"
import type { RegistryProvider } from "@agentmaxxer/types"
import type { ProviderPlugin, SessionHandle, OpenSessionInput, SubmitInput } from "../plugin.js"

export class GenericPlugin implements ProviderPlugin {
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
    const binary = this.meta.detection.binary
    const template = this.meta.exec.template

    let child: ReturnType<typeof spawn>
    if (this.meta.exec.shell) {
      const cmdStr = template.replace("{binary}", binary).replace("{task}", input.task)
      child = spawn(cmdStr, { stdio: ["inherit", "pipe", "pipe"], shell: true, signal: input.signal })
    } else {
      const [before, after] = template.split("{task}")
      const beforeStr = before.replace("{binary}", binary).trim()
      const afterStr = (after ?? "").trim()
      const cmd = this.meta.detection.binary
      const flags = beforeStr.slice(cmd.length).trim().split(/\s+/).filter(Boolean)
      const suffix = afterStr ? afterStr.split(/\s+/).filter(Boolean) : []
      const args = [...flags, input.task, ...suffix]
      child = spawn(cmd, args, { stdio: ["inherit", "pipe", "pipe"], shell: false, signal: input.signal })
    }

    this.processes.set(input.threadId, child)
    const seq = [0]

    const stdoutReader = createInterface({ input: child.stdout!, crlfDelay: Infinity })
    for await (const raw of stdoutReader) {
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

    const exitCode = await new Promise<number>((r) => child.on("close", r))
    this.processes.delete(input.threadId)

    seq[0]++
    yield {
      id: `${input.threadId}-${seq[0]}`,
      provider: this.meta.id,
      threadId: input.threadId,
      ts: new Date().toISOString(),
      seq: seq[0],
      type: exitCode === 0 ? "turn.finished" : "output.error",
      status: exitCode === 0 ? "ok" : "failed",
      message: exitCode !== 0 ? `Process exited with code ${exitCode}` : undefined,
      code: exitCode !== 0 ? "EXIT_ERROR" : undefined,
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
