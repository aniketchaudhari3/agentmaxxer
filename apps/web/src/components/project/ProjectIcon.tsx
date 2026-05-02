import { FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectIconProps {
  name: string
  active?: boolean
  onClick: () => void
}

export function ProjectIcon({ name, active, onClick }: ProjectIconProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        active ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      )}
      title={name}
    >
      <FolderKanban className="size-4" />
    </button>
  )
}
