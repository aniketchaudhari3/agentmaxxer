import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@radix-ui/react-collapsible"
import { Brain, ChevronDown } from "lucide-react"
import { StreamdownRenderer } from "./StreamdownRenderer"

interface ThinkingSectionProps {
  content: string
  isStreaming?: boolean
}

export function ThinkingSection({ content, isStreaming }: ThinkingSectionProps) {
  return (
    <Collapsible className="border-l-2 border-zinc-700/50 pl-3 my-2">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer">
        <Brain className="size-3.5" />
        <span>Thinking</span>
        <ChevronDown className="size-3 transition-transform ui-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <StreamdownRenderer content={content} isStreaming={isStreaming} />
      </CollapsibleContent>
    </Collapsible>
  )
}
