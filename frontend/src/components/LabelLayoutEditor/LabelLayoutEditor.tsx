import { useState, useId } from 'react'
import type { LabelLayout, TextElementConfig, IconElementConfig } from '../../types'
import { POSITION_OPTIONS, FONT_OPTIONS } from '../../types'
import type { CustomLayoutsApi } from '../../hooks/useCustomLayouts'
import { LabelPreview } from './LabelPreview'

interface LabelLayoutEditorProps {
  isOpen: boolean
  layoutsApi: CustomLayoutsApi
}

const inputClasses =
  'w-full h-9 px-3 py-1.5 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm focus:outline-none focus:ring-2 focus:ring-mtg-accent/40'

export function LabelLayoutEditor({ isOpen, layoutsApi }: LabelLayoutEditorProps) {
  const layoutSelectId = useId()
  const [saveName, setSaveName] = useState('')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [confirmOverwrite, setConfirmOverwrite] = useState<{ id: string; name: string } | null>(null)

  // Local draft state for editing (before saving)
  const [draft, setDraft] = useState<LabelLayout | null>(null)

  const {
    selectedLayoutId,
    setSelectedLayoutId,
    getSelectedLayout,
    getAllLayouts,
    saveLayout,
    updateLayout,
    deleteLayout,
    isLayoutEditable,
    customLayouts,
  } = layoutsApi

  const currentLayout = draft ?? getSelectedLayout()
  const isEditing = draft !== null
  const canDelete = isLayoutEditable(selectedLayoutId)

  const handleLayoutSelect = (id: string) => {
    setSelectedLayoutId(id)
    setDraft(null)
  }

  const updateDraft = (partial: Partial<LabelLayout>) => {
    const base = draft ?? getSelectedLayout()
    setDraft({ ...base, ...partial })
  }

  const updateTextElement = (
    key: 'setName' | 'setCode' | 'releaseDate',
    partial: Partial<TextElementConfig>
  ) => {
    const base = draft ?? getSelectedLayout()
    updateDraft({
      [key]: { ...base[key], ...partial },
    })
  }

  const updateIconElement = (partial: Partial<IconElementConfig>) => {
    const base = draft ?? getSelectedLayout()
    updateDraft({
      setIcon: { ...base.setIcon, ...partial },
    })
  }

  const handleSave = () => {
    const name = saveName.trim()
    if (!name || !draft) return
    
    const existing = customLayouts.find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      setConfirmOverwrite({ id: existing.id, name: existing.name })
      return
    }
    
    const { id: _id, name: _name, isDefault: _isDefault, ...layoutData } = draft
    saveLayout(name, layoutData)
    setDraft(null)
    setSaveName('')
  }

  const handleConfirmOverwrite = () => {
    if (!confirmOverwrite || !draft) return
    const { id: _id, name: _name, isDefault: _isDefault, ...layoutData } = draft
    updateLayout(confirmOverwrite.id, layoutData)
    setSelectedLayoutId(confirmOverwrite.id)
    setDraft(null)
    setSaveName('')
    setConfirmOverwrite(null)
  }

  const handleUpdateCurrent = () => {
    if (!draft || !isLayoutEditable(selectedLayoutId)) return
    const { id: _id, name: _name, isDefault: _isDefault, ...layoutData } = draft
    updateLayout(selectedLayoutId, layoutData)
    setDraft(null)
  }

  const handleDelete = () => {
    if (confirmingDeleteId === selectedLayoutId) {
      deleteLayout(selectedLayoutId)
      setConfirmingDeleteId(null)
      setDraft(null)
    } else {
      setConfirmingDeleteId(selectedLayoutId)
    }
  }

  const handleReset = () => {
    setDraft(null)
  }

  return (
    <div
      className="overflow-hidden grid transition-[grid-template-rows] duration-200 ease-out bg-mtg-card-bg border-b border-mtg-border"
      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="container mx-auto px-4 py-4">
          {/* Layout selector */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="min-w-[200px] flex-1">
              <label htmlFor={layoutSelectId} className="block text-sm text-mtg-text mb-2">
                Label Layout
              </label>
              <div className="flex gap-2">
                <select
                  id={layoutSelectId}
                  value={selectedLayoutId}
                  onChange={(e) => handleLayoutSelect(e.target.value)}
                  className={inputClasses + ' flex-1'}
                >
                  <optgroup label="Default Layouts">
                    {getAllLayouts()
                      .filter((l) => l.isDefault)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </optgroup>
                  {customLayouts.length > 0 && (
                    <optgroup label="My Layouts">
                      {getAllLayouts()
                        .filter((l) => !l.isDefault)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                {canDelete &&
                  (confirmingDeleteId === selectedLayoutId ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="h-9 flex items-center px-3 py-0 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        className="h-9 flex items-center px-3 py-0 text-sm border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="h-9 flex items-center px-3 py-0 text-red-600 text-sm hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-800 shrink-0"
                      title="Delete this layout"
                      aria-label="Delete selected layout"
                    >
                      Delete
                    </button>
                  ))}
              </div>
            </div>

            {/* Save as new */}
            <div className="flex items-end gap-2 min-w-[200px] flex-1">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm text-mtg-text mb-2">Save as</label>
                <div className="flex h-9">
                  <input
                    type="text"
                    placeholder="Layout name..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    aria-label="Save layout as"
                    className={inputClasses + ' !h-full'}
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || !isEditing}
                className="h-9 flex items-center justify-center px-3 py-0 bg-mtg-accent text-gray-900 font-medium rounded text-sm hover:bg-mtg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Save
              </button>
            </div>

            {confirmOverwrite && (
              <div className="flex items-center gap-2 w-full mt-2 px-3 py-2 bg-mtg-section-bg border border-mtg-border rounded-lg text-sm">
                <span className="text-mtg-text">
                  Overwrite &ldquo;{confirmOverwrite.name}&rdquo;?
                </span>
                <button
                  type="button"
                  onClick={handleConfirmOverwrite}
                  className="h-7 px-2 py-0 bg-mtg-accent text-gray-900 font-medium rounded text-xs hover:bg-mtg-accent-hover transition-colors"
                >
                  Overwrite
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOverwrite(null)}
                  className="h-7 px-2 py-0 border border-mtg-border rounded text-xs hover:bg-mtg-hover-bg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Main content: config + preview */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
            {/* Element configurations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Set Icon */}
              <ElementConfigCard
                title="Set Icon"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                }
              >
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentLayout.setIcon.visible}
                      onChange={(e) => updateIconElement({ visible: e.target.checked })}
                      className="w-4 h-4 rounded border-mtg-border bg-mtg-input-bg text-mtg-accent focus:ring-mtg-accent"
                    />
                    <span className="text-sm text-mtg-text">Visible</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-mtg-text-muted block mb-1">Position</label>
                    <select
                      value={currentLayout.setIcon.position}
                      onChange={(e) => updateIconElement({ position: e.target.value as IconElementConfig['position'] })}
                      disabled={!currentLayout.setIcon.visible}
                      className={inputClasses + ' disabled:opacity-50'}
                    >
                      {POSITION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-mtg-text-muted block mb-1">Size (%)</label>
                    <input
                      type="number"
                      value={currentLayout.setIcon.size}
                      onChange={(e) => updateIconElement({ size: Math.max(10, Math.min(100, parseInt(e.target.value) || 50)) })}
                      disabled={!currentLayout.setIcon.visible}
                      min={10}
                      max={100}
                      className={inputClasses + ' disabled:opacity-50'}
                    />
                  </div>
                </div>
              </ElementConfigCard>

              {/* Set Name */}
              <TextElementConfigCard
                title="Set Name"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>
                }
                config={currentLayout.setName}
                onChange={(partial) => updateTextElement('setName', partial)}
              />

              {/* Set Code */}
              <TextElementConfigCard
                title="Set Code"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                }
                config={currentLayout.setCode}
                onChange={(partial) => updateTextElement('setCode', partial)}
              />

              {/* Release Date */}
              <TextElementConfigCard
                title="Release Date"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                }
                config={currentLayout.releaseDate}
                onChange={(partial) => updateTextElement('releaseDate', partial)}
              />
            </div>

            {/* Preview and actions */}
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
                <h3 className="font-semibold text-mtg-text mb-3 flex items-center gap-2 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mtg-accent shrink-0" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  Preview
                </h3>
                <LabelPreview layout={currentLayout} />
              </div>

              {/* Padding */}
              <div className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
                <h3 className="font-semibold text-mtg-text mb-3 flex items-center gap-2 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-mtg-accent shrink-0" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
                  Padding
                </h3>
                <div>
                  <label className="text-xs text-mtg-text-muted block mb-1">Edge padding (pt)</label>
                  <input
                    type="number"
                    value={currentLayout.padding}
                    onChange={(e) => updateDraft({ padding: Math.max(0, Math.min(20, parseInt(e.target.value) || 4)) })}
                    min={0}
                    max={20}
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {isEditing && canDelete && (
                  <button
                    onClick={handleUpdateCurrent}
                    className="flex-1 h-9 flex items-center justify-center px-3 py-0 bg-mtg-accent text-gray-900 font-medium rounded text-sm hover:bg-mtg-accent-hover transition-colors"
                  >
                    Update Layout
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={handleReset}
                    className="h-9 flex items-center justify-center px-3 py-0 border border-mtg-border rounded text-sm hover:bg-mtg-hover-bg transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              {isEditing && !canDelete && (
                <p className="text-xs text-mtg-text-muted">
                  Editing a default layout. Use &ldquo;Save as&rdquo; to save your changes as a new layout.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable card wrapper for element configs
function ElementConfigCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
      <h3 className="font-semibold text-mtg-text mb-3 flex items-center gap-2 text-sm">
        <span className="text-mtg-accent shrink-0" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  )
}

// Reusable card for text element configuration
function TextElementConfigCard({
  title,
  icon,
  config,
  onChange,
}: {
  title: string
  icon: React.ReactNode
  config: TextElementConfig
  onChange: (partial: Partial<TextElementConfig>) => void
}) {
  return (
    <ElementConfigCard title={title} icon={icon}>
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.visible}
            onChange={(e) => onChange({ visible: e.target.checked })}
            className="w-4 h-4 rounded border-mtg-border bg-mtg-input-bg text-mtg-accent focus:ring-mtg-accent"
          />
          <span className="text-sm text-mtg-text">Visible</span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-mtg-text-muted block mb-1">Position</label>
          <select
            value={config.position}
            onChange={(e) => onChange({ position: e.target.value as TextElementConfig['position'] })}
            disabled={!config.visible}
            className={inputClasses + ' disabled:opacity-50'}
          >
            {POSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-mtg-text-muted block mb-1">Font</label>
          <select
            value={config.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value as TextElementConfig['fontFamily'] })}
            disabled={!config.visible}
            className={inputClasses + ' disabled:opacity-50'}
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-mtg-text-muted block mb-1">Size (pt)</label>
        <input
          type="number"
          value={config.fontSize}
          onChange={(e) => onChange({ fontSize: Math.max(4, Math.min(24, parseInt(e.target.value) || 8)) })}
          disabled={!config.visible}
          min={4}
          max={24}
          className={inputClasses + ' disabled:opacity-50'}
        />
      </div>
    </ElementConfigCard>
  )
}
