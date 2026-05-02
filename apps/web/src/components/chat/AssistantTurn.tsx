import type { AgentEvent } from "@/types"
import { ThinkingSection } from "./ThinkingSection"
import { ToolCallsSection } from "./ToolCallsSection"
import { ResponseSection } from "./ResponseSection"

interface AssistantTurnProps {
  events: AgentEvent[]
  isStreaming?: boolean
}

export function AssistantTurn({ events, isStreaming }: AssistantTurnProps) {
  const reasoningEvents = events.filter(e => e.type === "reasoning")
  const toolEvents = events.filter(e => e.type === "tool_use" || e.type === "tool_result")
  const textEvents = events.filter(e => e.type === "text_delta")

  const reasoningContent = reasoningEvents.map(e => e.content).join("")
  const responseContent = textEvents.map(e => e.content).join("")

  return (
    <div className="w-full max-w-full">
      {reasoningContent && (
        <ThinkingSection content={reasoningContent} isStreaming={isStreaming} />
      )}
      {toolEvents.length > 0 && (
        <ToolCallsSection events={toolEvents} isStreaming={isStreaming} />
      )}
      {responseContent && (
        <ResponseSection content={responseContent} isStreaming={isStreaming} />
      )}
    </div>
  )
}
