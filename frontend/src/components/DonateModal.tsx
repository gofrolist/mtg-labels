import { useEffect, useRef, useCallback } from 'react'

interface DonateModalProps {
  onClose: () => void
}

export function DonateModal({ onClose }: DonateModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-modal-title"
      ref={dialogRef}
    >
      <div
        className="mx-4 w-full max-w-[500px] rounded-lg bg-mtg-card-bg border border-mtg-border shadow-xl p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 id="donate-modal-title" className="font-bold text-lg text-mtg-text">
            Thank You!
          </h3>
          <button
            ref={closeButtonRef}
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
        <p className="text-center text-mtg-text mb-4 leading-relaxed">
          Your PDF has been generated! If you find this tool useful, consider supporting its
          development!
        </p>
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <h4 className="text-sm font-semibold text-mtg-text">Venmo</h4>
            <a
              href="https://venmo.com/code?user_id=1935186853888000274"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src="/venmo-qr.png"
                alt="Donate with Venmo @evasilenko"
                className="w-56 rounded"
              />
            </a>
            <span className="text-xs text-mtg-text-muted">@evasilenko</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h4 className="text-sm font-semibold text-mtg-text">PayPal</h4>
            <form action="https://www.paypal.com/donate" method="post" target="_top">
              <input type="hidden" name="business" value="3ABRQKUCLUGXN" />
              <input type="hidden" name="no_recurring" value="0" />
              <input type="hidden" name="item_name" value="for buying more MTG cards :)" />
              <input type="hidden" name="currency_code" value="USD" />
              <button type="submit" className="border-0 bg-transparent p-0 cursor-pointer">
                <img
                  src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
                  alt="Donate with PayPal"
                  title="PayPal - The safer, easier way to pay online!"
                />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
