import type { MTGSet, SetFilterPreferences } from '../types'

export function applyFilters(
  sets: MTGSet[],
  prefs: SetFilterPreferences,
): MTGSet[] {
  const ignored = new Set(prefs.ignoredSetCodes.map((c) => c.toLowerCase()))
  const active = new Set(prefs.activeSetTypes)
  return sets.filter((s) => {
    if (!active.has(s.set_type)) return false
    if (ignored.has(s.code.toLowerCase())) return false
    if ((s.card_count ?? 0) < prefs.minimumSetSize) return false
    return true
  })
}
