import { Streamdown } from "streamdown"
import "streamdown/styles.css"
import { createCodePlugin } from "@streamdown/code"

const codePlugin = createCodePlugin({
  themes: ["github-light", "github-dark"],
})

interface StreamdownRendererProps {
  content: string
  isStreaming?: boolean
}

export function StreamdownRenderer({ content, isStreaming }: StreamdownRendererProps) {
  return (
    <div className="text-sm leading-relaxed text-zinc-100">
      <Streamdown
        plugins={{ code: codePlugin }}
        mode={isStreaming ? "streaming" : "static"}
        controls={{ code: { copy: true, download: true } }}
      >
        {content}
      </Streamdown>
    </div>
  )
}
