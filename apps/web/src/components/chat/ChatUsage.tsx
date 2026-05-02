import { useMemo } from "react"
import { useAppStore } from "@/stores/app-store"

export function ChatUsage() {
  const events = useAppStore((s) => s.events)

  const tokens = useMemo(() => {
    return events
      .filter(e => e.type === "done" && e.metadata?.tokens)
      .reduce((sum, e) => sum + (e.metadata?.tokens ?? 0), 0)
  }, [events])

  const cost = (tokens * 0.000003).toFixed(4)

  return (
    <div className="border border-zinc-800 bg-zinc-950 shadow-lg w-56">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs text-zinc-500">Session usage</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Tokens</span>
          <span className="text-zinc-200">{tokens.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Est. cost</span>
          <span className="text-zinc-200">${cost}</span>
        </div>
      </div>
    </div>
  )
}
