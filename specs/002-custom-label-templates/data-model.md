# Data Model: Custom Label Template Editor with Live Preview

**Date**: 2025-11-30
**Updated**: 2025-12-03
**Feature**: Custom Label Template Editor with Live Preview
**Phase**: Phase 1 - Design

## New Entities

### CustomTemplate

Represents a user-defined label template saved in browser local storage.

**Fields**:
- `id` (str): Unique identifier (UUID v4 format)
- `name` (str): User-provided template name (max 100 characters)
- `created_at` (str): ISO 8601 timestamp of creation
- `modified_at` (str): ISO 8601 timestamp of last modification

**Page Size**:
- `page_width` (float): Page width in points (1 point = 1/72 inch)
- `page_height` (float): Page height in points
- `page_width_unit` (str): Display unit preference ("in", "cm", "mm", "pt")

**Page Margins** (in points):
- `margin_top` (float): Top margin
- `margin_right` (float): Right margin
- `margin_bottom` (float): Bottom margin
- `margin_left` (float): Left margin

**Grid Layout**:
- `columns` (int): Number of label columns per page
- `rows` (int): Number of label rows per page
- `horizontal_gap` (float): Horizontal spacing between labels (in points)
- `vertical_gap` (float): Vertical spacing between labels (in points)

**Label Dimensions** (in points):
- `label_width` (float): Width of each label
- `label_height` (float): Height of each label

**Calculated Fields** (computed at runtime, not stored):
- `labels_per_page` (int): columns × rows
- `total_label_width` (float): (label_width × columns) + (horizontal_gap × (columns - 1))
- `total_label_height` (float): (label_height × rows) + (vertical_gap × (rows - 1))
- `is_valid` (bool): Whether template fits within page boundaries

**Validation Rules**:
- `name` must be non-empty and unique within saved templates
- All dimension values must be positive (> 0)
- `columns` and `rows` must be >= 1
- `page_width_unit` must be one of: "in", "cm", "mm", "pt"
- Template must fit within page boundaries:
  - `total_label_width + margin_left + margin_right <= page_width`
  - `total_label_height + margin_top + margin_bottom <= page_height`
- Maximum labels per page: 200 (performance limit)

**State Transitions**:
- Created → Saved (user saves new template)
- Saved → Loaded (user loads template for editing or PDF generation)
- Loaded → Modified (user edits parameters)
- Modified → Saved (user saves changes)
- Saved → Deleted (user deletes template)

**Storage**: Browser localStorage
- Key: `mtg_label_generator_templates`
- Value: JSON array of CustomTemplate objects
- Size estimate: ~500 bytes per template
- Typical capacity: 50-100 templates before reaching storage limits

**Relationships**:
- Extends TemplatePreset structure
- Used by TemplateConfiguration for PDF generation
- Referenced by TemplateState for active template tracking

---

### TemplatePreset

Represents a predefined template configuration for common label products.

**Presets**:

**avery5160** (US Letter, 3x10):
- Page: 8.5" × 11" (612pt × 792pt)
- Margins: Top 0.5", Right 0.1875", Bottom 0.5", Left 0.1875"
- Grid: 3 columns × 10 rows
- Gaps: H 0.125", V 0"
- Label: 2.625" × 1"

**averyl7160** (A4, 3x7):
- Page: 8.27" × 11.69" (595pt × 842pt)
- Margins: Top 0.55", Right 0.28", Bottom 0.55", Left 0.28"
- Grid: 3 columns × 7 rows
- Gaps: H 0.1", V 0"
- Label: 2.48" × 1.5"

**avery94208** (US Letter, 2x5):
- Page: 8.5" × 11" (612pt × 792pt)
- Margins: Top 0.5", Right 0.19", Bottom 0.5", Left 0.19"
- Grid: 2 columns × 5 rows
- Gaps: H 0.12", V 0"
- Label: 4" × 2"

**a4-3x10**:
- Page: 210mm × 297mm (595pt × 842pt)
- Margins: Top 10mm, Right 5mm, Bottom 10mm, Left 5mm
- Grid: 3 columns × 10 rows
- Gaps: H 5mm, V 2mm
- Label: 63mm × 25mm

**letter-3x10**:
- Page: 8.5" × 11" (612pt × 792pt)
- Margins: Top 0.5", Right 0.25", Bottom 0.5", Left 0.25"
- Grid: 3 columns × 10 rows
- Gaps: H 0.1", V 0"
- Label: 2.5" × 1"

**Structure**:
- `id` (str): Preset identifier
- `name` (str): Display name
- All CustomTemplate fields (page size, margins, grid, label dimensions)
- `is_preset` (bool): Always true for presets

**Usage**: Presets are immutable and serve as starting points for custom templates.

---

### TemplateConfiguration

Represents runtime template parameters used for PDF generation and preview rendering.

**Fields**:
- `template_source` (str): Source of template ("preset" or "custom")
- `template_id` (str): ID of preset or custom template
- `use_custom` (bool): Whether custom template mode is enabled

**Dimensions** (all in points for internal calculations):
- `page_width` (float)
- `page_height` (float)
- `margin_top` (float)
- `margin_right` (float)
- `margin_bottom` (float)
- `margin_left` (float)
- `columns` (int)
- `rows` (int)
- `horizontal_gap` (float)
- `vertical_gap` (float)
- `label_width` (float)
- `label_height` (float)

**Calculated Properties**:
- `labels_per_page` (int): Total labels that fit on one page
- `printable_width` (float): page_width - margin_left - margin_right
- `printable_height` (float): page_height - margin_top - margin_bottom
- `label_positions` (list[LabelPosition]): Calculated X,Y coordinates for each label

**Validation Methods**:
- `validate()`: Returns validation errors or empty list if valid
- `fits_on_page()`: Boolean check if layout fits within boundaries
- `to_points()`: Converts all dimensions to points from any unit

**Usage**: Created from CustomTemplate or TemplatePreset, passed to PDFGenerator and PreviewRenderer.

---

### LabelPosition

Represents the calculated position of a single label on the page.

**Fields**:
- `index` (int): Label number (1-based: 1, 2, 3, ...)
- `row` (int): Row index (0-based)
- `column` (int): Column index (0-based)
- `x` (float): X-coordinate of label's top-left corner (in points from page origin)
- `y` (float): Y-coordinate of label's top-left corner (in points from page origin)
- `width` (float): Label width (in points)
- `height` (float): Label height (in points)

**Calculation**:
```python
x = margin_left + (column * (label_width + horizontal_gap))
y = page_height - margin_top - ((row + 1) * label_height) - (row * vertical_gap)
```

**Usage**: Used by PreviewRenderer to draw label boundaries and by PDFGenerator to position label content.

---

### TemplateState

Manages the current state of the template editor UI.

**Fields**:
- `use_custom` (bool): Custom template mode enabled
- `active_template_id` (str | null): Currently selected template ID
- `active_template_source` (str): "preset" or "custom"
- `edited_template` (CustomTemplate | null): Current template being edited
- `is_dirty` (bool): Whether current template has unsaved changes
- `validation_errors` (list[ValidationError]): Current validation errors
- `view_mode` (str): "normal" or "fullscreen"
- `selected_unit` (str): Current display unit ("in", "cm", "mm", "pt")

**State Transitions**:
- User toggles `use_custom` → Updates `active_template_source`
- User selects preset → Loads preset into `edited_template`, sets `is_dirty = false`
- User modifies parameter → Sets `is_dirty = true`, triggers validation
- User saves template → Persists to localStorage, sets `is_dirty = false`
- User clicks fullscreen → Sets `view_mode = "fullscreen"`

**Usage**: Managed by frontend state management (React/Vue state or vanilla JS)

---

### ValidationError

Represents a validation error for template parameters.

**Fields**:
- `field` (str): Field name that has error (e.g., "page_width", "columns")
- `message` (str): User-friendly error message
- `severity` (str): "error" or "warning"
- `code` (str): Error code for programmatic handling

**Error Codes**:
- `VALUE_NEGATIVE`: Dimension value is negative or zero
- `VALUE_INVALID`: Non-numeric value entered
- `LAYOUT_EXCEEDS_PAGE`: Labels don't fit within page boundaries
- `NAME_EMPTY`: Template name is empty
- `NAME_DUPLICATE`: Template name already exists
- `GRID_TOO_LARGE`: More than 200 labels per page (performance warning)
- `LABEL_TOO_SMALL`: Label dimensions < 0.25" (printability warning)

**Usage**: Displayed inline next to form fields, prevents invalid template save/use

---

### ViewMode

Manages preview display state.

**Fields**:
- `mode` (str): "normal" or "fullscreen"
- `scale` (float): Preview scale factor (0.1 - 2.0)
- `show_margins` (bool): Whether to show margin guides
- `show_rulers` (bool): Whether to show dimension rulers
- `show_grid` (bool): Whether to show label grid overlay

**Methods**:
- `enter_fullscreen()`: Activates fullscreen mode
- `exit_fullscreen()`: Returns to normal mode
- `toggle_fullscreen()`: Switches between modes
- `calculate_scale(container_width, container_height)`: Calculates optimal preview scale

**Usage**: Controls preview rendering behavior

---

## Modified Entities

### MTGSet (no changes required for this feature)

No modifications needed for basic template customization. Future enhancements (text formats) may require additional fields.

---

## Data Flow

### Template Creation Flow

1. User opens customize interface
2. User toggles "Use Custom Template" (TemplateState.use_custom = true)
3. User modifies parameters (page size, margins, grid, label size)
4. Frontend updates TemplateState.edited_template on each change
5. Validation runs on each change → TemplateState.validation_errors updated
6. Preview renderer calculates LabelPositions from TemplateConfiguration
7. Preview updates within 100ms
8. User clicks "Save Template"
9. Frontend validates template name is unique
10. CustomTemplate serialized to JSON and saved to localStorage
11. TemplateState.is_dirty = false

### Template Loading Flow

1. User opens interface
2. Frontend loads saved templates from localStorage (`mtg_label_generator_templates`)
3. Templates deserialized from JSON → CustomTemplate objects
4. Templates displayed in "Saved Templates" section
5. User clicks a saved template
6. TemplateState.edited_template = selected CustomTemplate
7. TemplateState.active_template_id = template.id
8. Preview updates to show loaded template

### Preset Selection Flow

1. User clicks preset button (e.g., "avery5160")
2. Frontend loads TemplatePreset configuration
3. TemplateState.edited_template populated with preset values
4. TemplateState.active_template_source = "preset"
5. TemplateState.active_template_id = preset.id
6. Preview updates to show preset layout

### PDF Generation Flow

1. User selects sets and clicks "Generate PDF"
2. Frontend creates TemplateConfiguration from TemplateState.edited_template
3. TemplateConfiguration serialized and sent to `/generate-pdf` endpoint
4. Backend deserializes TemplateConfiguration
5. PDFGenerator calculates LabelPositions
6. PDF rendered with custom template layout
7. PDF returned to user

### Live Preview Flow

1. User modifies any template parameter
2. Frontend debounces input (50ms delay)
3. TemplateConfiguration calculated from current values
4. Validation runs → errors displayed inline
5. If valid: PreviewRenderer calculates LabelPositions
6. Canvas/SVG rendering draws:
   - Page boundary
   - Margin guides
   - Label grid (dotted borders)
   - Label numbers (1, 2, 3, ...)
7. Preview updates (target: <100ms total)

### Fullscreen Mode Flow

1. User clicks "Fullscreen" button
2. ViewMode.enter_fullscreen() called
3. Preview container expanded to fill viewport (CSS: position: fixed, z-index: 9999)
4. Preview scale recalculated for larger container
5. Close button displayed in corner
6. User presses ESC or clicks close
7. ViewMode.exit_fullscreen() called
8. Preview returns to normal size

---

## Storage Strategy

### Browser localStorage

**Key Structure**:
- `mtg_label_generator_templates`: JSON array of CustomTemplate objects
- `mtg_label_generator_active_template`: ID of currently active template
- `mtg_label_generator_template_prefs`: User preferences (selected unit, view mode settings)

**Example localStorage Data**:
```json
{
  "mtg_label_generator_templates": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Custom 3x8",
      "page_width": 612,
      "page_height": 792,
      "page_width_unit": "in",
      "margin_top": 36,
      "margin_right": 18,
      "margin_bottom": 36,
      "margin_left": 18,
      "columns": 3,
      "rows": 8,
      "horizontal_gap": 9,
      "vertical_gap": 5,
      "label_width": 189,
      "label_height": 90,
      "created_at": "2025-12-03T10:30:00Z",
      "modified_at": "2025-12-03T11:45:00Z"
    }
  ],
  "mtg_label_generator_active_template": "550e8400-e29b-41d4-a716-446655440000",
  "mtg_label_generator_template_prefs": {
    "selected_unit": "in",
    "show_margins": true,
    "show_grid": true
  }
}
```

**Benefits**:
- No backend changes required
- Instant access (synchronous)
- Works offline
- No authentication needed

**Limitations**:
- Client-side only (not synced across devices)
- Can be cleared by user
- ~5-10MB typical browser limit
- Not suitable for sharing templates between users

**Error Handling**:
- Storage full: Display error "Unable to save template. Browser storage is full."
- Storage unavailable (privacy mode): Display warning "Templates cannot be saved in private browsing mode."
- Corrupted data: Validate JSON on load, discard invalid entries, display warning

---

## Unit Conversion

### Conversion Factors (to points)

- 1 inch = 72 points
- 1 cm = 28.3465 points
- 1 mm = 2.83465 points
- 1 point = 1 point

### Conversion Functions

```python
def to_points(value: float, unit: str) -> float:
    """Convert value from unit to points"""
    factors = {"in": 72, "cm": 28.3465, "mm": 2.83465, "pt": 1}
    return value * factors[unit]

def from_points(value: float, unit: str) -> float:
    """Convert value from points to unit"""
    factors = {"in": 72, "cm": 28.3465, "mm": 2.83465, "pt": 1}
    return value / factors[unit]
```

**Precision**: Round to 2 decimal places for display (0.01 unit precision)

**Storage**: Always store in points internally, convert for display only

---

## Validation Logic

### Page Boundary Validation

```python
def validate_fits_on_page(config: TemplateConfiguration) -> bool:
    printable_width = config.page_width - config.margin_left - config.margin_right
    printable_height = config.page_height - config.margin_top - config.margin_bottom

    total_label_width = (config.label_width * config.columns) +
                        (config.horizontal_gap * (config.columns - 1))
    total_label_height = (config.label_height * config.rows) +
                         (config.vertical_gap * (config.rows - 1))

    return (total_label_width <= printable_width and
            total_label_height <= printable_height)
```

### All Validation Rules

1. **Positive Values**: All dimensions > 0
2. **Grid Minimum**: columns >= 1, rows >= 1
3. **Page Fit**: Labels must fit within page boundaries
4. **Name Unique**: Template name must be unique (case-insensitive)
5. **Name Non-Empty**: Template name must have length > 0
6. **Performance**: labels_per_page <= 200 (warning)
7. **Printability**: label dimensions >= 0.25" (warning)

---

## Performance Considerations

### Preview Rendering

- Target: <100ms update latency
- Debounce user input (50ms)
- Use canvas for rendering (faster than SVG for many elements)
- Limit preview to 100 labels max (if more, show "Preview limited to 100 labels")

### localStorage Access

- Batch reads/writes to minimize access
- Cache parsed templates in memory during session
- Limit to 50 saved templates (enforce UI limit)

### Validation

- Run validation on input debounce (50ms)
- Cache validation results until input changes
- Prioritize critical errors (page fit) over warnings (performance)

---

## Future Enhancements (Out of Scope)

- Backend template storage (sync across devices)
- Template sharing/export/import
- Template marketplace
- Advanced text formatting per label position
- Print preview with actual set data
- Template version history
- Collaborative editing
