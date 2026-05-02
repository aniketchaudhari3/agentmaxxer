import { useRef, useCallback } from "react"

interface PromptTextareaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  disabled: boolean
}

export function PromptTextarea({ value, onChange, onSubmit, disabled }: PromptTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 72) + "px"
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(value)
    }
  }, [value, onSubmit])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => { onChange(e.target.value); adjustHeight() }}
      onKeyDown={handleKeyDown}
      placeholder="$  Ask anything..."
      disabled={disabled}
      rows={1}
      className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0 border-0 disabled:opacity-50"
    />
  )
}
