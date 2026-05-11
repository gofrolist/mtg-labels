// Defaults for user-configurable set filters. Mirror the values that
// previously lived in backend/src/config.py before they were removed.

export const DEFAULT_SET_TYPES: readonly string[] = [
  'core',
  'expansion',
  'masters',
  'eternal',
  'alchemy',
  'masterpiece',
  'from_the_vault',
  'premium_deck',
  'duel_deck',
  'draft_innovation',
  'commander',
  'planechase',
  'funny',
  'starter',
  'box',
  'minigame',
] as const

export const DEFAULT_IGNORED_SET_CODES: readonly string[] = [
  'cmb1',
  'amh1',
  'cmb2',
  'fbb',
  'sum',
  '4bb',
  'bchr',
  'rin',
  'ren',
  'rqs',
  'itp',
  'sir',
  'sis',
  'cst',
] as const

export const DEFAULT_MINIMUM_SET_SIZE = 10
