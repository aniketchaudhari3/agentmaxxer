import { Plus, Trash2, Settings, PanelLeft, FolderKanban, PanelLeftClose } from "lucide-react"
import type { Session, Project } from "@/types"

interface SidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  projects: Project[]
  activeProjectId: string | null
  onOpenProject: () => void
  onOpenSettings: () => void
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

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  collapsed,
  onToggleCollapse,
  projects,
  activeProjectId,
  onOpenProject,
  onOpenSettings,
}: SidebarProps) {
  const activeProject = projects.find((p) => p.id === activeProjectId)

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-zinc-800 bg-zinc-950 py-3">
        <button onClick={onToggleCollapse} className="text-xs font-mono text-zinc-500 hover:text-zinc-300">
          amx
        </button>
        <button onClick={onNewSession} className="mt-4 text-zinc-500 hover:text-zinc-300">
          <Plus className="size-4" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-2">
          <button onClick={onOpenSettings} className="text-zinc-500 hover:text-zinc-300">
            <Settings className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-sm font-mono text-zinc-400">amx</span>
        <button onClick={onToggleCollapse} className="text-zinc-500 hover:text-zinc-300">
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="px-2">
        <button
          onClick={onNewSession}
          className="flex w-full items-center justify-between rounded-none border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          <span>New Session</span>
          <Plus className="size-4 text-zinc-500" />
        </button>
      </div>

      <div className="px-2 mt-1">
        {activeProject ? (
          <div className="group relative">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 bg-zinc-900/50">
              <FolderKanban className="size-3.5 shrink-0" />
              <span className="truncate">{activeProject.name}</span>
            </div>
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 whitespace-nowrap">
              {activeProject.path}
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenProject}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            <FolderKanban className="size-3.5" />
            <span>Open project</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mt-2 px-2">
        {sessions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-600">No sessions</div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSession(s.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 text-xs cursor-pointer transition-colors ${
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
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity shrink-0"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-2 py-2">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          <Settings className="size-3.5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}
