# Set Filter Preferences — Design

**Date:** 2026-05-10
**Status:** Approved (pending spec review)

## Summary

Move set filtering (`SET_TYPES`, `IGNORED_SETS`, `MINIMUM_SET_SIZE`) out of the
hardcoded backend `config.py` and into a user-facing configuration screen.
Filtering becomes a client-side concern; `config.py` remains the source of
default values, exposed via a new read-only endpoint. Preferences persist in
the browser's `localStorage`.

## Goals

- Let users enable/disable set types they want to see (e.g., opt in to `promo`,
  opt out of `funny`).
- Let users un-ignore specific sets currently hardcoded in `IGNORED_SETS`
  (e.g., re-include `sir` Shadows over Innistrad Remastered).
- Let users adjust the minimum card count threshold.
- Preserve current `config.py` values as the default state on first visit and
  via a "Reset to defaults" action.

## Non-goals

- User accounts or per-user server storage.
- Server-side admin override of defaults at runtime (still env-vars / code).
- Free-form "add custom set code to ignore" input — out of scope; revisit if
  asked for.
- New E2E coverage — existing PDF flow shape is unchanged.

## Architecture

Filtering moves from backend to frontend. Backend stops applying
`SET_TYPES`/`IGNORED_SETS`/`MINIMUM_SET_SIZE` filters in `/api/sets` and
`/generate-pdf`. It still excludes `digital=true` sets (no paper-label use
case). A new `/api/config/defaults` endpoint exposes the current `config.py`
values so the frontend can seed and reset preferences without duplicating
constants.

Frontend persists preferences in `localStorage` and applies them client-side
via a pure `applyFilters` function. This matches the existing
`useCustomTemplates` pattern and gives instant re-filter on toggle.

```
Backend /api/sets   → all non-digital sets
Backend /api/config/defaults → current config.py values
Frontend localStorage prefs → applyFilters(sets, prefs) → rendered list
```

## Backend changes

### `backend/src/services/scryfall_client.py`

Add a `filter_non_digital` static method:

```python
@staticmethod
def filter_non_digital(sets: list[dict]) -> list[dict]:
    return [s for s in sets if not s.get("digital", False)]
```

Keep `filter_sets` unchanged. The startup `_preload_icon_cache` continues to
use `filter_sets`, so icons for default-included sets still preload at boot.
Icons for newly-enabled set types lazy-load on demand via the existing
`download_and_cache_symbol` helper (or stay missing gracefully, mirroring
current behaviour for any uncached icon).

### `backend/src/api/routes.py`

- `/api/sets` and `/api/set-icons`: replace `filter_sets` calls with
  `filter_non_digital`.
- `/generate-pdf`: build `sets_by_id` from `filter_non_digital(all_sets)` so
  any set the user enabled in the UI can be looked up.
- New route `GET /api/config/defaults` returning a typed Pydantic response.

### `backend/src/models/set_data.py`

Add a `ConfigDefaultsResponse` model:

```python
class ConfigDefaultsResponse(BaseModel):
    default_set_types: list[str]
    default_ignored_sets: list[str]
    default_minimum_set_size: int
```

Endpoint reads `SET_TYPES`, `IGNORED_SETS`, `MINIMUM_SET_SIZE` from
`src.config` and returns them.

## Frontend changes

### New files

- `frontend/src/hooks/useSetFilterPreferences.ts`
  ```ts
  type SetFilterPreferences = {
    activeSetTypes: string[]
    ignoredSetCodes: string[]
    minimumSetSize: number
  }
  ```
  - Loads from `localStorage` key `mtg-labels:set-filter-preferences`.
  - On first visit (no key), seeds from `/api/config/defaults`.
  - Per-field setters and a `reset()` that restores defaults.
  - Corrupt JSON → fall back to defaults, `console.warn`. Mirrors
    `useCustomTemplates` parse-error handling.

- `frontend/src/utils/filtering.ts`
  ```ts
  export function applyFilters(
    sets: MTGSet[],
    prefs: SetFilterPreferences,
  ): MTGSet[]
  ```
  Pure function. Excludes by `set_type` not in `activeSetTypes`,
  `code.toLowerCase()` in `ignoredSetCodes`, or
  `card_count < minimumSetSize`. Digital exclusion stays on the backend.

- `frontend/src/constants/setTypes.ts` — display label + short description
  per known Scryfall `set_type` (used by the modal to render checkboxes
  nicely; falls back to the raw `set_type` string for unknown types).

- `frontend/src/components/SetFilterCustomizer/SetFilterCustomizer.tsx` —
  modal/overlay component, structurally similar to `TemplateCustomizer`.
  Sections:
  1. **Set types** — checkboxes for the union of defaults plus any
     `set_type` observed in the loaded sets. Renders pretty label and
     description from `constants/setTypes.ts`.
  2. **Ignored sets** — checkboxes for the codes in
     `default_ignored_sets`. Each row resolves the code against the
     loaded set list to display the human-readable set name. Checking
     adds the code to `ignoredSetCodes`; unchecking removes it.
  3. **Minimum set size** — `<input type="number" min="0" max="1000" />`.
  4. **Reset to defaults** button — calls `prefs.reset()`. Disabled until
     `/api/config/defaults` has resolved.

### Edited files

- `frontend/src/App.tsx`
  - Use `useSetFilterPreferences` and the existing
    `useApiSetsApiSetsGet` hook.
  - Replace `sets = setsResponse?.data ?? []` with
    `sets = useMemo(() => applyFilters(rawSets, prefs), [rawSets, prefs])`.
  - Add open/mounted state for the new modal (mirroring
    `templateCustomizerOpen`/`templateCustomizerMounted`).

- `frontend/src/components/Layout/Header.tsx`
  - Add a filter/funnel icon button next to the existing template button
    to toggle the modal. Same styling pattern as the template toggle.

- `frontend/src/api/...`
  - Regenerate via `bun run api:gen` once the backend endpoint exists, so
    Orval emits a typed client for `/api/config/defaults`.

### Loading behaviour

- App fetches `/api/config/defaults` on mount via TanStack Query, alongside
  `/api/sets`.
- `useSetFilterPreferences`:
  - **Returning user** (localStorage has the key): preferences are
    available synchronously on first render. Filtering proceeds even if
    `/api/config/defaults` is still in flight; defaults are only needed
    for the modal's "Reset to defaults" button.
  - **First-time user** (no localStorage key): the hook returns
    `undefined` for preferences until `/api/config/defaults` resolves,
    then seeds and persists to localStorage. While preferences are
    `undefined`, the App treats sets as still loading and renders the
    existing `LoadingSkeleton` (same component used for the sets fetch).

## Error handling

- `useSetFilterPreferences`: corrupt JSON → defaults + `console.warn`.
- `/api/config/defaults` fetch failure: TanStack Query retries; modal shows
  a loading state and "Reset to defaults" is disabled while pending/error.
- Backend `/api/config/defaults`: read-only access to module constants — no
  runtime error path.

## Testing

Coverage target ≥80% (`backend/pyproject.toml` and `frontend/vitest.config.ts`
already enforce this).

### Backend (pytest)

- Unit: `filter_non_digital` excludes only digital sets.
- Unit: `/api/config/defaults` returns the values from `src.config`.
- Integration: `/api/sets` includes a `promo` set, a set in `IGNORED_SETS`,
  and a set with `card_count < 10` (these were excluded before).
- Integration: `/generate-pdf` accepts a set ID that would have been
  excluded by the old default filter.

### Frontend (vitest)

- Unit: `applyFilters` covers each filter dimension and their combinations.
- Hook: `useSetFilterPreferences` — initial seed from defaults, per-field
  setters, `reset()`, corrupt-JSON fallback.
- Component: `SetFilterCustomizer` renders all sections, checkbox toggles
  call the right setters, "Reset" calls `reset()`.

## Risks / open questions

- **Icon coverage for non-default set types.** `_preload_icon_cache` still
  uses `filter_sets`, so if a user enables `promo` they'll see sets without
  cached icons until those icons are fetched on demand. Acceptable for v1;
  can add a per-set lazy fetch later if it's a visible problem.
- **Defaults drift.** `config.py` remains the seed; frontend never
  hardcodes the defaults. Reset always pulls fresh from
  `/api/config/defaults`.
- **localStorage size.** Three small fields, well under any limit.
