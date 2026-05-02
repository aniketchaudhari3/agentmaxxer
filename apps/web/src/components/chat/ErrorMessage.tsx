interface ErrorMessageProps {
  content: string
}

export function ErrorMessage({ content }: ErrorMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="border-l-2 border-red-500/50 pl-3">
        <p className="text-sm text-red-400 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
