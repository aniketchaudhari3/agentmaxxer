import type { ReactNode } from "react"

interface ConversationContainerProps {
  children: ReactNode
}

export function ConversationContainer({ children }: ConversationContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto" id="message-container">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {children}
      </div>
    </div>
  )
}
