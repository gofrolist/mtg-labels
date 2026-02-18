import { useState, useRef, useEffect } from 'react'
import type { CustomTemplateDimensions, TemplateMeasurementUnit } from '../../types'
import { LABEL_TEMPLATES, DEFAULT_TEMPLATE_ID } from '../../constants/templates'
import { convertValue } from '../../utils/unitConversion'
import { round2, presetToCustom, getPresetUnit } from '../../utils/templateUtils'
import type { CustomTemplatesApi } from '../../hooks/useCustomTemplates'
import { PagePreview } from './PagePreview'
import { PlaceholdersInput } from './PlaceholdersInput'
import { NumField, inputClasses } from './NumField'

interface TemplateCustomizerProps {
  isOpen: boolean
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
  useCustomQuantity: boolean
  templateId: string | null
  placeholders: number
  customTemplatesApi: CustomTemplatesApi
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

export function TemplateCustomizer({
  isOpen,
  customTemplate,
  useCustomTemplate,
  useCustomQuantity,
  templateId,
  placeholders,
  customTemplatesApi,
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
  const { templates: savedTemplates, saveTemplate, updateTemplate, deleteTemplate, loadTemplate } =
    customTemplatesApi

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
    const name = saveName.trim()
    if (!name) return
    const existing = savedTemplates.find(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    )
    if (existing) {
      if (!window.confirm(`Template "${existing.name}" already exists. Overwrite?`)) return
      updateTemplate(existing.id, template)
      onTemplateChange('saved:' + existing.id)
    } else {
      const saved = saveTemplate(name, template)
      onTemplateChange('saved:' + saved.id)
    }
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
                  aria-label="Load template"
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
                    aria-label="Save template as"
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
                      aria-label="Page width"
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
                      aria-label="Page height"
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
                      aria-label="Measurement unit"
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
                    aria-label="Quick page size"
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
