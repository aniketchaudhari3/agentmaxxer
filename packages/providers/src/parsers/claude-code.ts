import type { AgentEvent } from "@agentmaxxer/types"
import { generateEventId, nextSequence } from "./index.js"

interface ParserContext {
  provider: string
  model?: string
  sessionId?: string
  sequence: number
}

export interface AgentOutputParser {
  parse(chunk: string, context: ParserContext): AgentEvent[]
}

export class ClaudeCodeParser implements AgentOutputParser {
  parse(chunk: string, context: ParserContext): AgentEvent[] {
    const events: AgentEvent[] = []

    const lines = chunk.split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        events.push(this.textDelta(trimmed, context))
        continue
      }

      if (parsed.type === "tool_use" && typeof parsed.name === "string") {
        events.push({
          id: generateEventId(),
          type: "tool_use",
          content: "",
          toolUse: {
            name: parsed.name,
            input: parsed.input,
            callId: (parsed.callId as string) ?? generateEventId(),
          },
          provider: context.provider,
          model: context.model,
          sequence: nextSequence(),
          timestamp: Date.now(),
        })
      } else if (parsed.type === "tool_result" && typeof parsed.callId === "string") {
        events.push({
          id: generateEventId(),
          type: "tool_result",
          content: "",
          toolResult: {
            callId: parsed.callId as string,
            output: typeof parsed.output === "string" ? parsed.output : JSON.stringify(parsed.output),
            isError: !!parsed.isError,
          },
          provider: context.provider,
          model: context.model,
          sequence: nextSequence(),
          timestamp: Date.now(),
        })
      } else if (parsed.type === "text" && typeof parsed.text === "string") {
        events.push(this.textDelta(parsed.text, context))
      } else if (parsed.type === "reasoning" && typeof parsed.content === "string") {
        events.push({
          id: generateEventId(),
          type: "reasoning",
          content: parsed.content,
          provider: context.provider,
          model: context.model,
          sequence: nextSequence(),
          timestamp: Date.now(),
        })
      } else {
        events.push(this.textDelta(trimmed, context))
      }
    }

    return events
  }

  private textDelta(content: string, context: ParserContext): AgentEvent {
    return {
      id: generateEventId(),
      type: "text_delta",
      content,
      provider: context.provider,
      model: context.model,
      sequence: nextSequence(),
      timestamp: Date.now(),
    }
  }
}
