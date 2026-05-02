import { SessionItem } from "./SessionItem"
import type { Session } from "@/types"

interface SessionListProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function SessionList({ sessions, activeSessionId, onSelect, onDelete }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-600">
        No sessions yet
      </div>
    )
  }

  return (
    <div className="space-y-0.5 px-1">
      {sessions.map((s) => (
        <SessionItem
          key={s.id}
          session={s}
          active={s.id === activeSessionId}
          onSelect={() => onSelect(s.id)}
          onDelete={() => onDelete(s.id)}
        />
      ))}
    </div>
  )
}
