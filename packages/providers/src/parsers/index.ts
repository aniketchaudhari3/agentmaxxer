import type { AgentEvent } from "@agentmaxxer/types"

export interface ParserContext {
  provider: string
  model?: string
  sessionId?: string
  sequence: number
}

export interface AgentOutputParser {
  parse(chunk: string, context: ParserContext): AgentEvent[]
}

import { ClaudeCodeParser } from "./claude-code.js"
import { FallbackParser } from "./fallback.js"

export function getParser(providerId: string): AgentOutputParser {
  switch (providerId) {
    case "claude-code":
      return new ClaudeCodeParser()
    default:
      return new FallbackParser()
  }
}

let seqCounter = 0

export function nextSequence(): number {
  return ++seqCounter
}

export function resetSequence(): void {
  seqCounter = 0
}

export function generateEventId(): string {
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  const timestamp = Date.now().toString(36)
  const random = Array.from(buf)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
  return `${timestamp}-${random}`
}
