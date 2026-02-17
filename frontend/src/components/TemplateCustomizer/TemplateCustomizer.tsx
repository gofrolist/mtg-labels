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

  const inputClasses =
    'w-full px-2 py-1 border border-mtg-border rounded bg-mtg-input-bg text-mtg-text text-sm focus:outline-none focus:ring-2 focus:ring-mtg-accent'

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
        className={inputClasses}
      />
    </div>
  )

  return (
    <div className="border-b border-mtg-border">
      {/* Accordion header */}
      <div className="bg-gradient-to-r from-mtg-nav-from to-mtg-nav-to">
        <div className="container-fluid px-4">
          <div className="flex items-center justify-between py-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 text-sm text-mtg-accent font-medium hover:text-mtg-accent-hover transition-colors"
            >
              <span className={`transition-transform text-xs ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>
              Template Customizer
              {useCustomTemplate && (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-mtg-accent text-gray-900 rounded-full">
                  Custom Active
                </span>
              )}
            </button>
            {/* Toggle switch */}
            <label className="relative inline-flex items-center cursor-pointer gap-2">
              <input
                type="checkbox"
                checked={useCustomTemplate}
                onChange={e => handleToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-mtg-accent rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-mtg-accent" />
              <span className="text-sm text-white/80">Custom</span>
            </label>
          </div>
        </div>
      </div>

      {/* Collapsible panel */}
      {isOpen && (
        <div className="bg-mtg-card-bg">
          <div className="container-fluid px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: Controls */}
              <div className="space-y-4">
                {/* Preset loader */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm text-mtg-text-muted">Load from preset:</label>
                  <select
                    onChange={e => handlePresetLoad(e.target.value)}
                    className={inputClasses + ' w-auto'}
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

                {/* Page Size card with unit selector in header */}
                <div className="rounded-lg border border-mtg-border bg-mtg-section-bg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-mtg-section-header-bg border-b border-mtg-border">
                    <span className="text-sm font-medium text-mtg-text">
                      📄 Page Size
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={template.unit}
                        onChange={e => handleUnitChange(e.target.value as TemplateMeasurementUnit)}
                        className="px-2 py-0.5 text-xs border border-mtg-border rounded bg-mtg-input-bg text-mtg-text"
                      >
                        <option value="in">in</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                      </select>
                      <button
                        onClick={() => handlePageSize('letter')}
                        className="px-2 py-0.5 text-xs border border-mtg-border rounded hover:bg-mtg-accent hover:text-gray-900 transition-colors text-mtg-text"
                      >
                        Letter
                      </button>
                      <button
                        onClick={() => handlePageSize('a4')}
                        className="px-2 py-0.5 text-xs border border-mtg-border rounded hover:bg-mtg-accent hover:text-gray-900 transition-colors text-mtg-text"
                      >
                        A4
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {numField('Width', template.pageWidth, v => update({ pageWidth: v }), {
                      min: 1,
                    })}
                    {numField('Height', template.pageHeight, v => update({ pageHeight: v }), {
                      min: 1,
                    })}
                  </div>
                </div>

                {/* Margins card */}
                <div className="rounded-lg border border-mtg-border bg-mtg-section-bg overflow-hidden">
                  <div className="px-3 py-2 bg-mtg-section-header-bg border-b border-mtg-border">
                    <span className="text-sm font-medium text-mtg-text">
                      📐 Margins ({template.unit})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
                    {numField('Left', template.marginLeft, v => update({ marginLeft: v }))}
                    {numField('Top', template.marginTop, v => update({ marginTop: v }))}
                  </div>
                </div>

                {/* Grid Layout card */}
                <div className="rounded-lg border border-mtg-border bg-mtg-section-bg overflow-hidden">
                  <div className="px-3 py-2 bg-mtg-section-header-bg border-b border-mtg-border">
                    <span className="text-sm font-medium text-mtg-text">
                      🔲 Grid Layout
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
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
                </div>

                {/* Label Size card */}
                <div className="rounded-lg border border-mtg-border bg-mtg-section-bg overflow-hidden">
                  <div className="px-3 py-2 bg-mtg-section-header-bg border-b border-mtg-border">
                    <span className="text-sm font-medium text-mtg-text">
                      🏷️ Label Size ({template.unit})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3">
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
                    className="px-3 py-1 text-sm bg-mtg-accent text-gray-900 rounded-lg hover:bg-mtg-accent-hover disabled:opacity-50 transition-colors"
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
              <div className="rounded-lg border border-mtg-border bg-mtg-section-bg overflow-hidden self-start">
                <div className="flex items-center justify-between px-3 py-2 bg-mtg-section-header-bg border-b border-mtg-border">
                  <span className="text-sm font-medium text-mtg-text">
                    Preview ({template.columns} x {template.rows} ={' '}
                    {template.columns * template.rows} labels)
                  </span>
                  <button
                    onClick={() => setShowFullPreview(true)}
                    className="text-xs text-mtg-accent hover:text-mtg-accent-hover transition-colors"
                  >
                    Fullscreen
                  </button>
                </div>
                <div className="flex justify-center p-4">
                  <PagePreview template={template} />
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
                {template.columns} x {template.rows} = {template.columns * template.rows} labels
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
