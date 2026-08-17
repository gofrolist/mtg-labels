interface FeedbackNavButtonProps {
  isOpen: boolean
  onOpen: () => void
}

/** Nav-bar trigger for the feedback modal; styled to match the other nav buttons. */
export function FeedbackNavButton({ isOpen, onOpen }: FeedbackNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="h-9 px-3 py-0 flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-sm text-white font-medium cursor-pointer select-none"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title="Send feedback"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 pointer-events-none"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <span className="pointer-events-none">Feedback</span>
    </button>
  )
}
