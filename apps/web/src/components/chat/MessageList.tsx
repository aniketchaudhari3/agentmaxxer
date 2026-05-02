import { useEffect, useRef, useMemo } from "react"
import { MessageItem } from "./MessageItem"
import type { AgentEvent } from "@/types"

interface MessageListProps {
  events: AgentEvent[]
  userMessages: string[]
  isStreaming: boolean
}

export function MessageList({ events, userMessages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const turns = useMemo(() => {
    const result: Array<{
      type: "user" | "assistant" | "error"
      content?: string
      events?: AgentEvent[]
    }> = []

    let eventBuf: AgentEvent[] = []
    let msgIdx = 0

    const flushAssistant = () => {
      if (eventBuf.length > 0) {
        result.push({ type: "assistant", events: [...eventBuf] })
        eventBuf = []
      }
    }

    for (const event of events) {
      if (event.type === "done") {
        flushAssistant()
        continue
      }
      if (event.type === "error") {
        flushAssistant()
        result.push({ type: "error", content: event.content })
        continue
      }
      eventBuf.push(event)
    }

    if (eventBuf.length > 0) {
      result.push({ type: "assistant", events: [...eventBuf] })
    }

    const allTurns: Array<{
      type: "user" | "assistant" | "error"
      content?: string
      events?: AgentEvent[]
    }> = []

    let turnIdx = 0
    for (const msg of userMessages) {
      allTurns.push({ type: "user", content: msg })
      if (turnIdx < result.length) {
        allTurns.push(result[turnIdx])
      }
      turnIdx++
    }

    if (turnIdx === 0 && result.length > 0) {
      allTurns.push(...result)
    } else if (turnIdx < result.length) {
      allTurns.push(...result.slice(turnIdx))
    }

    if (allTurns.length === 0 && userMessages.length === 0 && events.length === 0) {
      return null
    }

    return allTurns
  }, [events, userMessages])

  useEffect(() => {
    if (turns) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      })
    }
  }, [turns])

  if (!turns) {
    return null
  }

  return (
    <div className="space-y-4">
      {turns.map((turn, i) => (
        <MessageItem key={i} turn={turn} isStreaming={isStreaming && i === turns.length - 1} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-1 text-zinc-500 text-sm px-1">
          <span className="inline-block size-1.5 bg-zinc-500 animate-pulse" />
          <span className="inline-block size-1.5 bg-zinc-500 animate-pulse delay-150" />
          <span className="inline-block size-1.5 bg-zinc-500 animate-pulse delay-300" />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
