/**
 * Number of physical label items a selection will generate.
 *
 * Each selected set/type produces one label per copy (its custom quantity, or 1
 * when custom quantities are off). Divider axes multiply that: every copy is
 * repeated once per divider letter and once per divider type — matching the
 * backend, which expands the set x letter x type cross-product into one label
 * item each.
 *
 * Pass `dividerCount = 0` when dividers are off, and for the types view (which
 * has no dividers).
 */
export function countLabelItems(
  ids: string[],
  quantities: Record<string, number>,
  useCustomQuantity: boolean,
  dividerCount: number
): number {
  const base = ids.reduce((sum, id) => sum + (useCustomQuantity ? (quantities[id] ?? 1) : 1), 0)
  return base * Math.max(dividerCount, 1)
}

/**
 * Divider labels printed per set: the letter x type cross-product, with an
 * empty axis contributing a single pass. Mirrors the backend's expansion.
 */
export function countDividersPerSet(letterCount: number, typeCount: number): number {
  return Math.max(letterCount, 1) * Math.max(typeCount, 1)
}
