import { FolderKanban, Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Project } from "@/types"

interface LeftRailProps {
  projects: Project[]
  activeProjectId: string | null
  onSelectProject: (id: string) => void
  onAddProject: () => void
  onOpenSettings: () => void
}

export function LeftRail({ projects, activeProjectId, onSelectProject, onAddProject, onOpenSettings }: LeftRailProps) {
  return (
    <div className="flex w-10 flex-col items-center gap-2 border-r border-zinc-800 bg-zinc-950 py-3">
      {projects.map((p) => (
        <Button
          key={p.id}
          variant={activeProjectId === p.id ? "default" : "ghost"}
          size="icon-xs"
          onClick={() => onSelectProject(p.id)}
        >
          <FolderKanban className="size-3.5" />
        </Button>
      ))}
      <Button variant="ghost" size="icon-xs" onClick={onAddProject}>
        <Plus className="size-3.5" />
      </Button>
      <div className="mt-auto">
        <Button variant="ghost" size="icon-xs" onClick={onOpenSettings}>
          <Settings className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
