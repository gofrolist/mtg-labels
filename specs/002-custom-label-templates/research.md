# Research: Custom Label Template Editor with Live Preview

**Date**: 2025-12-03
**Feature**: Custom Label Template Editor with Live Preview
**Phase**: Phase 0 - Research & Technical Decisions

## Research Questions

This document consolidates research findings for technical decisions required to implement the custom label template editor.

---

## 1. Preview Rendering Technology

**Question**: What technology should be used for rendering the live preview of label layouts?

**Options Evaluated**:

### Option A: HTML5 Canvas
- **Pros**:
  - Excellent performance for rendering many elements (100+ labels)
  - Pixel-perfect control over layout and positioning
  - Native browser support, no dependencies
  - Easy to export to image if needed
  - Scales well for fullscreen mode
- **Cons**:
  - Imperative API (more code than declarative)
  - No built-in accessibility (labels are pixels, not DOM elements)
  - Requires manual calculation of all positions

### Option B: SVG
- **Pros**:
  - Declarative, easier to reason about
  - Good for precise geometric shapes (rectangles, borders)
  - Can be styled with CSS
  - Accessible (DOM elements, can add ARIA labels)
- **Cons**:
  - Performance degrades with many elements (100+ labels)
  - Slower rendering than Canvas
  - Larger DOM tree impacts browser performance

###Option C: CSS Grid/Flexbox
- **Pros**:
  - Native HTML/CSS, highly accessible
  - Browser handles layout calculations
  - Easy to inspect in DevTools
- **Cons**:
  - Difficult to achieve pixel-perfect positioning with margins/gaps
  - Complex calculations for non-standard layouts
  - Not suitable for non-integer dimensions

**Decision**: **HTML5 Canvas**

**Rationale**:
- Performance is critical for <100ms preview updates (SC-002)
- Need to support up to 100 labels per page (SC-011)
- Pixel-perfect positioning required to match PDF output (<1% variance, SC-005)
- Canvas provides best performance/control tradeoff
- Accessibility handled through form inputs, not preview itself (preview is visual representation only)

**Implementation Notes**:
- Use requestAnimationFrame for smooth rendering
- Debounce input changes (50ms) before triggering render
- Cache canvas context and only redraw on changes
- Use high-DPI scaling for sharp rendering on Retina displays

---

## 2. Frontend Framework Choice

**Question**: Should we introduce a JavaScript framework (React/Vue) or use vanilla JavaScript?

**Options Evaluated**:

### Option A: React
- **Pros**:
  - Component-based architecture
  - Large ecosystem, many UI libraries
  - Virtual DOM for efficient updates
- **Cons**:
  - Adds ~40KB+ to bundle size
  - Learning curve for team unfamiliar with React
  - Overkill for single feature
  - Requires build tooling (Webpack/Vite)

### Option B: Vue.js
- **Pros**:
  - Simpler API than React
  - Good for enhancing existing HTML
  - Smaller bundle (~30KB)
- **Cons**:
  - Still adds framework overhead
  - Not used elsewhere in project
  - Requires build tooling

### Option C: Vanilla JavaScript (ES6+)
- **Pros**:
  - Zero bundle size overhead
  - Consistent with existing codebase approach
  - No build tooling required
  - Full control over implementation
  - Fast initial load time
- **Cons**:
  - More manual DOM manipulation
  - No reactive data binding
  - More boilerplate code

**Decision**: **Vanilla JavaScript (ES6+)**

**Rationale**:
- Existing codebase uses vanilla JavaScript approach
- Feature is self-contained, doesn't justify framework addition
- Performance-sensitive (preview updates <100ms)
- Team familiarity with vanilla JS
- Avoid increasing bundle size for single feature

**Implementation Notes**:
- Use ES6 classes for organization (TemplateEditor, TemplatePreview, TemplateStorage)
- Use modern DOM APIs (querySelector, addEventListener)
- Use template literals for HTML generation where needed
- Consider minimal state management pattern (pub/sub or simple event system)

---

## 3. Template Storage Strategy

**Question**: Where and how should custom templates be stored?

**Options Evaluated**:

### Option A: Backend Database
- **Pros**:
  - Sync across devices
  - Backup/recovery built-in
  - Can share templates between users
  - No storage limits
- **Cons**:
  - Requires backend API changes
  - Requires user authentication
  - Increased complexity
  - Network latency for load/save
  - Out of scope for MVP

### Option B: Browser localStorage
- **Pros**:
  - No backend changes required
  - Instant save/load (no network)
  - Works offline
  - Simple implementation
  - No authentication needed
- **Cons**:
  - Limited to ~5-10MB (sufficient for 50+ templates)
  - Not synced across devices
  - Can be cleared by user
  - Browser/domain specific

### Option C: IndexedDB
- **Pros**:
  - Larger storage limit (50MB+)
  - Better for complex queries
  - Asynchronous API
- **Cons**:
  - More complex API than localStorage
  - Overkill for simple key-value storage
  - Async adds complexity

**Decision**: **Browser localStorage**

**Rationale**:
- Specification explicitly requires localStorage (per clarifications)
- Simplest implementation, no backend changes
- Sufficient capacity (50 templates × ~500 bytes = 25KB, well under limits)
- Instant save/load supports <50ms performance target (performance context)
- Consistent with "no backend storage required" constraint

**Implementation Notes**:
- Store templates as JSON array under key `mtg_label_generator_templates`
- Store last-used template ID under key `mtg_label_generator_active_template`
- Store user preferences under key `mtg_label_generator_template_prefs`
- Handle quota exceeded errors gracefully
- Validate JSON on load, discard corrupted data
- Generate UUIDs for template IDs (crypto.randomUUID())

---

## 4. Unit Conversion Approach

**Question**: How should unit conversion be handled (inches, cm, mm, points)?

**Options Evaluated**:

### Option A: Store in User's Preferred Unit
- **Pros**:
  - User sees same values they entered
  - No rounding errors on display
- **Cons**:
  - Backend needs to know user's unit preference
  - Conversion required on every PDF generation
  - Difficult to maintain precision

### Option B: Store in Points (PDF Native Unit)
- **Pros**:
  - Points are PDF's native unit (1/72 inch)
  - No backend conversion needed
  - Consistent internal representation
  - Simple backend integration
- **Cons**:
  - Must convert for display in user's unit
  - Small rounding errors possible

### Option C: Store Multiple Units
- **Pros**:
  - No conversion needed
  - Perfect accuracy
- **Cons**:
  - Storage overhead
  - Synchronization complexity
  - Unnecessary complexity

**Decision**: **Store in Points, Display in User's Unit**

**Rationale**:
- Points are PDF native unit (ReportLab uses points internally)
- Simplifies backend integration (no unit awareness needed)
- Single source of truth for dimensions
- Conversion only needed for UI display
- Precision maintained with 0.01 unit accuracy (SC-009)

**Implementation Notes**:
```javascript
const POINTS_PER_UNIT = {
  'pt': 1,
  'in': 72,
  'cm': 28.3465,
  'mm': 2.83465
};

function toPoints(value, unit) {
  return value * POINTS_PER_UNIT[unit];
}

function fromPoints(value, unit) {
  return Math.round((value / POINTS_PER_UNIT[unit]) * 100) / 100; // 0.01 precision
}
```

---

## 5. Keyboard Accessibility Implementation

**Question**: What level of keyboard accessibility should be implemented for MVP?

**Options Evaluated**:

### Option A: Full WCAG 2.1 AA Compliance
- **Pros**:
  - Comprehensive accessibility
  - Screen reader support
  - ARIA labels for all elements
  - Focus management
  - High contrast support
- **Cons**:
  - Significant development time
  - Extensive testing required
  - Out of MVP scope per clarifications

### Option B: Basic Keyboard Navigation
- **Pros**:
  - Essential accessibility coverage
  - Tab, Enter, Escape support
  - Visible focus indicators
  - Reasonable implementation effort
  - Meets MVP requirements (per clarifications)
- **Cons**:
  - No screen reader optimization
  - No ARIA labels
  - Limited accessibility features

### Option C: Browser Defaults Only
- **Pros**:
  - Zero effort
  - Browser handles everything
- **Cons**:
  - May have gaps in keyboard navigation
  - Poor user experience for keyboard users
  - Doesn't meet MVP requirements

**Decision**: **Basic Keyboard Navigation (Option B)**

**Rationale**:
- Per clarifications: "Basic keyboard navigation (Tab, Enter, Escape) - essential minimum for MVP"
- Meets functional requirements FR-045 to FR-048
- Provides value to keyboard users without extensive WCAG implementation
- Balanced approach: better than defaults, less than full WCAG
- Can enhance to WCAG AA in future releases

**Implementation Notes**:
- Ensure logical tab order through all form inputs
- Support Enter/Space on buttons and controls (native HTML behavior)
- Support Escape key for fullscreen exit and modal close
- Visible focus indicators with CSS `:focus` styles
- Use semantic HTML (button, input, select) for native keyboard support
- No custom focus traps or ARIA labels required for MVP

---

## 6. Preset Template Data Source

**Question**: Where should preset template definitions be stored?

**Options Evaluated**:

### Option A: JavaScript Constants
- **Pros**:
  - Fast access (in-memory)
  - Type-safe with TypeScript/JSDoc
  - Easy to modify
  - No network request
- **Cons**:
  - Hardcoded in frontend
  - Can't update without deployment

### Option B: Backend Configuration
- **Pros**:
  - Centralized source of truth
  - Can update without frontend deployment
  - Can share with backend PDF generation
- **Cons**:
  - Network request to load presets
  - Slower initial load
  - More complex

### Option C: Both (DRY violation)
- **Cons**:
  - Synchronization issues
  - Maintenance burden

**Decision**: **JavaScript Constants (Option A)**

**Rationale**:
- Presets rarely change (stable Avery template specifications)
- Fast access critical for UI responsiveness
- No network request = better offline support
- Backend already has template definitions in config.py
- Acceptable duplication for static, stable data

**Implementation Notes**:
```javascript
const TEMPLATE_PRESETS = {
  'avery5160': {
    name: 'Avery 5160',
    pageWidth: 612, // 8.5"
    pageHeight: 792, // 11"
    marginTop: 36, // 0.5"
    marginRight: 13.5, // 0.1875"
    // ... rest of dimensions ...
  },
  // ... other presets ...
};
```

---

## 7. Error Handling Strategy

**Question**: How should validation errors be presented to users?

**Options Evaluated**:

### Option A: Inline Field-Level Errors
- **Pros**:
  - Immediate feedback
  - Error appears next to problem field
  - Clear what to fix
- **Cons**:
  - Can be overwhelming with many errors
  - May not show relationships between fields

### Option B: Summary Error Banner
- **Pros**:
  - All errors in one place
  - Overview of what needs fixing
- **Cons**:
  - User must find which field has error
  - Less immediate feedback

### Option C: Combination (Inline + Summary)
- **Pros**:
  - Best of both worlds
  - Inline for immediate feedback
  - Summary for overview
- **Cons**:
  - More implementation complexity
  - May be redundant for single errors

**Decision**: **Inline Field-Level Errors with Visual Preview Warnings**

**Rationale**:
- Per specification: "System MUST display field-level errors immediately after user input" (FR-039)
- Per specification: "System MUST display visual warnings (e.g., red borders) when labels exceed page boundaries" (FR-018)
- Immediate feedback supports <100ms preview update target
- Combination of field errors + preview warnings provides comprehensive feedback

**Implementation Notes**:
- Show error message below invalid input field (Bootstrap form-feedback)
- Add `is-invalid` class to input for styling
- Show red border on preview when template doesn't fit
- Display error summary in preview header if multiple errors
- Clear errors immediately when fixed (onInput event)

---

## 8. Preview Scale Calculation

**Question**: How should the preview scale to fit different container sizes?

**Options Evaluated**:

### Option A: Fixed Scale (e.g., 50%)
- **Pros**:
  - Simple, predictable
  - Consistent across devices
- **Cons**:
  - May not fit small screens
  - Wastes space on large screens
  - Doesn't adapt to container size

### Option B: Dynamic Scale to Fit Container
- **Pros**:
  - Optimal use of available space
  - Works on all screen sizes
  - Better UX
- **Cons**:
  - Slightly more complex calculation
  - Must recalculate on window resize

### Option C: User-Controlled Zoom
- **Pros**:
  - User controls scale
  - Can zoom in for details
- **Cons**:
  - Additional UI complexity
  - Out of MVP scope

**Decision**: **Dynamic Scale to Fit Container (Option B)**

**Rationale**:
- Better user experience across devices
- Preview must scale proportionally while maintaining aspect ratio (FR-019)
- Supports fullscreen mode with different scale (FR-015)
- Small implementation complexity, high value

**Implementation Notes**:
```javascript
function calculateScale(canvasWidth, canvasHeight, containerWidth, containerHeight) {
  const scaleX = containerWidth / canvasWidth;
  const scaleY = containerHeight / canvasHeight;
  return Math.min(scaleX, scaleY) * 0.95; // 95% to leave padding
}
```

---

## 9. Fullscreen Implementation

**Question**: How should fullscreen mode be implemented?

**Options Evaluated**:

### Option A: Browser Fullscreen API
- **Pros**:
  - True fullscreen experience
  - Hides browser chrome
  - Standard API
- **Cons**:
  - Requires user gesture
  - Different behavior across browsers
  - May be jarring UX

### Option B: Modal Overlay (Pseudo-Fullscreen)
- **Pros**:
  - More control over appearance
  - Consistent behavior
  - Can include controls in overlay
  - Simpler to implement
- **Cons**:
  - Not true fullscreen
  - Still shows browser chrome

**Decision**: **Modal Overlay (Pseudo-Fullscreen)**

**Rationale**:
- Specification says "expands the preview to fill the entire browser window" (not entire screen)
- More control over appearance and UX
- Consistent behavior across browsers
- Easier to implement with CSS (position: fixed, z-index: 9999)
- Can include close button and controls in overlay

**Implementation Notes**:
```javascript
function enterFullscreen() {
  const overlay = document.getElementById('preview-fullscreen');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scroll
  this.render(this.currentConfig); // Re-render at larger scale
}

function exitFullscreen() {
  const overlay = document.getElementById('preview-fullscreen');
  overlay.classList.remove('active');
  document.body.style.overflow = ''; // Restore scroll
  this.render(this.currentConfig); // Re-render at normal scale
}
```

CSS:
```css
.preview-fullscreen {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
}

.preview-fullscreen.active {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Summary of Decisions

| Decision Area | Chosen Approach | Rationale |
|---------------|-----------------|-----------|
| Preview Rendering | HTML5 Canvas | Performance for 100+ labels, pixel-perfect control |
| Frontend Framework | Vanilla JavaScript | Zero overhead, consistent with codebase, sufficient for feature |
| Template Storage | Browser localStorage | No backend changes, instant save/load, sufficient capacity |
| Unit Conversion | Store points, display user unit | PDF native unit, simple backend integration |
| Keyboard Accessibility | Basic navigation (Tab/Enter/Esc) | Meets MVP requirements, balanced effort/value |
| Preset Templates | JavaScript constants | Fast access, stable data, no network request |
| Error Handling | Inline field errors + preview warnings | Immediate feedback, clear what to fix |
| Preview Scale | Dynamic to fit container | Optimal space usage, better UX |
| Fullscreen Mode | Modal overlay (pseudo-fullscreen) | More control, consistent behavior, simpler |

All decisions align with constitution principles (TDD, performance, simplicity) and meet specification requirements.
