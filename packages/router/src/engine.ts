import { GenericAdapter } from "@agentmaxxer/providers"
import type { AgentEvent } from "@agentmaxxer/types"

export interface ExecutionResult {
  success: boolean
  output: string
  events: AgentEvent[]
  duration: number
}

export interface ExecutionOptions {
  timeout?: number
  onEvent?: (event: AgentEvent) => void
}

export class ExecutionEngine {
  async execute(
    adapter: GenericAdapter,
    task: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const ac = new AbortController()
    const timeout = options.timeout ?? 300_000
    const timer = setTimeout(() => ac.abort(), timeout)

    const events: AgentEvent[] = []

    try {
      for await (const event of adapter.execute(task, ac.signal)) {
        events.push(event)
        options.onEvent?.(event)

        if (event.type === "error") {
          clearTimeout(timer)
          return {
            success: false,
            output: event.content,
            events,
            duration: events.length > 0
              ? events[events.length - 1].timestamp - events[0].timestamp
              : 0,
          }
        }

        if (event.type === "done") {
          clearTimeout(timer)
          const textEvents = events.filter(e => e.type === "text_delta")
          return {
            success: true,
            output: textEvents.map(e => e.content).join(""),
            events,
            duration: event.metadata?.durationMs ?? (events.length > 0
              ? events[events.length - 1].timestamp - events[0].timestamp
              : 0),
          }
        }
      }
    } catch (err) {
      clearTimeout(timer)
      return {
        success: false,
        output: (err as Error).message,
        events,
        duration: 0,
      }
    }

    clearTimeout(timer)
    return {
      success: false,
      output: "No completion event",
      events,
      duration: 0,
    }
  }
}
