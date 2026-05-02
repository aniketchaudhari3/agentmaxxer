import type { AgentEvent } from "@agentmaxxer/types"

export interface ExecutionRecord {
  provider: string
  output: string
  events: AgentEvent[]
  timestamp: number
}

export interface HandoffContext {
  originalTask: string
  executionHistory: ExecutionRecord[]
  currentWorkingDirectory?: string
  fileChanges: string[]
}

export class TaskHandoff {
  private context: HandoffContext

  constructor(originalTask: string, cwd?: string) {
    this.context = {
      originalTask,
      executionHistory: [],
      currentWorkingDirectory: cwd ?? process.cwd(),
      fileChanges: [],
    }
  }

  recordExecution(provider: string, result: { output: string; events: AgentEvent[] }): void {
    this.context.executionHistory.push({
      provider,
      output: result.output,
      events: result.events,
      timestamp: Date.now(),
    })

    const changes = this.extractFileChanges(result.output)
    this.context.fileChanges?.push(...changes)
  }

  generateContinuationPrompt(): string {
    const last = this.context.executionHistory[this.context.executionHistory.length - 1]
    const fileChanges = this.context.fileChanges ?? []

    return [
      `# AgentMaxxer Task Continuation`,
      ``,
      `## Original Task`,
      this.context.originalTask,
      ``,
      `## Previous Provider: ${last?.provider ?? "none"}`,
      ``,
      `## Previous Output (last 2000 chars)`,
      last?.output.slice(-2000) ?? "(no output)",
      ``,
      ...(fileChanges.length > 0
        ? [`## File Changes Detected`, ...fileChanges, ``]
        : []),
      `## Continue the above task. Do not restart from scratch. Build on the work already done.`,
    ].join("\n")
  }

  private extractFileChanges(output: string): string[] {
    const lines = output.split("\n")
    const changeRegex = /(created|modified|updated|written|deleted):?\s+(.+\.\w+)/i
    return lines
      .filter(l => changeRegex.test(l))
      .map(l => l.trim())
  }

  getContext(): HandoffContext {
    return { ...this.context }
  }
}
