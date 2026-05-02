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

export class FallbackParser implements AgentOutputParser {
  parse(chunk: string, context: ParserContext): AgentEvent[] {
    const trimmed = chunk.trim()
    if (!trimmed) return []

    return [
      {
        id: generateEventId(),
        type: "text_delta",
        content: trimmed,
        provider: context.provider,
        model: context.model,
        sequence: nextSequence(),
        timestamp: Date.now(),
      },
    ]
  }
}
