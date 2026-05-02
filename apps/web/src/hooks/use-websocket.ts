import { useEffect, useRef, useCallback } from "react"
import { useAppStore } from "@/stores/app-store"

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const appendEvent = useAppStore((s) => s.appendEvent)
  const isStreaming = useAppStore((s) => s.isStreaming)
  const apiOnline = useAppStore((s) => s.apiOnline)

  useEffect(() => {
    if (!apiOnline) return
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    const ws = new WebSocket(`${proto}//${host}/api/ws?threadId=${activeSessionId ?? ""}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (activeSessionId) {
        ws.send(JSON.stringify({ type: "subscribe", threadId: activeSessionId }))
      }
    }

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data)
        if (frame.channel === "session.event") {
          if (isStreaming) return
          if (Array.isArray(frame.data)) {
            for (const item of frame.data) {
              appendEvent(item)
            }
          } else {
            appendEvent(frame.data)
          }
        }
        if (frame.channel === "session.refresh") {
          useAppStore.getState().loadSessions()
        }
        if (frame.channel === "provider.status") {
          useAppStore.getState().loadProviders()
        }
      } catch {
        // ignore bad frames
      }
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [activeSessionId, appendEvent, isStreaming, apiOnline])

  const reconnect = useCallback((threadId: string) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "subscribe", threadId }))
    }
  }, [])

  return { reconnect }
}
