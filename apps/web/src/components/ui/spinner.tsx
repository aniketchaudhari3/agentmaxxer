function Spinner({ className, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export { Spinner }
