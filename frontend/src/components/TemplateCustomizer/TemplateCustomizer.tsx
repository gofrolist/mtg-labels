import { useState } from 'react'
import type { CustomTemplateDimensions, TemplateMeasurementUnit } from '../../types'
import { LABEL_TEMPLATES } from '../../constants/templates'
import { fromPoints, convertValue } from '../../utils/unitConversion'
import { useCustomTemplates } from '../../hooks/useCustomTemplates'
import { PagePreview } from './PagePreview'
import { SavedTemplatesList } from './SavedTemplatesList'

interface TemplateCustomizerProps {
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
  templateId: string
  onCustomTemplateChange: (template: CustomTemplateDimensions) => void
  onUseCustomTemplateChange: (value: boolean) => void
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function presetToCustom(presetId: string, unit: TemplateMeasurementUnit): CustomTemplateDimensions {
  const t = LABEL_TEMPLATES[presetId] || LABEL_TEMPLATES.avery5160
  return {
    pageWidth: round2(fromPoints(t.page_width, unit)),
    pageHeight: round2(fromPoints(t.page_height, unit)),
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

const PAGE_SIZES: Record<string, { width: number; height: number; label: string }> = {
  letter: { width: 612, height: 792, label: 'Letter (8.5" x 11")' },
  a4: { width: 595.2, height: 841.8, label: 'A4 (210 x 297 mm)' },
}

export function TemplateCustomizer({
  customTemplate,
  useCustomTemplate,
  templateId,
  onCustomTemplateChange,
  onUseCustomTemplateChange,
}: TemplateCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showFullPreview, setShowFullPreview] = useState(false)
  const { templates: savedTemplates, saveTemplate, deleteTemplate, loadTemplate } =
    useCustomTemplates()

  const template = customTemplate ?? presetToCustom(templateId, 'in')

  const handleToggle = (checked: boolean) => {
    if (checked && !customTemplate) {
      onCustomTemplateChange(presetToCustom(templateId, 'in'))
    }
    onUseCustomTemplateChange(checked)
  }

  const update = (partial: Partial<CustomTemplateDimensions>) => {
    onCustomTemplateChange({ ...template, ...partial })
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
  }

  const handlePageSize = (key: string) => {
    const size = PAGE_SIZES[key]
    if (!size) return
    update({
      pageWidth: round2(fromPoints(size.width, template.unit)),
      pageHeight: round2(fromPoints(size.height, template.unit)),
    })
  }

  const handlePresetLoad = (presetId: string) => {
    onCustomTemplateChange(presetToCustom(presetId, template.unit))
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    saveTemplate(saveName.trim(), template)
    setSaveName('')
  }

  const handleLoadSaved = (id: string) => {
    const loaded = loadTemplate(id)
    if (loaded) onCustomTemplateChange(loaded)
  }

  const inputClasses =
    'w-full px-3 py-2 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm focus:outline-none focus:ring-2 focus:ring-mtg-accent'

  const numField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    opts?: { min?: number; step?: number; integer?: boolean },
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-mtg-text-muted">{label}</label>
      <input
        type="number"
        value={value}
        min={opts?.min ?? 0}
        step={opts?.step ?? 0.01}
        onChange={e => {
          const v = opts?.integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        className={inputClasses}
      />
    </div>
  )

  const totalLabels = template.columns * template.rows

  return (
    <div className="border-b border-mtg-accent/30">
      {/* Accordion header — navy gradient with gold bottom border */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gradient-to-r from-mtg-nav-from to-mtg-nav-to border-b-2 border-mtg-accent/60"
      >
        <div className="container-fluid px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-mtg-accent font-medium">
              <span className="text-base">&#9881;</span>
              <span>Customize Template</span>
            </div>
            <span className="text-mtg-accent text-sm">&#9650;</span>
          </div>
        </div>
      </button>

      {/* Collapsible panel */}
      {isOpen && (
        <div className="bg-mtg-card-bg">
          <div className="container-fluid px-4 py-6">
            {/* Toggle switch */}
            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useCustomTemplate}
                  onChange={e => handleToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 rounded-full peer-checked:bg-mtg-accent transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-mtg-text">
                Use Custom Template (overrides preset selection)
              </span>
            </label>

            {/* Preset loader */}
            <div className="mb-6">
              <label className="block text-sm text-mtg-text mb-2">Load Preset Template</label>
              <select
                onChange={e => handlePresetLoad(e.target.value)}
                className={inputClasses}
                defaultValue=""
              >
                <option value="" disabled>
                  Select a preset...
                </option>
                {Object.values(LABEL_TEMPLATES).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
              {/* LEFT: Controls */}
              <div className="space-y-5">
                {/* Page Size card */}
                <div className="rounded-xl border border-mtg-border bg-mtg-section-bg p-5">
                  <h3 className="text-sm font-semibold text-mtg-text mb-4 flex items-center gap-2">
                    <span>&#128196;</span> Page Size
                  </h3>
                  <div className="flex items-end gap-3 mb-4">
                    <div className="flex-1">
                      <label className="text-xs text-mtg-text-muted block mb-1.5">Width</label>
                      <input
                        type="number"
                        value={template.pageWidth}
                        min={1}
                        step={0.01}
                        onChange={e => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v)) update({ pageWidth: v })
                        }}
                        className={inputClasses}
                      />
                    </div>
                    <select
                      value={template.unit}
                      onChange={e => handleUnitChange(e.target.value as TemplateMeasurementUnit)}
                      className="px-3 py-2 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm mb-0"
                    >
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                    </select>
                    <div className="flex-1">
                      <label className="text-xs text-mtg-text-muted block mb-1.5">Height</label>
                      <input
                        type="number"
                        value={template.pageHeight}
                        min={1}
                        step={0.01}
                        onChange={e => {
                          const v = parseFloat(e.target.value)
                          if (!isNaN(v)) update({ pageHeight: v })
                        }}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-mtg-text-muted block mb-1.5">Quick Size</label>
                    <select
                      onChange={e => handlePageSize(e.target.value)}
                      className={inputClasses}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select size...
                      </option>
                      {Object.entries(PAGE_SIZES).map(([key, size]) => (
                        <option key={key} value={key}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Margins card */}
                <div className="rounded-xl border border-mtg-border bg-mtg-section-bg p-5">
                  <h3 className="text-sm font-semibold text-mtg-text mb-4 flex items-center gap-2">
                    <span>&#128208;</span> Page Margins
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {numField('Top', template.marginTop, v => update({ marginTop: v }))}
                    {numField('Left', template.marginLeft, v => update({ marginLeft: v }))}
                  </div>
                </div>

                {/* Grid Layout card */}
                <div className="rounded-xl border border-mtg-border bg-mtg-section-bg p-5">
                  <h3 className="text-sm font-semibold text-mtg-text mb-4 flex items-center gap-2">
                    <span>&#9638;</span> Grid Layout
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {numField('Columns', template.columns, v => update({ columns: v }), {
                      min: 1,
                      step: 1,
                      integer: true,
                    })}
                    {numField('Rows', template.rows, v => update({ rows: v }), {
                      min: 1,
                      step: 1,
                      integer: true,
                    })}
                    {numField('H Gap', template.horizontalGap, v => update({ horizontalGap: v }))}
                    {numField('V Gap', template.verticalGap, v => update({ verticalGap: v }))}
                  </div>
                </div>

                {/* Label Size card */}
                <div className="rounded-xl border border-mtg-border bg-mtg-section-bg p-5">
                  <h3 className="text-sm font-semibold text-mtg-text mb-4 flex items-center gap-2">
                    <span>&#127991;</span> Label Size
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {numField('Width', template.labelWidth, v => update({ labelWidth: v }), {
                      min: 0.1,
                    })}
                    {numField('Height', template.labelHeight, v => update({ labelHeight: v }), {
                      min: 0.1,
                    })}
                  </div>
                </div>

                {/* Save */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Template name..."
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    className={inputClasses + ' flex-1'}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="px-4 py-2 text-sm bg-mtg-accent text-gray-900 rounded-lg font-semibold hover:bg-mtg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                </div>

                {/* Saved templates */}
                <SavedTemplatesList
                  templates={savedTemplates}
                  onLoad={handleLoadSaved}
                  onDelete={deleteTemplate}
                />
              </div>

              {/* RIGHT: Preview card */}
              <div className="rounded-xl border border-mtg-border bg-mtg-section-bg overflow-hidden self-start">
                <div className="flex items-center justify-between px-4 py-3 border-b border-mtg-border">
                  <h3 className="text-sm font-semibold text-mtg-text flex items-center gap-2">
                    <span>&#128196;</span> Page Preview
                  </h3>
                  <button
                    onClick={() => setShowFullPreview(true)}
                    className="px-3 py-1 text-xs font-medium bg-mtg-accent text-gray-900 rounded hover:bg-mtg-accent-hover transition-colors"
                  >
                    Fullscreen
                  </button>
                </div>
                <div className="flex justify-center p-4 bg-mtg-section-header-bg min-h-[400px] items-start">
                  <PagePreview template={template} />
                </div>
                <div className="px-4 py-2 border-t border-mtg-border text-center">
                  <span className="text-xs text-mtg-text-muted">
                    {totalLabels} labels ({template.columns}&times;{template.rows}) &middot;{' '}
                    {template.pageWidth}&times;{template.pageHeight} {template.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      {showFullPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center"
          onClick={() => setShowFullPreview(false)}
        >
          <div
            className="bg-mtg-bg p-6 rounded-lg shadow-xl"
            onClick={e => e.stopPropagation()}
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
