import { useEffect, useRef, useState } from 'react'
import { useModalDialog } from '../hooks/useModalDialog'
import { submitFeedback, type FeedbackType } from '../utils/feedback'

const TYPE_OPTIONS: ReadonlyArray<{ value: FeedbackType; label: string }> = [
  { value: 'bug', label: 'Bug' },
  { value: 'idea', label: 'Idea' },
  { value: 'other', label: 'Other' },
]

const MIN_MESSAGE_LENGTH = 10
const MAX_MESSAGE_LENGTH = 4000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FeedbackModalProps {
  onClose: () => void
}

const inputClass =
  'w-full rounded border border-mtg-border bg-mtg-input-bg text-mtg-text placeholder-mtg-text-muted text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mtg-accent'

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { dialogRef, initialFocusRef } = useModalDialog<HTMLTextAreaElement>(onClose)
  // Mounted fresh on open and unmounted on close (see Header), so mount time IS
  // open time — capture the page the feedback is about now rather than at
  // submit time, when the location may have changed.
  const [pageUrl] = useState(() => window.location.href)

  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ message?: string; email?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [sent, setSent] = useState(false)

  // Submitting unmounts the form along with the focused Send button, which
  // would drop focus to <body> and let the next Tab walk the page behind the
  // dialog. Hand it to the one control the success state has.
  const sentCloseRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (sent) sentCloseRef.current?.focus()
  }, [sent])

  // A click event targets the nearest common ancestor of mousedown and mouseup,
  // so drag-selecting text in the textarea and releasing over the dimmed
  // backdrop would otherwise count as a backdrop click and discard a typed-out
  // report. Only dismiss when the gesture both starts and ends on the backdrop.
  const backdropArmed = useRef(false)

  const validate = () => {
    const next: { message?: string; email?: string } = {}
    const trimmedMessage = message.trim()
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      next.message = `Please describe it in at least ${MIN_MESSAGE_LENGTH} characters`
    } else if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      next.message = `Please keep it under ${MAX_MESSAGE_LENGTH} characters`
    }
    const trimmedEmail = email.trim()
    if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
      next.email = 'Please enter a valid email'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(false)
    if (!validate()) return
    setSubmitting(true)
    try {
      await submitFeedback({
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        url: pageUrl,
      })
      setSent(true)
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onMouseDown={e => {
        backdropArmed.current = e.target === e.currentTarget
      }}
      onClick={e => {
        if (e.target === e.currentTarget && backdropArmed.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      ref={dialogRef}
    >
      <div
        className="mx-4 w-full max-w-[500px] rounded-lg bg-mtg-card-bg border border-mtg-border shadow-xl p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 id="feedback-modal-title" className="font-bold text-lg text-mtg-text">
            Send feedback
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-mtg-text-muted hover:text-mtg-text p-1"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="text-center">
            <p role="status" className="text-mtg-text mb-4 leading-relaxed">
              Thanks — your feedback was sent!
            </p>
            <button
              ref={sentCloseRef}
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded bg-mtg-accent hover:bg-mtg-accent-hover text-gray-900 text-sm font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-mtg-text-muted">
              Found a bug or have an idea? It goes straight to the developer.
            </p>

            <div className="flex gap-1" role="group" aria-label="Feedback type">
              {TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  aria-pressed={type === option.value}
                  className={`h-9 px-3 rounded border text-sm transition-colors ${
                    type === option.value
                      ? 'border-mtg-accent bg-mtg-accent text-gray-900 font-semibold'
                      : 'border-mtg-border bg-mtg-input-bg text-mtg-text hover:bg-mtg-hover-bg'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div>
              <textarea
                ref={initialFocusRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                aria-label="Message"
                aria-invalid={errors.message ? true : undefined}
                aria-describedby={errors.message ? 'feedback-message-error' : undefined}
                placeholder="What happened, or what would you like to see?"
                className={inputClass}
              />
              {errors.message && (
                <p id="feedback-message-error" className="mt-1 text-xs text-red-500">
                  {errors.message}
                </p>
              )}
            </div>

            <div>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-label="Email (optional)"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'feedback-email-error' : undefined}
                placeholder="Email (optional — if you'd like a reply)"
                className={inputClass}
              />
              {errors.email && (
                <p id="feedback-email-error" className="mt-1 text-xs text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            {submitError && (
              <p role="alert" className="text-xs text-red-500">
                Your feedback could not be sent. Please try again.
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-4 rounded bg-mtg-accent hover:bg-mtg-accent-hover text-gray-900 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
