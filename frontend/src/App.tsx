import { useState, useMemo, lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useApiSetsApiSetsGet, useApiCardTypesApiCardTypesGet } from './api/queries/default/default'
import { useSelection } from './hooks/useSelection'
import { useTypeSelection } from './hooks/useTypeSelection'
import { useOpenGroups } from './hooks/useOpenGroups'
import { useSetIcons } from './hooks/useSetIcons'
import { useCustomTemplates } from './hooks/useCustomTemplates'
import { useSetFilterPreferences } from './hooks/useSetFilterPreferences'
import { applyFilters } from './utils/filtering'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from './constants/setFilterDefaults'
import { groupSetsByType, filterSetsByQuery } from './utils/grouping'
import { resolveLetters } from './utils/letters'
import { countDividersPerSet, countLabelItems } from './utils/labelCount'
import { splitDividerTypeId, sortDividerTypeIds } from './utils/dividerTypes'
import { LABEL_TEMPLATES } from './constants/templates'
import { Header } from './components/Layout/Header'
import { Footer } from './components/Layout/Footer'
import { SetList } from './components/SetList/SetList'
import { TypeList } from './components/TypeList/TypeList'
import { ViewToggle, type ViewMode } from './components/ViewToggle/ViewToggle'
const MatrixBuilder = lazy(() =>
  import('./components/MatrixBuilder/MatrixBuilder').then(m => ({ default: m.MatrixBuilder }))
)
const TemplateCustomizer = lazy(() =>
  import('./components/TemplateCustomizer/TemplateCustomizer').then(m => ({
    default: m.TemplateCustomizer,
  }))
)
const SetFilterCustomizer = lazy(() =>
  import('./components/SetFilterCustomizer/SetFilterCustomizer').then(m => ({
    default: m.SetFilterCustomizer,
  }))
)
import { ErrorDisplay } from './components/ErrorDisplay'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import type { MTGSet } from './types'

function sameElements(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every(x => setB.has(x))
}

function App() {
  const { data: setsResponse, isLoading: setsLoading, error: setsError } = useApiSetsApiSetsGet()
  const {
    data: typesResponse,
    isLoading: typesLoading,
    error: typesError,
  } = useApiCardTypesApiCardTypesGet()
  const { data: setIconsMap } = useSetIcons()
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
    setAlphabet,
  } = useSelection()

  const {
    preferences: setFilterPreferences,
    setActiveSetTypes,
    setIgnoredSetCodes,
    setMinimumSetSize,
    reset: resetSetFilter,
  } = useSetFilterPreferences()

  const rawSets: MTGSet[] = useMemo(() => setsResponse?.data ?? [], [setsResponse?.data])
  const sets: MTGSet[] = useMemo(
    () => applyFilters(rawSets, setFilterPreferences),
    [rawSets, setFilterPreferences]
  )
  const cardTypes: Record<string, string[]> = useMemo(
    () => typesResponse?.data ?? {},
    [typesResponse?.data]
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [templateCustomizerOpen, setTemplateCustomizerOpen] = useState(false)
  const [templateCustomizerMounted, setTemplateCustomizerMounted] = useState(false)
  if (templateCustomizerOpen && !templateCustomizerMounted) setTemplateCustomizerMounted(true)
  const [setFilterOpen, setSetFilterOpen] = useState(false)
  const [setFilterMounted, setSetFilterMounted] = useState(false)
  if (setFilterOpen && !setFilterMounted) setSetFilterMounted(true)
  const [viewMode, setViewMode] = useState<ViewMode>('sets')

  // Types selection state (separate from sets selection, persisted alongside it)
  const {
    typeSelection,
    toggleTypeSelection,
    selectTypes,
    deselectTypes,
    selectAllTypes,
    deselectAllTypes,
    setTypeQuantity,
  } = useTypeSelection()
  const { selectedTypeIds, quantities: typeQuantities } = typeSelection
  // Open the colors holding a restored selection, so a reload shows the ticked
  // types rather than a wall of collapsed groups (the Sets tab does the same).
  const [typeOpenGroups, setTypeOpenGroups] = useState<Set<string>>(
    () =>
      new Set(
        selectedTypeIds
          .map(id => splitDividerTypeId(id)?.color)
          .filter((color): color is string => Boolean(color))
      )
  )

  const filteredSets = useMemo(() => filterSetsByQuery(sets, searchQuery), [sets, searchQuery])
  const groupedSets = useMemo(() => groupSetsByType(filteredSets), [filteredSets])
  const { openGroups, toggleGroup, resetManualGroups } = useOpenGroups(
    searchQuery,
    groupedSets,
    selection.selectedSetIds
  )

  // The Matrix tab expands each selected set into the letter x type
  // cross-product, so its totals differ from the plain Sets tab.
  const dividerLetters = useMemo(() => resolveLetters(selection.alphabet), [selection.alphabet])
  const dividersPerSet = countDividersPerSet(dividerLetters.length, selectedTypeIds.length)

  // Print the types in the order the picker lays them out rather than the order
  // the boxes were ticked in, so the PDF matches the matrix preview.
  const orderedTypeIds = useMemo(
    () => sortDividerTypeIds(selectedTypeIds, cardTypes),
    [selectedTypeIds, cardTypes]
  )

  // Selected sets expanded by their custom quantities — the number of set
  // copies the matrix multiplies its dividers over.
  const setLabelCount = useMemo(
    () =>
      countLabelItems(
        selection.selectedSetIds,
        selection.quantities,
        selection.useCustomQuantity,
        0
      ),
    [selection.selectedSetIds, selection.quantities, selection.useCustomQuantity]
  )

  const totalLabels = useMemo(
    () =>
      countLabelItems(
        selection.selectedSetIds,
        selection.quantities,
        selection.useCustomQuantity,
        viewMode === 'matrix' ? dividersPerSet : 0
      ),
    [
      selection.selectedSetIds,
      selection.quantities,
      selection.useCustomQuantity,
      viewMode,
      dividersPerSet,
    ]
  )

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
      ? (customTemplatesApi.templates.find(t => t.id === selection.templateId!.slice(6))?.name ??
        'custom')
      : 'custom'
    : selection.templateId
      ? LABEL_TEMPLATES[selection.templateId]?.name
      : undefined

  const setFilterModified = useMemo(() => {
    if (setFilterPreferences.minimumSetSize !== DEFAULT_MINIMUM_SET_SIZE) return true
    if (!sameElements(setFilterPreferences.activeSetTypes, DEFAULT_SET_TYPES)) return true
    if (
      !sameElements(
        setFilterPreferences.ignoredSetCodes.map(c => c.toLowerCase()),
        DEFAULT_IGNORED_SET_CODES
      )
    ) {
      return true
    }
    return false
  }, [setFilterPreferences])

  const handleSelectAllSets = () => {
    const allSetIds = filteredSets.map(set => set.id)
    resetManualGroups()
    if (isAllSetsSelected(allSetIds)) {
      deselectAllSets()
    } else {
      selectAllSets(allSetIds)
    }
    resetManualGroups()
  }

  const handleSelectGroup = (_groupName: string, setIds: string[]) => {
    const allSelected = setIds.every(id => selection.selectedSetIds.includes(id))
    if (allSelected) {
      deselectSets(setIds)
    } else {
      selectSets(setIds)
    }
    resetManualGroups()
  }

  // Types handlers
  const toggleTypeGroup = (groupName: string) => {
    setTypeOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const handleSelectTypeGroup = (groupName: string, typeIds: string[]) => {
    const allSelected = typeIds.every(id => selectedTypeIds.includes(id))
    if (allSelected) {
      deselectTypes(typeIds)
      // Close the group when deselecting
      setTypeOpenGroups(prev => {
        const next = new Set(prev)
        next.delete(groupName)
        return next
      })
    } else {
      selectTypes(typeIds)
      // Open the group when selecting
      setTypeOpenGroups(prev => new Set([...prev, groupName]))
    }
  }

  const handleSelectAllTypes = () => {
    const allTypeIds = Object.entries(cardTypes).flatMap(([color, types]) =>
      types.map(type => `${color}:${type}`)
    )
    const allSelected = allTypeIds.every(id => selectedTypeIds.includes(id))
    if (allSelected) {
      deselectAllTypes()
      // Close all groups when deselecting all
      setTypeOpenGroups(new Set())
    } else {
      selectAllTypes(allTypeIds)
      // Open all groups when selecting all
      setTypeOpenGroups(new Set(Object.keys(cardTypes)))
    }
  }

  // Filter types by search query
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return cardTypes
    const query = searchQuery.toLowerCase()
    const result: Record<string, string[]> = {}
    for (const [color, types] of Object.entries(cardTypes)) {
      const filtered = types.filter(
        type => type.toLowerCase().includes(query) || color.toLowerCase().includes(query)
      )
      if (filtered.length > 0) {
        result[color] = filtered
      }
    }
    return result
  }, [cardTypes, searchQuery])

  // Count total type labels
  const totalTypeLabels = useMemo(() => {
    let labels = 0
    for (const typeId of selectedTypeIds) {
      labels += selection.useCustomQuantity ? typeQuantities[typeId] || 1 : 1
    }
    return labels
  }, [selectedTypeIds, typeQuantities, selection.useCustomQuantity])

  const typePageCount = useMemo(() => {
    const totalSlots = selection.placeholders + totalTypeLabels
    return totalSlots > 0 ? Math.ceil(totalSlots / labelsPerPage) : 0
  }, [selection.placeholders, totalTypeLabels, labelsPerPage])

  // The Matrix tab crosses sets with card types, so it needs both requests.
  const isLoading =
    viewMode === 'sets'
      ? setsLoading
      : viewMode === 'types'
        ? typesLoading
        : setsLoading || typesLoading
  const error =
    viewMode === 'sets' ? setsError : viewMode === 'types' ? typesError : (setsError ?? typesError)

  // The Matrix tab previews the first selected set as it will print. Resolve it
  // against the unfiltered list: the selection outlives the set filter, so a
  // set hidden by the current filter is still printed and still previewable.
  const sampleSet = useMemo(() => {
    const first = rawSets.find(s => s.id === selection.selectedSetIds[0])
    return first ? { name: first.name, code: first.code, releasedAt: first.released_at } : null
  }, [rawSets, selection.selectedSetIds])

  return (
    <div className="min-h-screen flex flex-col bg-mtg-bg text-mtg-text transition-colors">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        templateCustomizerOpen={templateCustomizerOpen}
        onTemplateToggle={() => setTemplateCustomizerOpen(o => !o)}
        templateBadgeLabel={templateBadgeLabel}
        selectedSetIds={selection.selectedSetIds}
        selectedTypeIds={orderedTypeIds}
        viewMode={viewMode}
        quantities={viewMode === 'types' ? typeQuantities : selection.quantities}
        useCustomQuantity={selection.useCustomQuantity}
        templateId={selection.templateId}
        placeholders={selection.placeholders}
        customTemplate={selection.customTemplate}
        useCustomTemplate={selection.useCustomTemplate}
        alphabet={selection.alphabet}
        setFilterOpen={setFilterOpen}
        onSetFilterToggle={() => setSetFilterOpen(o => !o)}
        setFilterModified={setFilterModified}
      />

      <Suspense fallback={null}>
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
      </Suspense>

      <Suspense fallback={null}>
        {setFilterMounted && (
          <SetFilterCustomizer
            isOpen={setFilterOpen}
            preferences={setFilterPreferences}
            allSets={rawSets}
            onActiveSetTypesChange={setActiveSetTypes}
            onIgnoredSetCodesChange={setIgnoredSetCodes}
            onMinimumSetSizeChange={setMinimumSetSize}
            onReset={resetSetFilter}
          />
        )}
      </Suspense>

      <main className="container mx-auto px-4 py-4 flex-1 min-h-[50vh]">
        <div className="flex items-center justify-between mb-4 min-h-9 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            <span className="text-sm text-mtg-text-muted">
              {viewMode === 'sets' ? (
                <>
                  {totalLabels} labels / {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                  {searchQuery.trim() && (
                    <span className="ml-2">
                      ({filteredSets.length} {filteredSets.length === 1 ? 'set' : 'sets'} found)
                    </span>
                  )}
                </>
              ) : viewMode === 'matrix' ? (
                <>
                  {totalLabels} labels / {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </>
              ) : (
                <>
                  {totalTypeLabels} labels / {typePageCount}{' '}
                  {typePageCount === 1 ? 'page' : 'pages'}
                  {searchQuery.trim() && (
                    <span className="ml-2">
                      ({Object.values(filteredTypes).flat().length} types found)
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
          {viewMode === 'matrix' ? null : viewMode === 'sets' ? (
            <button
              onClick={handleSelectAllSets}
              className={`h-9 px-3 py-0 flex items-center border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors text-sm focus-visible:ring-2 focus-visible:ring-mtg-accent ${filteredSets.length === 0 ? 'invisible' : ''}`}
            >
              {isAllSetsSelected(filteredSets.map(s => s.id)) ? 'Deselect All' : 'Select All'}
            </button>
          ) : (
            <button
              onClick={handleSelectAllTypes}
              className={`h-9 px-3 py-0 flex items-center border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors text-sm focus-visible:ring-2 focus-visible:ring-mtg-accent ${Object.keys(filteredTypes).length === 0 ? 'invisible' : ''}`}
            >
              {Object.entries(cardTypes)
                .flatMap(([color, types]) => types.map(type => `${color}:${type}`))
                .every(id => selectedTypeIds.includes(id))
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
        ) : viewMode === 'matrix' ? (
          <Suspense fallback={<LoadingSkeleton />}>
            <MatrixBuilder
              selectedSetCount={selection.selectedSetIds.length}
              sampleSet={sampleSet}
              selectedTypeIds={selectedTypeIds}
              groupedTypes={cardTypes}
              alphabet={selection.alphabet}
              dividersPerSet={dividersPerSet}
              setLabelCount={setLabelCount}
              totalLabels={totalLabels}
              onAlphabetChange={setAlphabet}
              onGoToSets={() => setViewMode('sets')}
              onGoToTypes={() => setViewMode('types')}
            />
          </Suspense>
        ) : viewMode === 'sets' ? (
          filteredSets.length === 0 && searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-mtg-text-muted mb-4"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <p className="text-lg font-medium text-mtg-text mb-1">No sets found</p>
              <p className="text-sm text-mtg-text-muted mb-4">
                No results for &ldquo;{searchQuery.trim()}&rdquo;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="h-9 px-4 py-0 flex items-center gap-2 text-sm border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                Clear search
              </button>
            </div>
          ) : sets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-mtg-text-muted mb-4"
                aria-hidden="true"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <p className="text-lg font-medium text-mtg-text mb-1">No sets match your filters</p>
              <p className="text-sm text-mtg-text-muted mb-4">
                All sets were excluded by your current filter preferences.
              </p>
              <button
                onClick={resetSetFilter}
                className="h-9 px-4 py-0 flex items-center gap-2 text-sm border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors"
              >
                Reset filters to defaults
              </button>
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
              setIconsMap={setIconsMap}
            />
          )
        ) : Object.keys(filteredTypes).length === 0 && searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-mtg-text-muted mb-4"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-lg font-medium text-mtg-text mb-1">No types found</p>
            <p className="text-sm text-mtg-text-muted mb-4">
              No results for &ldquo;{searchQuery.trim()}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="h-9 px-4 py-0 flex items-center gap-2 text-sm border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              Clear search
            </button>
          </div>
        ) : (
          <TypeList
            groupedTypes={filteredTypes}
            selectedTypeIds={selectedTypeIds}
            quantities={typeQuantities}
            useCustomQuantity={selection.useCustomQuantity}
            onToggleType={toggleTypeSelection}
            onQuantityChange={setTypeQuantity}
            openGroups={typeOpenGroups}
            onToggleGroup={toggleTypeGroup}
            onSelectGroup={handleSelectTypeGroup}
          />
        )}
      </main>

      {!isLoading && <Footer />}
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
