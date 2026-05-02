import { UserMessage } from "./UserMessage"
import { AssistantMessage } from "./AssistantMessage"
import { ErrorMessage } from "./ErrorMessage"
import type { AgentEvent } from "@/types"

interface Turn {
  type: "user" | "assistant" | "error"
  content?: string
  events?: AgentEvent[]
}

interface MessageItemProps {
  turn: Turn
  isStreaming?: boolean
}

export function MessageItem({ turn, isStreaming }: MessageItemProps) {
  switch (turn.type) {
    case "user":
      return <UserMessage content={turn.content ?? ""} />
    case "assistant":
      return <AssistantMessage events={turn.events ?? []} isStreaming={isStreaming} />
    case "error":
      return <ErrorMessage content={turn.content ?? ""} />
    default:
      return null
  }
}
