import { StreamdownRenderer } from "./StreamdownRenderer"

interface ResponseSectionProps {
  content: string
  isStreaming?: boolean
}

export function ResponseSection({ content, isStreaming }: ResponseSectionProps) {
  if (!content) return null

  return (
    <div className="my-2">
      <StreamdownRenderer content={content} isStreaming={isStreaming} />
    </div>
  )
}
