import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Bot, BarChart3, Settings2 } from "lucide-react"
import { AgentsTab } from "./AgentsTab"
import { UsageTab } from "./UsageTab"
import React, { useState, useEffect } from "react"

interface SettingsTabDef {
  id: string
  label: string
  icon: typeof Bot
  component: () => React.ReactElement
}

const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "agents", label: "Agents", icon: Bot, component: AgentsTab },
  { id: "usage", label: "Usage", icon: BarChart3, component: UsageTab },
  { id: "general", label: "General", icon: Settings2, component: () => <div className="text-xs text-zinc-600">General settings coming soon</div> },
]

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: string
}

export function SettingsModal({ open, onOpenChange, defaultTab }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? "agents")

  useEffect(() => {
    if (open && defaultTab) setActiveTab(defaultTab)
  }, [open, defaultTab])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl sm:!max-w-5xl h-[85vh] p-0 flex">
        <div className="w-[200px] border-r border-zinc-800 p-2 flex-shrink-0">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "text-zinc-100 border-l-2 border-zinc-100 bg-zinc-900"
                    : "text-zinc-500 hover:text-zinc-300 border-l-2 border-transparent"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {SETTINGS_TABS.map((tab) => (
            <div key={tab.id} className={activeTab !== tab.id ? "hidden" : ""}>
              <tab.component />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
