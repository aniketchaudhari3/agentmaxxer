import { useEffect, useState } from "react"
import { useAppStore } from "@/stores/app-store"
import { AgentLogo } from "@/components/AgentLogo"

interface TotalUsage {
  totalTokens: number
  perProvider: Array<{ providerId: string; tokens: number }>
}

export function UsageTab() {
  const [usage, setUsage] = useState<TotalUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const providers = useAppStore((s) => s.providers)

  useEffect(() => {
    fetch("/api/usage/total")
      .then(r => r.json())
      .then(data => { setUsage(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-xs text-zinc-600">Loading...</div>
  }

  if (!usage) {
    return <div className="text-xs text-zinc-600">No usage data yet</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-3xl font-semibold text-zinc-100">
          {usage.totalTokens.toLocaleString()}
        </div>
        <div className="text-xs text-zinc-500 mt-1">Total tokens consumed (all-time)</div>
      </div>
      <div>
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Per Provider</div>
        {usage.perProvider.length === 0 ? (
          <p className="text-xs text-zinc-600">No provider usage</p>
        ) : (
          <div className="space-y-1">
            {usage.perProvider.map((p) => {
              const provider = providers.find(pr => pr.id === p.providerId)
              return (
                <div key={p.providerId} className="flex items-center gap-3 border border-zinc-800 px-3 py-2">
                  <AgentLogo providerId={p.providerId} />
                  <span className="flex-1 text-sm text-zinc-300">{provider?.name ?? p.providerId}</span>
                  <span className="text-xs text-zinc-500">{p.tokens.toLocaleString()} tokens</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
