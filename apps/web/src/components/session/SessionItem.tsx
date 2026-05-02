import { Trash2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Session } from "@/types"

interface SessionItemProps {
  session: Session
  active: boolean
  onSelect: () => void
  onDelete: () => void
}

export function SessionItem({ session, active, onSelect, onDelete }: SessionItemProps) {
  const title = session.title ?? new Date(session.createdAt).toLocaleDateString()
  const time = new Date(session.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors",
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
      )}
      onClick={onSelect}
    >
      <MessageSquare className="size-3.5 shrink-0" />
      <div className="flex-1 truncate min-w-0">
        <div className="truncate">{title}</div>
        <div className="text-[10px] text-zinc-600">{time}</div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover:opacity-100 shrink-0"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  )
}
