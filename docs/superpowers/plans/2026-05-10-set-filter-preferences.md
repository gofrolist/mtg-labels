# Set Filter Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move SET_TYPES / IGNORED_SETS / MINIMUM_SET_SIZE out of `backend/src/config.py` and into a user-facing configuration modal in the frontend, with `localStorage` persistence. Backend keeps only digital-only exclusion.

**Architecture:** Backend stops doing type / code / min-size filtering — `/api/sets`, `/api/set-icons`, `/generate-pdf`, and the icon-cache preload all switch to a new `filter_non_digital` helper. Frontend owns defaults in TypeScript constants, persists user preferences in `localStorage`, and applies them via a pure `applyFilters` function plus a `SetFilterCustomizer` modal mirroring `TemplateCustomizer`.

**Tech Stack:** Python 3.13 / FastAPI / pytest (backend); React 19 / Vite / TypeScript / Tailwind CSS 4 / Vitest / React Testing Library (frontend). Package managers: `uv` (backend), `bun` (frontend).

---

## File structure

**Backend — created**
- (none)

**Backend — modified**
- `backend/src/services/scryfall_client.py` — replace `filter_sets` with `filter_non_digital`; drop the three constants from imports.
- `backend/src/api/routes.py` — call `filter_non_digital` everywhere `filter_sets` was used.
- `backend/src/config.py` — delete `SET_TYPES`, `IGNORED_SETS`, `MINIMUM_SET_SIZE`.
- `backend/tests/unit/test_scryfall_client.py` — replace `TestScryfallClientFilterSets` with `TestScryfallClientFilterNonDigital`.
- `backend/tests/unit/test_preload.py` — update mock to `filter_non_digital`.
- `backend/tests/unit/test_set_icons.py` — update mock to `filter_non_digital`.
- `backend/tests/integration/test_api_endpoints.py` — update / remove tests that asserted type/code/min-size filtering.
- `backend/tests/integration/test_pdf_generation.py` — update patch targets to `filter_non_digital`.

**Frontend — created**
- `frontend/src/constants/setFilterDefaults.ts` — `DEFAULT_SET_TYPES`, `DEFAULT_IGNORED_SET_CODES`, `DEFAULT_MINIMUM_SET_SIZE`.
- `frontend/src/constants/setTypes.ts` — master list of known `set_type` keys plus display label and description.
- `frontend/src/utils/filtering.ts` — pure `applyFilters(sets, prefs)`.
- `frontend/src/utils/__tests__/filtering.test.ts` — Vitest tests for `applyFilters`.
- `frontend/src/hooks/useSetFilterPreferences.ts` — localStorage-backed hook.
- `frontend/src/hooks/__tests__/useSetFilterPreferences.test.ts` — Vitest tests for the hook.
- `frontend/src/components/SetFilterCustomizer/SetFilterCustomizer.tsx` — modal panel.
- `frontend/src/components/SetFilterCustomizer/SetFilterNavButton.tsx` — header trigger button.
- `frontend/src/components/SetFilterCustomizer/__tests__/SetFilterCustomizer.test.tsx` — Vitest component tests.

**Frontend — modified**
- `frontend/src/types/index.ts` — add `SetFilterPreferences` type.
- `frontend/src/App.tsx` — wire `useSetFilterPreferences`, run `applyFilters`, add modal open state, pass new props to `Header`.
- `frontend/src/components/Layout/Header.tsx` — accept new props and render `SetFilterNavButton`.

---

## Task 1: Add `filter_non_digital` to ScryfallClient (TDD)

**Files:**
- Modify: `backend/src/services/scryfall_client.py`
- Modify: `backend/tests/unit/test_scryfall_client.py`

- [ ] **Step 1: Write failing tests for `filter_non_digital`**

Replace the class `TestScryfallClientFilterSets` in `backend/tests/unit/test_scryfall_client.py` (currently lines 90–210) with a new class `TestScryfallClientFilterNonDigital`. Keep the file's existing imports.

```python
class TestScryfallClientFilterNonDigital:
    """Tests for ScryfallClient.filter_non_digital() static method."""

    def test_returns_all_non_digital_sets(self):
        """All sets without digital=True are returned."""
        sets = [
            {"id": "a", "name": "A", "code": "a", "set_type": "expansion",
             "card_count": 100, "digital": False},
            {"id": "b", "name": "B", "code": "b", "set_type": "promo",
             "card_count": 5, "digital": False},
            {"id": "c", "name": "C", "code": "cmb1", "set_type": "funny",
             "card_count": 100, "digital": False},
        ]
        result = ScryfallClient.filter_non_digital(sets)
        assert {s["id"] for s in result} == {"a", "b", "c"}

    def test_excludes_digital_sets(self):
        """Sets with digital=True are excluded."""
        sets = [
            {"id": "paper", "name": "Paper", "code": "p", "set_type": "expansion",
             "card_count": 100, "digital": False},
            {"id": "online", "name": "Online", "code": "o", "set_type": "expansion",
             "card_count": 100, "digital": True},
        ]
        result = ScryfallClient.filter_non_digital(sets)
        assert len(result) == 1
        assert result[0]["id"] == "paper"

    def test_missing_digital_field_is_included(self):
        """Sets that omit the digital field are treated as non-digital (default False)."""
        sets = [
            {"id": "no-field", "name": "NoField", "code": "n", "set_type": "expansion",
             "card_count": 100},
        ]
        result = ScryfallClient.filter_non_digital(sets)
        assert len(result) == 1
        assert result[0]["id"] == "no-field"

    def test_empty_input_returns_empty_list(self):
        result = ScryfallClient.filter_non_digital([])
        assert result == []
```

- [ ] **Step 2: Run tests, expect failure**

Run: `cd backend && uv run pytest tests/unit/test_scryfall_client.py::TestScryfallClientFilterNonDigital -v`
Expected: 4 failures with `AttributeError: type object 'ScryfallClient' has no attribute 'filter_non_digital'`.

- [ ] **Step 3: Implement `filter_non_digital`**

In `backend/src/services/scryfall_client.py`, add this static method directly above the existing `filter_sets` method (around current line 112):

```python
    @staticmethod
    def filter_non_digital(sets: list[dict]) -> list[dict]:
        """Return only non-digital sets (digital=True excluded)."""
        return [s for s in sets if not s.get("digital", False)]
```

Leave `filter_sets` in place for now — Task 4 deletes it.

- [ ] **Step 4: Run tests, expect pass**

Run: `cd backend && uv run pytest tests/unit/test_scryfall_client.py::TestScryfallClientFilterNonDigital -v`
Expected: 4 passes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/scryfall_client.py backend/tests/unit/test_scryfall_client.py
git commit -m "feat(backend): add ScryfallClient.filter_non_digital

Adds a minimal digital-only filter alongside the existing filter_sets
helper. Replaces the previous TestScryfallClientFilterSets class with
tests scoped to digital exclusion."
```

---

## Task 2: Wire `filter_non_digital` into all four call sites

**Files:**
- Modify: `backend/src/api/routes.py`

- [ ] **Step 1: Replace `filter_sets` calls in routes**

Open `backend/src/api/routes.py`. Make exactly four edits, all replacing `filter_sets` with `filter_non_digital`:

1. In `_preload_icon_cache` (around line 51):
   ```python
           filtered = scryfall_client.filter_non_digital(all_sets)
   ```

2. In `api_sets` (around line 191):
   ```python
           filtered = scryfall_client.filter_non_digital(all_sets)
   ```

3. In `api_set_icons` (around line 217):
   ```python
           filtered = scryfall_client.filter_non_digital(all_sets)
   ```

4. In `generate_pdf` (around line 407):
   ```python
               filtered = scryfall_client.filter_non_digital(all_sets)
   ```

- [ ] **Step 2: Run the full backend test suite**

Run: `cd backend && uv run pytest -x`
Expected: Tests that mock `scryfall_client.filter_sets` (in `test_preload.py`, `test_set_icons.py`, `test_api_endpoints.py`, `test_pdf_generation.py`) start failing because the mocks are now unused — the production code path no longer calls `filter_sets`. Tasks 3 fixes them.

The failures should be assertion failures or "no valid sets selected" / empty lists; not import errors.

- [ ] **Step 3: Commit (with broken tests acknowledged in the message)**

```bash
git add backend/src/api/routes.py
git commit -m "refactor(backend): switch routes to filter_non_digital

Replaces filter_sets calls in /api/sets, /api/set-icons, /generate-pdf,
and the icon-cache preload. Existing tests still mock filter_sets and
will be migrated in the next commit."
```

---

## Task 3: Update existing mock-based tests to use `filter_non_digital`

**Files:**
- Modify: `backend/tests/unit/test_preload.py`
- Modify: `backend/tests/unit/test_set_icons.py`
- Modify: `backend/tests/integration/test_api_endpoints.py`
- Modify: `backend/tests/integration/test_pdf_generation.py`

- [ ] **Step 1: Update `test_preload.py`**

In `backend/tests/unit/test_preload.py`, line 37, replace:
```python
            mock_client.filter_sets.return_value = filtered_sets
```
with:
```python
            mock_client.filter_non_digital.return_value = filtered_sets
```

- [ ] **Step 2: Update `test_set_icons.py`**

In `backend/tests/unit/test_set_icons.py`, replace all three occurrences (lines 55, 78, 94) of:
```python
            mock_client.filter_sets.return_value = filtered_sets
```
with:
```python
            mock_client.filter_non_digital.return_value = filtered_sets
```

- [ ] **Step 3: Update `test_api_endpoints.py`**

In `backend/tests/integration/test_api_endpoints.py`:

(a) Delete the `test_api_sets_endpoint_filters_sets` method (lines 48–75) entirely. Reason: this test asserts `/api/sets` filters by `set_type` — which we are removing. Coverage for the new behaviour is added in Task 4.

(b) In the remaining test method `test_api_sets_endpoint_returns_dicts`, replace the decorator:
```python
    @patch("src.api.routes.scryfall_client.filter_sets")
```
with:
```python
    @patch("src.api.routes.scryfall_client.filter_non_digital")
```

- [ ] **Step 4: Update `test_pdf_generation.py`**

In `backend/tests/integration/test_pdf_generation.py`, replace both occurrences (lines 147 and 166) of:
```python
    @patch("src.api.routes.scryfall_client.filter_sets")
```
with:
```python
    @patch("src.api.routes.scryfall_client.filter_non_digital")
```

- [ ] **Step 5: Run backend test suite, expect pass**

Run: `cd backend && uv run pytest`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/tests
git commit -m "test(backend): migrate filter_sets mocks to filter_non_digital

Updates unit and integration tests to mock the new helper. Removes
test_api_sets_endpoint_filters_sets which asserted set_type filtering
that no longer happens at the API layer."
```

---

## Task 4: Delete `filter_sets`, `SET_TYPES`, `IGNORED_SETS`, `MINIMUM_SET_SIZE`

**Files:**
- Modify: `backend/src/services/scryfall_client.py`
- Modify: `backend/src/config.py`
- Modify: `backend/tests/integration/test_api_endpoints.py`
- Modify: `backend/tests/integration/test_pdf_generation.py`

- [ ] **Step 1: Add a new integration test asserting the unfiltered behaviour**

Append to the `TestApiSetsEndpoint` class in `backend/tests/integration/test_api_endpoints.py`:

```python
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_api_sets_returns_previously_excluded_sets(self, mock_fetch, client):
        """Sets that the old filter excluded (bad type, ignored code, small) are now included."""
        all_sets = [
            {
                "id": "promo-1",
                "name": "Promo One",
                "code": "promo1",
                "set_type": "promo",
                "card_count": 100,
                "digital": False,
            },
            {
                "id": "ignored-1",
                "name": "Mystery Booster Playtest",
                "code": "cmb1",
                "set_type": "expansion",
                "card_count": 100,
                "digital": False,
            },
            {
                "id": "small-1",
                "name": "Tiny Set",
                "code": "t1",
                "set_type": "expansion",
                "card_count": 3,
                "digital": False,
            },
            {
                "id": "digital-1",
                "name": "Digital Only",
                "code": "d1",
                "set_type": "expansion",
                "card_count": 100,
                "digital": True,
            },
        ]
        mock_fetch.return_value = all_sets

        response = client.get("/api/sets")

        assert response.status_code == 200
        ids = {s["id"] for s in response.json()}
        assert ids == {"promo-1", "ignored-1", "small-1"}
```

- [ ] **Step 2: Add an integration test for `/generate-pdf` with a previously-excluded set**

Append to the `TestGeneratePdfEndpoint` class in `backend/tests/integration/test_pdf_generation.py` (or, if that class is named differently, the class that already exercises `/generate-pdf` for the sets view). Use the same imports already present in that file (`from unittest.mock import Mock, patch`, `from io import BytesIO`).

```python
    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_accepts_previously_excluded_set(
        self, mock_fetch, mock_pdf_gen, client
    ):
        """A set that the old filter excluded (e.g., promo type) can now be printed."""
        mock_fetch.return_value = [
            {
                "id": "promo-1",
                "name": "Promo One",
                "code": "promo1",
                "set_type": "promo",
                "card_count": 100,
                "released_at": "2024-01-01",
                "icon_svg_uri": "https://example.com/p.svg",
                "digital": False,
            },
        ]
        mock_generator_instance = Mock()
        mock_generator_instance.generate.return_value = BytesIO(b"%PDF-1.4 fake")
        mock_pdf_gen.return_value = mock_generator_instance

        response = client.post(
            "/generate-pdf",
            data={"set_ids": ["promo-1"], "view_mode": "sets"},
        )

        assert response.status_code == 200
        # PDFGenerator was invoked with the promo set in the items list.
        items = mock_pdf_gen.call_args[0][0]
        assert any(item.get("id") == "promo-1" for item in items)
```

- [ ] **Step 3: Run the new tests, expect pass**

Run: `cd backend && uv run pytest tests/integration/test_api_endpoints.py::TestApiSetsEndpoint::test_api_sets_returns_previously_excluded_sets tests/integration/test_pdf_generation.py -v`
Expected: both new tests pass; the existing PDF generation tests continue to pass.

- [ ] **Step 4: Delete `filter_sets` from `ScryfallClient`**

In `backend/src/services/scryfall_client.py`:

(a) Update the import block (current lines 11–20) to remove the now-unused constants. The block should read:
```python
from src.cache.cache_manager import get_cache_manager
from src.config import (
    SCRYFALL_API_BASE_URL,
    SCRYFALL_API_RATE_LIMIT_DELAY,
    SCRYFALL_API_RETRY_ATTEMPTS,
    SCRYFALL_API_TIMEOUT,
    logger,
)
```

(b) Delete the entire `filter_sets` static method (currently lines 112–145 of the original file; after Task 1's addition it sits just below `filter_non_digital`). The class should still contain `fetch_sets`, `filter_non_digital`, `fetch_card_types_catalog`, `get_card_types_by_color`, and `_apply_rate_limit`.

- [ ] **Step 5: Delete constants from `config.py`**

In `backend/src/config.py`, delete lines that define:
- `SET_TYPES = (...)` (around lines 38–63, including the trailing parenthesis)
- `MINIMUM_SET_SIZE = int(os.getenv("MINIMUM_SET_SIZE", "10"))` (line 64)
- `IGNORED_SETS = (...)` (lines 65–80)

Also delete the `# --- Set Filtering Configuration ---` section header comment (line 37) since the section is now empty.

- [ ] **Step 6: Run the full backend test suite**

Run: `cd backend && uv run pytest`
Expected: all tests pass.

- [ ] **Step 7: Run lint and type check**

Run: `cd backend && uv run ruff check && uv run pyright`
Expected: clean. If `ruff` flags unused imports anywhere else, remove them.

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "refactor(backend): remove SET_TYPES, IGNORED_SETS, MINIMUM_SET_SIZE

Filtering on these dimensions is now owned by the frontend. The backend
keeps only digital-only exclusion via filter_non_digital. Adds an
integration test asserting /api/sets returns previously excluded sets."
```

---

## Task 5: Frontend constants — `setFilterDefaults.ts`

**Files:**
- Create: `frontend/src/constants/setFilterDefaults.ts`

- [ ] **Step 1: Create the constants file**

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && bun run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/constants/setFilterDefaults.ts
git commit -m "feat(frontend): add set filter default constants

Mirrors the values that previously lived in backend/src/config.py.
These become the source of truth for first-visit preferences and the
'Reset to defaults' action."
```

---

## Task 6: Frontend constants — `setTypes.ts` master list

**Files:**
- Create: `frontend/src/constants/setTypes.ts`

- [ ] **Step 1: Create the master list with labels and descriptions**

```typescript
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
  { key: 'alchemy', label: 'Alchemy', description: 'Arena set designed for Alchemy' },
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
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && bun run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/constants/setTypes.ts
git commit -m "feat(frontend): add master list of known set types

Provides display labels and descriptions for known Scryfall set_type
values. Used by the upcoming SetFilterCustomizer modal."
```

---

## Task 7: Add `SetFilterPreferences` type

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Append the type to `types/index.ts`**

Add at the bottom of the existing file (after `ThemePreference`):

```typescript
// User-configurable set filter preferences (persisted to localStorage)
export interface SetFilterPreferences {
  activeSetTypes: string[]
  ignoredSetCodes: string[]
  minimumSetSize: number
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && bun run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(frontend): add SetFilterPreferences type"
```

---

## Task 8: Pure filter — `applyFilters` (TDD)

**Files:**
- Create: `frontend/src/utils/filtering.ts`
- Create: `frontend/src/utils/__tests__/filtering.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/utils/__tests__/filtering.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyFilters } from '../filtering'
import type { MTGSet, SetFilterPreferences } from '../../types'

function makeSet(overrides: Partial<MTGSet> = {}): MTGSet {
  return {
    id: 'id',
    name: 'Name',
    code: 'CODE',
    set_type: 'expansion',
    card_count: 100,
    released_at: '2024-01-01',
    icon_svg_uri: null,
    scryfall_uri: null,
    ...overrides,
  } as MTGSet
}

const baseline: SetFilterPreferences = {
  activeSetTypes: ['expansion', 'core'],
  ignoredSetCodes: ['cmb1'],
  minimumSetSize: 10,
}

describe('applyFilters', () => {
  it('keeps sets whose type is in activeSetTypes', () => {
    const sets = [makeSet({ id: 'a', set_type: 'expansion' })]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['a'])
  })

  it('excludes sets whose type is not in activeSetTypes', () => {
    const sets = [
      makeSet({ id: 'keep', set_type: 'expansion' }),
      makeSet({ id: 'drop', set_type: 'funny' }),
    ]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['keep'])
  })

  it('excludes sets whose code is in ignoredSetCodes (case-insensitive)', () => {
    const sets = [
      makeSet({ id: 'keep', code: 'aaa' }),
      makeSet({ id: 'drop-lower', code: 'cmb1' }),
      makeSet({ id: 'drop-upper', code: 'CMB1' }),
    ]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['keep'])
  })

  it('excludes sets with card_count below minimumSetSize', () => {
    const sets = [
      makeSet({ id: 'big', card_count: 100 }),
      makeSet({ id: 'small', card_count: 5 }),
      makeSet({ id: 'boundary', card_count: 10 }),
    ]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['big', 'boundary'])
  })

  it('returns empty when no sets match', () => {
    const sets = [makeSet({ id: 'drop', set_type: 'funny' })]
    expect(applyFilters(sets, baseline)).toEqual([])
  })

  it('returns empty for empty input', () => {
    expect(applyFilters([], baseline)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests, expect failure**

Run: `cd frontend && bun run test src/utils/__tests__/filtering.test.ts`
Expected: failure — `Cannot find module '../filtering'`.

- [ ] **Step 3: Implement `applyFilters`**

Create `frontend/src/utils/filtering.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests, expect pass**

Run: `cd frontend && bun run test src/utils/__tests__/filtering.test.ts`
Expected: 6 passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/filtering.ts frontend/src/utils/__tests__/filtering.test.ts
git commit -m "feat(frontend): add applyFilters utility for set filter prefs"
```

---

## Task 9: `useSetFilterPreferences` hook (TDD)

**Files:**
- Create: `frontend/src/hooks/useSetFilterPreferences.ts`
- Create: `frontend/src/hooks/__tests__/useSetFilterPreferences.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/hooks/__tests__/useSetFilterPreferences.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSetFilterPreferences } from '../useSetFilterPreferences'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from '../../constants/setFilterDefaults'

const STORAGE_KEY = 'mtg-label-set-filter-preferences'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useSetFilterPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
  })

  it('returns defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(result.current.preferences.activeSetTypes).toEqual([...DEFAULT_SET_TYPES])
    expect(result.current.preferences.ignoredSetCodes).toEqual([...DEFAULT_IGNORED_SET_CODES])
    expect(result.current.preferences.minimumSetSize).toBe(DEFAULT_MINIMUM_SET_SIZE)
  })

  it('persists active set types', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setActiveSetTypes(['core'])
    })
    expect(result.current.preferences.activeSetTypes).toEqual(['core'])
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)
    expect(stored.activeSetTypes).toEqual(['core'])
  })

  it('persists ignored set codes', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setIgnoredSetCodes(['custom'])
    })
    expect(result.current.preferences.ignoredSetCodes).toEqual(['custom'])
  })

  it('persists minimum set size', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setMinimumSetSize(42)
    })
    expect(result.current.preferences.minimumSetSize).toBe(42)
  })

  it('reads previously stored preferences on mount', () => {
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeSetTypes: ['core'],
        ignoredSetCodes: ['xyz'],
        minimumSetSize: 5,
      }),
    )
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(result.current.preferences).toEqual({
      activeSetTypes: ['core'],
      ignoredSetCodes: ['xyz'],
      minimumSetSize: 5,
    })
  })

  it('falls back to defaults when stored value is malformed', () => {
    localStorageMock.setItem(STORAGE_KEY, '{not valid json')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(result.current.preferences.activeSetTypes).toEqual([...DEFAULT_SET_TYPES])
    expect(warnSpy).toHaveBeenCalled()
  })

  it('reset() restores defaults', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setActiveSetTypes(['core'])
      result.current.setMinimumSetSize(99)
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.preferences.activeSetTypes).toEqual([...DEFAULT_SET_TYPES])
    expect(result.current.preferences.minimumSetSize).toBe(DEFAULT_MINIMUM_SET_SIZE)
  })
})
```

- [ ] **Step 2: Run tests, expect failure**

Run: `cd frontend && bun run test src/hooks/__tests__/useSetFilterPreferences.test.ts`
Expected: failure — module not found.

- [ ] **Step 3: Implement the hook**

Create `frontend/src/hooks/useSetFilterPreferences.ts`:

```typescript
import { useState, useCallback } from 'react'
import type { SetFilterPreferences } from '../types'
import { getStorageItem, setStorageItem } from '../utils/localStorage'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from '../constants/setFilterDefaults'

const STORAGE_KEY = 'set-filter-preferences'

function buildDefaults(): SetFilterPreferences {
  return {
    activeSetTypes: [...DEFAULT_SET_TYPES],
    ignoredSetCodes: [...DEFAULT_IGNORED_SET_CODES],
    minimumSetSize: DEFAULT_MINIMUM_SET_SIZE,
  }
}

function isValid(value: unknown): value is SetFilterPreferences {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<SetFilterPreferences>
  return (
    Array.isArray(v.activeSetTypes) &&
    v.activeSetTypes.every((t) => typeof t === 'string') &&
    Array.isArray(v.ignoredSetCodes) &&
    v.ignoredSetCodes.every((c) => typeof c === 'string') &&
    typeof v.minimumSetSize === 'number' &&
    Number.isFinite(v.minimumSetSize)
  )
}

export function useSetFilterPreferences() {
  const [preferences, setPreferences] = useState<SetFilterPreferences>(() => {
    const stored = getStorageItem<unknown>(STORAGE_KEY)
    if (stored === null) return buildDefaults()
    if (!isValid(stored)) {
      console.warn('Invalid set filter preferences in localStorage; using defaults')
      return buildDefaults()
    }
    return stored
  })

  const persist = useCallback((updated: SetFilterPreferences) => {
    setPreferences(updated)
    setStorageItem(STORAGE_KEY, updated)
  }, [])

  const setActiveSetTypes = useCallback(
    (types: string[]) => persist({ ...preferences, activeSetTypes: types }),
    [preferences, persist],
  )

  const setIgnoredSetCodes = useCallback(
    (codes: string[]) => persist({ ...preferences, ignoredSetCodes: codes }),
    [preferences, persist],
  )

  const setMinimumSetSize = useCallback(
    (size: number) => persist({ ...preferences, minimumSetSize: size }),
    [preferences, persist],
  )

  const reset = useCallback(() => {
    persist(buildDefaults())
  }, [persist])

  return {
    preferences,
    setActiveSetTypes,
    setIgnoredSetCodes,
    setMinimumSetSize,
    reset,
  }
}

export type SetFilterPreferencesApi = ReturnType<typeof useSetFilterPreferences>
```

Note: the storage key used by `getStorageItem`/`setStorageItem` is automatically prefixed with `mtg-label-`, so the on-disk key matches the test's `mtg-label-set-filter-preferences`.

- [ ] **Step 4: Run tests, expect pass**

Run: `cd frontend && bun run test src/hooks/__tests__/useSetFilterPreferences.test.ts`
Expected: 7 passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useSetFilterPreferences.ts frontend/src/hooks/__tests__/useSetFilterPreferences.test.ts
git commit -m "feat(frontend): add useSetFilterPreferences hook

Reads from and writes to localStorage; seeds with defaults from
setFilterDefaults; falls back to defaults on malformed JSON."
```

---

## Task 10: `SetFilterNavButton` (header trigger)

**Files:**
- Create: `frontend/src/components/SetFilterCustomizer/SetFilterNavButton.tsx`

- [ ] **Step 1: Create the button component**

Mirrors `TemplateNavButton` styling so the two controls visually match.

```tsx
interface SetFilterNavButtonProps {
  isOpen: boolean
  onToggle: () => void
  modified: boolean
}

export function SetFilterNavButton({ isOpen, onToggle, modified }: SetFilterNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-9 px-3 py-0 flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-sm text-white font-medium cursor-pointer select-none"
      aria-expanded={isOpen}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`shrink-0 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        aria-hidden="true"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
      <span className="pointer-events-none">Filters</span>
      {modified && (
        <span className="bg-mtg-accent text-gray-900 text-xs px-2 py-0.5 rounded font-bold shrink-0 pointer-events-none">
          custom
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && bun run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SetFilterCustomizer/SetFilterNavButton.tsx
git commit -m "feat(frontend): add SetFilterNavButton header trigger"
```

---

## Task 11: `SetFilterCustomizer` modal (TDD)

**Files:**
- Create: `frontend/src/components/SetFilterCustomizer/SetFilterCustomizer.tsx`
- Create: `frontend/src/components/SetFilterCustomizer/__tests__/SetFilterCustomizer.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetFilterCustomizer } from '../SetFilterCustomizer'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from '../../../constants/setFilterDefaults'
import type { MTGSet, SetFilterPreferences } from '../../../types'

const defaultPrefs: SetFilterPreferences = {
  activeSetTypes: [...DEFAULT_SET_TYPES],
  ignoredSetCodes: [...DEFAULT_IGNORED_SET_CODES],
  minimumSetSize: DEFAULT_MINIMUM_SET_SIZE,
}

const sampleSets: MTGSet[] = [
  {
    id: '1',
    name: 'Mystery Booster Playtest Cards',
    code: 'cmb1',
    set_type: 'expansion',
    card_count: 100,
  } as MTGSet,
  {
    id: '2',
    name: 'Some Promo',
    code: 'p1',
    set_type: 'promo',
    card_count: 50,
  } as MTGSet,
]

function makeProps(overrides: Partial<React.ComponentProps<typeof SetFilterCustomizer>> = {}) {
  return {
    isOpen: true,
    preferences: defaultPrefs,
    allSets: sampleSets,
    onActiveSetTypesChange: vi.fn(),
    onIgnoredSetCodesChange: vi.fn(),
    onMinimumSetSizeChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  }
}

describe('SetFilterCustomizer', () => {
  it('renders the three sections', () => {
    render(<SetFilterCustomizer {...makeProps()} />)
    expect(screen.getByRole('heading', { name: /set types/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ignored sets/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/minimum set size/i)).toBeInTheDocument()
  })

  it('toggling a set type calls onActiveSetTypesChange with the type removed', () => {
    const onActiveSetTypesChange = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onActiveSetTypesChange })} />)
    const coreCheckbox = screen.getByRole('checkbox', { name: /^core/i })
    fireEvent.click(coreCheckbox)
    expect(onActiveSetTypesChange).toHaveBeenCalledWith(
      defaultPrefs.activeSetTypes.filter((t) => t !== 'core'),
    )
  })

  it('toggling an ignored set calls onIgnoredSetCodesChange with the code removed', () => {
    const onIgnoredSetCodesChange = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onIgnoredSetCodesChange })} />)
    // cmb1 is ignored by default; unchecking should remove it
    const cmb1Checkbox = screen.getByRole('checkbox', { name: /cmb1/i })
    fireEvent.click(cmb1Checkbox)
    expect(onIgnoredSetCodesChange).toHaveBeenCalledWith(
      defaultPrefs.ignoredSetCodes.filter((c) => c !== 'cmb1'),
    )
  })

  it('changing minimum set size calls onMinimumSetSizeChange with parsed number', () => {
    const onMinimumSetSizeChange = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onMinimumSetSizeChange })} />)
    const input = screen.getByLabelText(/minimum set size/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '25' } })
    expect(onMinimumSetSizeChange).toHaveBeenCalledWith(25)
  })

  it('clicking Reset to defaults calls onReset', () => {
    const onReset = vi.fn()
    render(<SetFilterCustomizer {...makeProps({ onReset })} />)
    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }))
    expect(onReset).toHaveBeenCalled()
  })

  it('resolves ignored set names from allSets', () => {
    render(<SetFilterCustomizer {...makeProps()} />)
    // cmb1 is in default ignored codes AND in sampleSets, so its name should render
    expect(screen.getByText(/Mystery Booster Playtest Cards/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests, expect failure**

Run: `cd frontend && bun run test src/components/SetFilterCustomizer/__tests__/SetFilterCustomizer.test.tsx`
Expected: module-not-found failures.

- [ ] **Step 3: Implement the component**

Create `frontend/src/components/SetFilterCustomizer/SetFilterCustomizer.tsx`:

```tsx
import { useId, useMemo } from 'react'
import type { MTGSet, SetFilterPreferences } from '../../types'
import { KNOWN_SET_TYPES, getSetTypeMeta } from '../../constants/setTypes'
import { DEFAULT_IGNORED_SET_CODES } from '../../constants/setFilterDefaults'

interface SetFilterCustomizerProps {
  isOpen: boolean
  preferences: SetFilterPreferences
  allSets: MTGSet[]
  onActiveSetTypesChange: (types: string[]) => void
  onIgnoredSetCodesChange: (codes: string[]) => void
  onMinimumSetSizeChange: (size: number) => void
  onReset: () => void
}

const SIZE_INPUT_MIN = 0
const SIZE_INPUT_MAX = 1000

export function SetFilterCustomizer({
  isOpen,
  preferences,
  allSets,
  onActiveSetTypesChange,
  onIgnoredSetCodesChange,
  onMinimumSetSizeChange,
  onReset,
}: SetFilterCustomizerProps) {
  const minSizeId = useId()

  // Union of known set types and any set_type observed in the data.
  const setTypeKeys = useMemo(() => {
    const keys = new Set<string>(KNOWN_SET_TYPES.map((t) => t.key))
    for (const s of allSets) keys.add(s.set_type)
    return [...keys].sort()
  }, [allSets])

  // Map of set code → set, for resolving ignored-set names.
  const setByCode = useMemo(() => {
    const map: Record<string, MTGSet> = {}
    for (const s of allSets) map[s.code.toLowerCase()] = s
    return map
  }, [allSets])

  // Union of default-ignored codes and any user-added codes already in prefs.
  const ignoredCodeRows = useMemo(() => {
    const codes = new Set<string>(DEFAULT_IGNORED_SET_CODES)
    for (const c of preferences.ignoredSetCodes) codes.add(c)
    return [...codes].sort()
  }, [preferences.ignoredSetCodes])

  const activeTypeSet = useMemo(
    () => new Set(preferences.activeSetTypes),
    [preferences.activeSetTypes],
  )
  const ignoredCodeSet = useMemo(
    () => new Set(preferences.ignoredSetCodes.map((c) => c.toLowerCase())),
    [preferences.ignoredSetCodes],
  )

  const toggleSetType = (key: string) => {
    if (activeTypeSet.has(key)) {
      onActiveSetTypesChange(preferences.activeSetTypes.filter((t) => t !== key))
    } else {
      onActiveSetTypesChange([...preferences.activeSetTypes, key])
    }
  }

  const toggleIgnoredCode = (code: string) => {
    const lower = code.toLowerCase()
    if (ignoredCodeSet.has(lower)) {
      onIgnoredSetCodesChange(
        preferences.ignoredSetCodes.filter((c) => c.toLowerCase() !== lower),
      )
    } else {
      onIgnoredSetCodesChange([...preferences.ignoredSetCodes, lower])
    }
  }

  return (
    <div
      className="overflow-hidden grid transition-[grid-template-rows] duration-200 ease-out bg-mtg-card-bg border-b border-mtg-border"
      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Set Types */}
            <section className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
              <h3 className="font-semibold text-mtg-text mb-3 text-sm">Set Types</h3>
              <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {setTypeKeys.map((key) => {
                  const meta = getSetTypeMeta(key)
                  const checked = activeTypeSet.has(key)
                  return (
                    <li key={key}>
                      <label className="flex items-start gap-2 cursor-pointer text-sm text-mtg-text">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSetType(key)}
                          aria-label={meta.label}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium">{meta.label}</span>
                          {meta.description && (
                            <span className="block text-xs text-mtg-text-muted">
                              {meta.description}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Ignored Sets */}
            <section className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
              <h3 className="font-semibold text-mtg-text mb-3 text-sm">Ignored Sets</h3>
              <p className="text-xs text-mtg-text-muted mb-3">
                Uncheck a row to include that set in the list.
              </p>
              <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {ignoredCodeRows.map((code) => {
                  const checked = ignoredCodeSet.has(code.toLowerCase())
                  const set = setByCode[code.toLowerCase()]
                  return (
                    <li key={code}>
                      <label className="flex items-start gap-2 cursor-pointer text-sm text-mtg-text">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIgnoredCode(code)}
                          aria-label={code}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium">
                            {set ? set.name : code.toUpperCase()}
                          </span>
                          <span className="block text-xs text-mtg-text-muted">
                            {code}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          {/* Minimum Set Size */}
          <div className="mt-4 rounded-lg border border-mtg-border bg-mtg-section-bg p-4 max-w-md">
            <label
              htmlFor={minSizeId}
              className="block font-semibold text-mtg-text mb-2 text-sm"
            >
              Minimum set size
            </label>
            <p className="text-xs text-mtg-text-muted mb-2">
              Hide sets with fewer cards than this.
            </p>
            <input
              id={minSizeId}
              type="number"
              min={SIZE_INPUT_MIN}
              max={SIZE_INPUT_MAX}
              value={preferences.minimumSetSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!Number.isNaN(v)) onMinimumSetSizeChange(v)
              }}
              aria-label="Minimum set size"
              className="h-9 w-32 px-3 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm"
            />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={onReset}
              className="h-9 px-3 py-0 flex items-center text-sm border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `cd frontend && bun run test src/components/SetFilterCustomizer/__tests__/SetFilterCustomizer.test.tsx`
Expected: 6 passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SetFilterCustomizer
git commit -m "feat(frontend): add SetFilterCustomizer modal

Modal with three sections (set types, ignored sets, minimum set size)
and a reset button. Wires to setter callbacks supplied by the parent."
```

---

## Task 12: Wire the modal into `Header.tsx`

**Files:**
- Modify: `frontend/src/components/Layout/Header.tsx`

- [ ] **Step 1: Update `HeaderProps`**

In `frontend/src/components/Layout/Header.tsx`, add three props to the existing `HeaderProps` interface (after `useCustomTemplate`):

```typescript
  setFilterOpen: boolean
  onSetFilterToggle: () => void
  setFilterModified: boolean
```

- [ ] **Step 2: Destructure the new props in the component signature**

Add `setFilterOpen`, `onSetFilterToggle`, `setFilterModified` to the destructured props list (alphabetised next to the others; placement doesn't matter functionally).

- [ ] **Step 3: Import and render the button**

At the top of the file, after the `TemplateNavButton` import, add:

```typescript
import { SetFilterNavButton } from '../SetFilterCustomizer/SetFilterNavButton'
```

In the desktop nav cluster (the `<div className="hidden min-[880px]:block">` containing `TemplateNavButton`), add a second wrapper directly after it:

```tsx
            <div className="hidden min-[880px]:block">
              <SetFilterNavButton
                isOpen={setFilterOpen}
                onToggle={onSetFilterToggle}
                modified={setFilterModified}
              />
            </div>
```

In the mobile hamburger menu panel (the `<div className="flex flex-col gap-2 py-2 border-t border-white/20 mt-1">`), append after the existing `TemplateNavButton` wrapper:

```tsx
                <div className="w-full min-w-0 [&_button]:w-full [&_button]:justify-start">
                  <SetFilterNavButton
                    isOpen={setFilterOpen}
                    onToggle={onSetFilterToggle}
                    modified={setFilterModified}
                  />
                </div>
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && bun run build`
Expected: fail — `App.tsx` doesn't pass the new props yet. That's fine; Task 13 fixes it. If any other type error appears, address it; otherwise proceed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Layout/Header.tsx
git commit -m "feat(frontend): add SetFilterNavButton to Header

App.tsx wiring follows in the next commit."
```

---

## Task 13: Wire `App.tsx` — apply filters and mount the modal

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add imports near the top**

Insert under the existing hook imports (around line 8):

```typescript
import { useSetFilterPreferences } from './hooks/useSetFilterPreferences'
import { applyFilters } from './utils/filtering'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from './constants/setFilterDefaults'
```

Add a lazy import for the customizer alongside the existing `TemplateCustomizer` lazy import (around line 16):

```typescript
const SetFilterCustomizer = lazy(() =>
  import('./components/SetFilterCustomizer/SetFilterCustomizer').then((m) => ({
    default: m.SetFilterCustomizer,
  })),
)
```

- [ ] **Step 2: Initialise the hook and computed flags inside `App`**

Directly after the existing `useSelection` destructure (around line 43), add:

```typescript
  const {
    preferences: setFilterPreferences,
    setActiveSetTypes,
    setIgnoredSetCodes,
    setMinimumSetSize,
    reset: resetSetFilter,
  } = useSetFilterPreferences()
```

- [ ] **Step 3: Replace the `sets` memo with filtered output**

Find the line:
```typescript
  const sets: MTGSet[] = useMemo(() => setsResponse?.data ?? [], [setsResponse?.data])
```

Replace with:
```typescript
  const rawSets: MTGSet[] = useMemo(() => setsResponse?.data ?? [], [setsResponse?.data])
  const sets: MTGSet[] = useMemo(
    () => applyFilters(rawSets, setFilterPreferences),
    [rawSets, setFilterPreferences],
  )
```

- [ ] **Step 4: Add modal open/mounted state**

Just below the existing `templateCustomizerOpen` / `templateCustomizerMounted` declarations (around line 49), add:

```typescript
  const [setFilterOpen, setSetFilterOpen] = useState(false)
  const [setFilterMounted, setSetFilterMounted] = useState(false)
  if (setFilterOpen && !setFilterMounted) setSetFilterMounted(true)
```

Add a `setFilterModified` flag (placed near the other memoized values, e.g., after `templateBadgeLabel`):

```typescript
  const setFilterModified = useMemo(() => {
    const a = setFilterPreferences.activeSetTypes
    const b = setFilterPreferences.ignoredSetCodes
    if (a.length !== DEFAULT_SET_TYPES.length) return true
    if (b.length !== DEFAULT_IGNORED_SET_CODES.length) return true
    if (setFilterPreferences.minimumSetSize !== DEFAULT_MINIMUM_SET_SIZE) return true
    const defaultsA = new Set<string>(DEFAULT_SET_TYPES)
    if (a.some((t) => !defaultsA.has(t))) return true
    const defaultsB = new Set<string>(DEFAULT_IGNORED_SET_CODES)
    if (b.some((c) => !defaultsB.has(c.toLowerCase()))) return true
    return false
  }, [setFilterPreferences])
```

- [ ] **Step 5: Pass the new props to `Header`**

In the existing `<Header ... />` JSX, add three new props at the bottom (just before `/>`):

```tsx
        setFilterOpen={setFilterOpen}
        onSetFilterToggle={() => setSetFilterOpen((o) => !o)}
        setFilterModified={setFilterModified}
```

- [ ] **Step 6: Mount the customizer**

Directly after the existing `<Suspense fallback={null}><TemplateCustomizer ... /></Suspense>` block, add:

```tsx
      <Suspense fallback={null}>
        {setFilterMounted && (
          <SetFilterCustomizer
            isOpen={setFilterOpen}
            preferences={setFilterPreferences}
            allSets={rawSets}
            onActiveSetTypesChange={setActiveSetTypes}
            onIgnoredSetCodesChange={setIgnoredSetCodes}
            onMinimumSetSizeChange={setMinimumSetSize}
            onReset={resetSetFilter}
          />
        )}
      </Suspense>
```

- [ ] **Step 7: Type-check and build**

Run: `cd frontend && bun run build`
Expected: pass.

- [ ] **Step 8: Lint**

Run: `cd frontend && bun run lint`
Expected: clean.

- [ ] **Step 9: Run full frontend test suite**

Run: `cd frontend && bun run test`
Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): wire SetFilterCustomizer into App

Filters the raw /api/sets response through user preferences before
rendering. Modal mounts lazily on first open."
```

---

## Task 14: Manual smoke test and final verification

**Files:**
- (none — verification only)

- [ ] **Step 1: Start backend**

Run in a separate terminal: `cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080`
Expected: server starts. Wait for "Application startup complete".

- [ ] **Step 2: Start frontend**

Run in a separate terminal: `cd frontend && bun run dev`
Expected: Vite dev server starts on port 5173.

- [ ] **Step 3: Browser sanity check**

Open `http://localhost:5173/`.

Expected behaviour:
1. Set list loads as before (defaults match prior production behaviour).
2. The header shows a new "Filters" button next to the "Template" button.
3. Clicking "Filters" opens a panel with three sections: Set Types, Ignored Sets, Minimum set size.
4. Toggling a set type checkbox (e.g., uncheck "Expansion") immediately removes those sets from the list. Re-checking it brings them back.
5. Unchecking an ignored set (e.g., `sir`) — if present in the fetched data — makes it appear in the list.
6. Changing the minimum set size to a high value removes small sets.
7. The "Filters" button shows a `custom` badge once preferences diverge from defaults.
8. "Reset to defaults" clears the badge and restores the original list.
9. Reload the page: changes persist (localStorage).
10. Generate a PDF for a previously-ignored set you re-enabled — PDF downloads successfully.

- [ ] **Step 4: Run full test suites one last time**

Run in parallel:
- `cd backend && uv run pytest`
- `cd frontend && bun run test`

Expected: both green.

- [ ] **Step 5: Run lint and typecheck**

Run:
- `cd backend && uv run ruff check && uv run pyright`
- `cd frontend && bun run lint && bun run build`

Expected: clean.

- [ ] **Step 6: Commit if any cleanup edits were needed**

If steps 4–5 surfaced fixes, commit them with an appropriate message. Otherwise skip.
