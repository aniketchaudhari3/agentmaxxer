import { useAppStore } from "@/stores/app-store"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export function ModelSelector() {
  const activeProviderId = useAppStore((s) => s.activeProviderId)
  const providers = useAppStore((s) => s.providers)
  const selectedModel = useAppStore((s) => s.selectedModel)
  const setSelectedModel = useAppStore((s) => s.setSelectedModel)
  const isExecuting = useAppStore((s) => s.isExecuting)

  const activeProvider = providers.find(p => p.id === activeProviderId)

  if (!activeProviderId || !activeProvider) return null

  return (
    <Select
      value={selectedModel ?? ""}
      onValueChange={(v: string) => setSelectedModel(v || null)}
      disabled={isExecuting}
    >
      <SelectTrigger className="h-7 w-[130px] text-xs">
        <SelectValue placeholder="Model" />
      </SelectTrigger>
      <SelectContent>
        {activeProvider.models?.map((m: any) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
