import { useState } from "react"
import { useAppStore } from "@/stores/app-store"
import { AgentLogo } from "@/components/AgentLogo"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Search, Infinity, ChevronDown } from "lucide-react"

export function AgentSelector() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const providers = useAppStore((s) => s.providers)
  const activeProviderId = useAppStore((s) => s.activeProviderId)
  const setActiveProviderId = useAppStore((s) => s.setActiveProviderId)
  const isExecuting = useAppStore((s) => s.isExecuting)

  const installed = providers.filter(p => p.installed)
  const activeProvider = providers.find(p => p.id === activeProviderId)

  const filtered = installed.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <button
        onClick={() => !isExecuting && setOpen(true)}
        className="flex items-center gap-1.5 h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors disabled:opacity-50"
        disabled={isExecuting}
      >
        {activeProviderId ? (
          <AgentLogo providerId={activeProviderId} />
        ) : (
          <Infinity className="size-3.5" />
        )}
        <span>{activeProvider?.name ?? "Auto"}</span>
        <ChevronDown className="size-3" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-md sm:!max-w-md p-0">
          <div className="relative border-b border-zinc-800">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full bg-transparent pl-9 pr-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              onClick={() => { setActiveProviderId(null); setOpen(false); setSearch("") }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-xs transition-colors ${
                !activeProviderId ? "bg-zinc-900 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <Infinity className="size-4 text-zinc-500" />
              <span>Auto</span>
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-zinc-600">No agents found</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActiveProviderId(p.id); setOpen(false); setSearch("") }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-xs transition-colors ${
                    activeProviderId === p.id ? "bg-zinc-900 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
                  }`}
                >
                  <AgentLogo providerId={p.id} />
                  <span>{p.name}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
