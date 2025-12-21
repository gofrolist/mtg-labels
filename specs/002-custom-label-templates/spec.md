# Feature Specification: Custom Label Template Editor with Live Preview

**Feature Branch**: `002-custom-label-templates`
**Created**: 2025-11-30
**Status**: Enhanced
**Updated**: 2025-12-03
**Input**: Add an option to create/edit custom templates with parameters for Page Size, Page Margins, Grid Layout, Label Size. Add a dynamic Page Preview with "fullscreen" button. Save custom templates in local storage. Design provided.

## Clarifications

### Session 2025-12-03

- Q: When a user first opens the template customization interface, what should be the initial state? → A: Load the last-used template from previous session (preset or saved custom)
- Q: How should the system handle concurrent edits when the same template is being edited in multiple browser tabs? → A: Last write wins - most recent save overwrites; no conflict detection (simpler)
- Q: When PDF generation fails due to backend errors or invalid template parameters, how should the system respond? → A: Show error message with retry button and option to adjust template
- Q: Should the system support template export/import/sharing capabilities (JSON download/upload or copy to clipboard)? → A: Defer to future enhancement - out of scope for MVP, focus on core customization
- Q: What level of accessibility support should be implemented for keyboard-only users and assistive technologies? → A: Basic keyboard navigation (Tab, Enter, Escape) - essential minimum for MVP

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive Template Customization (Priority: P1) 🎯 MVP

Users need to customize label templates by adjusting page size, margins, grid layout, and label dimensions through an intuitive visual interface. All changes must be reflected immediately in a live preview to ensure accuracy before generating PDFs.

**Why this priority**: This is the core functionality that enables users to create custom templates matching their specific label sheets. Without interactive customization and preview, users cannot confidently create templates for non-standard label products.

**Independent Test**: Can be fully tested by opening the customize template interface, adjusting any parameter (e.g., changing columns from 3 to 2), observing the preview update immediately, and verifying the preview accurately reflects the changes. Delivers immediate value by enabling precise template creation without trial-and-error PDF generation.

**Acceptance Scenarios**:

1. **Given** a user opens the customize template section, **When** they toggle "Use Custom Template", **Then** the custom template editor becomes active and the preview updates to show the custom layout
2. **Given** a user adjusts page size (width/height), **When** they change the values, **Then** the preview updates in real-time to show the new page dimensions
3. **Given** a user selects a quick size preset (e.g., "Letter 8.5" x 11""), **When** they select it, **Then** width and height fields auto-populate and the preview updates
4. **Given** a user adjusts page margins (top/right/bottom/left), **When** they change any margin value, **Then** the preview shows the margin boundaries and label grid adjusts accordingly
5. **Given** a user changes grid layout (columns/rows), **When** they update these values, **Then** the preview shows the correct number of labels per row and total labels per page
6. **Given** a user adjusts horizontal or vertical gap between labels, **When** they change gap values, **Then** the preview shows accurate spacing between labels
7. **Given** a user changes label size (width/height), **When** they update dimensions, **Then** each label in the preview reflects the new size
8. **Given** the preview shows 30 labels, **When** the user views the grid, **Then** each label is numbered sequentially (1-30) for easy reference
9. **Given** a keyboard-only user navigates the interface, **When** they press Tab, **Then** focus moves through all interactive elements (input fields, buttons, dropdowns) in logical order
10. **Given** a keyboard-only user has a button focused, **When** they press Enter or Space, **Then** the button action executes (e.g., save template, select preset)
11. **Given** a user is in fullscreen preview mode, **When** they press Escape, **Then** the preview exits fullscreen and returns to normal mode

---

### User Story 2 - Live Page Preview with Fullscreen Mode (Priority: P1) 🎯 MVP

Users need a visual preview of their template layout that updates instantly as they make changes. They must be able to enter fullscreen mode to see the preview at full size for detailed inspection before printing.

**Why this priority**: Visual feedback is critical for template creation. Without a preview, users must generate PDFs repeatedly to verify their template, which is slow and frustrating. Fullscreen mode enables detailed inspection of label alignment and spacing.

**Independent Test**: Can be fully tested by making any template adjustment, verifying the preview updates within 100ms, clicking the fullscreen button, confirming the preview expands to fill the screen, and exiting fullscreen. Delivers immediate value by providing confidence in template accuracy without generating PDFs.

**Acceptance Scenarios**:

1. **Given** a user makes any template adjustment, **When** they change a value, **Then** the preview updates within 100ms showing the new layout
2. **Given** a user views the page preview, **When** they observe the layout, **Then** the preview accurately represents margins, gaps, label positions, and label sizes with visual boundaries
3. **Given** a user wants to inspect the template in detail, **When** they click the "Fullscreen" button, **Then** the preview expands to fill the entire screen
4. **Given** a user is in fullscreen preview mode, **When** they press ESC or click exit, **Then** the preview returns to normal size within the interface
5. **Given** a user is in fullscreen mode, **When** they make template adjustments, **Then** the fullscreen preview updates in real-time
6. **Given** the preview displays labels, **When** the user views them, **Then** each label shows a dotted border and sequential number for easy identification
7. **Given** a template doesn't fit on the page, **When** the user views the preview, **Then** the system shows a visual warning (e.g., red borders) indicating labels exceed page boundaries

---

### User Story 3 - Preset Template Selection (Priority: P1) 🎯 MVP

Users need quick access to common preset templates (Avery 5160, L7160, 94208, A4-3x10, Letter-3x10) that auto-populate all template parameters. Presets provide a starting point for users who want to use standard label sheets or customize them slightly.

**Why this priority**: Most users will start with standard label products. Providing preset templates eliminates manual data entry and reduces errors. This is essential for first-time users who don't know the exact dimensions of their label sheets.

**Independent Test**: Can be fully tested by selecting a preset template from the dropdown (e.g., "avery5160"), verifying all fields auto-populate with correct values, and confirming the preview shows the preset layout. Delivers immediate value for users with standard label sheets.

**Acceptance Scenarios**:

1. **Given** a user opens the template customization interface for the first time, **When** the interface loads, **Then** the last-used template from the previous session is loaded (preset or custom), or avery5160 preset loads if no previous session exists
2. **Given** a user opens the template customization interface, **When** they view the template dropdown, **Then** they see all 5 preset options (avery5160, averyl7160, avery94208, a4-3x10, letter-3x10)
3. **Given** a user selects a preset from the dropdown, **When** the selection changes, **Then** all fields (page size, margins, grid layout, label size) populate with the preset's values
4. **Given** a user selects a preset template, **When** the preview updates, **Then** the preview accurately shows the preset's layout
5. **Given** a user has selected a preset, **When** they modify any parameter, **Then** the dropdown selection remains but the values reflect custom changes (allowing preset customization)
6. **Given** a user toggles "Use Custom Template" off, **When** a preset is selected in the dropdown, **Then** the preset template is used directly for PDF generation

---

### User Story 4 - Save and Manage Custom Templates (Priority: P2)

Users need to save custom templates to local storage with descriptive names, view saved templates, load them for editing or PDF generation, and delete templates they no longer need. Saved templates persist across browser sessions.

**Why this priority**: After creating a custom template, users want to reuse it without re-entering all parameters. Local storage enables template persistence without requiring backend changes or user accounts.

**Independent Test**: Can be fully tested by creating a custom template, saving it with a name, refreshing the browser, verifying the template appears in "Saved Templates", loading it, and confirming all parameters are restored. Delivers value by enabling template reuse and organization.

**Acceptance Scenarios**:

1. **Given** a user has customized a template, **When** they click "Save Template" and enter a name, **Then** the template is saved to local storage with a unique ID
2. **Given** a user has saved templates, **When** they view the "Saved Templates" section, **Then** all saved templates are listed with their names and creation dates
3. **Given** a user clicks a saved template, **When** they load it, **Then** all template parameters populate with the saved values and the preview updates
4. **Given** a user wants to remove a template, **When** they click delete on a saved template, **Then** the template is removed from local storage and the list updates
5. **Given** a user saves a template, **When** they refresh the browser or return later, **Then** the saved template remains available in the "Saved Templates" list
6. **Given** a user attempts to save a template without a name, **When** they try to save, **Then** the system prompts for a template name
7. **Given** a user has saved multiple templates, **When** they generate a PDF, **Then** they can select any saved template for label generation

---

### User Story 5 - Template Validation and Error Handling (Priority: P2)

Users receive clear, immediate feedback when template parameters are invalid or result in layouts that don't fit on the page. The system prevents invalid configurations and guides users to correct them.

**Why this priority**: Invalid templates waste time and paper when printed. Real-time validation prevents errors before PDF generation, ensuring users create functional templates.

**Independent Test**: Can be fully tested by entering invalid values (e.g., negative margins, labels too large for page), verifying the system shows clear error messages, and confirming invalid templates cannot be saved or used for PDF generation. Delivers value by preventing printing errors.

**Acceptance Scenarios**:

1. **Given** a user enters a negative value for any dimension, **When** they leave the field, **Then** the system shows an error message "Value must be positive" and highlights the field
2. **Given** a user creates a layout where labels exceed page boundaries, **When** the preview renders, **Then** the system shows a visual warning and displays an error message "Labels exceed page boundaries. Reduce label size, margins, or gaps."
3. **Given** a user enters non-numeric text in a dimension field, **When** they leave the field, **Then** the system shows an error "Please enter a valid number"
4. **Given** a user configures a template with invalid parameters, **When** they attempt to save or use it, **Then** the system prevents the action and shows all validation errors
5. **Given** a user enters a very large number of rows or columns, **When** the preview updates, **Then** the system displays a performance warning if label count exceeds 200 labels per page
6. **Given** a user corrects validation errors, **When** all parameters are valid, **Then** error messages clear and the template can be saved/used
7. **Given** PDF generation fails due to backend errors or invalid parameters, **When** the error occurs, **Then** the system displays a clear error message with a "Retry" button and an "Adjust Template" option that returns focus to the template editor

---

### User Story 6 - Unit Conversion and Quick Size Presets (Priority: P3)

Users can work with their preferred measurement units (inches, cm, mm, points) and quickly select common page sizes. The system handles unit conversion automatically and updates all fields accordingly.

**Why this priority**: Users in different regions prefer different units. Label sheets often specify dimensions in inches (US) or millimeters (Europe). Unit conversion improves usability across markets.

**Independent Test**: Can be fully tested by changing the unit dropdown from "in" to "mm", verifying all dimension values convert correctly, selecting a quick size preset, and confirming the values populate in the selected unit. Delivers value by supporting international users and reducing conversion errors.

**Acceptance Scenarios**:

1. **Given** a user selects a different unit (in/cm/mm/pt) from the dropdown, **When** the unit changes, **Then** all dimension values convert to the new unit automatically
2. **Given** a user selects a quick size preset (e.g., "Letter 8.5" x 11""), **When** the preset loads, **Then** page dimensions populate in the currently selected unit
3. **Given** a user enters values in inches, **When** they generate a PDF, **Then** the backend receives dimensions in points (internal unit)
4. **Given** a user switches units multiple times, **When** they view dimension values, **Then** rounding errors are minimized (max 0.01 unit precision)
5. **Given** quick size presets are available, **When** the user views the dropdown, **Then** common sizes are listed (Letter, Legal, A4, A5) with dimensions displayed

---

### User Story 7 - Custom Text and Size (Priority: P3)

Users need to customize the text content and size of labels to match their specific organizational needs. This includes adjusting font sizes and text content format (rarity labels, order numbers, set acronym-symbol-alphabet formats).

**Why this priority**: Building on template customization, this enables users to control label content in addition to layout. Users have different organizational systems requiring different text formats.

**Independent Test**: Can be fully tested by selecting a text format option (e.g., order numbers), configuring the format (start=50, increment=50), generating a PDF, and verifying labels display the correct format. Delivers value by enabling flexible label content.

**Acceptance Scenarios**:

1. **Given** a user selects order number format, **When** they configure start=50, increment=50, **Then** generated labels show order numbers (50, 100, 150, 200)
2. **Given** a user selects set acronym-symbol-alphabet format, **When** they generate labels, **Then** labels display format "SET_ACRONYM - symbol - LETTER" (e.g., "FIN - symbol - A")
3. **Given** a user adjusts font size, **When** they generate a PDF, **Then** label text displays at the specified size
4. **Given** a user specifies custom text content, **When** they generate labels, **Then** the custom text appears on each label
5. **Given** a user combines custom template with custom text format, **When** they generate a PDF, **Then** both template layout and text format are applied correctly

---

### Edge Cases

- What happens when a user specifies dimensions that result in zero labels fitting on the page?
- How does the system handle extremely small label sizes (<0.25 inches) that may be unprintable?
- What happens when page margins are so large that no labels fit on the page?
- How does the system handle grid layouts with >100 labels per page (preview performance)?
- What happens when local storage is full or unavailable (browser privacy mode)?
- How does the system handle invalid JSON in local storage (corrupted data)?
- What happens when a user resizes their browser window while in fullscreen preview mode?
- How does the system handle very long template names (>100 characters)?
- What happens when a user has saved 100+ templates (UI performance, storage limits)?
- How does the preview handle sub-pixel dimensions when labels don't align to whole pixels?
- What happens when a user enters scientific notation or special number formats?
- Concurrent edits in multiple tabs: Last write wins with no conflict detection - most recent save overwrites previous version

## Requirements *(mandatory)*

### Functional Requirements

#### Template Customization Interface

- **FR-001**: System MUST provide a "Customize Template" section with a toggle to enable/disable custom template mode
- **FR-002**: System MUST provide a template selection dropdown containing preset templates (avery5160, averyl7160, avery94208, a4-3x10, letter-3x10) that loads predefined configurations when selected. The existing template dropdown from the main interface MUST be moved to the Customize Template section.
- **FR-002b**: Preset template dimensions MUST be synchronized between frontend JavaScript constants (template-presets.js) and backend configuration (config.py LABEL_TEMPLATES). Any changes to preset specifications MUST be applied to both locations consistently. Validation test MUST verify exact match for all dimension parameters.
- **FR-003**: System MUST provide input fields for page size (width, height) with unit selection dropdown (in, cm, mm, pt)
- **FR-004**: System MUST provide a quick size dropdown with common page sizes (Letter 8.5" x 11", Legal 8.5" x 14", A4 210mm x 297mm, A5 148mm x 210mm)
- **FR-005**: System MUST provide input fields for page margins (top, right, bottom, left) in selected units
- **FR-006**: System MUST provide input fields for grid layout (columns, rows, horizontal gap, vertical gap) in selected units
- **FR-007**: System MUST provide input fields for label size (width, height) in selected units
- **FR-008**: System MUST automatically convert all dimension values when the user changes units
- **FR-009**: System MUST validate all dimension inputs in real-time and display error messages for invalid values
- **FR-010**: System MUST calculate and display the number of labels per page based on grid layout settings. Display location: Below Grid Layout section as read-only text (e.g., "Total: 30 labels per page")

#### Live Page Preview

- **FR-011**: System MUST provide a "Page Preview" section that displays a visual representation of the label layout
- **FR-012**: System MUST update the preview within 100ms of any template parameter change
- **FR-013**: System MUST display each label in the preview with a dotted border and sequential number (1, 2, 3, ...)
- **FR-014**: System MUST visually represent page margins, label spacing, and label dimensions accurately in the preview
- **FR-015**: System MUST provide a "Fullscreen" button that expands the preview to fill the entire browser window
- **FR-016**: System MUST allow users to exit fullscreen mode via ESC key or close button
- **FR-017**: System MUST continue updating the preview in real-time while in fullscreen mode
- **FR-018**: System MUST display visual warnings (e.g., red borders) when labels exceed page boundaries
- **FR-019**: System MUST scale the preview proportionally to fit the display area while maintaining accurate aspect ratio
- **FR-020**: System MUST show page dimensions and label count in the preview header

#### Template Persistence

- **FR-021**: System MUST allow users to save custom templates to browser local storage with a user-provided name
- **FR-022**: System MUST generate unique IDs for saved templates (UUID or timestamp-based)
- **FR-023**: System MUST store templates as JSON with all parameters (page size, margins, grid layout, label size, creation date)
- **FR-024**: System MUST display saved templates in a "Saved Templates" section with template name and creation date
- **FR-025**: System MUST allow users to load saved templates by clicking on them in the list
- **FR-026**: System MUST allow users to delete saved templates with confirmation prompt
- **FR-027**: System MUST persist saved templates across browser sessions
- **FR-028**: System MUST handle local storage errors gracefully (storage full, unavailable) with user-friendly messages
- **FR-029**: System MUST validate saved template data on load and handle corrupted data gracefully
- **FR-030**: System MUST persist the last-used template selection (preset ID or custom template ID) to local storage and restore it when the interface loads; if no previous selection exists, default to avery5160 preset
- **FR-031**: System MUST use last-write-wins strategy for concurrent edits across multiple browser tabs (no conflict detection required); the most recent save operation overwrites previous versions

#### Template Usage

- **FR-032**: System MUST allow users to generate PDFs using custom templates
- **FR-033**: System MUST send custom template parameters to the backend PDF generation endpoint
- **FR-034**: System MUST maintain backward compatibility with existing default template selection
- **FR-035**: System MUST allow users to switch between custom templates and preset templates without losing data
- **FR-036**: System MUST indicate which template is currently active (preset or custom, which saved template)

#### Validation and Error Handling

- **FR-037**: System MUST validate that all dimension values are positive numbers
- **FR-038**: System MUST validate that grid layout produces at least one label per page
- **FR-039**: System MUST validate that labels fit within page boundaries (page size minus margins)
- **FR-040**: System MUST validate that template names are non-empty and unique
- **FR-041**: System MUST display field-level errors immediately after user input (inline validation)
- **FR-042**: System MUST prevent saving or using templates with validation errors
- **FR-043**: System MUST provide clear, actionable error messages following constitution principle (FR-021 from original spec)
- **FR-044**: System MUST display PDF generation errors with a "Retry" button and an "Adjust Template" option that returns the user to the template editor with current values preserved
- **FR-049**: System MUST display success confirmation when template save operation completes (e.g., toast notification or inline message "Template '[name]' saved successfully")

#### Accessibility

- **FR-045**: System MUST support keyboard navigation using Tab key to move focus through all interactive elements in logical order
- **FR-046**: System MUST support Enter and Space keys to activate focused buttons and controls
- **FR-047**: System MUST support Escape key to exit fullscreen preview mode and close modal dialogs
- **FR-048**: System MUST provide visible focus indicators for all interactive elements during keyboard navigation

### Key Entities *(include if feature involves data)*

- **CustomTemplate**: User-defined label template with page size, margins, grid layout, label dimensions, name, ID, timestamps
- **TemplateConfiguration**: Runtime template parameters including dimensions in points (internal representation), calculated label positions
- **TemplatePreset**: Predefined template configuration for common label products (Avery 5160, etc.)
- **LabelPosition**: Calculated X,Y coordinates for each label position on the page based on template parameters
- **ViewMode**: State management for preview display mode (normal, fullscreen)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select a preset template and see the preview update in under 200ms
- **SC-002**: Users can create a custom template by adjusting parameters and see real-time preview updates with <100ms latency
- **SC-003**: Users can save a custom template in under 30 seconds (including naming)
- **SC-004**: Saved templates persist across browser sessions with 100% reliability (no data loss)
- **SC-005**: Preview accurately represents printed output with <1% dimension variance
- **SC-006**: Fullscreen mode activates in <200ms and provides clear, scaled preview
- **SC-007**: Template validation catches 100% of invalid configurations before PDF generation
- **SC-008**: System handles at least 50 saved templates without performance degradation (<500ms load time)
- **SC-009**: Unit conversion maintains accuracy within 0.01 unit precision
- **SC-010**: 90% of users successfully create and save a custom template on first attempt without errors
- **SC-011**: Preview rendering supports up to 100 labels per page without performance degradation (<500ms render time)
- **SC-012**: Custom template PDF generation maintains same performance targets as default templates (<10s for 30 labels)

## Out of Scope (Future Enhancements)

The following features are explicitly excluded from the MVP to maintain focus on core template customization functionality. These may be considered for future releases based on user feedback:

- **Template Export/Import**: Downloading templates as JSON files or importing templates from files
- **Template Sharing**: Sharing templates between users or devices via URL or clipboard
- **Cloud Sync**: Syncing templates across devices via backend storage
- **Template Marketplace**: Public repository of community-created templates
- **Advanced Accessibility**: Beyond basic browser defaults (WCAG AA+ compliance, screen reader optimization)
- **Template Versioning**: Version history and rollback capabilities for templates
- **Collaborative Editing**: Real-time collaborative template editing across multiple users
- **Template Analytics**: Usage statistics and popular template tracking
