import { useState, useEffect, useMemo } from 'react'
import { useSets } from './hooks/useSets'
import { useSelection } from './hooks/useSelection'
import { useCardTypes } from './hooks/useCardTypes'
import { groupSetsByType, filterSetsByQuery } from './utils/grouping'
import { SetList } from './components/SetList/SetList'
import { SearchBar } from './components/SearchBar/SearchBar'
import { SelectionCounter } from './components/SelectionCounter/SelectionCounter'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'
import { PDFGenerator } from './components/PDFGenerator/PDFGenerator'
import { TemplateSelector } from './components/TemplateSelector/TemplateSelector'
import { PlaceholdersInput } from './components/PDFGenerator/PlaceholdersInput'
import { LABEL_TEMPLATES } from './constants/templates'

function App() {
  const { sets, loading: setsLoading, error: setsError } = useSets()
  const { loading: typesLoading, error: typesError } = useCardTypes()
  const { selection, toggleSetSelection, setQuantity, setViewMode, setTemplate, setPlaceholders, selectAllSets, deselectAllSets, isAllSetsSelected } = useSelection()

  const [searchQuery, setSearchQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  // Filter sets based on search query
  const filteredSets = useMemo(() => {
    return filterSetsByQuery(sets, searchQuery)
  }, [sets, searchQuery])

  // Group filtered sets by type
  const groupedSets = useMemo(() => {
    return groupSetsByType(filteredSets)
  }, [filteredSets])

  // Filter card types based on search query (for future Types view)
  // const filteredCardTypes = useMemo(() => {
  //   return filterCardTypesByQuery(cardTypes, searchQuery)
  // }, [cardTypes, searchQuery])

  // Auto-expand groups that contain selected sets
  useEffect(() => {
    if (selection.viewMode === 'sets' && selection.selectedSetIds.length > 0) {
      const groupsToOpen = new Set<string>()
      for (const [groupName, groupSets] of Object.entries(groupedSets)) {
        if (groupSets.some((set) => selection.selectedSetIds.includes(set.id))) {
          groupsToOpen.add(groupName)
        }
      }
      setOpenGroups(groupsToOpen)
    }
  }, [groupedSets, selection.selectedSetIds, selection.viewMode])

  // Calculate total labels and pages
  const { totalLabels, totalPages } = useMemo(() => {
    const template = LABEL_TEMPLATES[selection.templateId] || LABEL_TEMPLATES.avery5160

    let labels = 0
    if (selection.viewMode === 'sets') {
      for (const setId of selection.selectedSetIds) {
        const qty = selection.quantities[setId] || 1
        labels += qty
      }
    } else {
      for (const cardTypeId of selection.selectedCardTypeIds) {
        const qty = selection.quantities[cardTypeId] || 1
        labels += qty
      }
    }

    const totalLabelsWithPlaceholders = labels + selection.placeholders
    const totalPages = Math.ceil(totalLabelsWithPlaceholders / template.labels_per_page)

    return { totalLabels: labels, totalPages }
  }, [selection])

  const handleToggleGroup = (groupName: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const handleSelectAllSets = () => {
    const allSetIds = filteredSets.map((set) => set.id)
    if (isAllSetsSelected(allSetIds)) {
      deselectAllSets()
    } else {
      selectAllSets(allSetIds)
    }
  }


  return (
    <div className="min-h-screen bg-mtg-bg text-mtg-text transition-colors">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">MTG Label Generator</h1>
            <ThemeToggle />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setViewMode('sets')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                selection.viewMode === 'sets'
                  ? 'bg-blue-600 text-white'
                  : 'bg-mtg-card-bg text-mtg-text hover:bg-opacity-80'
              }`}
            >
              Sets
            </button>
            <button
              onClick={() => setViewMode('types')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                selection.viewMode === 'types'
                  ? 'bg-blue-600 text-white'
                  : 'bg-mtg-card-bg text-mtg-text hover:bg-opacity-80'
              }`}
            >
              Types
            </button>
          </div>

          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </header>

        {/* Selection Counter */}
        {(selection.viewMode === 'sets' ? selection.selectedSetIds.length : selection.selectedCardTypeIds.length) > 0 && (
          <div className="mb-4">
            <SelectionCounter
              selectedCount={selection.viewMode === 'sets' ? selection.selectedSetIds.length : selection.selectedCardTypeIds.length}
              totalLabels={totalLabels}
              totalPages={totalPages}
            />
          </div>
        )}

        {/* Select All Button */}
        {selection.viewMode === 'sets' && filteredSets.length > 0 && (
          <div className="mb-4">
            <button
              onClick={handleSelectAllSets}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              {isAllSetsSelected(filteredSets.map((s) => s.id))
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            {setsLoading || typesLoading ? (
              <div className="text-center py-12">
                <div className="text-mtg-text-muted">Loading...</div>
              </div>
            ) : setsError || typesError ? (
              <div className="text-center py-12">
                <div className="text-red-600">
                  {setsError || typesError || 'Failed to load data'}
                </div>
              </div>
            ) : selection.viewMode === 'sets' ? (
              <SetList
                groupedSets={groupedSets}
                selectedSetIds={selection.selectedSetIds}
                quantities={selection.quantities}
                onToggleSet={toggleSetSelection}
                onQuantityChange={(setId, quantity) => setQuantity(setId, quantity)}
                openGroups={openGroups}
                onToggleGroup={handleToggleGroup}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-mtg-text-muted">Card Types view - Coming soon</div>
              </div>
            )}
          </div>

          {/* PDF Generation Panel */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="sticky top-4 lg:top-6 space-y-4 bg-mtg-card-bg border border-mtg-border rounded-lg p-4 sm:p-6">
              <h2 className="text-xl font-bold text-mtg-text mb-4">Generate Labels</h2>

              <TemplateSelector
                selectedTemplate={selection.templateId}
                onTemplateChange={setTemplate}
              />

              <PlaceholdersInput
                templateId={selection.templateId}
                placeholders={selection.placeholders}
                onPlaceholdersChange={setPlaceholders}
              />

              <PDFGenerator
                selectedSetIds={selection.selectedSetIds}
                selectedCardTypeIds={selection.selectedCardTypeIds}
                templateId={selection.templateId}
                placeholders={selection.placeholders}
                viewMode={selection.viewMode}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
