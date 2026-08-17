import { useEffect, useRef } from 'react'

// Disabled controls are excluded: they sit in the DOM order but can never be
// `document.activeElement`, so counting them as `first`/`last` would make the
// wrap-around check below never fire and let focus escape the dialog.
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

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

  // Held in a ref so the effect below can keep an empty dep list. Callers pass
  // an inline arrow, so depending on `onClose` directly would tear down and
  // re-run the effect on every parent render — re-focusing the initial element
  // out from under someone mid-form and briefly releasing the scroll lock.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
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
    }

    const prev = document.activeElement as HTMLElement | null
    initialFocusRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [])

  return { dialogRef, initialFocusRef }
}
