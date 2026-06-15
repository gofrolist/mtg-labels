# Alphabet Divider Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in option that expands each selected set into one printable label per user-chosen letter (e.g. `Modern Horizons 2 / MH2 - June 2021 / Q`), for alphabetical divider tabs within a set.

**Architecture:** The user picks letters in the frontend (Off / All A–Z / Custom `A-F, H, L-Z`). The frontend parses the range syntax into a plain list of single letters and sends it as a comma-separated `letters` form field. The backend validates the single letters, expands `sets × letters` into label items (injecting a `letter` key), and the PDF renderer draws a large letter glyph just left of the existing set icon. When no letters are sent, behavior is identical to today.

**Tech Stack:** Backend — Python 3.13, FastAPI, ReportLab, pytest. Frontend — React 19 + TypeScript + Vite + Tailwind 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-15-alphabet-divider-labels-design.md`

**Conventions:**
- Backend tests: `cd backend && uv run pytest <path> -v`. Coverage ≥80% enforced by `pyproject.toml`.
- Frontend tests: `cd frontend && bun run test <path>`.
- Commits: conventional commits (`feat:`, `test:`, `refactor:`). Attribution is disabled globally — do **not** add co-author trailers.
- Immutability: never mutate shared dicts/objects — build new ones.

---

## Task 1: Letter font-size helper (backend)

A pure helper that scales the divider letter's font size to the label height (so it stays big on tall Avery 5160 labels and fits short ones), capped at a max.

**Files:**
- Modify: `backend/src/config.py` (add constants after `SET_SYMBOL_MAX_WIDTH`, ~line 235)
- Modify: `backend/src/services/helpers.py` (imports ~line 10-15; add function)
- Test: `backend/tests/unit/test_helpers.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/unit/test_helpers.py`. First ensure the import line at the top of the file includes `letter_font_size`:

```python
from src.services.helpers import (
    abbreviate_set_name,
    fit_text_to_width,
    letter_font_size,
)
```

(Merge with whatever helper imports already exist at the top of the file — keep it alphabetized and do not drop existing imports.)

Then add this test class:

```python
class TestLetterFontSize:
    """Tests for letter_font_size() function."""

    def test_scales_with_label_height(self):
        # Default scale is 0.5, so a 72pt-tall label -> 36pt letter.
        assert letter_font_size(72) == 36.0

    def test_caps_at_max(self):
        # Tall label is capped at LETTER_MAX_FONT_SIZE (default 40).
        assert letter_font_size(200) == 40.0

    def test_short_label(self):
        # Narrow 48pt label -> 24pt letter (below the cap).
        assert letter_font_size(48) == 24.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/unit/test_helpers.py::TestLetterFontSize -v`
Expected: FAIL with `ImportError: cannot import name 'letter_font_size'`.

- [ ] **Step 3: Add config constants**

In `backend/src/config.py`, immediately after the `SET_SYMBOL_MAX_WIDTH` block (the lines defining `SET_SYMBOL_MAX_WIDTH = float(...)`), add:

```python
# --- Alphabet Divider Letter ---
# Big letter drawn on alphabet divider labels. Font size scales with the label
# height (a fraction of label height), capped at a maximum point size so it
# stays large on tall labels and fits short ones.
LETTER_FONT_SCALE = float(os.getenv("LETTER_FONT_SCALE", "0.5"))
LETTER_MAX_FONT_SIZE = float(os.getenv("LETTER_MAX_FONT_SIZE", "40"))
```

- [ ] **Step 4: Implement the helper**

In `backend/src/services/helpers.py`, extend the `from src.config import (...)` block to also import the two new constants:

```python
from src.config import (
    ABBREVIATION_MAP,
    LETTER_FONT_SCALE,
    LETTER_MAX_FONT_SIZE,
    MAX_SET_NAME_LENGTH,
    SCRYFALL_API_RATE_LIMIT_DELAY,
    logger,
)
```

Then add this function (place it near `fit_text_to_width`):

```python
def letter_font_size(label_height: float) -> float:
    """Font size (points) for the alphabet divider letter on a label.

    Scales with the label height so the letter stays large on tall labels and
    shrinks on short ones, capped at ``LETTER_MAX_FONT_SIZE``.

    Args:
        label_height: Label height in points.

    Returns:
        Font size in points.
    """
    return min(label_height * LETTER_FONT_SCALE, LETTER_MAX_FONT_SIZE)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/unit/test_helpers.py::TestLetterFontSize -v`
Expected: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
git add backend/src/config.py backend/src/services/helpers.py backend/tests/unit/test_helpers.py
git commit -m "feat(backend): add letter_font_size helper for divider labels"
```

---

## Task 2: Backend letter parsing & validation

`_parse_letters` turns the `letters` form value (comma-separated single letters, already range-expanded by the frontend) into a validated, de-duplicated, ordered list. The backend deliberately does **not** parse ranges — that lives only in the frontend.

**Files:**
- Modify: `backend/src/api/routes.py` (add function near `_validate_id_list`, ~after line 261)
- Test: `backend/tests/unit/test_parse_letters.py` (new)

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_parse_letters.py`:

```python
"""Unit tests for _parse_letters in the PDF generation route."""

import pytest
from fastapi import HTTPException

from src.api.routes import _parse_letters


class TestParseLetters:
    """Tests for _parse_letters()."""

    def test_none_returns_empty(self):
        assert _parse_letters(None) == []

    def test_empty_string_returns_empty(self):
        assert _parse_letters("") == []

    def test_parses_and_uppercases(self):
        assert _parse_letters("a,b,c") == ["A", "B", "C"]

    def test_dedupes_preserving_order(self):
        assert _parse_letters("A,A,B") == ["A", "B"]

    def test_skips_empty_tokens(self):
        assert _parse_letters("A,,B,") == ["A", "B"]

    def test_strips_whitespace(self):
        assert _parse_letters(" A , B ") == ["A", "B"]

    def test_rejects_multichar_token(self):
        with pytest.raises(HTTPException) as exc:
            _parse_letters("AB")
        assert exc.value.status_code == 400

    def test_rejects_non_letter(self):
        with pytest.raises(HTTPException) as exc:
            _parse_letters("1")
        assert exc.value.status_code == 400

    def test_rejects_too_long(self):
        with pytest.raises(HTTPException) as exc:
            _parse_letters("A," * 200)
        assert exc.value.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/unit/test_parse_letters.py -v`
Expected: FAIL with `ImportError: cannot import name '_parse_letters'`.

- [ ] **Step 3: Implement `_parse_letters`**

In `backend/src/api/routes.py`, directly after the `_validate_id_list` function (ends ~line 261), add:

```python
def _parse_letters(raw: str | None) -> list[str]:
    """Parse the alphabet-divider ``letters`` form value into single letters.

    The frontend expands ranges (``A-F, H, L-Z``) before sending, so the value
    here is a comma-separated list of single letters. Each token is validated as
    a single A-Z letter, uppercased, and de-duplicated while preserving order.

    Args:
        raw: Comma-separated single letters, or ``None``/empty.

    Returns:
        Ordered, de-duplicated list of uppercase letters (empty if no input).

    Raises:
        HTTPException: 400 if the value is too long or has a non-letter token.
    """
    if not raw:
        return []
    if len(raw) > 200:
        raise HTTPException(status_code=400, detail="Letters value too long.")
    letters: list[str] = []
    for token in raw.split(","):
        token = token.strip().upper()
        if not token:
            continue
        if len(token) != 1 or not ("A" <= token <= "Z"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid letter '{token}'. Use single letters A-Z.",
            )
        if token not in letters:
            letters.append(token)
    return letters
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/unit/test_parse_letters.py -v`
Expected: PASS (9 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/routes.py backend/tests/unit/test_parse_letters.py
git commit -m "feat(backend): validate alphabet letters form value"
```

---

## Task 3: Expand `sets × letters` in `_build_label_items`

Add an optional `letters` parameter. When present (sets view), each resolved set is expanded into one item per letter, grouped by set and ordered by letter, each item a **new dict** with a `letter` key (no mutation of the cached set dict).

**Files:**
- Modify: `backend/src/api/routes.py` (`_build_label_items`, lines 344-379)
- Test: `backend/tests/unit/test_build_label_items.py` (new)

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_build_label_items.py`:

```python
"""Unit tests for _build_label_items letter expansion."""

from unittest.mock import patch

from src.api.routes import _build_label_items

SAMPLE_SETS = [
    {"id": "s1", "name": "Set One", "code": "S1", "released_at": "2021-06-01"},
    {"id": "s2", "name": "Set Two", "code": "S2", "released_at": "2022-02-01"},
]


class TestBuildLabelItemsLetters:
    """Tests for letter expansion in _build_label_items()."""

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_expands_each_set_per_letter(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1", "s2"], None, 0, ["A", "B", "C"])
        assert [(i["id"], i["letter"]) for i in items] == [
            ("s1", "A"),
            ("s1", "B"),
            ("s1", "C"),
            ("s2", "A"),
            ("s2", "B"),
            ("s2", "C"),
        ]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_no_letters_one_item_per_set(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1", "s2"], None, 0, None)
        assert len(items) == 2
        assert "letter" not in items[0]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_does_not_mutate_source_set(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        _build_label_items("sets", ["s1"], None, 0, ["A"])
        assert "letter" not in SAMPLE_SETS[0]

    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_letters_keep_leading_placeholders(self, mock_fetch):
        mock_fetch.return_value = SAMPLE_SETS
        items = _build_label_items("sets", ["s1"], None, 2, ["A", "B"])
        assert items[0] == {"__placeholder__": True}
        assert items[1] == {"__placeholder__": True}
        assert [i["letter"] for i in items[2:]] == ["A", "B"]

    def test_types_view_ignores_letters(self):
        items = _build_label_items("types", None, ["White:Creature"], 0, ["A", "B"])
        assert len(items) == 1
        assert "letter" not in items[0]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/unit/test_build_label_items.py -v`
Expected: FAIL with `TypeError: _build_label_items() takes 4 positional arguments but 5 were given`.

- [ ] **Step 3: Add the `letters` parameter and expansion**

In `backend/src/api/routes.py`, change the `_build_label_items` signature to add `letters`:

```python
def _build_label_items(
    view_mode: str,
    set_ids: list[str] | None,
    card_type_ids: list[str] | None,
    placeholder_count: int,
    letters: list[str] | None = None,
) -> list[dict]:
```

Then replace the sets-resolution loop at the end of the function:

```python
    # Sets (default): resolve each requested ID against the non-digital sets.
    all_sets = scryfall_client.fetch_sets()
    filtered = scryfall_client.filter_non_digital(all_sets)
    sets_by_id: dict[str, dict] = {s["id"]: s for s in filtered if isinstance(s.get("id"), str)}
    for set_id in set_ids or []:
        if set_id in sets_by_id:
            items.append(sets_by_id[set_id])
    return items
```

with this letter-aware version:

```python
    # Sets (default): resolve each requested ID against the non-digital sets.
    all_sets = scryfall_client.fetch_sets()
    filtered = scryfall_client.filter_non_digital(all_sets)
    sets_by_id: dict[str, dict] = {s["id"]: s for s in filtered if isinstance(s.get("id"), str)}
    for set_id in set_ids or []:
        if set_id not in sets_by_id:
            continue
        set_dict = sets_by_id[set_id]
        if letters:
            # One label per letter; build a new dict so the cached set is
            # never mutated.
            for letter in letters:
                items.append({**set_dict, "letter": letter})
        else:
            items.append(set_dict)
    return items
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/unit/test_build_label_items.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/routes.py backend/tests/unit/test_build_label_items.py
git commit -m "feat(backend): expand sets by letters in label items"
```

---

## Task 4: Wire `letters` into `POST /generate-pdf`

Accept a `letters` form param, parse it, and thread it into `_build_label_items`.

**Files:**
- Modify: `backend/src/api/routes.py` (endpoint signature ~648-655; body where `_build_label_items` is called ~737-739)
- Test: `backend/tests/integration/test_pdf_generation.py`

- [ ] **Step 1: Write the failing test**

In `backend/tests/integration/test_pdf_generation.py`, inside `class TestGeneratePdfEndpoint`, add (ensure `from io import BytesIO` and `from unittest.mock import Mock, patch` are imported at the top — they already are for the existing tests):

```python
    @patch("src.api.routes.PDFGenerator")
    @patch("src.api.routes.scryfall_client.fetch_sets")
    def test_generate_pdf_with_letters_expands_items(
        self, mock_fetch, mock_pdf_gen, client, sample_set_data
    ):
        """letters form field expands each set into one item per letter."""
        mock_fetch.return_value = sample_set_data

        mock_instance = Mock()
        mock_instance.generate.return_value = BytesIO(b"%PDF-1.4 fake pdf content")
        mock_pdf_gen.return_value = mock_instance

        response = client.post(
            "/generate-pdf",
            data={"set_ids": ["test-set-1"], "letters": "A,B,C"},
        )

        assert response.status_code == 200
        # First positional arg to PDFGenerator(...) is the list of label items.
        passed_items = mock_pdf_gen.call_args.args[0]
        assert [item["letter"] for item in passed_items] == ["A", "B", "C"]

    def test_generate_pdf_invalid_letters_returns_400(self, client):
        """Non-letter tokens are rejected before any work happens."""
        response = client.post(
            "/generate-pdf",
            data={"set_ids": ["test-set-1"], "letters": "1,2"},
        )
        assert response.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/integration/test_pdf_generation.py::TestGeneratePdfEndpoint::test_generate_pdf_with_letters_expands_items -v`
Expected: FAIL — `letters` is ignored, so `passed_items` has 1 entry with no `letter` key (KeyError/assert fails).

- [ ] **Step 3: Add the `letters` form param**

In `backend/src/api/routes.py`, add `letters` to the endpoint signature:

```python
@app.post("/generate-pdf", include_in_schema=False)
async def generate_pdf(
    set_ids: list[str] | None = Form(None),
    card_type_ids: list[str] | None = Form(None),
    use_template: str | None = Form(None),
    template: str | None = Form(None),
    custom_template: str | None = Form(None),
    placeholders: int = Form(0),
    view_mode: str = Form("sets"),
    letters: str | None = Form(None),
) -> StreamingResponse:
```

- [ ] **Step 4: Parse and pass `letters`**

In the same function, find the `_build_label_items(...)` call:

```python
    selected_items_data = _build_label_items(
        view_mode, set_ids, card_type_ids, placeholder_count
    )
```

Replace it with a parse step plus the extra argument:

```python
    # Parse alphabet divider letters (raises 400 on a non-letter token).
    parsed_letters = _parse_letters(letters)

    selected_items_data = _build_label_items(
        view_mode, set_ids, card_type_ids, placeholder_count, parsed_letters
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/integration/test_pdf_generation.py -v`
Expected: PASS (existing tests + both new tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/routes.py backend/tests/integration/test_pdf_generation.py
git commit -m "feat(backend): accept letters param in generate-pdf"
```

---

## Task 5: Render the letter glyph (PDF)

Draw a large letter vertically centered, just left of the existing top-right set icon, reserving width so the set name/date re-fit.

**Files:**
- Modify: `backend/src/services/pdf_generator.py` (helpers import ~32-38; `_draw_label` ~205-275)
- Test: `backend/tests/unit/test_pdf_generator.py`

- [ ] **Step 1: Write the failing test**

In `backend/tests/unit/test_pdf_generator.py`, inside `class TestPDFGenerator`, add:

```python
    def test_renders_letter_label(self):
        """A set item carrying a 'letter' renders a valid PDF."""
        set_data = [
            {
                "id": "s1",
                "name": "Modern Horizons 2",
                "code": "MH2",
                "released_at": "2021-06-18",
                "letter": "Q",
            }
        ]
        generator = PDFGenerator(set_data)
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()
        assert result.read().startswith(b"%PDF")

    def test_renders_letter_label_narrow_template(self):
        """Letter rendering also works on the short narrow 94208 template."""
        set_data = [
            {
                "id": "s1",
                "name": "Modern Horizons 2",
                "code": "MH2",
                "released_at": "2021-06-18",
                "letter": "Q",
            }
        ]
        generator = PDFGenerator(set_data, template_name="avery94208")
        with patch("src.services.pdf_generator.get_symbol_file", return_value=None):
            result = generator.generate()
        assert result.read().startswith(b"%PDF")
```

- [ ] **Step 2: Run test to verify it passes trivially (regression guard)**

Run: `cd backend && uv run pytest tests/unit/test_pdf_generator.py::TestPDFGenerator::test_renders_letter_label -v`
Expected: PASS — but the letter is **not drawn yet** (the `letter` key is ignored). PDF byte output can't assert "a Q was drawn", so these tests are crash/exception guards (especially the short template). The actual drawing behavior is added in the next steps and confirmed visually in Task 11.

- [ ] **Step 3: Import the font-size helper**

In `backend/src/services/pdf_generator.py`, extend the helpers import block (lines 32-38) to add `letter_font_size`:

```python
from src.services.helpers import (
    abbreviate_set_name,
    download_and_cache_symbol,
    fit_text_to_width,
    get_svg_intrinsic_dimensions,
    get_symbol_file,
    letter_font_size,
)
```

- [ ] **Step 4: Reserve width for the letter**

In `_draw_label`, find this block (the `symbol_area_start` calculation followed by `max_text_width`):

```python
    symbol_area_start = (
        label_x
        + self.template["label_width"]
        - self.template["label_margin_x"]
        - self.effective_symbol_width
        - padding
    )
    max_text_width = symbol_area_start - text_x
```

Replace **only** the `max_text_width = symbol_area_start - text_x` line with:

```python

    # Reserve space for the alphabet divider letter, drawn just left of the set
    # symbol. Only the "sets" view carries a letter.
    letter = set_data.get("letter") if self.view_mode == "sets" else None
    letter_x = 0.0
    letter_size = 0.0
    text_boundary = symbol_area_start
    if letter:
        letter_size = letter_font_size(self.template["label_height"])
        letter_width = self.canvas.stringWidth(letter, "EBGaramondBold", letter_size)
        letter_x = symbol_area_start - padding - letter_width
        text_boundary = letter_x - padding

    max_text_width = text_boundary - text_x
```

(The existing `if max_text_width <= 0:` guard immediately below still applies and protects very narrow labels.)

- [ ] **Step 5: Draw the letter glyph**

At the end of `_draw_label`, find:

```python
    # Draw symbol
    if symbol_file:
        self._draw_symbol(symbol_file, label_x, label_y, symbol_label)
```

Add immediately after it:

```python

    # Draw the alphabet divider letter, vertically centered, left of the symbol.
    if letter:
        letter_baseline_y = label_y + (self.template["label_height"] - letter_size) / 2
        self.canvas.setFont("EBGaramondBold", letter_size)
        self.canvas.setFillColorRGB(0, 0, 0)
        self.canvas.drawString(letter_x, letter_baseline_y, letter)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/unit/test_pdf_generator.py -v`
Expected: PASS (existing + both new tests).

- [ ] **Step 7: Run the full backend suite + lint/typecheck**

Run: `cd backend && uv run pytest && uv run ruff check && uv run ruff format --check . && uv run pyright`
Expected: all pass; coverage ≥80%.

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/pdf_generator.py backend/tests/unit/test_pdf_generator.py
git commit -m "feat(backend): render alphabet divider letter on labels"
```

---

## Task 6: Frontend letter parsing utility + types

The single source of truth for the `A-F, H, L-Z` range syntax. Pure functions, fully unit-tested.

**Files:**
- Modify: `frontend/src/types/index.ts` (add `AlphabetMode`, `AlphabetSelection`; extend `SelectionState`)
- Create: `frontend/src/utils/letters.ts`
- Test: `frontend/src/utils/__tests__/letters.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/__tests__/letters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseLetterSpec, resolveLetters, LETTERS_AZ } from '../letters'

describe('parseLetterSpec', () => {
  it('parses single letters', () => {
    const r = parseLetterSpec('A, C, e')
    expect(r).toEqual({ ok: true, letters: ['A', 'C', 'E'] })
  })

  it('expands a contiguous range', () => {
    const r = parseLetterSpec('A-F')
    expect(r).toEqual({ ok: true, letters: ['A', 'B', 'C', 'D', 'E', 'F'] })
  })

  it('parses a mixed spec, deduped and sorted', () => {
    const r = parseLetterSpec('L-Z, A-F, H')
    expect(r).toEqual({
      ok: true,
      letters: [
        'A', 'B', 'C', 'D', 'E', 'F', 'H',
        'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      ],
    })
  })

  it('ignores surrounding whitespace and empty tokens', () => {
    expect(parseLetterSpec(' A , , B ')).toEqual({ ok: true, letters: ['A', 'B'] })
  })

  it('rejects an empty spec', () => {
    expect(parseLetterSpec('   ').ok).toBe(false)
  })

  it('rejects a reversed range', () => {
    expect(parseLetterSpec('Z-A').ok).toBe(false)
  })

  it('rejects non-letters', () => {
    expect(parseLetterSpec('1-5').ok).toBe(false)
    expect(parseLetterSpec('AB').ok).toBe(false)
    expect(parseLetterSpec('A-').ok).toBe(false)
  })
})

describe('resolveLetters', () => {
  it('returns [] when off', () => {
    expect(resolveLetters({ mode: 'off', customInput: 'A-F' })).toEqual([])
  })

  it('returns all 26 letters when all', () => {
    expect(resolveLetters({ mode: 'all', customInput: '' })).toEqual(LETTERS_AZ)
    expect(LETTERS_AZ).toHaveLength(26)
  })

  it('returns parsed letters when custom and valid', () => {
    expect(resolveLetters({ mode: 'custom', customInput: 'A-C' })).toEqual(['A', 'B', 'C'])
  })

  it('returns [] when custom and invalid', () => {
    expect(resolveLetters({ mode: 'custom', customInput: 'Z-A' })).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && bun run test src/utils/__tests__/letters.test.ts`
Expected: FAIL — cannot resolve `../letters`.

- [ ] **Step 3: Add the types**

In `frontend/src/types/index.ts`, add near the `SelectionState` interface (around lines 51-59):

```typescript
export type AlphabetMode = 'off' | 'all' | 'custom'

export interface AlphabetSelection {
  mode: AlphabetMode
  // Raw text the user typed in Custom mode, e.g. "A-F, H, L-Z".
  customInput: string
}
```

Then add an `alphabet` field to the `SelectionState` interface:

```typescript
export interface SelectionState {
  selectedSetIds: string[]
  quantities: Record<string, number> // Map of set ID to quantity (1-100)
  templateId: string | null
  placeholders: number // Number of empty labels at start (0 to labels_per_page - 1)
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
  useCustomQuantity: boolean // When false, all sets use quantity 1
  alphabet: AlphabetSelection // Alphabet divider labels (off by default)
}
```

- [ ] **Step 4: Implement the utility**

Create `frontend/src/utils/letters.ts`:

```typescript
import type { AlphabetSelection } from '../types'

export type ParseResult =
  | { ok: true; letters: string[] }
  | { ok: false; message: string }

const EMPTY_MESSAGE = 'Enter at least one letter, e.g. A-F, H, L-Z'

export const LETTERS_AZ: string[] = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode('A'.charCodeAt(0) + i),
)

function isLetter(token: string): boolean {
  return token.length === 1 && token >= 'A' && token <= 'Z'
}

/**
 * Parse a print-dialog-style letter spec ("A-F, H, L-Z") into a sorted,
 * de-duplicated list of single uppercase letters. Case-insensitive; whitespace
 * is ignored. Returns a discriminated result so the UI can show a precise error.
 */
export function parseLetterSpec(input: string): ParseResult {
  if (!input.trim()) {
    return { ok: false, message: EMPTY_MESSAGE }
  }

  const found = new Set<string>()
  for (const rawToken of input.split(',')) {
    const token = rawToken.trim().toUpperCase()
    if (!token) continue

    if (isLetter(token)) {
      found.add(token)
      continue
    }

    const parts = token.split('-')
    if (parts.length === 2 && isLetter(parts[0]) && isLetter(parts[1])) {
      const start = parts[0].charCodeAt(0)
      const end = parts[1].charCodeAt(0)
      if (start > end) {
        return { ok: false, message: `Range "${token}" is backwards` }
      }
      for (let c = start; c <= end; c++) {
        found.add(String.fromCharCode(c))
      }
      continue
    }

    return { ok: false, message: `Invalid entry "${rawToken.trim()}"` }
  }

  if (found.size === 0) {
    return { ok: false, message: EMPTY_MESSAGE }
  }

  return { ok: true, letters: [...found].sort() }
}

/** Resolve a selection to the concrete letters to send to the backend. */
export function resolveLetters(sel: AlphabetSelection): string[] {
  if (sel.mode === 'off') return []
  if (sel.mode === 'all') return [...LETTERS_AZ]
  const parsed = parseLetterSpec(sel.customInput)
  return parsed.ok ? parsed.letters : []
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && bun run test src/utils/__tests__/letters.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/utils/letters.ts frontend/src/utils/__tests__/letters.test.ts
git commit -m "feat(frontend): add letter-spec parser and alphabet types"
```

---

## Task 7: Alphabet state in `useSelection`

Add the default `alphabet` value and a `setAlphabet` setter.

**Files:**
- Modify: `frontend/src/hooks/useSelection.ts` (`initialState`; new setter; return object)
- Test: `frontend/src/hooks/__tests__/useSelection.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/__tests__/useSelection.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSelection } from '../useSelection'

describe('useSelection alphabet', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults alphabet to off with empty input', () => {
    const { result } = renderHook(() => useSelection())
    expect(result.current.selection.alphabet).toEqual({ mode: 'off', customInput: '' })
  })

  it('updates alphabet via setAlphabet', () => {
    const { result } = renderHook(() => useSelection())
    act(() => {
      result.current.setAlphabet({ mode: 'custom', customInput: 'A-F' })
    })
    expect(result.current.selection.alphabet).toEqual({ mode: 'custom', customInput: 'A-F' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && bun run test src/hooks/__tests__/useSelection.test.ts`
Expected: FAIL — `setAlphabet` is undefined / `alphabet` missing from default.

- [ ] **Step 3: Add the default and setter**

In `frontend/src/hooks/useSelection.ts`:

1. Find the `initialState` object and add the `alphabet` default (matching the other fields' style):

```typescript
  alphabet: { mode: 'off', customInput: '' },
```

2. Add a setter near the other `useCallback` setters (e.g., after `setUseCustomQuantity`):

```typescript
  const setAlphabet = useCallback((alphabet: AlphabetSelection) => {
    setSelection((prev) => ({ ...prev, alphabet }))
  }, [])
```

3. Add `setAlphabet` to the returned object:

```typescript
    setUseCustomQuantity,
    setAlphabet,
  }
```

4. Ensure `AlphabetSelection` is imported at the top of the file (merge into the existing `import type { ... } from '../types'`):

```typescript
import type { AlphabetSelection, SelectionState } from '../types'
```

(Keep any other types already imported from `../types`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && bun run test src/hooks/__tests__/useSelection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useSelection.ts frontend/src/hooks/__tests__/useSelection.test.ts
git commit -m "feat(frontend): add alphabet selection state"
```

---

## Task 8: Send `letters` from the API client

**Files:**
- Modify: `frontend/src/api/client.ts` (`GeneratePDFOptions`, `generatePDF`)
- Test: `frontend/src/api/__tests__/client.letters.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/api/__tests__/client.letters.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { generatePDF } from '../client'

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('generatePDF letters', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends letters joined by comma for sets view', async () => {
    const fetchMock = mockFetchOk()
    await generatePDF({
      setIds: ['s1'],
      template: 'avery5160',
      placeholders: 0,
      viewMode: 'sets',
      letters: ['A', 'B', 'C'],
    })
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('letters')).toBe('A,B,C')
  })

  it('omits letters when none are provided', async () => {
    const fetchMock = mockFetchOk()
    await generatePDF({
      setIds: ['s1'],
      template: 'avery5160',
      placeholders: 0,
      viewMode: 'sets',
    })
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('letters')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && bun run test src/api/__tests__/client.letters.test.ts`
Expected: FAIL — `body.get('letters')` is `null` in the first test.

- [ ] **Step 3: Add the `letters` option**

In `frontend/src/api/client.ts`, add `letters` to the options interface:

```typescript
interface GeneratePDFOptions {
  setIds?: string[]
  cardTypeIds?: string[]
  template: string
  placeholders: number
  customTemplate?: Record<string, number>
  viewMode: 'sets' | 'types'
  letters?: string[]
}
```

Destructure it in the function signature:

```typescript
export async function generatePDF({
  setIds,
  cardTypeIds,
  template,
  placeholders,
  customTemplate,
  viewMode,
  letters,
}: GeneratePDFOptions): Promise<Blob> {
```

Then, immediately after the `formData.append('view_mode', viewMode)` line, add:

```typescript
  if (viewMode === 'sets' && letters && letters.length > 0) {
    formData.append('letters', letters.join(','))
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && bun run test src/api/__tests__/client.letters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/__tests__/client.letters.test.ts
git commit -m "feat(frontend): send letters to generate-pdf"
```

---

## Task 9: Letters control in `TemplateCustomizer`

A mode selector (Off / All A–Z / Custom) plus a Custom text input with inline validation, styled to match the existing controls.

**Files:**
- Modify: `frontend/src/components/TemplateCustomizer/TemplateCustomizer.tsx` (props interface; JSX near the "Use Custom Quantity" toggle ~227-247)
- Test: `frontend/src/components/TemplateCustomizer/TemplateCustomizer.letters.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/TemplateCustomizer/TemplateCustomizer.letters.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TemplateCustomizer } from './TemplateCustomizer'
import type { AlphabetSelection } from '../../types'

function baseProps(alphabet: AlphabetSelection, onAlphabetChange = vi.fn()) {
  return {
    isOpen: true,
    customTemplate: null,
    useCustomTemplate: false,
    useCustomQuantity: false,
    templateId: 'avery5160',
    placeholders: 0,
    customTemplatesApi: {
      customTemplates: [],
      addCustomTemplate: vi.fn(),
      updateCustomTemplate: vi.fn(),
      deleteCustomTemplate: vi.fn(),
    } as never,
    alphabet,
    onAlphabetChange,
    onCustomTemplateChange: vi.fn(),
    onUseCustomTemplateChange: vi.fn(),
    onUseCustomQuantityChange: vi.fn(),
    onPlaceholdersChange: vi.fn(),
    onTemplateChange: vi.fn(),
  }
}

describe('TemplateCustomizer letters control', () => {
  it('hides the custom input unless in custom mode', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'off', customInput: '' })} />)
    expect(screen.queryByPlaceholderText(/A-F, H, L-Z/i)).not.toBeInTheDocument()
  })

  it('shows the custom input in custom mode', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'custom', customInput: '' })} />)
    expect(screen.getByPlaceholderText(/A-F, H, L-Z/i)).toBeInTheDocument()
  })

  it('shows an inline error for an invalid custom spec', () => {
    render(<TemplateCustomizer {...baseProps({ mode: 'custom', customInput: 'Z-A' })} />)
    expect(screen.getByText(/backwards/i)).toBeInTheDocument()
  })

  it('calls onAlphabetChange when typing in the custom input', () => {
    const onAlphabetChange = vi.fn()
    render(
      <TemplateCustomizer
        {...baseProps({ mode: 'custom', customInput: '' }, onAlphabetChange)}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText(/A-F, H, L-Z/i), {
      target: { value: 'A-C' },
    })
    expect(onAlphabetChange).toHaveBeenCalledWith({ mode: 'custom', customInput: 'A-C' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && bun run test src/components/TemplateCustomizer/TemplateCustomizer.letters.test.tsx`
Expected: FAIL — props `alphabet`/`onAlphabetChange` don't exist; the control isn't rendered.

- [ ] **Step 3: Extend the props interface**

In `frontend/src/components/TemplateCustomizer/TemplateCustomizer.tsx`, add to `TemplateCustomizerProps`:

```typescript
  alphabet: AlphabetSelection
  onAlphabetChange: (value: AlphabetSelection) => void
```

Add the imports at the top of the file:

```typescript
import type { AlphabetSelection } from '../../types'
import { parseLetterSpec } from '../../utils/letters'
```

Destructure the new props where the component reads its props (alongside `useCustomQuantity`, etc.):

```typescript
  alphabet,
  onAlphabetChange,
```

- [ ] **Step 4: Render the control**

Immediately after the closing `</label>` of the "Use Custom Quantity" toggle block (ends ~line 247), add:

```tsx
            <div className="flex flex-col gap-2">
              <span className="text-sm text-mtg-text flex items-center gap-1">
                Alphabet divider letters
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-mtg-text-muted/20 text-mtg-text-muted text-xs cursor-help"
                  title="Print one divider label per letter for each selected set. Use Custom to choose letters and ranges, e.g. A-F, H, L-Z."
                >
                  ?
                </span>
              </span>
              <select
                className="bg-mtg-card-bg border border-gray-600 rounded-md px-3 py-2 text-sm text-mtg-text focus-visible:ring-2 focus-visible:ring-mtg-accent"
                value={alphabet.mode}
                onChange={(e) =>
                  onAlphabetChange({
                    ...alphabet,
                    mode: e.target.value as AlphabetSelection['mode'],
                  })
                }
              >
                <option value="off">Off</option>
                <option value="all">All (A–Z)</option>
                <option value="custom">Custom…</option>
              </select>

              {alphabet.mode === 'custom' && (
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    placeholder="e.g. A-F, H, L-Z"
                    value={alphabet.customInput}
                    onChange={(e) =>
                      onAlphabetChange({ ...alphabet, customInput: e.target.value })
                    }
                    className="bg-mtg-card-bg border border-gray-600 rounded-md px-3 py-2 text-sm text-mtg-text focus-visible:ring-2 focus-visible:ring-mtg-accent"
                  />
                  {(() => {
                    const result = parseLetterSpec(alphabet.customInput)
                    return result.ok ? (
                      <span className="text-xs text-mtg-text-muted">
                        {result.letters.length} divider
                        {result.letters.length === 1 ? '' : 's'} per set
                      </span>
                    ) : (
                      <span className="text-xs text-red-400">{result.message}</span>
                    )
                  })()}
                </div>
              )}
            </div>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && bun run test src/components/TemplateCustomizer/TemplateCustomizer.letters.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/TemplateCustomizer/TemplateCustomizer.tsx frontend/src/components/TemplateCustomizer/TemplateCustomizer.letters.test.tsx
git commit -m "feat(frontend): add alphabet letters control to customizer"
```

---

## Task 10: Wire alphabet through App → Header → PDFGenerator

Thread the selection down and use it at generation time, blocking generation while a Custom spec is invalid.

**Files:**
- Modify: `frontend/src/App.tsx` (destructure `setAlphabet`; pass `alphabet` to `TemplateCustomizer` and `Header`)
- Modify: `frontend/src/components/Layout/Header.tsx` (accept `alphabet`; pass to `PDFGenerator`)
- Modify: `frontend/src/components/PDFGenerator/PDFGenerator.tsx` (accept `alphabet`; resolve letters; pass to `generatePDF`; disable when invalid)
- Test: `frontend/src/components/PDFGenerator/PDFGenerator.letters.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/PDFGenerator/PDFGenerator.letters.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFGenerator } from './PDFGenerator'
import { generatePDF } from '../../api/client'

vi.mock('../../api/client')
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
globalThis.URL.revokeObjectURL = vi.fn()

describe('PDFGenerator alphabet letters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes resolved letters to generatePDF', async () => {
    vi.mocked(generatePDF).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))

    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'A-C' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /pdf/i }))

    await waitFor(() => {
      expect(generatePDF).toHaveBeenCalledWith(
        expect.objectContaining({ letters: ['A', 'B', 'C'], viewMode: 'sets' }),
      )
    })
  })

  it('disables the button when the custom spec is invalid', () => {
    render(
      <PDFGenerator
        selectedSetIds={['set-1']}
        quantities={{}}
        useCustomQuantity={false}
        templateId="avery5160"
        placeholders={0}
        alphabet={{ mode: 'custom', customInput: 'Z-A' }}
      />,
    )
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && bun run test src/components/PDFGenerator/PDFGenerator.letters.test.tsx`
Expected: FAIL — `alphabet` prop unknown; letters not passed; button not disabled.

- [ ] **Step 3: Update `PDFGenerator`**

In `frontend/src/components/PDFGenerator/PDFGenerator.tsx`:

1. Add imports:

```typescript
import type { AlphabetSelection } from '../../types'
import { parseLetterSpec, resolveLetters } from '../../utils/letters'
```

2. Add `alphabet` to the props type (optional, with an off default so existing call sites/tests keep working). In the props interface add:

```typescript
  alphabet?: AlphabetSelection
```

3. In the component signature, default it:

```typescript
  alphabet = { mode: 'off', customInput: '' },
```

4. Compute validity + letters near the top of the component body:

```typescript
  const alphabetInvalid =
    alphabet.mode === 'custom' && !parseLetterSpec(alphabet.customInput).ok
  const letters = resolveLetters(alphabet)
```

5. In the sets branch, pass `letters` to `generatePDF` (add to the existing options object):

```typescript
        blob = await generatePDF({
          setIds: expandedSetIds,
          template: backendTemplateId,
          placeholders,
          customTemplate: backendCustomTemplate,
          viewMode: 'sets',
          letters: letters.length > 0 ? letters : undefined,
        })
```

6. Add `alphabetInvalid` to the generate button's `disabled` condition (combine with the existing disabled logic — e.g. `disabled={isLoading || alphabetInvalid || ...}`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && bun run test src/components/PDFGenerator/PDFGenerator.letters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Thread the prop through Header and App**

In `frontend/src/components/Layout/Header.tsx`:
- Add `alphabet: AlphabetSelection` to `HeaderProps` and import the type (`import type { AlphabetSelection } from '../../types'` — merge with existing type imports).
- Destructure `alphabet` from props and pass it to `<PDFGenerator ... alphabet={alphabet} />`.

In `frontend/src/App.tsx`:
- Add `setAlphabet` to the destructured `useSelection()` return.
- Pass `alphabet={selection.alphabet}` and `onAlphabetChange={setAlphabet}` to `<TemplateCustomizer ... />`.
- Pass `alphabet={selection.alphabet}` to wherever `<Header ... />` is rendered with the other selection props.

- [ ] **Step 6: Run the full frontend suite + typecheck/build**

Run: `cd frontend && bun run test && bun run build`
Expected: all tests pass; the production build (which type-checks) succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Layout/Header.tsx frontend/src/components/PDFGenerator/PDFGenerator.tsx frontend/src/components/PDFGenerator/PDFGenerator.letters.test.tsx
git commit -m "feat(frontend): wire alphabet letters into PDF generation"
```

---

## Task 11: Manual verification (visual)

Automated tests can't confirm the letter looks right on the page. Verify visually.

- [ ] **Step 1: Start both servers**

```bash
cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080
```
In a second terminal:
```bash
cd frontend && bun run dev
```

- [ ] **Step 2: Generate and inspect a PDF**

1. Open `http://localhost:5173`.
2. Select a set (e.g. Modern Horizons 2).
3. Open the template customizer, set **Alphabet divider letters → Custom**, enter `N-Q`.
4. Generate the PDF.
5. Confirm: four labels (N, O, P, Q), each showing set name + `MH2 - June 2021` on the left, a large letter and the set icon on the right (letter to the left of the icon), no overflow.
6. Switch the template to **avery94208** (narrow) and regenerate; confirm the letter still fits and doesn't collide with the icon or text.

- [ ] **Step 3: Confirm the no-letters path is unchanged**

Set **Alphabet divider letters → Off**, regenerate, and confirm output matches the original one-label-per-set behavior.

---

## Self-Review Notes (author)

- **Spec coverage:** picker modes Off/All/Custom (Task 9), range syntax + frontend-only parsing (Task 6), single-letter backend contract + validation (Tasks 2, 4), `sets × letters` expansion with no mutation (Task 3), letter + icon rendering with height-scaled font (Tasks 1, 5), sets-view-only (Tasks 3, 5, 8 guards), off-by-default & unchanged output (Tasks 6, 7, 11), testing on both sides (every task), narrow-template risk (Tasks 5, 11). A–Z only / no "#" is enforced by `_parse_letters` and `parseLetterSpec` (reject non-letters).
- **Worst-case size:** `set_ids` is capped at `MAX_INPUT_ITEMS` (500) and letters at ≤26, so the expansion is bounded (≤13,000 labels). Per the spec this is left as inherent/no special cap; revisit if it becomes a problem.
- **Backward compatibility:** `letters`, `_build_label_items(letters=...)`, and the `PDFGenerator` `letter` key are all optional; omitting them reproduces today's output exactly. `useSelection` merges saved state over `initialState`, so existing localStorage gets the `alphabet` default.
```
