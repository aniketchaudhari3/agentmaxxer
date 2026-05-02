import { useAppStore } from "@/stores/app-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Mode } from "@/stores/app-store"

export function ModeSelector() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const isExecuting = useAppStore((s) => s.isExecuting)

  return (
    <Select value={mode} onValueChange={(v: string) => setMode(v as Mode)} disabled={isExecuting}>
      <SelectTrigger className="w-20 h-7 text-xs" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="auto">Auto</SelectItem>
        <SelectItem value="free">Free</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
      </SelectContent>
    </Select>
  )
}
