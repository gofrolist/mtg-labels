// Master list of known Scryfall set_type values with human-readable
// labels and short descriptions. Used by SetFilterCustomizer.
// Unknown set_types from the API still render — they fall back to the
// raw string for the label and an empty description.

export interface SetTypeMeta {
  key: string
  label: string
  description: string
}

export const KNOWN_SET_TYPES: readonly SetTypeMeta[] = [
  { key: 'core', label: 'Core', description: 'Yearly Magic core set (Tenth Edition, etc.)' },
  { key: 'expansion', label: 'Expansion', description: 'Rotational expansion set in a block' },
  { key: 'masters', label: 'Masters', description: 'Reprint set with no new cards' },
  { key: 'eternal', label: 'Eternal', description: 'New cards added to high-power formats' },
  { key: 'masterpiece', label: 'Masterpiece', description: 'Premium foil card series' },
  { key: 'arsenal', label: 'Arsenal', description: 'Commander-oriented gift set' },
  { key: 'from_the_vault', label: 'From the Vault', description: 'Limited-print premium gift sets' },
  { key: 'spellbook', label: 'Spellbook', description: 'Signature Spellbook gift sets' },
  { key: 'premium_deck', label: 'Premium Deck', description: 'Premium Deck Series decks' },
  { key: 'duel_deck', label: 'Duel Deck', description: 'Duel Decks' },
  { key: 'draft_innovation', label: 'Draft Innovation', description: 'Special draft sets (Conspiracy, Battlebond, etc.)' },
  { key: 'treasure_chest', label: 'Treasure Chest', description: 'Magic Online treasure chest prize sets' },
  { key: 'commander', label: 'Commander', description: 'Commander preconstructed decks' },
  { key: 'planechase', label: 'Planechase', description: 'Planechase sets' },
  { key: 'archenemy', label: 'Archenemy', description: 'Archenemy sets' },
  { key: 'vanguard', label: 'Vanguard', description: 'Vanguard card sets' },
  { key: 'funny', label: 'Funny', description: 'Un-sets and funny promo releases' },
  { key: 'starter', label: 'Starter', description: 'Starter/introductory sets (Portal, etc.)' },
  { key: 'box', label: 'Box Set', description: 'Gift box sets' },
  { key: 'promo', label: 'Promo', description: 'Purely promotional cards' },
  { key: 'token', label: 'Token', description: 'Tokens and emblems' },
  { key: 'memorabilia', label: 'Memorabilia', description: 'Gold-bordered, oversize, or trophy cards (not tournament legal)' },
  { key: 'minigame', label: 'Minigame', description: 'Minigame card inserts from booster packs' },
] as const

const META_BY_KEY: Record<string, SetTypeMeta> = Object.fromEntries(
  KNOWN_SET_TYPES.map((t) => [t.key, t]),
)

export function getSetTypeMeta(key: string): SetTypeMeta {
  return META_BY_KEY[key] ?? { key, label: key, description: '' }
}
