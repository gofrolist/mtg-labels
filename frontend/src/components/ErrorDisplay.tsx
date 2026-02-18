interface ErrorDisplayProps {
  message: string
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
      {message}
    </div>
  )
}
