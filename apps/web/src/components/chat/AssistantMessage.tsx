import type { AgentEvent } from "@/types"
import { AssistantTurn } from "./AssistantTurn"

interface AssistantMessageProps {
  events: AgentEvent[]
  isStreaming?: boolean
}

export function AssistantMessage({ events, isStreaming }: AssistantMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-full">
        <AssistantTurn events={events} isStreaming={isStreaming} />
      </div>
    </div>
  )
}
