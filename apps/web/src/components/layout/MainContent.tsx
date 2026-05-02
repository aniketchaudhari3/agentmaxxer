import type { ReactNode } from "react"

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <div className="flex flex-1 flex-col min-w-0">
      {children}
    </div>
  )
}
