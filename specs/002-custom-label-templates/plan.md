# Implementation Plan: Custom Label Template Editor with Live Preview

**Branch**: `002-custom-label-templates` | **Date**: 2025-12-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-custom-label-templates/spec.md`
**Design Baseline**: Screenshot provided showing two-column layout (Customize Template | Page Preview)

## Summary

Implement an interactive custom label template editor that allows users to create, save, and manage label templates with real-time visual preview. Users can customize page size, margins, grid layout, and label dimensions through an intuitive interface. Templates are saved to browser localStorage and persist across sessions. The editor provides preset templates (Avery 5160, L7160, 94208, A4-3x10, Letter-3x10) as starting points and supports unit conversion (in/cm/mm/pt). A fullscreen preview mode enables detailed inspection before PDF generation. The system implements basic keyboard accessibility and handles errors gracefully with retry/adjust options.

## Technical Context

**Language/Version**: Python 3.13+ (backend), JavaScript ES6+ (frontend)
**Primary Dependencies**:
- Backend: FastAPI 0.95+, ReportLab 3.6.12+, Pydantic for validation
- Frontend: Bootstrap 5 (existing UI framework), Vanilla JavaScript (no additional frameworks)
**Storage**: Browser localStorage for templates (frontend-only), no backend storage required
**Testing**: pytest (backend unit/integration), JavaScript test framework TBD for frontend (consider Jest or Vitest)
**Target Platform**: Web application - Chrome/Firefox/Safari/Edge (modern browsers with ES6+ support)
**Project Type**: Web application (existing FastAPI backend + HTML/JS/CSS frontend)
**Performance Goals**:
- Preview update latency: <100ms per parameter change
- Template save/load: <50ms
- PDF generation: <10s for 30 labels (existing target maintained)
- Support 50+ saved templates without UI degradation (<500ms load time)
**Constraints**:
- Browser localStorage: ~5-10MB typical limit
- No backend changes for template persistence (frontend-only storage)
- Maintain backward compatibility with existing template selection
- Preview must work without PDF generation (client-side rendering)
**Scale/Scope**:
- Target users: 100-1000 label creators
- Expected templates per user: 5-20 (support up to 50)
- Preview complexity: Up to 100 labels per page
- Concurrent users: 10+ (existing capacity)

## UI/UX Design Specifications

**Design Reference**: Screenshot provided showing complete template editor interface

### Layout Structure

**Two-Column Layout** (Responsive):
- **Left Column**: "Customize Template" section (40-45% width)
- **Right Column**: "Page Preview" section (55-60% width)
- **Theme**: Dark grey background with white text and input fields
- **Spacing**: Adequate padding between sections and input groups

### Left Column: Customize Template

#### 1. Toggle Control (Top)
```
┌─────────────────────────────────────────────┐
│ [○──] Use Custom Template                   │
│       (overrides preset selection)          │
└─────────────────────────────────────────────┘
```
- **Component**: Bootstrap toggle switch
- **Label**: "Use Custom Template (overrides preset selection)"
- **States**: ON (grey switch, white circle right) / OFF
- **Behavior**: When ON, enables custom parameters; when OFF, uses preset

#### 2. Template Selection Dropdown
```
┌─────────────────────────────────────────┐
│ Template: [avery5160          ▾]        │
│           (existing dropdown reused)     │
└─────────────────────────────────────────┘
```
- **Component**: Existing template dropdown/select element
- **Location**: Moved to Customize Template section (currently in main interface)
- **Options**:
  - `avery5160` - Avery 5160 (3×10, Letter)
  - `averyl7160` - Avery L7160 (3×7, A4)
  - `avery94208` - Avery 94208 (2×5, Letter)
  - `a4-3x10` - A4 3×10 Custom
  - `letter-3x10` - Letter 3×10 Custom
  - (Future: Saved custom templates appear here)
- **Behavior**: Select to load preset parameters into customization fields
- **Integration**: Works with "Use Custom Template" toggle - when OFF, uses selected preset directly for PDF; when ON, preset values populate fields for customization

#### 3. Page Size Section
```
┌─ Page Size ───────────────────────────────┐
│ 📄                                         │
│ Width:  [8.5    ] [in ▾]                  │
│ Height: [11     ]                          │
│ Quick Size: [Letter (8.5" x 11") ▾]      │
└────────────────────────────────────────────┘
```
- **Icon**: Document icon (📄) next to section title
- **Fields**:
  - Width input (numeric, 2 decimals)
  - Unit dropdown (in, cm, mm, pt) - applies to all dimensions
  - Height input (numeric, 2 decimals)
  - Quick Size dropdown:
    - Letter (8.5" x 11")
    - Legal (8.5" x 14")
    - A4 (210mm x 297mm)
    - A5 (148mm x 210mm)
- **Validation**: Real-time, inline error messages below invalid fields

#### 4. Page Margins Section
```
┌─ Page Margins ────────────────────────────┐
│ △                                          │
│ Top:    [0.5    ]    Right:  [0.1875]    │
│ Bottom: [0.5    ]    Left:   [0.1875]    │
└────────────────────────────────────────────┘
```
- **Icon**: Triangle icon (△) next to section title
- **Layout**: 2x2 grid of inputs
- **Fields**: Top, Right, Bottom, Left (numeric, 4 decimals)
- **Unit**: Shares unit selection from Page Size section

#### 5. Grid Layout Section
```
┌─ Grid Layout ─────────────────────────────┐
│ ⊞                                          │
│ Columns: [3     ]    Rows:  [10    ]     │
│ H Gap:   [0.125 ]    V Gap: [0     ]     │
│ Y Gap:   [0     ]                          │
└────────────────────────────────────────────┘
```
- **Icon**: Grid icon (⊞) next to section title
- **Fields**:
  - Columns (integer, 1-20)
  - Rows (integer, 1-50)
  - H Gap (horizontal gap, numeric)
  - V Gap (vertical gap, numeric)
  - Y Gap (numeric) - **Note**: Clarify if this is different from V Gap
- **Calculated**: Total labels per page displayed (e.g., "30 labels per page")

#### 6. Label Size Section
```
┌─ Label Size ──────────────────────────────┐
│ 🏷️                                         │
│ Width:  [2.625  ]                         │
│ Height: [1      ]                         │
└────────────────────────────────────────────┘
```
- **Icon**: Tag icon (🏷️) next to section title
- **Fields**: Width, Height (numeric, 3-4 decimals)
- **Unit**: Shares unit selection from Page Size section

#### 7. Saved Templates Section
```
┌─ Saved Templates ─────────────────────────┐
│ 📁                                         │
│ (Collapsible list of saved templates)     │
│ • My Custom 3x8    [Load] [Delete]        │
│ • Avery Modified   [Load] [Delete]        │
└────────────────────────────────────────────┘
```
- **Icon**: Folder icon (📁) next to section title
- **State**: Collapsed by default, expandable
- **Items**: List of saved templates with:
  - Template name
  - Creation date (optional, shown on hover)
  - Load button
  - Delete button (with confirmation)
- **Empty State**: "No saved templates. Customize and save a template to see it here."
- **Actions**: Save Current Template button at bottom (with name input modal)

### Right Column: Page Preview

#### Preview Header
```
┌─ Page Preview ─────────────────[Fullscreen]┐
│ 📄                            [🔲 Yellow Btn]│
```
- **Title**: "Page Preview" with document icon (📄)
- **Fullscreen Button**:
  - Position: Top right corner
  - Color: Yellow/gold background
  - Label: "Fullscreen" or expand icon
  - Action: Opens fullscreen overlay

#### Preview Canvas Area
```
│ ┌──────────────────────────────────┐       │
│ │ Dark grey container              │       │
│ │  ┌────────────────────────────┐  │       │
│ │  │ White page representation  │  │       │
│ │  │  ╔═══╗ ╔═══╗ ╔═══╗        │  │       │
│ │  │  ║ 1 ║ ║ 2 ║ ║ 3 ║        │  │       │
│ │  │  ╚═══╝ ╚═══╝ ╚═══╝        │  │       │
│ │  │  ╔═══╗ ╔═══╗ ╔═══╗        │  │       │
│ │  │  ║ 4 ║ ║ 5 ║ ║ 6 ║        │  │       │
│ │  │  ╚═══╝ ╚═══╝ ╚═══╝        │  │       │
│ │  │  ... (up to 30 labels)     │  │       │
│ │  └────────────────────────────┘  │       │
│ └──────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

**Canvas Specifications**:
- **Container**: Dark grey background (#2c2c2c or similar)
- **Page**: White rectangle representing paper
- **Labels**:
  - Light grey rectangles (#e0e0e0 or similar)
  - Dotted borders (#666666)
  - Sequential numbers (1-30) centered in each label
  - Number font: ~12px, grey (#999999)
- **Margins**: Visible margin boundaries (light grid lines or subtle indicators)
- **Gaps**: Visible spacing between labels
- **Scaling**: Auto-scale to fit container while maintaining aspect ratio
- **Update**: Re-render within 100ms of parameter change

**Label Display**:
- Each label shows its position number (1, 2, 3, ... 30)
- Grid layout: 3 columns × 10 rows in screenshot example
- Margins visible as white space around label grid
- Gaps visible as white space between labels

**Error States**:
- Labels exceeding page: Show red border around page and/or labels
- Warning icon with tooltip: "Labels exceed page boundaries"

### Fullscreen Mode

**Overlay Specifications**:
```
┌───────────────────────────────────────────────────────┐
│ Full Viewport Overlay (rgba(0,0,0,0.95))             │
│                                                        │
│  [×]  Close                                           │
│                                                        │
│        ┌──────────────────────────────┐              │
│        │   Scaled Preview Canvas      │              │
│        │   (larger version of preview)│              │
│        │   ... label grid ...         │              │
│        └──────────────────────────────┘              │
│                                                        │
└───────────────────────────────────────────────────────┘
```
- **Background**: Dark overlay (rgba(0,0,0,0.95))
- **Position**: Fixed, full viewport
- **Z-index**: 9999
- **Content**: Centered, scaled-up preview canvas
- **Controls**:
  - Close button (top right or X icon)
  - ESC key to exit
- **Scaling**: Maximum size while maintaining aspect ratio
- **Body**: Prevent background scroll (overflow: hidden)

### Visual Design Tokens

**Colors**:
- Background: Dark grey (#1a1a1a or similar)
- Panels: Slightly lighter grey (#2a2a2a)
- Text: White (#ffffff)
- Input fields: Dark with white text
- Input borders: Light grey (#555555)
- Active/Focus: Blue or brand color
- Error: Red (#dc3545)
- Success: Green (#28a745)
- Warning: Yellow/Amber (#ffc107)
- Preview canvas background: Dark grey (#2c2c2c)
- Preview page: White (#ffffff)
- Preview labels: Light grey (#e0e0e0)
- Preview label borders: Dotted grey (#666666)
- Preview label numbers: Medium grey (#999999)

**Typography**:
- Font family: System sans-serif or Roboto
- Section titles: Bold, 14-16px
- Input labels: Regular, 12-14px
- Input values: Regular, 14px
- Help text: Smaller, 11-12px, muted color

**Spacing**:
- Section padding: 16-20px
- Input group margin: 12px
- Input spacing: 8px
- Label margin: 4px

**Borders & Shadows**:
- Panel borders: 1px solid rgba(255,255,255,0.1)
- Input borders: 1px solid #555555
- Focus borders: 2px solid brand color
- Panel shadows: Subtle box-shadow for depth

**Icons**:
- Section icons: 16-20px, positioned left of title
- Button icons: 14-16px
- Consistent icon set (Font Awesome, Material Icons, or similar)

### Responsive Behavior

**Desktop (>1200px)**:
- Two-column layout as shown
- Preview takes majority of space

**Tablet (768px - 1200px)**:
- Two-column layout maintained
- Adjusted proportions (50/50)
- Reduced padding

**Mobile (<768px)**:
- **Stack vertically**: Customize Template section above Preview
- Full-width sections
- Collapsible sections with accordion behavior
- Preview canvas scaled to fit mobile width
- Fullscreen mode more impactful on small screens

### Interaction States

**Input Fields**:
- Default: Dark background, light border
- Focus: Highlighted border (blue/brand color), visible focus ring
- Error: Red border, error message below field
- Disabled: Reduced opacity, no interaction

**Buttons**:
- Default: Solid background, white text
- Hover: Slightly darker/lighter background
- Active: Pressed state with darker background
- Disabled: Reduced opacity, cursor not-allowed

**Toggle Switch**:
- OFF: Grey background, circle on left
- ON: Brand color background, circle on right
- Hover: Subtle brightness change
- Focus: Visible focus ring

**Preset Buttons**:
- Default: Outlined or subtle background
- Hover: Highlight background
- Selected: Solid background (brand color)
- Focus: Visible focus ring

### Accessibility Considerations

**Keyboard Navigation**:
- Tab order: Top to bottom, left to right through all inputs
- Focus indicators: Visible on all interactive elements
- Enter/Space: Activate buttons
- ESC: Close fullscreen mode, close modals

**Screen Readers** (Future Enhancement):
- ARIA labels for all form controls
- ARIA live regions for validation errors
- ARIA expanded/collapsed for sections
- Alt text for icons

**Color Contrast**:
- Text on background: WCAG AA minimum (4.5:1)
- Interactive elements: Visible when focused
- Error states: Sufficient contrast for red text

### Animation & Transitions

**Preview Updates**:
- Debounced input (50ms delay)
- Smooth canvas re-render (requestAnimationFrame)
- No jarring jumps or flickers

**Fullscreen Transition**:
- Fade in overlay (200ms)
- Scale up preview (200ms ease-out)
- Fade out on close (200ms)

**Section Expand/Collapse** (if used):
- Smooth height transition (300ms ease)
- Rotate icon indicator

**Button Interactions**:
- Subtle hover transitions (150ms)
- Active state immediate feedback

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Test-First Development (TDD) ✅

**Status**: COMPLIANT
- Tests will be written for all backend validation logic
- Frontend JavaScript will have unit tests for template calculation logic
- Integration tests for localStorage operations
- Preview rendering will have visual regression tests (optional for MVP)

**Action Items**:
- [ ] Write backend tests for custom template validation (FR-037 to FR-043)
- [ ] Write frontend tests for unit conversion logic
- [ ] Write frontend tests for template save/load operations
- [ ] Write integration tests for PDF generation with custom templates

### II. Performance & Resource Efficiency ✅

**Status**: COMPLIANT
- Preview updates target <100ms (SC-002)
- PDF generation maintains <10s target (SC-012)
- localStorage access optimized with caching
- Preview rendering uses canvas for performance (100 labels in <500ms, SC-011)

**Performance Considerations**:
- Debounce user input (50ms) to reduce preview render frequency
- Use requestAnimationFrame for smooth preview updates
- Lazy-load saved templates list for UI performance
- Limit preview to 100 labels maximum (show warning if exceeded)

### III. Intelligent Caching ✅

**Status**: COMPLIANT
- Last-used template cached in localStorage (FR-030)
- Parsed template objects cached in memory during session
- Preview canvas cached and only redrawn on changes

**Caching Strategy**:
- localStorage key: `mtg_label_generator_templates` (template array)
- localStorage key: `mtg_label_generator_active_template` (last-used ID)
- In-memory cache: Parsed CustomTemplate objects during session

### IV. Modern Python Practices ✅

**Status**: COMPLIANT
- Backend validation uses Pydantic models with type hints
- All code passes `uv run ruff check` and `uv run pyright`
- No new Python dependencies required (uses existing FastAPI/ReportLab)

**Code Quality**:
- Type hints for all template validation functions
- Pydantic models for CustomTemplate structure validation
- Clear error messages following constitution FR-043

### V. Production Readiness ✅

**Status**: COMPLIANT
- Error handling with retry/adjust options (FR-044)
- Logging for template validation errors
- Graceful localStorage error handling (FR-028, FR-029)
- No deployment changes required (frontend-only feature)

**Error Scenarios Handled**:
- localStorage full/unavailable (browser privacy mode)
- Corrupted template data (invalid JSON)
- Template validation errors (labels exceed page)
- Backend PDF generation failures (retry/adjust)

### Constitution Compliance Summary

✅ **ALL GATES PASSED** - No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/002-custom-label-templates/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research findings
├── data-model.md        # Data entities and storage strategy (complete)
├── quickstart.md        # Developer onboarding guide
├── contracts/
│   └── api-contracts.md # API endpoint modifications (complete)
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

This is a web application with FastAPI backend and HTML/JS/CSS frontend:

```text
src/
├── api/
│   ├── __init__.py
│   ├── routes.py                    # MODIFY: Add custom template validation
│   └── dependencies.py
├── services/
│   ├── __init__.py
│   ├── pdf_generator.py             # MODIFY: Accept custom template parameters
│   ├── scryfall_client.py           # NO CHANGES
│   └── helpers.py                   # NO CHANGES
├── models/
│   ├── __init__.py
│   ├── set_data.py                  # NO CHANGES
│   └── custom_template.py           # NEW: Pydantic model for validation
├── cache/
│   └── # NO CHANGES
└── config.py                        # MODIFY: Add custom template validation functions

templates/
├── index.html                       # MODIFY: Add template editor UI sections
└── js/
    ├── template-editor.js           # NEW: Template editor logic
    ├── template-preview.js          # NEW: Preview rendering logic
    ├── template-storage.js          # NEW: localStorage operations
    └── template-validation.js       # NEW: Client-side validation

static/
├── css/
│   └── template-editor.css          # NEW: Template editor styles
└── # Existing files unchanged

tests/
├── unit/
│   ├── test_custom_template.py      # NEW: Backend validation tests
│   └── test_template_validation.js  # NEW: Frontend validation tests
├── integration/
│   ├── test_custom_template_pdf.py  # NEW: Custom template PDF generation
│   └── test_template_storage.js     # NEW: localStorage integration tests
└── contract/
    └── # Existing contract tests (may need updates)
```

**Structure Decision**: Web application structure (Option 2 from template). This is an existing FastAPI web application with:
- Backend (Python/FastAPI) at repository root in `src/`
- Frontend (HTML/JS/CSS) in `templates/` and `static/`
- Shared test directory structure in `tests/`

The feature is primarily frontend-focused with minimal backend changes for custom template validation and PDF generation parameter acceptance.

## Phase 0: Research & Design Decisions

**Status**: ✅ COMPLETE

See [research.md](./research.md) for detailed research findings.

### Key Technical Decisions

1. **Preview Rendering Technology**: HTML5 Canvas
   - **Decision**: Use HTML5 Canvas for preview rendering
   - **Rationale**: Better performance for 100+ labels, easier pixel-perfect layout control
   - **Alternatives**: SVG (slower for many elements), CSS Grid (harder to calculate positions)

2. **Frontend Framework**: Vanilla JavaScript
   - **Decision**: No additional JavaScript framework (use existing vanilla JS approach)
   - **Rationale**: Consistent with existing codebase, avoids bundle size increase
   - **Alternatives**: React/Vue (unnecessary complexity for this feature)

3. **Template Storage**: Browser localStorage
   - **Decision**: Store templates as JSON in browser localStorage
   - **Rationale**: No backend changes, immediate persistence, works offline
   - **Alternatives**: Backend database (requires API changes, authentication)

4. **Unit Conversion**: JavaScript conversion functions
   - **Decision**: Convert all units to points (pt) for internal calculations, display in user-selected unit
   - **Rationale**: Points are PDF native unit, simplifies backend integration
   - **Alternatives**: Store in user's preferred unit (requires backend awareness)

5. **Keyboard Accessibility**: Native browser focus management
   - **Decision**: Use native HTML tab order and focus management
   - **Rationale**: Minimal implementation, good browser support, meets MVP requirements
   - **Alternatives**: Custom focus trap (unnecessary complexity for MVP)

## Phase 1: Data Model & Contracts

**Status**: ✅ COMPLETE

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

**Key Entities**:
- `CustomTemplate`: User-defined template (page size, margins, grid, label dims, name, ID, timestamps)
- `TemplatePreset`: Predefined templates (avery5160, averyl7160, avery94208, a4-3x10, letter-3x10)
- `TemplateConfiguration`: Runtime parameters for PDF generation (all dimensions in points)
- `LabelPosition`: Calculated X,Y coordinates for each label
- `TemplateState`: UI state management (active template, dirty flag, validation errors)
- `ValidationError`: Structured error representation (field, message, code, severity)

**Storage Strategy**:
- localStorage key: `mtg_label_generator_templates` (JSON array of CustomTemplate)
- localStorage key: `mtg_label_generator_active_template` (string: template ID or preset name)
- localStorage key: `mtg_label_generator_template_prefs` (JSON: user preferences like selected unit)

### API Contracts

See [contracts/api-contracts.md](./contracts/api-contracts.md) for complete endpoint specifications.

**Modified Endpoint**: `POST /generate-pdf`
- **New Parameters**:
  - `use_custom_template` (bool): Enable custom template mode
  - `custom_template_json` (JSON string): Complete custom template configuration
- **Backward Compatible**: All existing calls continue to work unchanged
- **Validation**: Backend validates custom template fits within page boundaries

**Frontend-Only Operations** (no backend API):
- Save custom template to localStorage
- Load custom templates from localStorage
- Delete custom template from localStorage
- Update custom template in localStorage

### Quickstart Guide

See [quickstart.md](./quickstart.md) for developer onboarding and testing instructions.

## Phase 2: Implementation Approach

### Frontend Architecture

**Template Editor Component** (`template-editor.js`):
```javascript
class TemplateEditor {
  constructor() {
    this.state = new TemplateState();
    this.preview = new TemplatePreview();
    this.storage = new TemplateStorage();
    this.validator = new TemplateValidator();
  }

  // Initialize editor, load last-used template
  init() { }

  // Handle parameter changes, update preview
  onParameterChange(field, value) { }

  // Save template to localStorage
  saveTemplate(name) { }

  // Load preset or saved template
  loadTemplate(id, source) { }
}
```

**Preview Renderer** (`template-preview.js`):
```javascript
class TemplatePreview {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.scale = 1.0;
  }

  // Render preview from TemplateConfiguration
  render(config) { }

  // Enter fullscreen mode
  enterFullscreen() { }

  // Exit fullscreen mode
  exitFullscreen() { }

  // Calculate optimal scale for container
  calculateScale(containerWidth, containerHeight) { }
}
```

**Template Storage** (`template-storage.js`):
```javascript
class TemplateStorage {
  // Save template to localStorage
  save(template) { }

  // Load all templates from localStorage
  loadAll() { }

  // Load specific template by ID
  load(id) { }

  // Delete template from localStorage
  delete(id) { }

  // Save last-used template ID
  saveLastUsed(id) { }

  // Load last-used template ID
  loadLastUsed() { }
}
```

**Template Validator** (`template-validation.js`):
```javascript
class TemplateValidator {
  // Validate entire template configuration
  validate(config) { }

  // Check if labels fit within page boundaries
  validatePageFit(config) { }

  // Validate individual field value
  validateField(field, value) { }

  // Generate user-friendly error messages
  formatError(errorCode, context) { }
}
```

### Backend Modifications

**Custom Template Model** (`src/models/custom_template.py`):
```python
from pydantic import BaseModel, Field, validator
from typing import Optional

class CustomTemplateConfig(BaseModel):
    """Pydantic model for custom template validation"""
    page_width: float = Field(gt=0, description="Page width in points")
    page_height: float = Field(gt=0, description="Page height in points")
    margin_top: float = Field(ge=0, description="Top margin in points")
    margin_right: float = Field(ge=0, description="Right margin in points")
    margin_bottom: float = Field(ge=0, description="Bottom margin in points")
    margin_left: float = Field(ge=0, description="Left margin in points")
    columns: int = Field(ge=1, le=20, description="Number of columns")
    rows: int = Field(ge=1, le=50, description="Number of rows")
    horizontal_gap: float = Field(ge=0, description="Horizontal gap in points")
    vertical_gap: float = Field(ge=0, description="Vertical gap in points")
    label_width: float = Field(gt=0, description="Label width in points")
    label_height: float = Field(gt=0, description="Label height in points")

    @validator('columns', 'rows')
    def validate_grid(cls, v, values):
        """Validate grid produces reasonable label count"""
        if 'columns' in values and 'rows' in values:
            labels_per_page = values['columns'] * values['rows']
            if labels_per_page > 200:
                raise ValueError(f"Grid too large: {labels_per_page} labels per page (max 200)")
        return v

    @validator('label_width', 'label_height')
    def validate_label_dimensions(cls, v, field, values):
        """Validate labels fit within page boundaries"""
        # Implementation in actual code
        return v
```

**Routes Modification** (`src/api/routes.py`):
```python
from src.models.custom_template import CustomTemplateConfig

@app.post("/generate-pdf")
async def generate_pdf(
    set_ids: list[str] = Form([]),
    use_custom_template: bool = Form(False),
    custom_template_json: Optional[str] = Form(None),
    # ... existing parameters ...
):
    """Generate PDF with optional custom template"""

    if use_custom_template:
        if not custom_template_json:
            raise HTTPException(
                status_code=400,
                detail="Custom template configuration required when use_custom_template=true"
            )

        try:
            # Parse and validate custom template
            template_dict = json.loads(custom_template_json)
            template_config = CustomTemplateConfig(**template_dict)

            # Pass to PDF generator
            pdf_generator = PDFGenerator(custom_template=template_config)
            # ... rest of generation logic ...

        except ValidationError as e:
            # Format Pydantic validation errors into user-friendly messages
            errors = format_validation_errors(e)
            raise HTTPException(status_code=400, detail=errors)

    else:
        # Use preset template (existing logic)
        pdf_generator = PDFGenerator(template=template)
        # ... existing logic ...
```

### Testing Strategy

**Unit Tests** (Backend):
- `test_custom_template_validation.py`: Test Pydantic validation rules
- `test_template_page_fit.py`: Test boundary checking logic
- `test_template_label_positions.py`: Test coordinate calculations

**Unit Tests** (Frontend):
- `test_unit_conversion.js`: Test conversion functions (in/cm/mm/pt ↔ points)
- `test_template_validation.js`: Test client-side validation rules
- `test_template_storage.js`: Test localStorage operations with mocked storage

**Integration Tests** (Backend):
- `test_custom_template_pdf_generation.py`: Test PDF generation with various custom templates
- `test_template_validation_errors.py`: Test error message formatting

**Integration Tests** (Frontend):
- `test_template_editor_flow.js`: Test full create/save/load/delete flow
- `test_preview_rendering.js`: Test preview updates on parameter changes

**Manual Testing** (Required for MVP):
- Visual inspection of preview accuracy
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Keyboard navigation testing
- Fullscreen mode testing
- Error message clarity testing

## Complexity Tracking

**No complexity violations** - All requirements fit within constitution principles without exceptions.

## Next Steps

1. ✅ Phase 0: Research complete (see research.md)
2. ✅ Phase 1: Data model and contracts complete
3. ✅ Phase 1: Quickstart guide created
4. ⏭️  Phase 2: Task breakdown (run `/speckit.tasks` to generate tasks.md)

## Notes

- **Design Baseline**: Implementation MUST match the detailed UI specifications in the "UI/UX Design Specifications" section above, which are derived from the provided screenshot
- **Visual Consistency**: Use dark theme with icons for each section as specified (document, triangle, grid, tag, folder icons)
- **Preset Templates**: Ensure all 5 presets (avery5160, averyl7160, avery94208, a4-3x10, letter-3x10) are implemented with correct dimensions. Reuse existing template dropdown/select element (move to Customize Template section) instead of creating new preset buttons.
- **Preset Template Synchronization**: Preset dimensions defined in two locations:
  - Backend: `/Users/evgenii.vasilenko/gofrolist/mtg-label-generator/src/config.py` (LABEL_TEMPLATES dict)
  - Frontend: `/Users/evgenii.vasilenko/gofrolist/mtg-label-generator/templates/js/template-presets.js` (TEMPLATE_PRESETS constant)
  - **Strategy**: Backend config.py is source of truth. Frontend values MUST be manually synchronized.
  - **Validation**: Test task T047b validates synchronization before implementation.
  - **Future Enhancement**: Consider backend API endpoint to serve preset definitions (eliminates duplication).
- **Preview Rendering**: Canvas must show numbered labels (1-30) with dotted borders, matching screenshot layout
- **Fullscreen Mode**: Yellow button in top-right of preview section, opens dark overlay with scaled preview
- **localStorage Keys**: Use consistent key naming with `mtg_label_generator_` prefix
- **Error Messages**: Follow constitution principle for clear, actionable error messages
- **Backward Compatibility**: Existing template selection must continue to work without changes
- **Responsive Design**: Two-column layout on desktop, stacked on mobile (<768px)
- **Unit Dropdown**: Single unit selector in Page Size section applies to all dimension inputs
- **Y Gap Field**: Clarify purpose and relationship to V Gap (vertical gap) - may be redundant or serve specific function
