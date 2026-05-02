import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@radix-ui/react-collapsible"
import { ChevronDown, Loader2, CheckCircle2, XCircle } from "lucide-react"
import type { ToolUsePayload, ToolResultPayload } from "@/types"

interface ToolCallCardProps {
  toolUse: ToolUsePayload
  toolResult?: ToolResultPayload
  isStreaming?: boolean
}

export function ToolCallCard({ toolUse, toolResult, isStreaming }: ToolCallCardProps) {
  const status = !toolResult
    ? "running"
    : toolResult.isError
      ? "error"
      : "done"

  const statusIcon = {
    running: <Loader2 className="size-3.5 animate-spin text-zinc-400" />,
    done: <CheckCircle2 className="size-3.5 text-emerald-400" />,
    error: <XCircle className="size-3.5 text-red-400" />,
  }

  const statusLabel = {
    running: "Running",
    done: "Done",
    error: "Error",
  }

  const inputStr = typeof toolUse.input === "string"
    ? toolUse.input
    : JSON.stringify(toolUse.input, null, 2)

  const resultTruncated = toolResult && toolResult.output.length > 200
    ? toolResult.output.slice(0, 200) + "..."
    : toolResult?.output

  return (
    <div className="border border-zinc-800 my-1.5">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs text-zinc-500 font-mono">{toolUse.name}</span>
        <div className="ml-auto flex items-center gap-1 text-xs text-zinc-500">
          {statusIcon[status]}
          <span>{statusLabel[status]}</span>
        </div>
      </div>

      <Collapsible defaultOpen className="border-b border-zinc-800 last:border-b-0">
        <CollapsibleTrigger className="flex items-center gap-2 px-3 py-1 text-[11px] text-zinc-600 hover:text-zinc-400 cursor-pointer w-full">
          <ChevronDown className="size-3 transition-transform ui-open:rotate-180" />
          Input
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="px-3 py-1.5 text-xs text-zinc-400 font-mono overflow-x-auto">{inputStr}</pre>
        </CollapsibleContent>
      </Collapsible>

      {toolResult && (
        <Collapsible defaultOpen={toolResult.output.length < 200}>
          <CollapsibleTrigger className="flex items-center gap-2 px-3 py-1 text-[11px] text-zinc-600 hover:text-zinc-400 cursor-pointer w-full">
            <ChevronDown className="size-3 transition-transform ui-open:rotate-180" />
            Result
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="px-3 py-1.5 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">{resultTruncated}</pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
