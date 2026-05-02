import type { AgentEvent } from "@/types"
import { ToolCallCard } from "./ToolCallCard"

interface ToolCallsSectionProps {
  events: AgentEvent[]
  isStreaming?: boolean
}

export function ToolCallsSection({ events, isStreaming }: ToolCallsSectionProps) {
  const toolUseEvents = events.filter(e => e.type === "tool_use")
  const toolResultEvents = events.filter(e => e.type === "tool_result")

  const pairs = toolUseEvents.map(use => ({
    toolUse: use.toolUse!,
    toolResult: toolResultEvents.find(r => r.toolResult?.callId === use.toolUse?.callId)?.toolResult,
  }))

  if (pairs.length === 0) return null

  return (
    <div className="my-2">
      {pairs.map((pair, i) => (
        <ToolCallCard
          key={pair.toolUse.callId}
          toolUse={pair.toolUse}
          toolResult={pair.toolResult}
          isStreaming={isStreaming}
        />
      ))}
    </div>
  )
}
