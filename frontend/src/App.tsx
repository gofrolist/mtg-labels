import { useState, useMemo } from 'react'
import { useApiSetsApiSetsGet } from './api/queries/default/default'
import { useApiCardTypesApiCardTypesGet } from './api/queries/default/default'
import { useSelection } from './hooks/useSelection'
import { groupSetsByType, filterSetsByQuery } from './utils/grouping'
import { SetList } from './components/SetList/SetList'
import { SearchBar } from './components/SearchBar/SearchBar'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'
import { PDFGenerator } from './components/PDFGenerator/PDFGenerator'
import { TemplateSelector } from './components/TemplateSelector/TemplateSelector'
import { PlaceholdersInput } from './components/PDFGenerator/PlaceholdersInput'
import type { MTGSet } from './types'

function App() {
  const { data: setsResponse, isLoading: setsLoading, error: setsError } = useApiSetsApiSetsGet()
  const { isLoading: typesLoading, error: typesError } = useApiCardTypesApiCardTypesGet()
  const { selection, toggleSetSelection, setQuantity, setViewMode, setTemplate, setPlaceholders, selectAllSets, deselectAllSets, isAllSetsSelected } = useSelection()

  const sets: MTGSet[] = useMemo(() => setsResponse?.data ?? [], [setsResponse?.data])

  const [searchQuery, setSearchQuery] = useState('')
  const [manualOpenGroups, setManualOpenGroups] = useState<Set<string> | null>(null)

  // Filter sets based on search query
  const filteredSets = useMemo(() => {
    return filterSetsByQuery(sets, searchQuery)
  }, [sets, searchQuery])

  // Group filtered sets by type
  const groupedSets = useMemo(() => {
    return groupSetsByType(filteredSets)
  }, [filteredSets])

  // Derive open groups: auto-expand groups containing selected sets
  const openGroups = useMemo(() => {
    if (manualOpenGroups !== null) return manualOpenGroups
    if (selection.viewMode === 'sets' && selection.selectedSetIds.length > 0) {
      const groupsToOpen = new Set<string>()
      for (const [groupName, groupSets] of Object.entries(groupedSets)) {
        if (groupSets.some((set) => selection.selectedSetIds.includes(set.id))) {
          groupsToOpen.add(groupName)
        }
      }
      return groupsToOpen
    }
    return new Set<string>()
  }, [manualOpenGroups, groupedSets, selection.selectedSetIds, selection.viewMode])

  // Calculate total labels
  const { totalLabels } = useMemo(() => {
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

    return { totalLabels: labels }
  }, [selection])

  const handleToggleGroup = (groupName: string) => {
    const prev = openGroups
    const next = new Set(prev)
    if (next.has(groupName)) {
      next.delete(groupName)
    } else {
      next.add(groupName)
    }
    setManualOpenGroups(next)
  }

  const handleSelectAllSets = () => {
    const allSetIds = filteredSets.map((set) => set.id)
    if (isAllSetsSelected(allSetIds)) {
      deselectAllSets()
    } else {
      selectAllSets(allSetIds)
    }
  }

  const handleSelectGroup = (_groupName: string, setIds: string[]) => {
    const allSelected = setIds.every(id => selection.selectedSetIds.includes(id))
    if (allSelected) {
      // Deselect all in group
      setIds.forEach(id => {
        if (selection.selectedSetIds.includes(id)) {
          toggleSetSelection(id)
        }
      })
    } else {
      // Select all in group
      setIds.forEach(id => {
        if (!selection.selectedSetIds.includes(id)) {
          toggleSetSelection(id)
        }
      })
    }
  }

  const errorMessage = (setsError as Error | null)?.message || (typesError as Error | null)?.message

  return (
    <div className="min-h-screen bg-mtg-bg text-mtg-text transition-colors">
      {/* Sticky Navbar - Bootstrap style */}
      <nav className="sticky top-0 z-50 bg-gray-800 text-white shadow-lg">
        <div className="container-fluid px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
            {/* Brand */}
            <a href="#" className="text-xl font-bold">
              MTG Labels
            </a>

            {/* Collapsible content */}
            <div className="flex flex-wrap items-center gap-3 flex-1 justify-between">
              {/* Left: Generate PDF & Template */}
              <div className="flex items-center gap-3">
                <PDFGenerator
                  selectedSetIds={selection.selectedSetIds}
                  selectedCardTypeIds={selection.selectedCardTypeIds}
                  templateId={selection.templateId}
                  placeholders={selection.placeholders}
                  viewMode={selection.viewMode}
                />
                <TemplateSelector
                  selectedTemplate={selection.templateId}
                  onTemplateChange={setTemplate}
                />
              </div>

              {/* Right: Select All & Search */}
              <div className="flex items-center gap-3 ml-auto">
                {selection.viewMode === 'sets' && filteredSets.length > 0 && (
                  <button
                    onClick={handleSelectAllSets}
                    className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    {isAllSetsSelected(filteredSets.map((s) => s.id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                )}
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mt-4">
        {/* Centered Title */}
        <h1 className="mb-4 text-center">MTG Printable Label Generator</h1>

        {/* View Mode Tabs with Label Count and Empty at start */}
        <div className="flex flex-wrap items-center gap-3 mb-4 justify-center">
          <button
            onClick={() => setViewMode('sets')}
            className={`px-3 py-2 rounded font-medium transition-colors text-sm ${
              selection.viewMode === 'sets'
                ? 'bg-blue-600 text-white'
                : 'bg-mtg-card-bg text-mtg-text hover:bg-opacity-80 border border-mtg-border'
            }`}
          >
            Sets
          </button>
          <button
            onClick={() => setViewMode('types')}
            className={`px-3 py-2 rounded font-medium transition-colors text-sm ${
              selection.viewMode === 'types'
                ? 'bg-blue-600 text-white'
                : 'bg-mtg-card-bg text-mtg-text hover:bg-opacity-80 border border-mtg-border'
            }`}
          >
            Types
          </button>
          <span className="px-3 py-2 text-sm text-mtg-text-muted">
            {totalLabels} labels
          </span>
          <PlaceholdersInput
            templateId={selection.templateId}
            placeholders={selection.placeholders}
            onPlaceholdersChange={setPlaceholders}
          />
        </div>

        {/* Main Content: Set List */}
        <main>
          {setsLoading || typesLoading ? (
            <div className="text-center py-12">
              <div className="text-mtg-text-muted">Loading...</div>
            </div>
          ) : errorMessage ? (
            <div className="text-center py-12">
              <div className="text-red-600">
                {errorMessage}
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
              onSelectGroup={handleSelectGroup}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-mtg-text-muted">Card Types view - Coming soon</div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
