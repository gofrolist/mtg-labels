# Frontend Simplification & UI/UX Improvement Design

**Date:** 2026-02-18
**Approach:** Big-bang restructure
**Scope:** Code simplification + UI/UX polish, preserving current visual design

## 1. Component Architecture

### Current Problems
- `App.tsx` (297 lines) is a God component: layout + nav + state + business logic
- `TemplateCustomizer.tsx` (585 lines) has inline JSX functions, co-located utilities, two exports
- Dead code: `SavedTemplatesList.tsx`, `TemplateSelector.tsx` (both unused)
- `PlaceholdersInput` lives in `PDFGenerator/` but is used only in `TemplateCustomizer`
- `<form id="sets-form">` in SetList has no onSubmit (misleading)

### New Structure

```
src/
├── App.tsx                          (~80 lines) layout shell only
├── components/
│   ├── Layout/
│   │   ├── Header.tsx               nav bar: logo, theme toggle, search, template button, PDF button
│   │   ├── HamburgerMenu.tsx        mobile nav dropdown
│   │   └── Footer.tsx               footer
│   ├── SetList/
│   │   ├── SetList.tsx              unchanged
│   │   ├── AccordionGroup.tsx       moved from AccordionGroup/
│   │   └── SetItem.tsx              moved from SetItem/
│   ├── TemplateCustomizer/
│   │   ├── TemplateCustomizer.tsx   (~250 lines, down from 585)
│   │   ├── TemplateNavButton.tsx    extracted
│   │   ├── NumField.tsx             proper component (was inline function)
│   │   ├── PlaceholdersInput.tsx    moved from PDFGenerator/
│   │   └── PagePreview.tsx          unchanged
│   ├── PDFGenerator/
│   │   └── PDFGenerator.tsx         simplified (donate modal extracted)
│   ├── DonateModal.tsx              extracted from PDFGenerator
│   ├── SearchBar/
│   │   └── SearchBar.tsx            simplified (2 variants)
│   ├── ErrorDisplay.tsx             shared error component
│   ├── LoadingSkeleton.tsx          shimmer skeleton for loading state
│   ├── ThemeToggle/
│   │   └── ThemeToggle.tsx          unchanged
│   └── ErrorBoundary/
│       └── ErrorBoundary.tsx        unchanged
├── hooks/
│   ├── useSelection.ts             + selectSets()/deselectSets() batch API
│   ├── useOpenGroups.ts            extracted from App.tsx
│   ├── useTheme.ts                 unchanged
│   └── useCustomTemplates.ts       unchanged
├── utils/
│   ├── templateUtils.ts            round2, snapPageSize, presetToCustom, getPresetUnit
│   └── (existing files unchanged)
```

### Deleted Files
- `SavedTemplatesList.tsx` (dead code)
- `TemplateSelector.tsx` (dead code)
- `TemplateSelector.test.tsx` (tests for dead code)

## 2. State Management & Anti-Pattern Fixes

### templateId: empty string -> null
- Type: `string` -> `string | null`
- `null` = no preset selected (custom editing mode)
- Eliminates `LABEL_TEMPLATES[templateId] || LABEL_TEMPLATES.avery5160` fallback guards (3 places)

### useSelection batch API
- Add `selectSets(ids: string[])` and `deselectSets(ids: string[])`
- Replace `handleSelectGroup` loop that calls `toggleSetSelection` per ID
- Single state update instead of N

### useCustomTemplates double-call fix
- `TemplateNavButton` receives saved template name as prop
- No longer calls `useCustomTemplates()` independently
- Eliminates latent sync bug

### useOpenGroups extracted hook
- Complex `openGroups` useMemo moves from App.tsx to `useOpenGroups()`
- Same logic, better isolation and testability

### numField() -> NumField component
- Proper React component declared outside render function
- No recreation on every render

### Utility extraction
- `round2()`, `snapPageSize()`, `presetToCustom()`, `getPresetUnit()` -> `utils/templateUtils.ts`

## 3. UI/UX Improvements

### Loading skeleton
- Replace "Loading..." text with shimmer skeleton
- 4-column grid of placeholder rows matching set list layout
- Pure CSS animation (@keyframes shimmer), no library

### Consistent error display
- Shared `<ErrorDisplay message={...} />` component
- Used by both API fetch error and PDF generation error
- Consistent light/dark styling

### Fix dark mode Tailwind v4
- Add `@custom-variant dark (&:where(.dark, .dark *));` to `index.css`
- Enables `dark:` prefix classes throughout

### SearchBar simplification
- 3 variants -> 2 (`default`, `nav`)
- `navFull` replaced by responsive CSS on `nav` variant

### Donate modal extraction
- Separate `<DonateModal />` component
- PDFGenerator calls `onSuccess` callback; parent handles modal display
