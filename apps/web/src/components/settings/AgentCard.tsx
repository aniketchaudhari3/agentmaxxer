import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { ProviderStatus } from "@/types"
import { useAppStore } from "@/stores/app-store"
import { AgentLogo } from "@/components/AgentLogo"

interface AgentCardProps {
  provider: ProviderStatus
  onInstall: (id: string) => void
}

export function AgentCard({ provider, onInstall }: AgentCardProps) {
  const enabledProviders = useAppStore((s) => s.enabledProviders)
  const toggleProvider = useAppStore((s) => s.toggleProvider)
  const isEnabled = enabledProviders.length === 0 || enabledProviders.includes(provider.id)

  return (
    <div className="flex items-center gap-3 border border-zinc-800 p-3">
      <AgentLogo providerId={provider.id} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{provider.name}</span>
          <Badge variant={provider.type === "paid" ? "default" : "outline"}>
            {provider.type}
          </Badge>
          {provider.healthy === false && (
            <Badge variant="error">Unhealthy</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {provider.version && <span>v{provider.version}</span>}
          <span>·</span>
          <span>{provider.type}</span>
          <span>·</span>
          <span>{provider.healthy !== false ? "healthy" : "unhealthy"}</span>
        </div>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={() => toggleProvider(provider.id)}
      />
    </div>
  )
}
