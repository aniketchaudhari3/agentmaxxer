import { useAppStore } from "@/stores/app-store"
import { AgentCard } from "./AgentCard"

export function AgentsTab() {
  const providers = useAppStore((s) => s.providers)

  const installed = providers.filter(p => p.installed)
  const available = providers.filter(p => !p.installed)

  async function handleInstall(id: string) {
    try {
      const res = await fetch(`/api/providers/${id}/install`, { method: "POST" })
      if (res.ok) {
        useAppStore.getState().loadProviders()
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Installed Agents</h3>
        {installed.length === 0 ? (
          <p className="text-sm text-zinc-600">No agents installed yet</p>
        ) : (
          <div className="space-y-2">
            {installed.map((p) => (
              <AgentCard key={p.id} provider={p} onInstall={handleInstall} />
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Available Agents</h3>
        {available.length === 0 ? (
          <p className="text-sm text-zinc-600">No additional agents available</p>
        ) : (
          <div className="space-y-2">
            {available.map((p) => (
              <AgentCard key={p.id} provider={p} onInstall={handleInstall} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
