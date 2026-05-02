import { useEffect } from "react"

interface KeyboardShortcuts {
  onCommandK?: () => void
  onEscape?: () => void
  onNewSession?: () => void
  onToggleSidebar?: () => void
  onSubmit?: () => void
  onCancelStream?: () => void
}

export function useKeyboard(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.key === "Escape") {
        shortcuts.onEscape?.()
        shortcuts.onCancelStream?.()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        shortcuts.onCommandK?.()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault()
        shortcuts.onToggleSidebar?.()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        shortcuts.onSubmit?.()
        return
      }

      if (!isInput && e.key === "n") {
        shortcuts.onNewSession?.()
        return
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [shortcuts])
}
