import { describe, it, expect } from 'vitest'
import { parseLetterSpec, resolveLetters, LETTERS_AZ } from '../letters'

describe('parseLetterSpec', () => {
  it('parses single letters', () => {
    const r = parseLetterSpec('A, C, e')
    expect(r).toEqual({ ok: true, letters: ['A', 'C', 'E'] })
  })

  it('expands a contiguous range', () => {
    const r = parseLetterSpec('A-F')
    expect(r).toEqual({ ok: true, letters: ['A', 'B', 'C', 'D', 'E', 'F'] })
  })

  it('parses a mixed spec, deduped and sorted', () => {
    const r = parseLetterSpec('L-Z, A-F, H')
    expect(r).toEqual({
      ok: true,
      letters: [
        'A', 'B', 'C', 'D', 'E', 'F', 'H',
        'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      ],
    })
  })

  it('ignores surrounding whitespace and empty tokens', () => {
    expect(parseLetterSpec(' A , , B ')).toEqual({ ok: true, letters: ['A', 'B'] })
  })

  it('rejects an empty spec', () => {
    expect(parseLetterSpec('   ').ok).toBe(false)
  })

  it('rejects a reversed range', () => {
    expect(parseLetterSpec('Z-A').ok).toBe(false)
  })

  it('rejects non-letters', () => {
    expect(parseLetterSpec('1-5').ok).toBe(false)
    expect(parseLetterSpec('AB').ok).toBe(false)
    expect(parseLetterSpec('A-').ok).toBe(false)
  })
})

describe('resolveLetters', () => {
  it('returns [] when off', () => {
    expect(resolveLetters({ mode: 'off', customInput: 'A-F' })).toEqual([])
  })

  it('returns all 26 letters when all', () => {
    expect(resolveLetters({ mode: 'all', customInput: '' })).toEqual(LETTERS_AZ)
    expect(LETTERS_AZ).toHaveLength(26)
  })

  it('returns parsed letters when custom and valid', () => {
    expect(resolveLetters({ mode: 'custom', customInput: 'A-C' })).toEqual(['A', 'B', 'C'])
  })

  it('returns [] when custom and invalid', () => {
    expect(resolveLetters({ mode: 'custom', customInput: 'Z-A' })).toEqual([])
  })
})
