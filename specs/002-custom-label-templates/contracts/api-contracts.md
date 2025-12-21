# API Contracts: Custom Label Template Editor with Live Preview

**Date**: 2025-11-30
**Updated**: 2025-12-03
**Feature**: Custom Label Template Editor with Live Preview

## Modified Endpoints

### POST /generate-pdf

**Description**: Generate PDF with labels for selected sets using custom or preset templates with customization options.

**Request Parameters** (Form Data):

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `set_ids` | list[str] | Yes* | - | List of set IDs (required if view_mode="sets") |
| `card_type_ids` | list[str] | Yes* | - | List of card type IDs (required if view_mode="types") |
| `view_mode` | str | No | "sets" | View mode: "sets" or "types" |
| `placeholders` | int | No | 0 | Number of empty labels at start |
| **Template Selection** |
| `use_custom_template` | bool | No | false | Whether to use custom template (overrides `template`) |
| `template` | str | No | "avery5160" | Preset template name (used if use_custom_template=false) |
| **Custom Template Parameters** (used if use_custom_template=true) |
| `custom_template_json` | JSON string | Yes* | - | Complete custom template configuration (see structure below) |
| **Text Format Options** |
| `text_format` | str | No | "default" | Text format: "default", "rarity", "order_numbers", "acronym_symbol_alphabet", "custom" |
| `custom_text` | str | No | - | Custom text when text_format="custom" |
| `show_quantities` | bool | No | true | Whether to show quantity information on labels |
| `custom_font_size` | float | No | - | Custom font size in points |
| `order_number_start` | int | No | 1 | Starting number for order number format |
| `order_number_increment` | int | No | 1 | Increment for order number format |
| `alphabet_per_set` | bool | No | true | Whether alphabet resets per set |
| `alphabet_start_letter` | str | No | "A" | Starting letter for alphabet format |

*Required conditions:
- Either `set_ids` or `card_type_ids` required based on `view_mode`
- `custom_template_json` required if `use_custom_template=true`

**Custom Template JSON Structure**:

```json
{
  "page_width": 612.0,          // Page width in points
  "page_height": 792.0,         // Page height in points
  "margin_top": 36.0,           // Top margin in points
  "margin_right": 13.5,         // Right margin in points
  "margin_bottom": 36.0,        // Bottom margin in points
  "margin_left": 13.5,          // Left margin in points
  "columns": 3,                 // Number of columns
  "rows": 10,                   // Number of rows
  "horizontal_gap": 9.0,        // Horizontal gap in points
  "vertical_gap": 0.0,          // Vertical gap in points
  "label_width": 189.0,         // Label width in points
  "label_height": 72.0          // Label height in points
}
```

**Response**:

- **Success (200)**: `StreamingResponse` with PDF file
  - Content-Type: `application/pdf`
  - Headers: `Content-Disposition: attachment;filename=mtg_labels.pdf`

- **Error (400)**: JSON error response
  ```json
  {
    "detail": "Descriptive error message with specific issue and guidance"
  }
  ```

**Validation Rules**:

**Template Validation**:
- All dimension values must be positive (> 0)
- `columns` and `rows` must be >= 1
- Labels must fit within page boundaries:
  - `(label_width × columns) + (horizontal_gap × (columns - 1)) + margin_left + margin_right <= page_width`
  - `(label_height × rows) + (vertical_gap × (rows - 1)) + margin_top + margin_bottom <= page_height`
- Maximum 200 labels per page (performance limit)

**Text Format Validation**:
- `text_format` must be one of: "default", "rarity", "order_numbers", "acronym_symbol_alphabet", "custom"
- `custom_text` required if `text_format="custom"`
- `custom_font_size` must be positive if provided
- `order_number_start` and `increment` must be positive if provided
- `placeholders` must be >= 0

**Error Messages** (following constitution FR-021):

| Error Code | HTTP Status | Message Example |
|------------|-------------|-----------------|
| `TEMPLATE_INVALID` | 400 | "Custom template validation failed: Labels exceed page boundaries. Label area requires 650pt width but page provides only 585pt (612pt - 27pt margins)." |
| `DIMENSION_NEGATIVE` | 400 | "Invalid label width: -5.0. Label dimensions must be positive." |
| `DIMENSION_ZERO` | 400 | "Invalid label height: 0. Label dimensions must be greater than zero." |
| `GRID_INVALID` | 400 | "Invalid grid layout: columns=0. Grid must have at least 1 column and 1 row." |
| `TEMPLATE_REQUIRED` | 400 | "Custom template configuration required when use_custom_template=true. Provide custom_template_json parameter." |
| `TEXT_FORMAT_INVALID` | 400 | "Invalid text_format: 'invalid'. Must be one of: default, rarity, order_numbers, acronym_symbol_alphabet, custom." |
| `CUSTOM_TEXT_MISSING` | 400 | "Custom text required when text_format='custom'. Provide custom_text parameter." |

**Backward Compatibility**:

- All new parameters are optional
- Default values maintain existing behavior
- Existing API calls without new parameters work unchanged
- `template` parameter still works when `use_custom_template=false`

**Example Request - Preset Template**:

```bash
curl -X POST "http://localhost:8080/generate-pdf" \
  -F "set_ids=abc123" \
  -F "set_ids=def456" \
  -F "template=avery5160" \
  -F "use_custom_template=false" \
  -F "text_format=default" \
  -F "show_quantities=true"
```

**Example Request - Custom Template**:

```bash
curl -X POST "http://localhost:8080/generate-pdf" \
  -F "set_ids=abc123" \
  -F "set_ids=def456" \
  -F "use_custom_template=true" \
  -F 'custom_template_json={"page_width":612.0,"page_height":792.0,"margin_top":36.0,"margin_right":13.5,"margin_bottom":36.0,"margin_left":13.5,"columns":3,"rows":10,"horizontal_gap":9.0,"vertical_gap":0.0,"label_width":189.0,"label_height":72.0}' \
  -F "text_format=order_numbers" \
  -F "order_number_start=50" \
  -F "order_number_increment=50"
```

**Example Request - Custom Template with Text Format**:

```bash
curl -X POST "http://localhost:8080/generate-pdf" \
  -F "set_ids=abc123" \
  -F "use_custom_template=true" \
  -F 'custom_template_json={"page_width":595.0,"page_height":842.0,"margin_top":28.35,"margin_right":14.17,"margin_bottom":28.35,"margin_left":14.17,"columns":2,"rows":5,"horizontal_gap":7.09,"vertical_gap":0.0,"label_width":255.12,"label_height":141.73}' \
  -F "text_format=acronym_symbol_alphabet" \
  -F "alphabet_per_set=true"
```

---

## Frontend-Only Operations (No Backend API)

The following operations are handled entirely in the browser using localStorage:

### Save Custom Template

**Description**: Save custom template to browser localStorage.

**Implementation**: JavaScript/TypeScript
```javascript
function saveCustomTemplate(template) {
  const templates = JSON.parse(localStorage.getItem('mtg_label_generator_templates') || '[]');

  // Generate UUID for new template
  template.id = generateUUID();
  template.created_at = new Date().toISOString();
  template.modified_at = template.created_at;

  templates.push(template);
  localStorage.setItem('mtg_label_generator_templates', JSON.stringify(templates));

  return template.id;
}
```

**Storage Key**: `mtg_label_generator_templates`

**Data Structure**: Array of CustomTemplate objects (see data-model.md)

---

### Load Custom Templates

**Description**: Load all saved custom templates from localStorage.

**Implementation**: JavaScript/TypeScript
```javascript
function loadCustomTemplates() {
  const templates = localStorage.getItem('mtg_label_generator_templates');

  if (!templates) return [];

  try {
    return JSON.parse(templates);
  } catch (error) {
    console.error('Failed to parse saved templates:', error);
    return [];
  }
}
```

---

### Delete Custom Template

**Description**: Delete a saved custom template by ID.

**Implementation**: JavaScript/TypeScript
```javascript
function deleteCustomTemplate(templateId) {
  const templates = JSON.parse(localStorage.getItem('mtg_label_generator_templates') || '[]');
  const filtered = templates.filter(t => t.id !== templateId);

  localStorage.setItem('mtg_label_generator_templates', JSON.stringify(filtered));

  return filtered.length < templates.length; // Returns true if deleted
}
```

---

### Update Custom Template

**Description**: Update an existing custom template.

**Implementation**: JavaScript/TypeScript
```javascript
function updateCustomTemplate(templateId, updates) {
  const templates = JSON.parse(localStorage.getItem('mtg_label_generator_templates') || '[]');
  const index = templates.findIndex(t => t.id === templateId);

  if (index === -1) return null;

  templates[index] = {
    ...templates[index],
    ...updates,
    modified_at: new Date().toISOString()
  };

  localStorage.setItem('mtg_label_generator_templates', JSON.stringify(templates));

  return templates[index];
}
```

---

## Contract Testing

### Test Cases - Custom Template PDF Generation

1. **Custom Template - Valid Layout**:
   - Request with `use_custom_template=true` and valid `custom_template_json`
   - Verify PDF generates with custom dimensions
   - Verify labels fit within specified boundaries
   - Verify correct number of labels per page (columns × rows)

2. **Custom Template - Invalid Layout (Exceeds Page)**:
   - Request with custom template where labels exceed page boundaries
   - Verify 400 error with specific message describing the issue
   - Verify message includes actual vs available dimensions

3. **Custom Template - Negative Dimensions**:
   - Request with negative `label_width` or `label_height`
   - Verify 400 error: "Label dimensions must be positive"

4. **Custom Template - Zero Dimensions**:
   - Request with zero `columns` or `rows`
   - Verify 400 error: "Grid must have at least 1 column and 1 row"

5. **Custom Template - Missing JSON**:
   - Request with `use_custom_template=true` but no `custom_template_json`
   - Verify 400 error: "Custom template configuration required"

6. **Preset Template - Still Works**:
   - Request with `use_custom_template=false` and `template=avery5160`
   - Verify PDF generates with preset template
   - Verify backward compatibility maintained

7. **Custom Template + Text Format**:
   - Request with custom template and `text_format=order_numbers`
   - Verify both custom layout and custom text format applied
   - Verify order numbers displayed correctly with custom spacing

8. **Custom Template + Multiple Sets**:
   - Request with custom template and 30+ sets
   - Verify multi-page PDF generates correctly
   - Verify template applied consistently across all pages

9. **Custom Template - Large Grid**:
   - Request with custom template having 100 labels per page
   - Verify PDF generates successfully
   - Verify generation completes within performance target (<10s for 30 labels)

10. **Custom Template - Small Labels**:
    - Request with very small labels (0.5" × 0.5")
    - Verify PDF generates (may show warning in logs)
    - Verify labels render correctly even at small size

### Test Cases - Frontend localStorage Operations

1. **Save Template**:
   - Create custom template in UI
   - Click save with unique name
   - Verify template appears in localStorage
   - Verify template appears in "Saved Templates" list

2. **Load Template**:
   - Click saved template in list
   - Verify all fields populate with saved values
   - Verify preview updates to show loaded template

3. **Delete Template**:
   - Click delete on saved template
   - Verify confirmation prompt shown
   - Verify template removed from localStorage
   - Verify template removed from UI list

4. **Update Template**:
   - Load saved template
   - Modify parameters
   - Save with same name
   - Verify template updated in localStorage with new modified_at timestamp

5. **Persist Across Sessions**:
   - Save template
   - Refresh browser
   - Verify template still appears in list
   - Verify template loads correctly

6. **Handle Storage Full**:
   - Mock localStorage quota exceeded error
   - Attempt to save template
   - Verify user-friendly error message displayed

7. **Handle Corrupted Data**:
   - Manually corrupt localStorage data (invalid JSON)
   - Load templates
   - Verify graceful handling (empty list, error logged)
   - Verify app continues functioning

8. **Duplicate Name Prevention**:
   - Attempt to save template with existing name
   - Verify validation error shown
   - Verify user prompted to choose different name

### Test Cases - Live Preview

1. **Preview Updates on Change**:
   - Modify any template parameter
   - Measure update latency
   - Verify preview updates within 100ms
   - Verify preview accurately reflects changes

2. **Preview Shows Correct Layout**:
   - Set columns=3, rows=10
   - Verify preview shows 30 numbered labels
   - Verify labels arranged in 3 columns, 10 rows

3. **Preview Shows Margins**:
   - Set margins: top=36pt, right=18pt, bottom=36pt, left=18pt
   - Verify preview displays margin boundaries
   - Verify labels positioned within margins

4. **Preview Shows Gaps**:
   - Set horizontal_gap=10pt, vertical_gap=5pt
   - Verify gaps visible between labels in preview

5. **Preview Fullscreen Mode**:
   - Click "Fullscreen" button
   - Verify preview expands to fill viewport
   - Verify labels scale proportionally
   - Press ESC, verify preview returns to normal size

6. **Preview Validation Errors**:
   - Create template where labels exceed page
   - Verify preview shows red borders or warning indicator
   - Verify error message displayed

7. **Preview Performance - Large Grid**:
   - Set columns=10, rows=10 (100 labels)
   - Measure preview render time
   - Verify render completes within 500ms

### Test Cases - Unit Conversion

1. **Convert Inches to Points**:
   - Enter 8.5 inches for page width
   - Verify backend receives 612 points (8.5 × 72)

2. **Convert Millimeters to Points**:
   - Enter 210mm for page width
   - Verify backend receives ~595 points (210 × 2.83465)

3. **Unit Dropdown Change**:
   - Set width=8.5 inches
   - Change unit to cm
   - Verify displayed value updates to ~21.59cm
   - Verify internal value remains 612 points

4. **Precision Maintained**:
   - Convert 2.625 inches to mm and back
   - Verify rounding errors minimal (<0.01 difference)

### Performance Requirements

- Custom template PDF generation: <10s for 30 labels (same as preset templates)
- Preview update latency: <100ms per change
- localStorage save/load: <50ms
- Fullscreen mode activation: <200ms
- Preview render (100 labels): <500ms

---

## External API Contracts (Future Enhancement)

### MTGJSON API (Priority P4 - Exploration)

**Endpoint**: https://mtgjson.com/api/v5/

**Usage**: Download set files or use API for card-level data (rarity, collector numbers).

**Contract**: TBD based on integration research.

**Exploration Deliverables**:
- Research document comparing MTGJSON vs Scryfall data quality
- Proof-of-concept implementation
- Decision criteria for full integration

---

### Keyrune Font (Priority P5 - Exploration)

**Source**: https://keyrune.andrewgioia.com/

**Usage**: Load font files for set symbol rendering in labels.

**Contract**: Font file format (TTF/OTF), character code mapping to set codes.

**Exploration Deliverables**:
- Research document on font integration
- Proof-of-concept for symbol rendering
- Symbol mapping validation (coverage for 95%+ of sets)

---

## Notes for Backend Implementation

### Validation Order

1. Validate request parameters (required fields present)
2. Validate template selection (preset vs custom)
3. If custom template:
   - Validate JSON structure
   - Validate all dimension values positive
   - Validate grid values >= 1
   - Calculate if labels fit on page
4. Validate text format options
5. Proceed to PDF generation

### Error Response Format

Always return detailed, actionable error messages:

```json
{
  "detail": "Specific error message",
  "field": "field_name",           // Optional: specific field with error
  "code": "ERROR_CODE",             // Optional: programmatic error code
  "suggestion": "How to fix it"    // Optional: guidance for user
}
```

Example:
```json
{
  "detail": "Labels exceed page boundaries. Label area requires 650pt width but page provides only 585pt (612pt page - 27pt margins).",
  "field": "label_width",
  "code": "LAYOUT_EXCEEDS_PAGE",
  "suggestion": "Reduce label width, increase page size, or reduce margins."
}
```
