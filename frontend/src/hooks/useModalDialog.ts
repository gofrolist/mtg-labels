import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Wiring shared by the app's hand-rolled modals: Escape to close, Tab/Shift+Tab
 * trapped inside the dialog, background scroll locked while open, initial focus
 * moved into the dialog and restored to the trigger on close.
 *
 * Modals using this must be mounted only while open (the caller renders them
 * conditionally), since the effect runs on mount.
 */
export function useModalDialog<T extends HTMLElement = HTMLElement>(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null)
  /** Attach to the element that should receive focus when the modal opens. */
  const initialFocusRef = useRef<T>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
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
    initialFocusRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [handleKeyDown])

  return { dialogRef, initialFocusRef }
}
