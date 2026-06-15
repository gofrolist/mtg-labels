import type { MTGSet } from '../types'

/**
 * Group sets by their set_type.
 */
export function groupSetsByType(sets: MTGSet[]): Record<string, MTGSet[]> {
  const grouped: Record<string, MTGSet[]> = {}

  for (const set of sets) {
    const type = set.set_type || 'Other'
    if (!grouped[type]) {
      grouped[type] = []
    }
    grouped[type].push(set)
  }

  return grouped
}

/**
 * Filter sets by search query (case-insensitive).
 * Matches against set name and code.
 */
export function filterSetsByQuery(sets: MTGSet[], query: string): MTGSet[] {
  if (!query.trim()) {
    return sets
  }

  const lowerQuery = query.toLowerCase()

  return sets.filter(
    set =>
      set.name.toLowerCase().includes(lowerQuery) || set.code.toLowerCase().includes(lowerQuery)
  )
}
