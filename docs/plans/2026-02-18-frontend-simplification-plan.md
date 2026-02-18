# Frontend Simplification & UI/UX Improvement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the frontend codebase by breaking up God components, deleting dead code, fixing anti-patterns, and improving UI/UX with loading skeletons, consistent error display, and dark mode fixes.

**Architecture:** Extract Layout components from App.tsx, break TemplateCustomizer into smaller pieces, add batch selection API to useSelection, create shared UI primitives (ErrorDisplay, LoadingSkeleton, DonateModal, NumField). All changes preserve the existing visual design.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vite 7, Vitest, Bun

---

### Task 1: Delete dead code files

**Files:**
- Delete: `frontend/src/components/TemplateCustomizer/SavedTemplatesList.tsx`
- Delete: `frontend/src/components/TemplateSelector/TemplateSelector.tsx`
- Delete: `frontend/src/components/TemplateSelector/TemplateSelector.test.tsx`

**Step 1: Delete the files**

```bash
rm frontend/src/components/TemplateCustomizer/SavedTemplatesList.tsx
rm -r frontend/src/components/TemplateSelector/
```

**Step 2: Verify no remaining imports**

```bash
cd frontend && bunx grep -r "SavedTemplatesList\|TemplateSelector" src/ --include="*.ts" --include="*.tsx"
```

Expected: No output (no imports remain).

**Step 3: Commit**

```bash
git add -A && git commit -m "delete dead code: SavedTemplatesList, TemplateSelector"
```

---

### Task 2: Create `utils/templateUtils.ts`

Extract `round2`, `snapPageSize`, `presetToCustom`, `getPresetUnit` from `TemplateCustomizer.tsx`.

**Files:**
- Create: `frontend/src/utils/templateUtils.ts`
- Create: `frontend/src/utils/__tests__/templateUtils.test.ts`

**Step 1: Write the test**

```typescript
// frontend/src/utils/__tests__/templateUtils.test.ts
import { describe, it, expect } from 'vitest'
import { round2, snapPageSize, presetToCustom, getPresetUnit } from '../templateUtils'

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1)
    expect(round2(1.555)).toBe(1.56)
    expect(round2(2.0)).toBe(2)
  })
})

describe('getPresetUnit', () => {
  it('returns in for US Letter presets', () => {
    expect(getPresetUnit('avery5160')).toBe('in')
  })

  it('returns mm for A4 presets', () => {
    expect(getPresetUnit('averyl7160')).toBe('mm')
  })

  it('defaults to avery5160 for unknown IDs', () => {
    expect(getPresetUnit('nonexistent')).toBe('in')
  })
})

describe('snapPageSize', () => {
  it('snaps near-A4 values', () => {
    expect(snapPageSize(209.99, 297.01, 'mm')).toEqual({ width: 210, height: 297 })
  })

  it('snaps near-letter values', () => {
    expect(snapPageSize(8.499, 10.999, 'in')).toEqual({ width: 8.5, height: 11 })
  })

  it('rounds non-standard values', () => {
    expect(snapPageSize(7.123, 9.456, 'in')).toEqual({ width: 7.12, height: 9.46 })
  })
})

describe('presetToCustom', () => {
  it('converts avery5160 preset to custom dimensions in inches', () => {
    const result = presetToCustom('avery5160', 'in')
    expect(result.pageWidth).toBe(8.5)
    expect(result.pageHeight).toBe(11)
    expect(result.unit).toBe('in')
    expect(result.columns).toBe(3)
    expect(result.rows).toBe(10)
  })

  it('converts A4 preset to custom dimensions in mm', () => {
    const result = presetToCustom('averyl7160', 'mm')
    expect(result.pageWidth).toBe(210)
    expect(result.pageHeight).toBe(297)
    expect(result.unit).toBe('mm')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd frontend && bun run test -- src/utils/__tests__/templateUtils.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write implementation**

```typescript
// frontend/src/utils/templateUtils.ts
import type { CustomTemplateDimensions, TemplateMeasurementUnit } from '../types'
import { LABEL_TEMPLATES } from '../constants/templates'
import { fromPoints } from './unitConversion'

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function getPresetUnit(presetId: string): TemplateMeasurementUnit {
  const t = LABEL_TEMPLATES[presetId] ?? LABEL_TEMPLATES.avery5160
  return t.page_width === 595.2 && t.page_height === 841.8 ? 'mm' : 'in'
}

export function snapPageSize(
  width: number,
  height: number,
  unit: TemplateMeasurementUnit,
): { width: number; height: number } {
  if (unit === 'mm' && Math.abs(width - 210) < 0.1 && Math.abs(height - 297) < 0.1) {
    return { width: 210, height: 297 }
  }
  if (unit === 'in' && Math.abs(width - 8.5) < 0.01 && Math.abs(height - 11) < 0.01) {
    return { width: 8.5, height: 11 }
  }
  return { width: round2(width), height: round2(height) }
}

export function presetToCustom(
  presetId: string,
  unit: TemplateMeasurementUnit,
): CustomTemplateDimensions {
  const t = LABEL_TEMPLATES[presetId] ?? LABEL_TEMPLATES.avery5160
  const rawW = fromPoints(t.page_width, unit)
  const rawH = fromPoints(t.page_height, unit)
  const { width: pageWidth, height: pageHeight } = snapPageSize(rawW, rawH, unit)
  return {
    pageWidth,
    pageHeight,
    unit,
    marginLeft: round2(fromPoints(t.left_margin, unit)),
    marginTop: round2(fromPoints(t.top_margin, unit)),
    columns: t.labels_per_row,
    rows: t.label_rows,
    horizontalGap: round2(fromPoints(t.horizontal_gap, unit)),
    verticalGap: round2(fromPoints(t.vertical_gap, unit)),
    labelWidth: round2(fromPoints(t.label_width, unit)),
    labelHeight: round2(fromPoints(t.label_height, unit)),
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd frontend && bun run test -- src/utils/__tests__/templateUtils.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/utils/templateUtils.ts frontend/src/utils/__tests__/templateUtils.test.ts
git commit -m "extract template utilities from TemplateCustomizer"
```

---

### Task 3: Update `SelectionState.templateId` type to `string | null`

**Files:**
- Modify: `frontend/src/types/index.ts:53` — change `templateId: string` to `templateId: string | null`
- Modify: `frontend/src/hooks/useSelection.ts` — update `setTemplate` type, add `selectSets`/`deselectSets`
- Modify: `frontend/src/constants/templates.ts` — update `getTemplate` to accept `string | null`

**Step 1: Update types**

In `frontend/src/types/index.ts`, change line 53:
```typescript
  templateId: string | null
```

**Step 2: Update `constants/templates.ts`**

Update `getTemplate` to handle null:
```typescript
export function getTemplate(id: string | null): LabelTemplate | undefined {
  if (!id) return undefined
  return LABEL_TEMPLATES[id]
}
```

**Step 3: Update `useSelection.ts`**

Add `selectSets` and `deselectSets` batch methods, change `setTemplate` to accept `string | null`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { CustomTemplateDimensions, SelectionState } from '../types'
import { getStorageItem, setStorageItem, isStorageAvailable } from '../utils/localStorage'
import { DEFAULT_TEMPLATE_ID } from '../constants/templates'

const SELECTION_STORAGE_KEY = 'selection-state'

const initialState: SelectionState = {
  selectedSetIds: [],
  quantities: {},
  templateId: DEFAULT_TEMPLATE_ID,
  placeholders: 0,
  customTemplate: null,
  useCustomTemplate: false,
  useCustomQuantity: false,
}

export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>(() => {
    if (isStorageAvailable()) {
      const saved = getStorageItem<SelectionState>(SELECTION_STORAGE_KEY)
      if (saved) {
        return { ...initialState, ...saved }
      }
    }
    return initialState
  })

  useEffect(() => {
    if (isStorageAvailable()) {
      setStorageItem(SELECTION_STORAGE_KEY, selection)
    }
  }, [selection])

  const toggleSetSelection = useCallback((setId: string) => {
    setSelection((prev) => {
      const isSelected = prev.selectedSetIds.includes(setId)
      return {
        ...prev,
        selectedSetIds: isSelected
          ? prev.selectedSetIds.filter((id) => id !== setId)
          : [...prev.selectedSetIds, setId],
      }
    })
  }, [])

  const selectSets = useCallback((ids: string[]) => {
    setSelection((prev) => {
      const existing = new Set(prev.selectedSetIds)
      for (const id of ids) existing.add(id)
      return { ...prev, selectedSetIds: [...existing] }
    })
  }, [])

  const deselectSets = useCallback((ids: string[]) => {
    setSelection((prev) => {
      const toRemove = new Set(ids)
      return {
        ...prev,
        selectedSetIds: prev.selectedSetIds.filter((id) => !toRemove.has(id)),
      }
    })
  }, [])

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setSelection((prev) => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [itemId]: Math.max(1, Math.min(100, quantity)),
      },
    }))
  }, [])

  const setTemplate = useCallback((templateId: string | null) => {
    setSelection((prev) => ({ ...prev, templateId }))
  }, [])

  const setPlaceholders = useCallback((placeholders: number) => {
    setSelection((prev) => ({ ...prev, placeholders: Math.max(0, placeholders) }))
  }, [])

  const selectAllSets = useCallback((setIds: string[]) => {
    setSelection((prev) => ({ ...prev, selectedSetIds: setIds }))
  }, [])

  const deselectAllSets = useCallback(() => {
    setSelection((prev) => ({ ...prev, selectedSetIds: [] }))
  }, [])

  const isAllSetsSelected = useCallback((setIds: string[]) => {
    return setIds.length > 0 && setIds.every((id) => selection.selectedSetIds.includes(id))
  }, [selection.selectedSetIds])

  const setCustomTemplate = useCallback((customTemplate: CustomTemplateDimensions | null) => {
    setSelection((prev) => ({ ...prev, customTemplate }))
  }, [])

  const setUseCustomTemplate = useCallback((useCustomTemplate: boolean) => {
    setSelection((prev) => ({ ...prev, useCustomTemplate }))
  }, [])

  const setUseCustomQuantity = useCallback((useCustomQuantity: boolean) => {
    setSelection((prev) => ({ ...prev, useCustomQuantity }))
  }, [])

  return {
    selection,
    toggleSetSelection,
    selectSets,
    deselectSets,
    setQuantity,
    setTemplate,
    setPlaceholders,
    selectAllSets,
    deselectAllSets,
    isAllSetsSelected,
    setCustomTemplate,
    setUseCustomTemplate,
    setUseCustomQuantity,
  }
}
```

**Step 4: Run existing tests**

```bash
cd frontend && bun run test -- src/hooks/__tests__/useSelection.test.ts
```

Expected: PASS (existing tests should still pass since `DEFAULT_TEMPLATE_ID` is a valid string)

**Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/hooks/useSelection.ts frontend/src/constants/templates.ts
git commit -m "add batch select/deselect API and nullable templateId"
```

---

### Task 4: Create `useOpenGroups` hook

**Files:**
- Create: `frontend/src/hooks/useOpenGroups.ts`

**Step 1: Write the hook**

```typescript
// frontend/src/hooks/useOpenGroups.ts
import { useState, useMemo, useCallback } from 'react'
import type { MTGSet } from '../types'

export function useOpenGroups(
  searchQuery: string,
  groupedSets: Record<string, MTGSet[]>,
  selectedSetIds: string[],
) {
  const [manualOpenGroups, setManualOpenGroups] = useState<Set<string> | null>(null)

  const openGroups = useMemo(() => {
    if (searchQuery.trim()) {
      return new Set(Object.keys(groupedSets))
    }
    if (manualOpenGroups !== null) return manualOpenGroups
    if (selectedSetIds.length > 0) {
      const groupsToOpen = new Set<string>()
      for (const [groupName, groupSets] of Object.entries(groupedSets)) {
        if (groupSets.some((set) => selectedSetIds.includes(set.id))) {
          groupsToOpen.add(groupName)
        }
      }
      return groupsToOpen
    }
    return new Set<string>()
  }, [searchQuery, manualOpenGroups, groupedSets, selectedSetIds])

  const toggleGroup = useCallback((groupName: string) => {
    setManualOpenGroups((prev) => {
      const base = prev ?? openGroups
      const next = new Set(base)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }, [openGroups])

  return { openGroups, toggleGroup }
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useOpenGroups.ts
git commit -m "extract useOpenGroups hook from App.tsx"
```

---

### Task 5: Create shared UI components

**Files:**
- Create: `frontend/src/components/ErrorDisplay.tsx`
- Create: `frontend/src/components/LoadingSkeleton.tsx`
- Create: `frontend/src/components/DonateModal.tsx`

**Step 1: Create ErrorDisplay**

```typescript
// frontend/src/components/ErrorDisplay.tsx
interface ErrorDisplayProps {
  message: string
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
      {message}
    </div>
  )
}
```

**Step 2: Create LoadingSkeleton**

```typescript
// frontend/src/components/LoadingSkeleton.tsx
export function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-4" aria-label="Loading sets...">
      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx} className="border border-mtg-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-mtg-section-bg">
            <div className="h-5 w-32 rounded bg-mtg-border animate-pulse" />
          </div>
          <div className="px-4 py-2 bg-mtg-card-bg border-t border-mtg-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-1 py-1">
                  <div className="w-4 h-4 rounded bg-mtg-border animate-pulse shrink-0" />
                  <div className="w-5 h-5 rounded bg-mtg-border animate-pulse shrink-0" />
                  <div className="h-4 flex-1 rounded bg-mtg-border animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Create DonateModal**

```typescript
// frontend/src/components/DonateModal.tsx
interface DonateModalProps {
  onClose: () => void
}

export function DonateModal({ onClose }: DonateModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-[500px] rounded-lg bg-mtg-card-bg border border-mtg-border shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg text-mtg-text">Thank You!</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-mtg-text-muted hover:text-mtg-text p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-center text-mtg-text mb-4 leading-relaxed">
          Your PDF is being generated. If you find this tool useful, consider supporting its
          development!
        </p>
        <div className="flex justify-center">
          <form action="https://www.paypal.com/donate" method="post" target="_top">
            <input type="hidden" name="business" value="3ABRQKUCLUGXN" />
            <input type="hidden" name="no_recurring" value="0" />
            <input type="hidden" name="item_name" value="for buying more MTG cards :)" />
            <input type="hidden" name="currency_code" value="USD" />
            <button type="submit" className="border-0 bg-transparent p-0 cursor-pointer">
              <img
                src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
                alt="Donate with PayPal"
                title="PayPal - The safer, easier way to pay online!"
              />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/ErrorDisplay.tsx frontend/src/components/LoadingSkeleton.tsx frontend/src/components/DonateModal.tsx
git commit -m "add shared UI components: ErrorDisplay, LoadingSkeleton, DonateModal"
```

---

### Task 6: Create `NumField` component and move `PlaceholdersInput`

**Files:**
- Create: `frontend/src/components/TemplateCustomizer/NumField.tsx`
- Move: `frontend/src/components/PDFGenerator/PlaceholdersInput.tsx` → `frontend/src/components/TemplateCustomizer/PlaceholdersInput.tsx`

**Step 1: Create NumField**

```typescript
// frontend/src/components/TemplateCustomizer/NumField.tsx
interface NumFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  integer?: boolean
}

const inputClasses =
  'w-full h-9 px-2.5 py-1.5 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm focus:outline-none focus:ring-2 focus:ring-mtg-accent'

export function NumField({ label, value, onChange, min = 0, step = 0.01, integer }: NumFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-mtg-text-muted">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const v = integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        className={inputClasses}
      />
    </div>
  )
}
```

**Step 2: Move PlaceholdersInput**

```bash
mv frontend/src/components/PDFGenerator/PlaceholdersInput.tsx frontend/src/components/TemplateCustomizer/PlaceholdersInput.tsx
```

**Step 3: Commit**

```bash
git add frontend/src/components/TemplateCustomizer/NumField.tsx frontend/src/components/TemplateCustomizer/PlaceholdersInput.tsx
git rm frontend/src/components/PDFGenerator/PlaceholdersInput.tsx
git commit -m "add NumField component, move PlaceholdersInput to TemplateCustomizer"
```

---

### Task 7: Simplify SearchBar (2 variants)

**Files:**
- Modify: `frontend/src/components/SearchBar/SearchBar.tsx`

**Step 1: Rewrite SearchBar**

```typescript
// frontend/src/components/SearchBar/SearchBar.tsx
interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  variant?: 'default' | 'nav'
  className?: string
}

export function SearchBar({ value, onChange, onClear, variant = 'default', className }: SearchBarProps) {
  const isNav = variant === 'nav'
  return (
    <div className={`flex items-center ${className ?? ''}`}>
      <span
        className={
          isNav
            ? 'h-9 flex items-center justify-center px-2 bg-white/10 border border-white/20 rounded-l text-gray-300 shrink-0'
            : 'px-2 py-2 bg-mtg-input-bg border border-mtg-border rounded-l text-mtg-text-muted'
        }
      >
        🔍
      </span>
      <input
        type="text"
        placeholder="Search sets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          isNav
            ? 'h-9 px-3 border border-white/20 border-l-0 rounded-r bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm min-w-0 box-border w-40 flex-1'
            : 'px-3 py-2 border border-mtg-border border-l-0 rounded-r bg-mtg-input-bg text-mtg-text placeholder-mtg-text-muted focus:outline-none focus:ring-2 focus:ring-mtg-accent text-sm'
        }
        aria-label="Search sets"
      />
      {value && (
        <button
          onClick={onClear}
          className={
            isNav
              ? 'h-9 min-w-9 ml-2 px-2 py-0 flex items-center justify-center text-gray-400 hover:text-white transition-colors'
              : 'h-9 min-w-9 ml-2 px-2 py-0 flex items-center justify-center text-mtg-text-muted hover:text-mtg-text transition-colors'
          }
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
```

Note: The `navFull` variant is replaced by passing `className="w-full"` from the parent when needed.

**Step 2: Commit**

```bash
git add frontend/src/components/SearchBar/SearchBar.tsx
git commit -m "simplify SearchBar: remove navFull variant, add className prop"
```

---

### Task 8: Simplify PDFGenerator

Remove donate modal (now external), use ErrorDisplay, remove `dark:` fallback guards.

**Files:**
- Modify: `frontend/src/components/PDFGenerator/PDFGenerator.tsx`

**Step 1: Rewrite PDFGenerator**

```typescript
// frontend/src/components/PDFGenerator/PDFGenerator.tsx
import { useState } from 'react'
import { generatePDF } from '../../api/client'
import { LABEL_TEMPLATES } from '../../constants/templates'
import type { CustomTemplateDimensions } from '../../types'
import { customTemplateToBackendFormat } from '../../utils/unitConversion'
import { ErrorDisplay } from '../ErrorDisplay'

interface PDFGeneratorProps {
  selectedSetIds: string[]
  quantities: Record<string, number>
  useCustomQuantity: boolean
  templateId: string | null
  placeholders: number
  customTemplate?: CustomTemplateDimensions | null
  useCustomTemplate?: boolean
  onSuccess?: () => void
}

export function PDFGenerator({
  selectedSetIds,
  quantities,
  useCustomQuantity,
  templateId,
  placeholders,
  customTemplate,
  useCustomTemplate,
  onSuccess,
}: PDFGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (selectedSetIds.length === 0) {
      setError('Please select at least one set before generating the PDF.')
      return
    }

    const labelsPerPage =
      useCustomTemplate && customTemplate
        ? customTemplate.columns * customTemplate.rows
        : (templateId && LABEL_TEMPLATES[templateId]
            ? LABEL_TEMPLATES[templateId]
            : LABEL_TEMPLATES.avery5160
          ).labels_per_page

    if (placeholders < 0 || placeholders >= labelsPerPage) {
      setError(`Placeholders must be between 0 and ${labelsPerPage - 1}.`)
      return
    }

    setError(null)
    setLoading(true)

    try {
      const backendCustomTemplate =
        useCustomTemplate && customTemplate
          ? customTemplateToBackendFormat(customTemplate)
          : undefined

      const expandedSetIds: string[] = []
      for (const id of selectedSetIds) {
        const qty = useCustomQuantity ? (quantities[id] ?? 1) : 1
        for (let i = 0; i < qty; i++) {
          expandedSetIds.push(id)
        }
      }

      const blob = await generatePDF(
        expandedSetIds,
        templateId ?? 'avery5160',
        placeholders,
        backendCustomTemplate,
      )

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'mtg_labels.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <ErrorDisplay message={error} />
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || selectedSetIds.length === 0}
        className="h-9 px-4 py-0 flex items-center gap-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Generating PDF…</span>
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden
            >
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
              <path d="M4.603 14.087a.8.8 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.7 7.7 0 0 1 1.482-.645 20 20 0 0 0 1.062-2.227 7.3 7.3 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a11 11 0 0 0 .98 1.686 5.8 5.8 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.86.86 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.7 5.7 0 0 1-.911-.95 11.7 11.7 0 0 0-1.997.406 11.3 11.3 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.8.8 0 0 1-.58.029m1.379-1.901q-.25.115-.459.238c-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361q.016.032.026.044l.035-.012c.137-.056.355-.235.635-.572a8 8 0 0 0 .45-.606m1.64-1.33a13 13 0 0 1 1.01-.193 12 12 0 0 1-.51-.858 21 21 0 0 1-.5 1.05zm2.446.45q.226.245.435.41c.24.19.407.253.498.256a.1.1 0 0 0 .07-.015.3.3 0 0 0 .094-.125.44.44 0 0 0 .059-.2.1.1 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a4 4 0 0 0-.612-.053zM8.078 7.8a7 7 0 0 0 .2-.828q.046-.282.038-.465a.6.6 0 0 0-.032-.198.5.5 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822q.036.167.09.346z" />
            </svg>
            PDF
          </>
        )}
      </button>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/PDFGenerator/PDFGenerator.tsx
git commit -m "simplify PDFGenerator: extract donate modal, use ErrorDisplay"
```

---

### Task 9: Extract TemplateNavButton and rewrite TemplateCustomizer

**Files:**
- Create: `frontend/src/components/TemplateCustomizer/TemplateNavButton.tsx`
- Modify: `frontend/src/components/TemplateCustomizer/TemplateCustomizer.tsx`

**Step 1: Create TemplateNavButton**

This no longer calls `useCustomTemplates()` — it receives the badge label as a prop.

```typescript
// frontend/src/components/TemplateCustomizer/TemplateNavButton.tsx
interface TemplateNavButtonProps {
  isOpen: boolean
  onToggle: () => void
  badgeLabel?: string
}

export function TemplateNavButton({ isOpen, onToggle, badgeLabel }: TemplateNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-9 px-3 py-0 flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-sm text-white font-medium cursor-pointer select-none"
      aria-expanded={isOpen}
    >
      <span
        className={`inline-block transition-transform duration-200 text-xs shrink-0 pointer-events-none ${isOpen ? 'rotate-90' : ''}`}
      >
        ▶
      </span>
      <span className="pointer-events-none">Template</span>
      {badgeLabel && (
        <span className="bg-mtg-accent text-gray-900 text-xs px-2 py-0.5 rounded font-bold shrink-0 pointer-events-none">
          {badgeLabel}
        </span>
      )}
    </button>
  )
}
```

**Step 2: Rewrite TemplateCustomizer**

Uses extracted `NumField`, `templateUtils`, and no longer exports `TemplateCustomizerNavButton`.

```typescript
// frontend/src/components/TemplateCustomizer/TemplateCustomizer.tsx
import { useState, useRef, useEffect } from 'react'
import type { CustomTemplateDimensions, TemplateMeasurementUnit } from '../../types'
import { LABEL_TEMPLATES, DEFAULT_TEMPLATE_ID } from '../../constants/templates'
import { convertValue } from '../../utils/unitConversion'
import { round2, presetToCustom, getPresetUnit } from '../../utils/templateUtils'
import { useCustomTemplates } from '../../hooks/useCustomTemplates'
import { PagePreview } from './PagePreview'
import { PlaceholdersInput } from './PlaceholdersInput'
import { NumField } from './NumField'

interface TemplateCustomizerProps {
  isOpen: boolean
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
  useCustomQuantity: boolean
  templateId: string | null
  placeholders: number
  onCustomTemplateChange: (template: CustomTemplateDimensions | null) => void
  onUseCustomTemplateChange: (value: boolean) => void
  onUseCustomQuantityChange: (value: boolean) => void
  onPlaceholdersChange: (value: number) => void
  onTemplateChange: (templateId: string | null) => void
}

const PAGE_SIZES: Record<
  string,
  { width: number; height: number; unit: TemplateMeasurementUnit; label: string }
> = {
  letter: { width: 8.5, height: 11, unit: 'in', label: 'Letter (8.5" x 11")' },
  a4: { width: 210, height: 297, unit: 'mm', label: 'A4 (210 x 297 mm)' },
}

const inputClasses =
  'w-full h-9 px-2.5 py-1.5 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm focus:outline-none focus:ring-2 focus:ring-mtg-accent'

export function TemplateCustomizer({
  isOpen,
  customTemplate,
  useCustomTemplate,
  useCustomQuantity,
  templateId,
  placeholders,
  onCustomTemplateChange,
  onUseCustomTemplateChange,
  onUseCustomQuantityChange,
  onPlaceholdersChange,
  onTemplateChange,
}: TemplateCustomizerProps) {
  const [saveName, setSaveName] = useState('')
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [previewContainerSize, setPreviewContainerSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const { templates: savedTemplates, saveTemplate, deleteTemplate, loadTemplate } =
    useCustomTemplates()

  const effectivePresetId = templateId ?? DEFAULT_TEMPLATE_ID
  const template =
    customTemplate ?? presetToCustom(effectivePresetId, getPresetUnit(effectivePresetId))

  const handleToggle = (checked: boolean) => {
    if (checked && !customTemplate) {
      onCustomTemplateChange(presetToCustom(effectivePresetId, getPresetUnit(effectivePresetId)))
    }
    onUseCustomTemplateChange(checked)
  }

  const update = (partial: Partial<CustomTemplateDimensions>) => {
    onCustomTemplateChange({ ...template, ...partial })
    onUseCustomTemplateChange(true)
    onTemplateChange(null)
  }

  const handleUnitChange = (newUnit: TemplateMeasurementUnit) => {
    const oldUnit = template.unit
    if (oldUnit === newUnit) return
    onCustomTemplateChange({
      ...template,
      unit: newUnit,
      pageWidth: round2(convertValue(template.pageWidth, oldUnit, newUnit)),
      pageHeight: round2(convertValue(template.pageHeight, oldUnit, newUnit)),
      marginLeft: round2(convertValue(template.marginLeft, oldUnit, newUnit)),
      marginTop: round2(convertValue(template.marginTop, oldUnit, newUnit)),
      horizontalGap: round2(convertValue(template.horizontalGap, oldUnit, newUnit)),
      verticalGap: round2(convertValue(template.verticalGap, oldUnit, newUnit)),
      labelWidth: round2(convertValue(template.labelWidth, oldUnit, newUnit)),
      labelHeight: round2(convertValue(template.labelHeight, oldUnit, newUnit)),
    })
    onUseCustomTemplateChange(true)
    onTemplateChange(null)
  }

  const handlePageSize = (key: string) => {
    const size = PAGE_SIZES[key]
    if (!size) return
    const newUnit = size.unit
    const oldUnit = template.unit
    if (newUnit !== oldUnit) {
      onCustomTemplateChange({
        ...template,
        unit: newUnit,
        pageWidth: size.width,
        pageHeight: size.height,
        marginLeft: round2(convertValue(template.marginLeft, oldUnit, newUnit)),
        marginTop: round2(convertValue(template.marginTop, oldUnit, newUnit)),
        horizontalGap: round2(convertValue(template.horizontalGap, oldUnit, newUnit)),
        verticalGap: round2(convertValue(template.verticalGap, oldUnit, newUnit)),
        labelWidth: round2(convertValue(template.labelWidth, oldUnit, newUnit)),
        labelHeight: round2(convertValue(template.labelHeight, oldUnit, newUnit)),
      })
      onUseCustomTemplateChange(true)
      onTemplateChange(null)
    } else {
      update({ pageWidth: size.width, pageHeight: size.height })
    }
  }

  const handlePresetLoad = (presetId: string) => {
    onCustomTemplateChange(null)
    onUseCustomTemplateChange(false)
    onTemplateChange(presetId)
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    saveTemplate(saveName.trim(), template)
    setSaveName('')
  }

  const handleLoadSaved = (id: string) => {
    const loaded = loadTemplate(id)
    if (loaded) {
      onCustomTemplateChange(loaded)
      onUseCustomTemplateChange(true)
      onTemplateChange('saved:' + id)
    }
  }

  const handleTemplateSelect = (value: string) => {
    if (!value) return
    if (value.startsWith('saved:')) {
      handleLoadSaved(value.slice(6))
    } else {
      handlePresetLoad(value)
    }
  }

  const handleDeleteSaved = (id: string) => {
    deleteTemplate(id)
    if (templateId === 'saved:' + id) {
      onCustomTemplateChange(null)
      onUseCustomTemplateChange(false)
      onTemplateChange(DEFAULT_TEMPLATE_ID)
    }
  }

  const isSavedTemplateSelected = templateId?.startsWith('saved:') ?? false
  const selectedSavedId = isSavedTemplateSelected ? templateId!.slice(6) : null

  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setPreviewContainerSize({ width, height })
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isOpen])

  const totalLabels = template.columns * template.rows

  return (
    <div
      className="border border-mtg-border rounded-lg mb-4 overflow-hidden grid transition-[grid-template-rows] duration-200 ease-out"
      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-4 py-2 bg-mtg-card-bg border-t border-mtg-border">
          {/* Toggle switches */}
          <div className="flex flex-col gap-3 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useCustomTemplate}
                  onChange={(e) => handleToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer-checked:bg-mtg-accent transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-mtg-text">Use Custom Template</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useCustomQuantity}
                  onChange={(e) => onUseCustomQuantityChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer-checked:bg-mtg-accent transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-mtg-text">Use Custom Quantity</span>
            </label>
          </div>

          <div className="mb-6">
            <PlaceholdersInput
              templateId={templateId}
              placeholders={placeholders}
              onPlaceholdersChange={onPlaceholdersChange}
              customTemplate={customTemplate}
              useCustomTemplate={useCustomTemplate}
            />
          </div>

          {/* Load template */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="min-w-[200px] flex-1">
              <label className="block text-sm text-mtg-text mb-2">Load template</label>
              <div className="flex gap-2">
                <select
                  value={templateId ?? ''}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className={inputClasses + ' flex-1'}
                >
                  <option value="" disabled>
                    Select a template...
                  </option>
                  <optgroup label="Presets">
                    {Object.values(LABEL_TEMPLATES).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  {savedTemplates.length > 0 && (
                    <optgroup label="Saved">
                      {savedTemplates.map((t) => (
                        <option key={t.id} value={'saved:' + t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {selectedSavedId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(selectedSavedId)}
                    className="h-9 flex items-center px-3 py-0 text-red-600 text-sm hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-800 shrink-0"
                    title="Delete this template"
                    aria-label="Delete selected template"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-end gap-2 min-w-0 flex-1">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm text-mtg-text mb-2">Save as</label>
                <div className="flex h-9">
                  <input
                    type="text"
                    placeholder="Template name..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className={inputClasses + ' !h-full'}
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || !useCustomTemplate}
                className="h-9 flex items-center justify-center px-3 py-0 bg-mtg-accent text-gray-900 font-medium rounded text-sm hover:bg-mtg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Save
              </button>
            </div>
          </div>

          {/* Grid: controls + preview */}
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
            {/* Controls */}
            <div className="space-y-5">
              {/* Page Size */}
              <div className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
                <h3 className="font-semibold text-mtg-text mb-3 flex items-center gap-2">
                  <span className="text-mtg-accent">📄</span> Page Size
                </h3>
                <div className="flex items-end gap-3 mb-4">
                  <div className="flex-1">
                    <label className="text-xs text-mtg-text-muted block mb-1.5">Width</label>
                    <input
                      type="number"
                      value={template.pageWidth}
                      min={1}
                      step={0.01}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v)) update({ pageWidth: v })
                      }}
                      className={inputClasses}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-mtg-text-muted block mb-1.5">Height</label>
                    <input
                      type="number"
                      value={template.pageHeight}
                      min={1}
                      step={0.01}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v)) update({ pageHeight: v })
                      }}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-mtg-text-muted block mb-1.5">Unit</label>
                    <select
                      value={template.unit}
                      onChange={(e) =>
                        handleUnitChange(e.target.value as TemplateMeasurementUnit)
                      }
                      className="h-9 px-2.5 py-1.5 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm shrink-0"
                    >
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-mtg-text-muted block mb-1.5">Quick Size</label>
                  <select
                    value={
                      template.unit === 'in' &&
                      Math.abs(template.pageWidth - 8.5) < 0.1 &&
                      Math.abs(template.pageHeight - 11) < 0.1
                        ? 'letter'
                        : template.unit === 'mm' &&
                            Math.abs(template.pageWidth - 210) < 2 &&
                            Math.abs(template.pageHeight - 297) < 2
                          ? 'a4'
                          : ''
                    }
                    onChange={(e) => handlePageSize(e.target.value)}
                    className={inputClasses}
                  >
                    <option value="">Custom</option>
                    {Object.entries(PAGE_SIZES).map(([key, size]) => (
                      <option key={key} value={key}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Margins */}
              <div className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
                <h3 className="font-semibold text-mtg-text mb-3 flex items-center gap-2">
                  <span className="text-mtg-accent">📐</span> Page Margins
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Top" value={template.marginTop} onChange={(v) => update({ marginTop: v })} />
                  <NumField label="Left" value={template.marginLeft} onChange={(v) => update({ marginLeft: v })} />
                </div>
              </div>

              {/* Grid Layout */}
              <div className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
                <h3 className="font-semibold text-mtg-text mb-3 flex items-center gap-2">
                  <span className="text-mtg-accent">⊞</span> Grid Layout
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <NumField label="Columns" value={template.columns} onChange={(v) => update({ columns: v })} min={1} step={1} integer />
                  <NumField label="Rows" value={template.rows} onChange={(v) => update({ rows: v })} min={1} step={1} integer />
                  <NumField label="H Gap" value={template.horizontalGap} onChange={(v) => update({ horizontalGap: v })} />
                  <NumField label="V Gap" value={template.verticalGap} onChange={(v) => update({ verticalGap: v })} />
                </div>
              </div>

              {/* Label Size */}
              <div className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
                <h3 className="font-semibold text-mtg-text mb-3 flex items-center gap-2">
                  <span className="text-mtg-accent">🏷️</span> Label Size
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <NumField label="Width" value={template.labelWidth} onChange={(v) => update({ labelWidth: v })} min={0.1} />
                  <NumField label="Height" value={template.labelHeight} onChange={(v) => update({ labelHeight: v })} min={0.1} />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-mtg-border bg-mtg-section-bg overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b border-mtg-border">
                <h3 className="font-semibold text-mtg-text flex items-center gap-2">
                  <span className="text-mtg-accent">📄</span> Page Preview
                </h3>
                <button
                  onClick={() => setShowFullPreview(true)}
                  className="h-9 flex items-center px-2 py-0 text-xs font-medium bg-mtg-accent text-gray-900 rounded hover:bg-mtg-accent-hover transition-colors"
                >
                  Fullscreen
                </button>
              </div>
              <div
                ref={previewContainerRef}
                className="flex-1 flex items-center justify-center p-4 bg-mtg-section-header-bg min-h-0"
              >
                <PagePreview
                  template={template}
                  containerSize={previewContainerSize ?? undefined}
                />
              </div>
              <p className="text-xs text-center text-mtg-text-muted px-4 py-2 border-t border-mtg-border">
                {totalLabels} labels ({template.columns}&times;{template.rows}) •{' '}
                {template.pageWidth}&times;{template.pageHeight} {template.unit}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {showFullPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center"
          onClick={() => setShowFullPreview(false)}
        >
          <div
            className="bg-mtg-bg p-6 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-mtg-text">
                {totalLabels} labels ({template.columns}&times;{template.rows}) &middot;{' '}
                {template.pageWidth}&times;{template.pageHeight} {template.unit}
              </span>
              <button
                onClick={() => setShowFullPreview(false)}
                className="text-mtg-text-muted hover:text-mtg-text transition-colors"
              >
                Close
              </button>
            </div>
            <PagePreview template={template} fullscreen />
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Update PlaceholdersInput to accept `templateId: string | null`**

In `frontend/src/components/TemplateCustomizer/PlaceholdersInput.tsx`, update the interface:
```typescript
interface PlaceholdersInputProps {
  templateId: string | null
  // ... rest unchanged
}
```

And the usage:
```typescript
const maxPlaceholders =
    useCustomTemplate && customTemplate
      ? customTemplate.columns * customTemplate.rows - 1
      : (getTemplate(templateId) ?? getDefaultTemplate()).labels_per_page - 1
```

**Step 4: Commit**

```bash
git add frontend/src/components/TemplateCustomizer/
git commit -m "extract TemplateNavButton, rewrite TemplateCustomizer with NumField"
```

---

### Task 10: Remove `<form>` wrapper from SetList

**Files:**
- Modify: `frontend/src/components/SetList/SetList.tsx`

**Step 1: Remove the form wrapper**

Replace `<form id="sets-form">` with a `<div>`:

```typescript
// frontend/src/components/SetList/SetList.tsx
import type { MTGSet } from '../../types'
import { AccordionGroup } from '../AccordionGroup/AccordionGroup'
import { SetItem } from '../SetItem/SetItem'

interface SetListProps {
  groupedSets: Record<string, MTGSet[]>
  selectedSetIds: string[]
  quantities: Record<string, number>
  useCustomQuantity: boolean
  onToggleSet: (setId: string) => void
  onQuantityChange: (setId: string, quantity: number) => void
  openGroups?: Set<string>
  onToggleGroup?: (groupName: string) => void
  onSelectGroup?: (groupName: string, setIds: string[]) => void
}

export function SetList({
  groupedSets,
  selectedSetIds,
  quantities,
  useCustomQuantity,
  onToggleSet,
  onQuantityChange,
  openGroups = new Set(),
  onToggleGroup = () => {},
  onSelectGroup,
}: SetListProps) {
  return (
    <div>
      {Object.entries(groupedSets).map(([groupName, sets]) => (
        <div key={groupName} id={`accordion-${groupName}`} className="mb-2">
          <AccordionGroup
            title={groupName}
            isOpen={openGroups.has(groupName)}
            onToggle={() => onToggleGroup(groupName)}
            onSelectGroup={
              onSelectGroup
                ? () => {
                    const setIds = sets.map((s) => s.id)
                    onSelectGroup(groupName, setIds)
                  }
                : undefined
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {sets.map((set) => (
                <div key={set.id} className="col">
                  <SetItem
                    set={set}
                    isSelected={selectedSetIds.includes(set.id)}
                    quantity={quantities[set.id] || 1}
                    showQuantityInput={useCustomQuantity}
                    onToggle={() => onToggleSet(set.id)}
                    onQuantityChange={(quantity) => onQuantityChange(set.id, quantity)}
                  />
                </div>
              ))}
            </div>
          </AccordionGroup>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/SetList/SetList.tsx
git commit -m "remove unused form wrapper from SetList"
```

---

### Task 11: Create Layout components and rewrite App.tsx

**Files:**
- Create: `frontend/src/components/Layout/Footer.tsx`
- Create: `frontend/src/components/Layout/Header.tsx`
- Modify: `frontend/src/App.tsx` — rewrite as thin shell

**Step 1: Create Footer**

```typescript
// frontend/src/components/Layout/Footer.tsx
export function Footer() {
  return (
    <footer className="py-4 border-t border-mtg-border bg-mtg-section-bg mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="mb-2 text-sm text-mtg-text-muted leading-relaxed">
            MTG Printable Label Generator is unofficial Fan Content permitted under the Fan
            Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are
            property of Wizards of the Coast. ©Wizards of the Coast LLC.
          </p>
          <p className="mb-2 text-sm text-mtg-text-muted leading-relaxed">
            <a
              href="https://company.wizards.com/en/legal/fancontentpolicy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mtg-accent hover:underline"
            >
              View the full Fan Content Policy
            </a>
            .
          </p>
          <p className="mb-0 text-sm text-mtg-text-muted leading-relaxed">
            It uses set information provided by{' '}
            <a
              href="https://scryfall.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mtg-accent hover:underline"
            >
              Scryfall
            </a>{' '}
            in accordance with their{' '}
            <a
              href="https://scryfall.com/docs/api#use-of-scryfall-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mtg-accent hover:underline"
            >
              guidelines
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
```

**Step 2: Create Header**

The header includes the hamburger menu inline (it's tightly coupled to the nav layout).

```typescript
// frontend/src/components/Layout/Header.tsx
import { useState } from 'react'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { SearchBar } from '../SearchBar/SearchBar'
import { TemplateNavButton } from '../TemplateCustomizer/TemplateNavButton'
import { PDFGenerator } from '../PDFGenerator/PDFGenerator'
import { DonateModal } from '../DonateModal'
import type { CustomTemplateDimensions } from '../../types'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  templateCustomizerOpen: boolean
  onTemplateToggle: () => void
  templateBadgeLabel?: string
  selectedSetIds: string[]
  quantities: Record<string, number>
  useCustomQuantity: boolean
  templateId: string | null
  placeholders: number
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
}

export function Header({
  searchQuery,
  onSearchChange,
  templateCustomizerOpen,
  onTemplateToggle,
  templateBadgeLabel,
  selectedSetIds,
  quantities,
  useCustomQuantity,
  templateId,
  placeholders,
  customTemplate,
  useCustomTemplate,
}: HeaderProps) {
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [showDonateModal, setShowDonateModal] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-mtg-nav-from to-mtg-nav-to text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 min-h-[40px]">
          <div className="flex items-center gap-2 min-h-[40px]">
            <a href="#" className="navbar-brand fw-bold text-xl text-mtg-accent">
              MTG Labels
            </a>
            <ThemeToggle />
            <div className="hidden min-[640px]:block">
              <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                onClear={() => onSearchChange('')}
                variant="nav"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 min-h-[40px]">
            <div className="hidden min-[880px]:block">
              <TemplateNavButton
                isOpen={templateCustomizerOpen}
                onToggle={onTemplateToggle}
                badgeLabel={templateBadgeLabel}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (navMenuOpen) onTemplateToggle()
                setNavMenuOpen((o) => !o)
              }}
              className="min-[880px]:hidden h-9 w-9 flex items-center justify-center rounded border border-white/30 hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={navMenuOpen}
            >
              {navMenuOpen ? (
                <span className="text-lg">✕</span>
              ) : (
                <span className="flex flex-col gap-1">
                  <span className="block w-4 h-0.5 bg-current" />
                  <span className="block w-4 h-0.5 bg-current" />
                  <span className="block w-4 h-0.5 bg-current" />
                </span>
              )}
            </button>

            <PDFGenerator
              selectedSetIds={selectedSetIds}
              quantities={quantities}
              useCustomQuantity={useCustomQuantity}
              templateId={templateId}
              placeholders={placeholders}
              customTemplate={customTemplate}
              useCustomTemplate={useCustomTemplate}
              onSuccess={() => setShowDonateModal(true)}
            />
          </div>

          {/* Hamburger menu panel */}
          <div
            className="w-full min-[880px]:hidden grid transition-[grid-template-rows] duration-200 ease-out overflow-hidden"
            style={{ gridTemplateRows: navMenuOpen ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-2 py-2 border-t border-white/20 mt-1">
                <div className="min-[640px]:hidden w-full">
                  <SearchBar
                    value={searchQuery}
                    onChange={onSearchChange}
                    onClear={() => onSearchChange('')}
                    variant="nav"
                    className="w-full"
                  />
                </div>
                <div className="w-full min-w-0 [&_button]:w-full [&_button]:justify-start">
                  <TemplateNavButton
                    isOpen={templateCustomizerOpen}
                    onToggle={onTemplateToggle}
                    badgeLabel={templateBadgeLabel}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {showDonateModal && <DonateModal onClose={() => setShowDonateModal(false)} />}
    </>
  )
}
```

**Step 3: Rewrite App.tsx**

```typescript
// frontend/src/App.tsx
import { useState, useMemo } from 'react'
import { useApiSetsApiSetsGet } from './api/queries/default/default'
import { useSelection } from './hooks/useSelection'
import { useOpenGroups } from './hooks/useOpenGroups'
import { useCustomTemplates } from './hooks/useCustomTemplates'
import { groupSetsByType, filterSetsByQuery } from './utils/grouping'
import { LABEL_TEMPLATES } from './constants/templates'
import { Header } from './components/Layout/Header'
import { Footer } from './components/Layout/Footer'
import { SetList } from './components/SetList/SetList'
import { TemplateCustomizer } from './components/TemplateCustomizer/TemplateCustomizer'
import { ErrorDisplay } from './components/ErrorDisplay'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import type { MTGSet } from './types'

function App() {
  const { data: setsResponse, isLoading, error } = useApiSetsApiSetsGet()
  const {
    selection,
    toggleSetSelection,
    selectSets,
    deselectSets,
    setQuantity,
    setTemplate,
    setPlaceholders,
    selectAllSets,
    deselectAllSets,
    isAllSetsSelected,
    setCustomTemplate,
    setUseCustomTemplate,
    setUseCustomQuantity,
  } = useSelection()

  const sets: MTGSet[] = useMemo(() => setsResponse?.data ?? [], [setsResponse?.data])
  const [searchQuery, setSearchQuery] = useState('')
  const [templateCustomizerOpen, setTemplateCustomizerOpen] = useState(false)

  const filteredSets = useMemo(() => filterSetsByQuery(sets, searchQuery), [sets, searchQuery])
  const groupedSets = useMemo(() => groupSetsByType(filteredSets), [filteredSets])
  const { openGroups, toggleGroup } = useOpenGroups(
    searchQuery,
    groupedSets,
    selection.selectedSetIds,
  )

  const totalLabels = useMemo(() => {
    let labels = 0
    for (const setId of selection.selectedSetIds) {
      labels += selection.useCustomQuantity ? (selection.quantities[setId] || 1) : 1
    }
    return labels
  }, [selection.selectedSetIds, selection.quantities, selection.useCustomQuantity])

  const labelsPerPage = useMemo(() => {
    if (selection.useCustomTemplate && selection.customTemplate) {
      return selection.customTemplate.columns * selection.customTemplate.rows
    }
    const t =
      selection.templateId && LABEL_TEMPLATES[selection.templateId]
        ? LABEL_TEMPLATES[selection.templateId]
        : LABEL_TEMPLATES.avery5160
    return t.labels_per_page
  }, [selection.useCustomTemplate, selection.customTemplate, selection.templateId])

  const pageCount = useMemo(() => {
    const totalSlots = selection.placeholders + totalLabels
    return totalSlots > 0 ? Math.ceil(totalSlots / labelsPerPage) : 0
  }, [selection.placeholders, totalLabels, labelsPerPage])

  const { templates: savedTemplates } = useCustomTemplates()
  const templateBadgeLabel = selection.useCustomTemplate
    ? selection.templateId?.startsWith('saved:')
      ? savedTemplates.find((t) => t.id === selection.templateId!.slice(6))?.name ?? 'custom'
      : 'custom'
    : selection.templateId
      ? LABEL_TEMPLATES[selection.templateId]?.name
      : undefined

  const handleSelectAllSets = () => {
    const allSetIds = filteredSets.map((set) => set.id)
    if (isAllSetsSelected(allSetIds)) {
      deselectAllSets()
    } else {
      selectAllSets(allSetIds)
    }
  }

  const handleSelectGroup = (_groupName: string, setIds: string[]) => {
    const allSelected = setIds.every((id) => selection.selectedSetIds.includes(id))
    if (allSelected) {
      deselectSets(setIds)
    } else {
      selectSets(setIds)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-mtg-bg text-mtg-text transition-colors">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        templateCustomizerOpen={templateCustomizerOpen}
        onTemplateToggle={() => setTemplateCustomizerOpen((o) => !o)}
        templateBadgeLabel={templateBadgeLabel}
        selectedSetIds={selection.selectedSetIds}
        quantities={selection.quantities}
        useCustomQuantity={selection.useCustomQuantity}
        templateId={selection.templateId}
        placeholders={selection.placeholders}
        customTemplate={selection.customTemplate}
        useCustomTemplate={selection.useCustomTemplate}
      />

      <div className="container mx-auto px-4 py-4 flex-1">
        <TemplateCustomizer
          isOpen={templateCustomizerOpen}
          customTemplate={selection.customTemplate}
          useCustomTemplate={selection.useCustomTemplate}
          useCustomQuantity={selection.useCustomQuantity}
          templateId={selection.templateId}
          placeholders={selection.placeholders}
          onCustomTemplateChange={setCustomTemplate}
          onUseCustomTemplateChange={setUseCustomTemplate}
          onUseCustomQuantityChange={setUseCustomQuantity}
          onPlaceholdersChange={setPlaceholders}
          onTemplateChange={setTemplate}
        />

        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-mtg-text-muted">
              {totalLabels} labels / {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              {searchQuery.trim() && (
                <span className="ml-2">
                  ({filteredSets.length} {filteredSets.length === 1 ? 'set' : 'sets'} found)
                </span>
              )}
            </span>
          </div>
          {filteredSets.length > 0 && (
            <button
              onClick={handleSelectAllSets}
              className="h-9 px-3 py-0 flex items-center border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors text-sm"
            >
              {isAllSetsSelected(filteredSets.map((s) => s.id))
                ? 'Deselect All'
                : 'Select All'}
            </button>
          )}
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <ErrorDisplay message={(error as Error).message} />
          </div>
        ) : (
          <SetList
            groupedSets={groupedSets}
            selectedSetIds={selection.selectedSetIds}
            quantities={selection.quantities}
            useCustomQuantity={selection.useCustomQuantity}
            onToggleSet={toggleSetSelection}
            onQuantityChange={(setId, quantity) => setQuantity(setId, quantity)}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
            onSelectGroup={handleSelectGroup}
          />
        )}
      </div>

      <Footer />
    </div>
  )
}

export default App
```

**Step 4: Commit**

```bash
git add frontend/src/components/Layout/ frontend/src/App.tsx
git commit -m "extract Layout components, rewrite App.tsx as thin shell"
```

---

### Task 12: Fix dark mode in `index.css`

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: Add custom-variant for dark mode**

Add `@custom-variant dark (&:where(.dark, .dark *));` after `@import "tailwindcss"`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

This enables `dark:` prefix classes to work with the `.dark` class on `<html>`.

**Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "fix dark mode: add Tailwind v4 custom-variant for dark class"
```

---

### Task 13: Update tests for restructured code

**Files:**
- Modify: `frontend/src/components/PDFGenerator/PDFGenerator.test.tsx` — update for new props (`onSuccess` instead of internal `showDonateModal`)
- Modify: `frontend/src/components/SetList/SetList.test.tsx` — update if `<form>` was being tested
- Delete: `frontend/src/components/TemplateSelector/TemplateSelector.test.tsx` (already deleted in Task 1)

**Step 1: Update PDFGenerator test**

The main change: `onGenerate` prop renamed to `onSuccess`, and the donate modal is no longer inside PDFGenerator. Update test to not look for "Thank You!" modal:

In `PDFGenerator.test.tsx`, replace the `onGenerate` prop with `onSuccess` in test fixtures. The test should verify `onSuccess` is called after successful generation, not that the donate modal appears.

**Step 2: Run all tests**

```bash
cd frontend && bun run test
```

Expected: All tests pass.

**Step 3: Fix any failing tests**

If tests fail due to import path changes (e.g., `TemplateSelector` tests — already deleted), remove those. If tests reference `<form id="sets-form">` in SetList, update to `<div>`.

**Step 4: Commit**

```bash
git add -A && git commit -m "update tests for restructured components"
```

---

### Task 14: Final verification

**Step 1: Run the full test suite**

```bash
cd frontend && bun run test
```

Expected: All tests PASS.

**Step 2: Run TypeScript compilation**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: No type errors.

**Step 3: Run ESLint**

```bash
cd frontend && bun run lint
```

Expected: No errors.

**Step 4: Start dev server and manually verify**

```bash
cd frontend && bun run dev
```

Verify in browser at http://localhost:5173:
- Page loads with loading skeleton
- Sets load and display correctly
- Light/dark mode toggle works
- Search works
- Template customizer opens/closes
- Hamburger menu works on mobile viewport
- PDF generation works
- Error display is consistent in both themes

**Step 5: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
