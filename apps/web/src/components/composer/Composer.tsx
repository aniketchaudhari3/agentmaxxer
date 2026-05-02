import { useState, useCallback } from "react"
import { PromptTextarea } from "./PromptTextarea"
import { AgentSelector } from "./AgentSelector"
import { ModelSelector } from "./ModelSelector"
import { ModeSelector } from "./ModeSelector"
import { SendButton } from "./SendButton"
import { BarChart3 } from "lucide-react"
import { useAppStore } from "@/stores/app-store"

interface ComposerProps {
  onOpenSettings?: (tab?: string) => void
  onOpenUsage?: () => void
}

export function Composer({ onOpenSettings, onOpenUsage }: ComposerProps) {
  const [input, setInput] = useState("")
  const submitTask = useAppStore((s) => s.submitTask)
  const isExecuting = useAppStore((s) => s.isExecuting)
  const apiOnline = useAppStore((s) => s.apiOnline)

  const handleSubmit = useCallback((text: string) => {
    if (!text.trim() || isExecuting || !apiOnline) return
    submitTask(text.trim())
    setInput("")
  }, [isExecuting, apiOnline, submitTask])

  return (
    <div className="border border-zinc-800 bg-zinc-950">
      <PromptTextarea
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={!apiOnline}
      />
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1">
          <AgentSelector />
          <ModelSelector />
        </div>
        <div className="flex items-center gap-1">
          <ModeSelector />
          <button
            onClick={onOpenUsage}
            className="h-7 px-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Session usage"
          >
            <BarChart3 className="size-4" />
          </button>
          <SendButton
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || !apiOnline}
          />
        </div>
      </div>
    </div>
  )
}
