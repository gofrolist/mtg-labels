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

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.2, height: 841.8 },
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

  const numField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    opts?: { min?: number; step?: number; integer?: boolean },
  ) => (
    <div className="flex flex-col gap-1">
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
        className="w-full px-2 py-1 border border-mtg-border rounded bg-mtg-card-bg text-mtg-text text-sm focus:outline-none focus:ring-2 focus:ring-mtg-accent"
      />
    </div>
  )

  return (
    <div className="border-b border-mtg-border bg-mtg-card-bg">
      {/* Toggle bar */}
      <div className="container-fluid px-4">
        <div className="flex items-center justify-between py-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm text-mtg-text hover:text-mtg-accent transition-colors"
          >
            <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>
            Template Customizer
          </button>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomTemplate}
              onChange={e => handleToggle(e.target.checked)}
              className="accent-mtg-accent"
            />
            <span className="text-mtg-text">Use Custom Template</span>
          </label>
        </div>
      </div>

      {/* Collapsible panel */}
      {isOpen && (
        <div className="container-fluid px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
            {/* Controls */}
            <div className="space-y-4">
              {/* Preset loader */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm text-mtg-text-muted">Load from preset:</label>
                <select
                  onChange={e => handlePresetLoad(e.target.value)}
                  className="px-2 py-1 border border-mtg-border rounded bg-mtg-card-bg text-mtg-text text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select preset...
                  </option>
                  {Object.values(LABEL_TEMPLATES).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit selector + page size */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-mtg-text-muted">Unit:</label>
                  <select
                    value={template.unit}
                    onChange={e => handleUnitChange(e.target.value as TemplateMeasurementUnit)}
                    className="px-2 py-1 border border-mtg-border rounded bg-mtg-card-bg text-mtg-text text-sm"
                  >
                    <option value="in">Inches</option>
                    <option value="mm">Millimeters</option>
                    <option value="cm">Centimeters</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-mtg-text-muted">Page:</label>
                  <button
                    onClick={() => handlePageSize('letter')}
                    className="px-2 py-1 text-xs border border-mtg-border rounded hover:bg-mtg-accent hover:text-gray-900 transition-colors text-mtg-text"
                  >
                    US Letter
                  </button>
                  <button
                    onClick={() => handlePageSize('a4')}
                    className="px-2 py-1 text-xs border border-mtg-border rounded hover:bg-mtg-accent hover:text-gray-900 transition-colors text-mtg-text"
                  >
                    A4
                  </button>
                </div>
              </div>

              {/* Page size */}
              <fieldset className="border border-mtg-border rounded p-3">
                <legend className="text-sm font-medium text-mtg-text px-1">
                  Page Size ({template.unit})
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {numField('Width', template.pageWidth, v => update({ pageWidth: v }), {
                    min: 1,
                  })}
                  {numField('Height', template.pageHeight, v => update({ pageHeight: v }), {
                    min: 1,
                  })}
                </div>
              </fieldset>

              {/* Margins */}
              <fieldset className="border border-mtg-border rounded p-3">
                <legend className="text-sm font-medium text-mtg-text px-1">
                  Margins ({template.unit})
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {numField('Left', template.marginLeft, v => update({ marginLeft: v }))}
                  {numField('Top', template.marginTop, v => update({ marginTop: v }))}
                </div>
              </fieldset>

              {/* Grid */}
              <fieldset className="border border-mtg-border rounded p-3">
                <legend className="text-sm font-medium text-mtg-text px-1">Grid Layout</legend>
                <div className="grid grid-cols-2 gap-3">
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
                  {numField(
                    `H Gap (${template.unit})`,
                    template.horizontalGap,
                    v => update({ horizontalGap: v }),
                  )}
                  {numField(
                    `V Gap (${template.unit})`,
                    template.verticalGap,
                    v => update({ verticalGap: v }),
                  )}
                </div>
              </fieldset>

              {/* Label size */}
              <fieldset className="border border-mtg-border rounded p-3">
                <legend className="text-sm font-medium text-mtg-text px-1">
                  Label Size ({template.unit})
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {numField('Width', template.labelWidth, v => update({ labelWidth: v }), {
                    min: 0.1,
                  })}
                  {numField('Height', template.labelHeight, v => update({ labelHeight: v }), {
                    min: 0.1,
                  })}
                </div>
              </fieldset>

              {/* Save */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Template name..."
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="flex-1 px-2 py-1 border border-mtg-border rounded bg-mtg-card-bg text-mtg-text text-sm"
                />
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="px-3 py-1 text-sm bg-mtg-accent text-gray-900 rounded hover:bg-mtg-accent-hover disabled:opacity-50 transition-colors"
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

            {/* Preview */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-mtg-text-muted">
                Preview ({template.columns} x {template.rows} ={' '}
                {template.columns * template.rows} labels)
              </span>
              <PagePreview template={template} />
              <button
                onClick={() => setShowFullPreview(true)}
                className="text-xs text-mtg-accent hover:underline"
              >
                Fullscreen Preview
              </button>
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
                {template.columns} x {template.rows} = {template.columns * template.rows} labels
              </span>
              <button
                onClick={() => setShowFullPreview(false)}
                className="text-mtg-text-muted hover:text-mtg-text"
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
