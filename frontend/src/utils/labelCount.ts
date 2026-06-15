/**
 * Number of physical label items a selection will generate.
 *
 * Each selected set/type produces one label per copy (its custom quantity, or 1
 * when custom quantities are off). When alphabet divider letters are active,
 * every copy is repeated once per letter — matching the backend, which expands
 * the set x letter cross-product into one label item each.
 *
 * Pass `letterCount = 0` when dividers are off, and for the types view (which
 * has no divider letters).
 */
export function countLabelItems(
  ids: string[],
  quantities: Record<string, number>,
  useCustomQuantity: boolean,
  letterCount: number
): number {
  const base = ids.reduce((sum, id) => sum + (useCustomQuantity ? (quantities[id] ?? 1) : 1), 0)
  return base * Math.max(letterCount, 1)
}
