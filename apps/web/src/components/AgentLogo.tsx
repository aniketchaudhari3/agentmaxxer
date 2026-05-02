import { Infinity } from "lucide-react"

interface AgentLogoProps {
  providerId: string | "auto"
}

const logoMap: Record<string, string> = {
  "claude-code": "/logos/anthropic.svg",
  "gemini-cli": "/logos/gemini.svg",
  "codex-cli": "/logos/openai.svg",
  "cursor-cli": "/logos/cursor.svg",
}

export function AgentLogo({ providerId }: AgentLogoProps) {
  if (providerId === "auto") {
    return (
      <div className="flex size-8 items-center justify-center">
        <Infinity className="size-5 text-zinc-400" />
      </div>
    )
  }

  const src = logoMap[providerId]
  if (!src) {
    return (
      <div className="flex size-8 items-center justify-center bg-zinc-900">
        <span className="text-[10px] text-zinc-600 uppercase">{providerId.charAt(0)}</span>
      </div>
    )
  }

  return (
    <div className="flex size-8 items-center justify-center">
      <img src={src} alt={providerId} className="size-5 opacity-80" />
    </div>
  )
}
