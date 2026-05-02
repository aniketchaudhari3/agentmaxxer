import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SendButtonProps {
  onClick: () => void
  disabled: boolean
}

export function SendButton({ onClick, disabled }: SendButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      size="icon-xs"
    >
      <ArrowUp className="size-4" />
    </Button>
  )
}
