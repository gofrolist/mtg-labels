# Quickstart: Custom Label Template Editor Implementation

**Date**: 2025-12-03
**Feature**: Custom Label Template Editor with Live Preview
**Target Audience**: Developers implementing this feature

## Overview

This guide helps you get started implementing the Custom Label Template Editor. Follow this guide to set up your development environment, understand the architecture, and run tests.

## Prerequisites

- Python 3.13+ installed
- UV package manager installed
- Node.js 18+ (for frontend tests, if using Jest/Vitest)
- Git repository cloned
- Familiarity with FastAPI, JavaScript ES6+, HTML5 Canvas

## Quick Setup (5 minutes)

```bash
# 1. Navigate to project root
cd mtg-label-generator

# 2. Install dependencies (if not already done)
uv sync

# 3. Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate  # Windows

# 4. Run existing tests to verify setup
uv run pytest tests/ -v

# 5. Start development server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080

# 6. Open browser to http://localhost:8080
```

## Architecture Overview

### Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Frontend)                   │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Template Editor│  │   Preview    │  │  Storage    │ │
│  │   (UI Logic)   │──│  (Canvas)    │  │(localStorage)│ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
│           │                                    │          │
│           └────────────────┬──────────────────┘          │
│                            ▼                              │
│                    ┌───────────────┐                     │
│                    │   Validator   │                     │
│                    └───────────────┘                     │
└─────────────────────────────────────────────────────────┘
                            │
                   HTTP POST /generate-pdf
                   {use_custom_template: true,
                    custom_template_json: "..."}
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
│                                                          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  API Routes    │──│  Validation  │──│     PDF     │ │
│  │ (routes.py)    │  │  (Pydantic)  │  │  Generator  │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** → Template Editor (JavaScript)
2. **Template Editor** → Validator (validate parameters)
3. **Validator** → Preview Renderer (render preview on canvas)
4. **Template Editor** → Storage (save to localStorage)
5. **Generate PDF** → Backend API (POST /generate-pdf with custom_template_json)
6. **Backend** → Pydantic Validation → PDF Generation → Return PDF

## Key Files to Modify/Create

### Frontend (Primary Work)

**Create New Files**:
```
templates/js/
├── template-editor.js      # Main editor logic, state management
├── template-preview.js     # Canvas rendering, fullscreen mode
├── template-storage.js     # localStorage operations
└── template-validation.js  # Client-side validation

static/css/
└── template-editor.css     # Editor styling
```

**Modify Existing Files**:
```
templates/index.html        # Add template editor UI sections
```

### Backend (Minimal Changes)

**Create New Files**:
```
src/models/
└── custom_template.py      # Pydantic model for validation
```

**Modify Existing Files**:
```
src/api/routes.py           # Add custom template parameter handling
src/services/pdf_generator.py  # Accept custom template config
```

## Development Workflow

### Step 1: Backend Validation (TDD)

Start with backend validation following TDD principle.

```python
# tests/unit/test_custom_template.py
import pytest
from src.models.custom_template import CustomTemplateConfig

def test_valid_custom_template():
    """Test valid template configuration"""
    config = CustomTemplateConfig(
        page_width=612,
        page_height=792,
        margin_top=36,
        margin_right=13.5,
        margin_bottom=36,
        margin_left=13.5,
        columns=3,
        rows=10,
        horizontal_gap=9,
        vertical_gap=0,
        label_width=189,
        label_height=72
    )
    assert config.page_width == 612
    assert config.columns == 3

def test_negative_dimensions_rejected():
    """Test that negative dimensions are rejected"""
    with pytest.raises(ValueError):
        CustomTemplateConfig(
            page_width=-100,  # Invalid
            # ... other params ...
        )

def test_labels_exceed_page_rejected():
    """Test that templates where labels exceed page are rejected"""
    with pytest.raises(ValueError):
        CustomTemplateConfig(
            page_width=612,
            page_height=792,
            margin_top=36,
            margin_left=36,
            margin_bottom=36,
            margin_right=36,
            columns=5,
            rows=15,
            label_width=200,  # Too wide
            label_height=100,
            horizontal_gap=10,
            vertical_gap=10
        )
```

Run tests (they should fail):
```bash
uv run pytest tests/unit/test_custom_template.py -v
```

Then implement `src/models/custom_template.py` to make tests pass.

### Step 2: Frontend Template Editor

Create the template editor JavaScript:

```javascript
// templates/js/template-editor.js
class TemplateEditor {
  constructor() {
    this.initElements();
    this.initPresets();
    this.loadLastUsed();
    this.attachEventListeners();
  }

  initElements() {
    // Cache DOM elements
    this.toggleCustom = document.getElementById('use-custom-template');
    this.pageWidth = document.getElementById('page-width');
    this.pageHeight = document.getElementById('page-height');
    // ... other input fields ...
  }

  initPresets() {
    // Load preset template definitions
    this.presets = {
      'avery5160': { /* ...dimensions... */ },
      // ... other presets ...
    };
  }

  loadLastUsed() {
    // Load last-used template from localStorage (FR-030)
    const lastUsed = localStorage.getItem('mtg_label_generator_active_template');
    if (lastUsed) {
      this.loadTemplate(lastUsed);
    } else {
      this.loadTemplate('avery5160'); // Default preset
    }
  }

  attachEventListeners() {
    // Attach event listeners to all inputs
    // Debounce updates for performance
    this.pageWidth.addEventListener('input', debounce(() => {
      this.onParameterChange();
    }, 50));
    // ... other listeners ...
  }

  onParameterChange() {
    // Validate, update preview, save state
    const config = this.getCurrentConfig();
    const errors = this.validator.validate(config);

    if (errors.length === 0) {
      this.preview.render(config);
      this.clearErrors();
    } else {
      this.showErrors(errors);
    }
  }
}

// Utility: Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

### Step 3: Frontend Preview Renderer

Create the canvas preview renderer:

```javascript
// templates/js/template-preview.js
class TemplatePreview {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.scale = 1.0;
    this.isFullscreen = false;
  }

  render(config) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate scale to fit container
    const containerWidth = this.canvas.parentElement.clientWidth;
    const containerHeight = this.canvas.parentElement.clientHeight;
    this.scale = this.calculateScale(config, containerWidth, containerHeight);

    // Set canvas dimensions
    this.canvas.width = config.page_width * this.scale;
    this.canvas.height = config.page_height * this.scale;

    // Draw page border
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw margin guides
    this.drawMargins(config);

    // Draw labels
    this.drawLabels(config);

    // Show validation warnings if needed
    if (!this.validatePageFit(config)) {
      this.showFitWarning();
    }
  }

  drawLabels(config) {
    // Calculate label positions
    const positions = this.calculateLabelPositions(config);

    // Draw each label
    positions.forEach((pos, index) => {
      const x = pos.x * this.scale;
      const y = pos.y * this.scale;
      const width = config.label_width * this.scale;
      const height = config.label_height * this.scale;

      // Draw label border (dotted)
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeStyle = '#666';
      this.ctx.strokeRect(x, y, width, height);
      this.ctx.setLineDash([]);

      // Draw label number
      this.ctx.fillStyle = '#999';
      this.ctx.font = `${12 * this.scale}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(index + 1, x + width / 2, y + height / 2);
    });
  }

  calculateLabelPositions(config) {
    const positions = [];
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.columns; col++) {
        const x = config.margin_left + col * (config.label_width + config.horizontal_gap);
        const y = config.margin_top + row * (config.label_height + config.vertical_gap);
        positions.push({ x, y, row, col });
      }
    }
    return positions;
  }

  calculateScale(config, containerWidth, containerHeight) {
    const scaleX = containerWidth / config.page_width;
    const scaleY = containerHeight / config.page_height;
    return Math.min(scaleX, scaleY) * 0.95; // 95% to leave padding
  }

  enterFullscreen() {
    const overlay = document.getElementById('preview-fullscreen-overlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.isFullscreen = true;
    // Re-render at larger scale
    this.render(this.currentConfig);
  }

  exitFullscreen() {
    const overlay = document.getElementById('preview-fullscreen-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    this.isFullscreen = false;
    // Re-render at normal scale
    this.render(this.currentConfig);
  }
}
```

### Step 4: Frontend localStorage Operations

Create storage operations:

```javascript
// templates/js/template-storage.js
class TemplateStorage {
  constructor() {
    this.storageKey = 'mtg_label_generator_templates';
    this.activeKey = 'mtg_label_generator_active_template';
  }

  save(template) {
    try {
      const templates = this.loadAll();

      // Generate UUID if new template
      if (!template.id) {
        template.id = this.generateUUID();
        template.created_at = new Date().toISOString();
      }
      template.modified_at = new Date().toISOString();

      // Check for duplicate name
      const existing = templates.find(t => t.name === template.name && t.id !== template.id);
      if (existing) {
        throw new Error(`Template name "${template.name}" already exists`);
      }

      // Add or update template
      const index = templates.findIndex(t => t.id === template.id);
      if (index >= 0) {
        templates[index] = template;
      } else {
        templates.push(template);
      }

      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
      return template.id;

    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        throw new Error('Storage full. Please delete some templates.');
      }
      throw e;
    }
  }

  loadAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];

      const templates = JSON.parse(data);

      // Validate each template
      return templates.filter(t => this.validateTemplate(t));

    } catch (e) {
      console.error('Failed to load templates:', e);
      return [];
    }
  }

  load(id) {
    const templates = this.loadAll();
    return templates.find(t => t.id === id) || null;
  }

  delete(id) {
    const templates = this.loadAll();
    const filtered = templates.filter(t => t.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    return filtered.length < templates.length;
  }

  saveLastUsed(id) {
    localStorage.setItem(this.activeKey, id);
  }

  loadLastUsed() {
    return localStorage.getItem(this.activeKey);
  }

  validateTemplate(template) {
    // Basic validation: ensure required fields exist
    return template.id && template.name &&
           typeof template.page_width === 'number' &&
           typeof template.page_height === 'number';
  }

  generateUUID() {
    return crypto.randomUUID();
  }
}
```

### Step 5: Integration Testing

Test the full flow:

```python
# tests/integration/test_custom_template_pdf.py
import pytest
import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_generate_pdf_with_custom_template():
    """Test PDF generation with custom template"""
    custom_template = {
        "page_width": 612,
        "page_height": 792,
        "margin_top": 36,
        "margin_right": 13.5,
        "margin_bottom": 36,
        "margin_left": 13.5,
        "columns": 3,
        "rows": 10,
        "horizontal_gap": 9,
        "vertical_gap": 0,
        "label_width": 189,
        "label_height": 72
    }

    response = client.post(
        "/generate-pdf",
        data={
            "set_ids": ["test-set-id"],
            "use_custom_template": True,
            "custom_template_json": json.dumps(custom_template)
        }
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"

def test_custom_template_validation_error():
    """Test validation error for invalid template"""
    invalid_template = {
        "page_width": -100,  # Invalid
        "page_height": 792,
        # ... other fields ...
    }

    response = client.post(
        "/generate-pdf",
        data={
            "set_ids": ["test-set-id"],
            "use_custom_template": True,
            "custom_template_json": json.dumps(invalid_template)
        }
    )

    assert response.status_code == 400
    assert "positive" in response.json()["detail"].lower()
```

## Testing

### Run Backend Tests

```bash
# All tests
uv run pytest tests/ -v

# Unit tests only
uv run pytest tests/unit/ -v

# Integration tests only
uv run pytest tests/integration/ -v

# Specific test file
uv run pytest tests/unit/test_custom_template.py -v

# With coverage
uv run pytest --cov=src --cov-report=html --cov-report=term-missing
```

### Run Frontend Tests (if using Jest)

```bash
# Install Jest (if not already)
npm install --save-dev jest

# Run tests
npm test

# Run specific test
npm test template-storage.test.js

# With coverage
npm test -- --coverage
```

### Manual Testing Checklist

- [ ] Load interface - last-used template loads
- [ ] Select preset - all 5 presets load correctly
- [ ] Modify parameters - preview updates within 100ms
- [ ] Unit conversion - switching units converts values correctly
- [ ] Save template - template saves to localStorage
- [ ] Load template - saved template loads with all parameters
- [ ] Delete template - template removes from list
- [ ] Fullscreen mode - preview expands and exits correctly
- [ ] Keyboard navigation - Tab moves through inputs, Enter activates buttons, Escape exits fullscreen
- [ ] Validation - negative values show errors, labels exceeding page show warning
- [ ] PDF generation - custom template generates correct PDF
- [ ] Error handling - invalid template shows retry/adjust options

## Debugging Tips

### Backend Debugging

```python
# Add print statements in validation
from src.models.custom_template import CustomTemplateConfig

config = CustomTemplateConfig(**template_dict)
print(f"Validation passed: {config}")
```

### Frontend Debugging

```javascript
// Enable verbose logging
const DEBUG = true;

if (DEBUG) {
  console.log('Template config:', config);
  console.log('Label positions:', positions);
  console.log('Validation errors:', errors);
}

// Inspect canvas
console.log('Canvas dimensions:', canvas.width, canvas.height);
console.log('Scale:', this.scale);
```

### localStorage Debugging

```javascript
// View all templates in console
const templates = JSON.parse(localStorage.getItem('mtg_label_generator_templates'));
console.table(templates);

// Clear all templates (for testing)
localStorage.removeItem('mtg_label_generator_templates');
localStorage.removeItem('mtg_label_generator_active_template');
```

## Common Issues & Solutions

### Issue: Preview not updating
**Solution**: Check debounce timing, verify event listeners attached, check for JavaScript errors in console

### Issue: localStorage quota exceeded
**Solution**: Clear old templates, reduce template count, implement template deletion

### Issue: Canvas blurry on high-DPI displays
**Solution**: Use device pixel ratio scaling:
```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
ctx.scale(dpr, dpr);
```

### Issue: Template validation failing unexpectedly
**Solution**: Check unit conversion (ensure converting to points), verify calculation logic matches backend

## Next Steps

1. ✅ Read this quickstart
2. ✅ Set up development environment
3. ⏭️ Run `/speckit.tasks` to generate detailed task breakdown
4. ⏭️ Start with backend validation (TDD approach)
5. ⏭️ Implement frontend components
6. ⏭️ Write tests as you go
7. ⏭️ Run `uv run ruff check` and `uv run pyright` before committing

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [HTML5 Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [ReportLab User Guide](https://www.reportlab.com/docs/reportlab-userguide.pdf)
- Project Constitution: `/.specify/memory/constitution.md`
- Feature Specification: `./spec.md`
- Data Model: `./data-model.md`
- API Contracts: `./contracts/api-contracts.md`
