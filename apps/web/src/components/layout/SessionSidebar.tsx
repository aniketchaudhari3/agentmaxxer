import { Plus, Trash2, PanelLeftClose, PanelLeft, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Session } from "@/types"

interface SessionSidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  onOpenProjects?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  collapsed,
  onToggleCollapse,
  onOpenProjects,
}: SessionSidebarProps) {
  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r border-zinc-800 bg-zinc-950 py-3">
        <span className="text-[10px] text-zinc-600 font-mono">amx</span>
        <button
          onClick={onToggleCollapse}
          className="mt-auto text-zinc-600 hover:text-zinc-400"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-60 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono">amx</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={onNewSession}>
            <Plus className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onToggleCollapse}>
            <PanelLeftClose className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-600">
            No sessions
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSession(s.id)}
              className={`group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                s.id === activeSessionId
                  ? "bg-zinc-900 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-300"
              }`}
            >
              <span className="flex-1 truncate">{s.title ?? "New session"}</span>
              <span className="text-[10px] text-zinc-600 shrink-0">
                {s.updatedAt ? timeAgo(s.updatedAt) : ""}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id) }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-zinc-800 p-2">
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          <FolderKanban className="size-3.5" />
          <span>Projects</span>
        </button>
      </div>
    </div>
  )
}
