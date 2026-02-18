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

  const customTemplatesApi = useCustomTemplates()
  const templateBadgeLabel = selection.useCustomTemplate
    ? selection.templateId?.startsWith('saved:')
      ? customTemplatesApi.templates.find((t) => t.id === selection.templateId!.slice(6))?.name ??
        'custom'
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
          customTemplatesApi={customTemplatesApi}
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
