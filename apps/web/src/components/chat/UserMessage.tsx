interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] bg-zinc-800 px-3 py-2">
        <p className="text-sm text-zinc-100 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
