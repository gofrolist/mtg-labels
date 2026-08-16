/**
 * Type dividers are identified by the same `"color:type"` ids the Types view
 * uses (e.g. `"White:Creature"`), so one contract serves both features. The
 * backend prints them as the label's second line, `"White - Creature"`.
 */

/** Split a `"color:type"` id, or return null when it is not one. */
export function splitDividerTypeId(id: string): { color: string; type: string } | null {
  const separator = id.indexOf(':')
  if (separator <= 0) return null
  const color = id.slice(0, separator).trim()
  const type = id.slice(separator + 1).trim()
  if (!color || !type) return null
  return { color, type }
}

/** Render a `"color:type"` id the way it appears on the printed label. */
export function formatDividerTypeLabel(id: string): string {
  const parts = splitDividerTypeId(id)
  return parts ? `${parts.color} - ${parts.type}` : id
}

/**
 * Order divider ids by the color order the API returns, then by the order the
 * types appear within that color, so the printed run follows the picker's
 * layout no matter which order the boxes were ticked in.
 */
export function sortDividerTypeIds(
  ids: readonly string[],
  groupedTypes: Record<string, string[]>
): string[] {
  const rank = new Map<string, number>()
  let index = 0
  for (const [color, types] of Object.entries(groupedTypes)) {
    for (const type of types) {
      rank.set(`${color}:${type}`, index++)
    }
  }
  return [...ids].sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity))
}
