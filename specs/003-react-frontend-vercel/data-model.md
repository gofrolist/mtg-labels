# Data Model: React Frontend Rewrite & Vercel Deployment

**Date**: 2025-01-27
**Feature**: React Frontend Rewrite & Vercel Deployment
**Phase**: Phase 1 - Design

## Entities

### MTGSet

Represents a Magic: The Gathering set with all metadata needed for display and selection.

**Fields**:
- `id` (string): Unique identifier from Scryfall API
- `name` (string): Full set name
- `code` (string): Set code (e.g., "MH2", "CMM")
- `set_type` (string): Type of set (core, expansion, commander, etc.)
- `card_count` (number): Number of cards in the set
- `released_at` (string | null): Release date in ISO format (YYYY-MM-DD)
- `icon_svg_uri` (string | null): URL to set symbol SVG
- `scryfall_uri` (string | null): Scryfall API URI for the set

**Validation Rules**:
- `id` must be non-empty string
- `name` must be non-empty string
- `code` must be uppercase, 2-5 characters
- `card_count` must be >= 0
- `released_at` must be valid ISO date format if present

**State Transitions**: None (immutable data from API)

**Relationships**:
- Belongs to a set type group (many-to-one via `set_type`)
- Can be selected by user (many-to-many via selection state)

### CardType

Represents a card type organized by color for the "Types" view mode.

**Fields**:
- `color` (string): Card color (White, Blue, Black, Red, Green, Colorless, Multicolor)
- `type` (string): Card type (Creature, Instant, Sorcery, etc.)
- `id` (string): Composite ID in format "color:type" (e.g., "White:Creature")

**Validation Rules**:
- `color` must be one of valid MTG colors
- `type` must be non-empty string
- `id` must match format "color:type"

**State Transitions**: None (immutable data from API)

**Relationships**:
- Belongs to a color group (many-to-one via `color`)
- Can be selected by user (many-to-many via selection state)

### LabelTemplate

Represents a label template configuration with dimensions and labels per page.

**Fields**:
- `id` (string): Template identifier (e.g., "avery5160", "averyl7160")
- `name` (string): Display name (e.g., "Avery 5160/8460")
- `dimensions` (string): Label dimensions (e.g., "1\" x 2-5/8\"")
- `labels_per_page` (number): Number of labels per page
- `labels_per_row` (number): Number of labels per row
- `label_rows` (number): Number of rows per page

**Validation Rules**:
- `id` must be non-empty string
- `labels_per_page` must equal `labels_per_row * label_rows`
- All numeric fields must be > 0

**State Transitions**: None (static configuration)

**Relationships**:
- Selected by user (one-to-one via selection state)

### SelectionState

Represents the current user selections and configuration.

**Fields**:
- `selectedSetIds` (string[]): Array of selected set IDs
- `selectedCardTypeIds` (string[]): Array of selected card type IDs (format: "color:type")
- `quantities` (Record<string, number>): Map of item ID to quantity (1-100)
- `templateId` (string): Selected label template ID
- `placeholders` (number): Number of empty labels at start (0 to labels_per_page - 1)
- `viewMode` ("sets" | "types"): Current view mode

**Validation Rules**:
- `selectedSetIds` and `selectedCardTypeIds` are mutually exclusive (only one active based on viewMode)
- All quantities must be between 1 and 100
- `templateId` must be valid template ID
- `placeholders` must be >= 0 and < labels_per_page for selected template
- `viewMode` must be "sets" or "types"

**State Transitions**:
- Empty → Has selections (when user selects items)
- Has selections → Empty (when user deselects all)
- Sets mode → Types mode (when user switches view)
- Types mode → Sets mode (when user switches view)

**Relationships**:
- References multiple MTGSet entities (via `selectedSetIds`)
- References multiple CardType entities (via `selectedCardTypeIds`)
- References one LabelTemplate (via `templateId`)

### ThemePreference

Represents user's theme preference stored in browser.

**Fields**:
- `theme` ("light" | "dark"): Current theme preference

**Validation Rules**:
- `theme` must be "light" or "dark"

**State Transitions**:
- Light → Dark (when user toggles theme)
- Dark → Light (when user toggles theme)

**Relationships**: None (standalone preference)

### SearchState

Represents the current search/filter state.

**Fields**:
- `query` (string): Search query string
- `filteredSets` (MTGSet[]): Sets matching search query
- `filteredCardTypes` (CardType[]): Card types matching search query

**Validation Rules**:
- `query` can be empty string (no filter)
- `filteredSets` and `filteredCardTypes` are computed from `query`

**State Transitions**:
- Empty query → Has query (when user types)
- Has query → Empty query (when user clears search)

**Relationships**:
- Filters MTGSet entities (via `filteredSets`)
- Filters CardType entities (via `filteredCardTypes`)

## Data Flow

### Initial Load
1. User opens application
2. Frontend fetches sets from `/api/sets`
3. Frontend loads theme preference from localStorage
4. Frontend loads saved selections from localStorage
5. Frontend groups sets by `set_type`
6. Frontend displays sets in collapsible groups

### Set Selection
1. User clicks checkbox for a set
2. Set ID added to `selectedSetIds` in SelectionState
3. SelectionState persisted to localStorage
4. Selection counter updated
5. Group toggle button state updated

### PDF Generation
1. User clicks "Generate PDF"
2. Frontend validates at least one item selected
3. Frontend prepares FormData with:
   - Selected set IDs or card type IDs (expanded by quantities)
   - Template ID
   - Placeholders count
   - View mode
4. Frontend sends POST request to `/generate-pdf`
5. Backend generates PDF and returns blob
6. Frontend triggers download

### View Mode Switch
1. User switches between "Sets" and "Types"
2. If switching to "Types", fetch card types from `/api/card-types`
3. Update `viewMode` in SelectionState
4. Clear selections (or preserve separately per view mode)
5. Update UI to show appropriate view

## Storage Strategy

### Browser localStorage

**Keys**:
- `mtg-label-theme`: Theme preference ("light" | "dark")
- `mtg-label-selected-sets`: JSON array of selected set IDs
- `mtg-label-selected-card-types`: JSON array of selected card type IDs
- `mtg-label-template`: Selected template ID
- `mtg-label-view-mode`: Current view mode ("sets" | "types")

**Persistence**:
- Theme preference: Persisted immediately on change
- Selections: Persisted on every selection change
- Template: Persisted on template change
- View mode: Persisted on view mode change

**Error Handling**:
- If localStorage is disabled: Gracefully degrade, don't persist
- If localStorage is full: Clear old data, show user notification
- If data is corrupted: Clear and reset to defaults

## API Data Mapping

### Backend to Frontend

**MTGSet** (from `/api/sets`):
```json
{
  "id": "string",
  "name": "string",
  "code": "string",
  "set_type": "string",
  "card_count": 0,
  "released_at": "YYYY-MM-DD" | null,
  "icon_svg_uri": "url" | null,
  "scryfall_uri": "url" | null
}
```

**CardType** (from `/api/card-types` - to be created):
```json
{
  "color": "string",
  "type": "string"
}
```

**LabelTemplate** (static configuration, can be from API or frontend config):
```json
{
  "id": "string",
  "name": "string",
  "dimensions": "string",
  "labels_per_page": 0,
  "labels_per_row": 0,
  "label_rows": 0
}
```

### Frontend to Backend

**PDF Generation Request** (POST `/generate-pdf`):
```typescript
FormData {
  set_ids?: string[],
  card_type_ids?: string[],
  template: string,
  placeholders: number,
  view_mode: "sets" | "types"
}
```
