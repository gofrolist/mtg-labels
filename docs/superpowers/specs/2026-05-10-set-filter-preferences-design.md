# Set Filter Preferences — Design

**Date:** 2026-05-10
**Status:** Approved (pending spec review)

## Summary

Move set filtering (`SET_TYPES`, `IGNORED_SETS`, `MINIMUM_SET_SIZE`) out of the
backend `config.py` and into a user-facing configuration screen. Filtering
becomes a purely client-side concern. The backend stops knowing about these
values entirely — they are removed from `config.py`. Default values live in
the frontend as TypeScript constants and persist per-user in `localStorage`.

## Goals

- Let users enable/disable set types they want to see (e.g., opt in to `promo`,
  opt out of `funny`).
- Let users un-ignore specific sets currently hardcoded in `IGNORED_SETS`
  (e.g., re-include `sir` Shadows over Innistrad Remastered).
- Let users adjust the minimum card count threshold.
- Preserve the previous `config.py` values as the frontend defaults and via a
  "Reset to defaults" action.
- Remove `SET_TYPES`, `IGNORED_SETS`, `MINIMUM_SET_SIZE` from backend
  `config.py` — backend is no longer aware of these filters.

## Non-goals

- User accounts or per-user server storage.
- Free-form "add custom set code to ignore" input — out of scope; revisit if
  asked for.
- New E2E coverage — existing PDF flow shape is unchanged.

## Architecture

Filtering moves from backend to frontend. Backend still excludes digital-only
sets in `/api/sets`, `/api/set-icons`, and `/generate-pdf` (no paper-label use
case for digital sets). All other filter dimensions are owned by the frontend.

Frontend persists user preferences in `localStorage` and applies them
client-side via a pure `applyFilters` function. Defaults are TypeScript
constants in `frontend/src/constants/`. This matches the existing
`useCustomTemplates` pattern and gives instant re-filter on toggle, with no
extra network calls.

```
Backend /api/sets   → all non-digital sets
Frontend defaults (constants) ─┐
                                ├─ useSetFilterPreferences (localStorage)
Frontend modal toggles ────────┘
                                ↓
            applyFilters(sets, prefs) → rendered list
```

## Backend changes

### `backend/src/config.py`

Delete the constants `SET_TYPES`, `IGNORED_SETS`, and `MINIMUM_SET_SIZE`. They
have no remaining consumers after this change.

### `backend/src/services/scryfall_client.py`

- Remove the imports of `SET_TYPES`, `IGNORED_SETS`, `MINIMUM_SET_SIZE`.
- Replace the `filter_sets` static method with `filter_non_digital`:
  ```python
  @staticmethod
  def filter_non_digital(sets: list[dict]) -> list[dict]:
      return [s for s in sets if not s.get("digital", False)]
  ```
- Delete `filter_sets` entirely (no callers will remain after the routes
  update below).

### `backend/src/api/routes.py`

- `/api/sets`: call `filter_non_digital` instead of `filter_sets`.
- `/api/set-icons`: call `filter_non_digital` instead of `filter_sets`.
- `/generate-pdf`: build `sets_by_id` from `filter_non_digital(all_sets)` so
  any set the user enabled in the UI can be looked up by id.
- `_preload_icon_cache`: iterate `filter_non_digital(all_sets)`. This
  preloads icons for a slightly larger set of releases than today, but the
  ceiling is small and bounded (no digital sets, no growth beyond Scryfall's
  catalogue). Acceptable trade-off for removing the heuristic.

### No new endpoints, no new models

`/api/config/defaults` is **not** added. Defaults live in the frontend.

## Frontend changes

### New files

- `frontend/src/constants/setFilterDefaults.ts`
  ```ts
  export const DEFAULT_SET_TYPES: readonly string[] = [
    'core', 'expansion', 'masters', 'eternal', 'alchemy', 'masterpiece',
    'from_the_vault', 'premium_deck', 'duel_deck', 'draft_innovation',
    'commander', 'planechase', 'funny', 'starter', 'box', 'minigame',
  ] as const

  export const DEFAULT_IGNORED_SET_CODES: readonly string[] = [
    'cmb1', 'amh1', 'cmb2', 'fbb', 'sum', '4bb', 'bchr', 'rin', 'ren',
    'rqs', 'itp', 'sir', 'sis', 'cst',
  ] as const

  export const DEFAULT_MINIMUM_SET_SIZE = 10
  ```
  These mirror the values currently in `backend/src/config.py` and become
  the single source of truth going forward.

- `frontend/src/constants/setTypes.ts` — master list of all known Scryfall
  `set_type` values plus display label and short description for each
  (e.g., `from_the_vault` → "From the Vault", "Limited-print premium gift
  sets"). Used by the modal to render checkboxes nicely. Falls back to the
  raw `set_type` string for unknown types.

- `frontend/src/hooks/useSetFilterPreferences.ts`
  ```ts
  type SetFilterPreferences = {
    activeSetTypes: string[]
    ignoredSetCodes: string[]
    minimumSetSize: number
  }
  ```
  - Loads from `localStorage` key `mtg-labels:set-filter-preferences`.
  - If the key is absent or contains invalid JSON, returns a fresh copy of
    the defaults (and logs `console.warn` for the corrupt case, mirroring
    `useCustomTemplates`).
  - Per-field setters persist the updated object back to `localStorage`.
  - `reset()` restores all three fields to the constants above.
  - Preferences are always available synchronously on first render — no
    loading state required.

- `frontend/src/utils/filtering.ts`
  ```ts
  export function applyFilters(
    sets: MTGSet[],
    prefs: SetFilterPreferences,
  ): MTGSet[]
  ```
  Pure function. Excludes a set when:
  - `set.set_type` is not in `prefs.activeSetTypes`, or
  - `set.code.toLowerCase()` is in `prefs.ignoredSetCodes`, or
  - `set.card_count < prefs.minimumSetSize`.
  Digital exclusion remains on the backend.

- `frontend/src/components/SetFilterCustomizer/SetFilterCustomizer.tsx` —
  modal/overlay component, structurally similar to `TemplateCustomizer`.
  Sections:
  1. **Set types** — checkboxes for the union of `DEFAULT_SET_TYPES`,
     keys in `setTypes.ts`, and any `set_type` observed in the loaded
     sets. Each row uses the label and description from `setTypes.ts`,
     falling back to the raw type string.
  2. **Ignored sets** — checkboxes for codes in
     `DEFAULT_IGNORED_SET_CODES`. Each row resolves the code against the
     loaded set list to display the human-readable set name. Checking a
     box adds the code to `ignoredSetCodes`; unchecking removes it.
  3. **Minimum set size** — `<input type="number" min="0" max="1000" />`.
  4. **Reset to defaults** button — calls `prefs.reset()`.

### Edited files

- `frontend/src/App.tsx`
  - Use `useSetFilterPreferences`.
  - Replace `sets = setsResponse?.data ?? []` with
    `sets = useMemo(() => applyFilters(rawSets, prefs), [rawSets, prefs])`.
  - Add open/mounted state for the new modal, mirroring
    `templateCustomizerOpen`/`templateCustomizerMounted`.

- `frontend/src/components/Layout/Header.tsx`
  - Add a filter/funnel icon button next to the existing template button
    to toggle the modal. Same styling pattern as the template toggle.

- `frontend/src/api/...`
  - Regenerate via `bun run api:gen` after backend changes ship. The
    regeneration is needed because `/api/sets` will return more rows; the
    generated types do not change.

## Error handling

- `useSetFilterPreferences`: corrupt localStorage JSON → defaults +
  `console.warn`. Empty localStorage → defaults silently.
- Backend has no new error paths — `filter_non_digital` is total over its
  input.

## Testing

Coverage target ≥80% (`backend/pyproject.toml` and `frontend/vitest.config.ts`
already enforce this).

### Backend (pytest)

- Unit: `filter_non_digital` excludes only sets with `digital=True`.
- Update existing tests that assert filtering by `SET_TYPES` / `IGNORED_SETS`
  / `MINIMUM_SET_SIZE` to assert the new behaviour (only digital exclusion
  at the API layer).
- Integration: `/api/sets` includes a `promo` set, a set previously in
  `IGNORED_SETS`, and a set with `card_count < 10`.
- Integration: `/generate-pdf` accepts a set ID for any non-digital set.

### Frontend (vitest)

- Unit: `applyFilters` covers each filter dimension and their combinations,
  including case-insensitive code matching.
- Hook: `useSetFilterPreferences` — defaults when localStorage is empty,
  persistence across reads, per-field setters, `reset()`, corrupt-JSON
  fallback.
- Component: `SetFilterCustomizer` renders all sections, checkbox toggles
  call the right setters, "Reset" restores defaults.

## Risks / open questions

- **Icon coverage for non-default set types.** With `_preload_icon_cache`
  now using `filter_non_digital`, all non-digital sets get their icons
  preloaded. Slightly more disk + bandwidth at startup than today;
  bounded by Scryfall's catalogue.
- **Defaults drift between languages.** The TypeScript constants in
  `frontend/src/constants/setFilterDefaults.ts` replace the previous
  `config.py` values verbatim. Going forward, defaults are edited there.
- **localStorage size.** Three small fields, well under any browser limit.
