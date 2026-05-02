import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import { appendFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import type { RegistryProvider, AgentEvent } from "@agentmaxxer/types"
import { getParser, nextSequence, resetSequence, generateEventId } from "./parsers/index.js"
import type { ParserContext } from "./parsers/index.js"

export interface ProviderAdapter {
  readonly meta: RegistryProvider
  execute(
    task: string,
    signal?: AbortSignal,
    sessionId?: string
  ): AsyncGenerator<AgentEvent>
  install(): Promise<void>
}

function ensureLogDir(): string {
  const dir = join(homedir(), ".agentmaxxer", "logs")
  mkdirSync(dir, { recursive: true })
  return dir
}

export class GenericAdapter implements ProviderAdapter {
  constructor(
    public readonly meta: RegistryProvider,
    private modelId?: string
  ) {}

  async *execute(
    task: string,
    signal?: AbortSignal,
    sessionId?: string
  ): AsyncGenerator<AgentEvent> {
    resetSequence()
    const binary = this.meta.detection.binary
    const template = this.meta.exec.template
    const parser = getParser(this.meta.id)

    let child: ReturnType<typeof spawn>
    if (this.meta.exec.shell) {
      const cmdStr = template.replace("{binary}", binary).replace("{task}", task)
      child = spawn(cmdStr, { stdio: ["inherit", "pipe", "pipe"], shell: true, signal })
    } else {
      const [before, after] = template.split("{task}")
      const beforeStr = before.replace("{binary}", binary).trim()
      const afterStr = (after ?? "").trim()
      const cmd = this.meta.detection.binary
      const flags = beforeStr.slice(cmd.length).trim().split(/\s+/).filter(Boolean)
      const suffix = afterStr ? afterStr.split(/\s+/).filter(Boolean) : []
      const args = [...flags, task, ...suffix]
      child = spawn(cmd, args, { stdio: ["inherit", "pipe", "pipe"], shell: false, signal })
    }

    const parserContext: ParserContext = {
      provider: this.meta.id,
      model: this.modelId,
      sessionId,
      sequence: nextSequence(),
    }

    let totalTokens = 0
    const startTime = Date.now()
    const logFile = join(ensureLogDir(), `${this.meta.id}-${Date.now()}.log`)

    const stdoutReader = createInterface({ input: child.stdout!, crlfDelay: Infinity })

    for await (const raw of stdoutReader) {
      const text = raw.trim()
      if (!text) continue
      const events = parser.parse(text, parserContext)
      for (const event of events) {
        if (event.type === "text_delta") {
          totalTokens += Math.ceil(event.content.length / 4)
        }
        yield event
      }
    }

    const stderrChunks: Buffer[] = []
    for await (const chunk of child.stderr!) {
      stderrChunks.push(chunk)
    }
    if (stderrChunks.length > 0) {
      try {
        appendFileSync(logFile, Buffer.concat(stderrChunks))
      } catch { /* ignore write errors */ }
    }

    const exitCode = await new Promise<number>((r) => child.on("close", r))

    if (exitCode !== 0) {
      yield {
        id: generateEventId(),
        type: "error",
        content: `Process exited with code ${exitCode}`,
        provider: this.meta.id,
        model: this.modelId,
        sequence: nextSequence(),
        timestamp: Date.now(),
        metadata: { durationMs: Date.now() - startTime },
      } as AgentEvent
    }

    yield {
      id: generateEventId(),
      type: "done",
      content: "",
      provider: this.meta.id,
      model: this.modelId,
      sequence: nextSequence(),
      timestamp: Date.now(),
      metadata: { tokens: totalTokens, durationMs: Date.now() - startTime },
    } as AgentEvent
  }

  async install(): Promise<void> {
    const { execSync } = await import("node:child_process")
    execSync(this.meta.install.command, { stdio: "inherit" })
  }
}
