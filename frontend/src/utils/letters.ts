import type { AlphabetSelection } from '../types'

export type ParseResult =
  | { ok: true; letters: string[] }
  | { ok: false; message: string }

const EMPTY_MESSAGE = 'Enter at least one letter, e.g. A-F, H, L-Z'

export const LETTERS_AZ: string[] = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode('A'.charCodeAt(0) + i),
)

function isLetter(token: string): boolean {
  return token.length === 1 && token >= 'A' && token <= 'Z'
}

/**
 * Parse a print-dialog-style letter spec ("A-F, H, L-Z") into a sorted,
 * de-duplicated list of single uppercase letters. Case-insensitive; whitespace
 * is ignored. Returns a discriminated result so the UI can show a precise error.
 */
export function parseLetterSpec(input: string): ParseResult {
  if (!input.trim()) {
    return { ok: false, message: EMPTY_MESSAGE }
  }

  const found = new Set<string>()
  for (const rawToken of input.split(',')) {
    const token = rawToken.trim().toUpperCase()
    if (!token) continue

    if (isLetter(token)) {
      found.add(token)
      continue
    }

    const parts = token.split('-')
    if (parts.length === 2 && isLetter(parts[0]) && isLetter(parts[1])) {
      const start = parts[0].charCodeAt(0)
      const end = parts[1].charCodeAt(0)
      if (start > end) {
        return { ok: false, message: `Range "${token}" is backwards` }
      }
      for (let c = start; c <= end; c++) {
        found.add(String.fromCharCode(c))
      }
      continue
    }

    return { ok: false, message: `Invalid entry "${rawToken.trim()}"` }
  }

  if (found.size === 0) {
    return { ok: false, message: EMPTY_MESSAGE }
  }

  return { ok: true, letters: [...found].sort() }
}

/** Resolve a selection to the concrete letters to send to the backend. */
export function resolveLetters(sel: AlphabetSelection): string[] {
  if (sel.mode === 'off') return []
  if (sel.mode === 'all') return [...LETTERS_AZ]
  const parsed = parseLetterSpec(sel.customInput)
  return parsed.ok ? parsed.letters : []
}
