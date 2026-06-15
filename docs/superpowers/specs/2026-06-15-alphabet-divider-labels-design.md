# Alphabet Divider Labels — Design

**Date:** 2026-06-15
**Status:** Approved (pending spec review)

## Summary

Add an option to expand each selected set into a run of **alphabet divider
labels** — one label per user-chosen letter (e.g. `MH2 · A`, `MH2 · B`, …) —
for organizing cards alphabetically within a set in a storage box. The letters
are a **user-supplied parameter**, not derived from card data. The picker works
like a print dialog's "Pages" field: **Off**, **All (A–Z)**, or **Custom** with
a text box accepting letters and ranges (`A-F, H, L-Z`).

The feature is opt-in and applies to the existing **"sets"** view only. When
off (the default), the generator's output is unchanged.

## Goals

- Let the user print alphabetical divider tabs instead of hand-writing them.
- Let the user choose exactly which letters to print, including non-contiguous
  picks (`A-F, H, L-Z`) — matching the real workflow of adding specific tabs.
- Keep the existing rich label content (set name, code, date, icon) on each
  divider, with a large, scannable letter.
- Require no new external data: no card-list fetching, no new caching.

## Non-goals (YAGNI)

- **Card-derived letters** — auto-detecting which first-letters actually occur
  in a set (would require Scryfall card-search + caching). Explicitly rejected.
- **Per-set different ranges** — one letter selection applies to all selected
  sets.
- **A "#" / numeric divider** — letters A–Z only.
- **Card-count badges** on dividers.
- The "types" (card-type) view — the option is sets-view only.

## Approach & alternative considered

Two approaches were weighed:

1. **Parametric (chosen)** — the user selects letters; each selected set is
   expanded into one label per letter. No card data needed; matches the
   by-hand workflow where the user places the exact tabs they want.
2. **Card-derived (rejected)** — fetch each set's card list from Scryfall,
   group by first letter, emit a divider only for letters that have cards.
   Rejected: needs new card-fetch infrastructure + caching for marginal
   benefit, and does not match the "place the tabs I want" workflow.

## Architecture

The letter selection is resolved **in the frontend** into a concrete list of
single letters, sent to the backend, which expands the label set and renders a
large letter onto each label.

```
TemplateCustomizer "Letters" control
  (Off / All A–Z / Custom "A-F, H, L-Z")
        │  parse + validate (frontend)
        ▼
  expanded letters ["A","B","C","D","E","F","H","L",…,"Z"]
        │  FormData: letters="A,B,C,D,E,F,H,L,…,Z"
        ▼
POST /generate-pdf  →  validate letters (backend)
        │
        ▼
_build_label_items: for each set × each letter → one item {..., "letter": L}
        │
        ▼
PDFGenerator._draw_label / _draw_label_text: render big letter + icon (right)
```

### Data contract (refinement)

The rich range syntax (`A-F, H, L-Z`) is a **frontend input convenience only**.
The frontend expands it into a deduplicated, A–Z-ordered list of **single
letters** and sends that. The backend contract is therefore just "a list of
single letters" — the backend does **not** parse ranges, avoiding duplicated
parsing logic across two languages. The backend still validates (each token is
one `A`–`Z` letter) as the trusted boundary.

## Frontend changes

### Types — `frontend/src/types/index.ts`

Add an alphabet selection to `SelectionState` (around `:51–59`):

```ts
type AlphabetMode = 'off' | 'all' | 'custom'

type AlphabetSelection = {
  mode: AlphabetMode
  // raw text the user typed in Custom mode, e.g. "A-F, H, L-Z"
  customInput: string
}
```

`SelectionState` gains `alphabet: AlphabetSelection`. Default:
`{ mode: 'off', customInput: '' }`.

### Letter parsing — `frontend/src/utils/letters.ts` (new)

Pure functions, the single source of truth for the range syntax:

```ts
// Parse "A-F, H, L-Z" → ["A","B","C","D","E","F","H","L",…,"Z"]
// - case-insensitive; whitespace ignored
// - dedup; output ordered A→Z
// - throws / returns an error result on: non-letter tokens ("1-5"),
//   reversed ranges ("Z-A"), malformed tokens ("A-", "-B", "AB")
export function parseLetterSpec(input: string): ParseResult

export function resolveLetters(sel: AlphabetSelection): string[]
// 'off' → []   'all' → A..Z   'custom' → parseLetterSpec(customInput)
```

`ParseResult` is a discriminated union (`{ ok: true; letters }` /
`{ ok: false; message }`) so the UI can show a precise inline error.

### Control — `frontend/src/components/TemplateCustomizer/TemplateCustomizer.tsx`

Add a **"Letters"** control next to the existing "Use Custom Quantity" toggle
(`:212–248`):

- A mode selector: **Off** · **All (A–Z)** · **Custom**.
- In **Custom**, a text input with placeholder `e.g. A-F, H, L-Z` and a live
  preview / inline validation message driven by `parseLetterSpec`.
- When the input is invalid, surface the error and disable PDF generation
  (consistent with existing validation gating).

Wiring: setter(s) in `frontend/src/hooks/useSelection.ts`, threaded through
`frontend/src/App.tsx`, mirroring how existing selection options flow.

### Request building — `frontend/src/api/client.ts`

In `generatePDF` (`:38–77`), when `resolveLetters(...)` is non-empty and the
view is "sets", append `letters` to the FormData as a comma-separated string of
single letters. When empty, omit it (preserving today's behavior).

## Backend changes

### `backend/src/api/routes.py`

- `POST /generate-pdf` (`:647–655`): add `letters: str | None = Form(None)`.
- Validate: split on `,`, strip, uppercase; each token must match `^[A-Z]$`;
  dedup preserving order; cap at 26. On any invalid token raise
  `HTTPException(400, ...)`, consistent with existing input validation. Empty /
  absent → treated as "no alphabet expansion".
- `_build_label_items(...)` (`~:737`): when `view_mode == "sets"` and letters
  are present, expand **each set into one item per letter**, grouped by set and
  ordered by letter (e.g. set1 A,B,C…; set2 A,B,C…). Inject `"letter"` into
  each item dict. When absent → today's one-item-per-set behavior, unchanged.
  Letters are ignored for `view_mode == "types"`.

### No new endpoints, no new models

The single bare-`Form` param matches the endpoint's existing style; no Pydantic
request model is introduced (none exists today).

## Rendering — `backend/src/services/pdf_generator.py`

In the sets branch of `_draw_label` (`:246–259`) and `_draw_label_text`
(`:276–292`):

- Keep **line 1** (`abbreviate_set_name(name)`, EB Garamond Bold) and **line 2**
  (`{code} - {date}`, Source Sans Pro).
- The set **icon stays in its current top-right position**. When `set_data`
  carries a `letter`, draw a **large letter glyph immediately to the left of the
  icon**, vertically centered on the label (reading order: letter, then icon).
- Reserve right-zone width = `effective_symbol_width + padding + letter_width +
  padding`; re-fit line 1 / line 2 into the remaining left width via the
  existing `fit_text_to_width`.
- **Letter font size scales to label height** (derived like the existing symbol
  sizing — a fraction of usable label height, capped) so it stays large on
  Avery 5160 (72pt tall) yet fits narrow templates such as 94208 (48pt tall).
  The letter uses the EB Garamond Bold face already registered.

When `set_data` has no `letter` key, rendering is byte-for-byte today's output.

## Error handling

- **Frontend:** `parseLetterSpec` returns a precise message for bad input
  (non-letters, reversed ranges, malformed tokens); the control shows it inline
  and blocks generation. `'off'`/`'all'` modes never error.
- **Backend:** invalid `letters` → `HTTPException(400)`. The renderer treats a
  missing `letter` as "no letter" (total over its input).

## Testing

Coverage target ≥80% (already enforced by `backend/pyproject.toml` and
`frontend/vitest.config.ts`).

### Backend (pytest)

- Unit: letter validation — accepts `"A,B,C"`; uppercases/dedups
  `"a,a,B"` → `["A","B"]`; rejects `"1"`, `"AB"`, empty tokens.
- Unit: `_build_label_items` expands `2 sets × ["A","B","C"]` into 6 items in
  the documented order, each with the right `letter`; with no letters yields
  one item per set; letters ignored in "types" view.
- Integration: `POST /generate-pdf` with `letters` returns a valid PDF and the
  expected number of labels; invalid `letters` returns 400.
- Rendering: a narrow-template (94208) case renders a lettered label without
  overflow/exception.

### Frontend (vitest)

- Unit: `parseLetterSpec` — single letters, contiguous range, mixed
  `"A-F, H, L-Z"`, case-insensitivity, whitespace, dedup/order; error cases
  `"Z-A"`, `"1-5"`, `"A-"`, `"AB"`.
- Unit: `resolveLetters` for each mode.
- Component: `TemplateCustomizer` Letters control — mode switching shows/hides
  the text field; invalid input shows the error and disables generation.
- Request: `generatePDF` appends `letters` only when applicable and omits it
  otherwise.

## Risks / open questions

- **Letter legibility on narrow templates.** 94208 labels are only 48pt tall;
  the scaled letter must remain readable without crowding the icon. Mitigated
  by height-derived sizing + width reservation; covered by a rendering test.
- **Large jobs.** Selecting many sets with All (A–Z) multiplies label count
  (sets × 26). This is inherent to the feature and bounded by the user's
  selection; no special handling planned.
- **Set-name truncation.** Reserving right-zone width for the letter shortens
  the space for long set names; `fit_text_to_width` already handles truncation,
  but lettered labels will truncate names a little sooner than today.
