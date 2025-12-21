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
 * Group card types by color.
 * Input format: { "White": ["Creature", "Instant"], ... }
 * Output format: Same structure, but can be used for display organization.
 */
export function groupCardTypesByColor(
  cardTypesByColor: Record<string, string[]>
): Record<string, string[]> {
  // Already grouped by color, return as-is
  return cardTypesByColor
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
    (set) =>
      set.name.toLowerCase().includes(lowerQuery) ||
      set.code.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Filter card types by search query (case-insensitive).
 */
export function filterCardTypesByQuery(
  cardTypesByColor: Record<string, string[]>,
  query: string
): Record<string, string[]> {
  if (!query.trim()) {
    return cardTypesByColor
  }

  const lowerQuery = query.toLowerCase()
  const filtered: Record<string, string[]> = {}

  for (const [color, types] of Object.entries(cardTypesByColor)) {
    const matchingTypes = types.filter((type) =>
      type.toLowerCase().includes(lowerQuery) ||
      color.toLowerCase().includes(lowerQuery)
    )
    if (matchingTypes.length > 0) {
      filtered[color] = matchingTypes
    }
  }

  return filtered
}
