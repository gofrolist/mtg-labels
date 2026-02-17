import { useState, useMemo } from 'react'
import { useApiSetsApiSetsGet } from './api/queries/default/default'
import { useSelection } from './hooks/useSelection'
import { groupSetsByType, filterSetsByQuery } from './utils/grouping'
import { SetList } from './components/SetList/SetList'
import { SearchBar } from './components/SearchBar/SearchBar'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'
import { PDFGenerator } from './components/PDFGenerator/PDFGenerator'
import { TemplateSelector } from './components/TemplateSelector/TemplateSelector'
import { PlaceholdersInput } from './components/PDFGenerator/PlaceholdersInput'
import { TemplateCustomizer } from './components/TemplateCustomizer/TemplateCustomizer'
import type { MTGSet } from './types'

function App() {
  const { data: setsResponse, isLoading, error } = useApiSetsApiSetsGet()
  const {
    selection,
    toggleSetSelection,
    setQuantity,
    setTemplate,
    setPlaceholders,
    selectAllSets,
    deselectAllSets,
    isAllSetsSelected,
    setCustomTemplate,
    setUseCustomTemplate,
  } = useSelection()

  const sets: MTGSet[] = useMemo(() => setsResponse?.data ?? [], [setsResponse?.data])

  const [searchQuery, setSearchQuery] = useState('')
  const [manualOpenGroups, setManualOpenGroups] = useState<Set<string> | null>(null)

  const filteredSets = useMemo(() => {
    return filterSetsByQuery(sets, searchQuery)
  }, [sets, searchQuery])

  const groupedSets = useMemo(() => {
    return groupSetsByType(filteredSets)
  }, [filteredSets])

  // Auto-expand groups containing selected sets
  const openGroups = useMemo(() => {
    if (manualOpenGroups !== null) return manualOpenGroups
    if (selection.selectedSetIds.length > 0) {
      const groupsToOpen = new Set<string>()
      for (const [groupName, groupSets] of Object.entries(groupedSets)) {
        if (groupSets.some((set) => selection.selectedSetIds.includes(set.id))) {
          groupsToOpen.add(groupName)
        }
      }
      return groupsToOpen
    }
    return new Set<string>()
  }, [manualOpenGroups, groupedSets, selection.selectedSetIds])

  const totalLabels = useMemo(() => {
    let labels = 0
    for (const setId of selection.selectedSetIds) {
      labels += selection.quantities[setId] || 1
    }
    return labels
  }, [selection.selectedSetIds, selection.quantities])

  const handleToggleGroup = (groupName: string) => {
    const next = new Set(openGroups)
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
      setIds.forEach(id => {
        if (selection.selectedSetIds.includes(id)) {
          toggleSetSelection(id)
        }
      })
    } else {
      setIds.forEach(id => {
        if (!selection.selectedSetIds.includes(id)) {
          toggleSetSelection(id)
        }
      })
    }
  }

  return (
    <div className="min-h-screen bg-mtg-bg text-mtg-text transition-colors">
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-mtg-nav-from to-mtg-nav-to text-white shadow-lg">
        <div className="container-fluid px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
            <a href="#" className="text-xl font-bold text-mtg-accent">
              MTG Labels
            </a>

            <div className="flex flex-wrap items-center gap-3 flex-1 justify-between">
              <div className="flex items-center gap-3">
                <PDFGenerator
                  selectedSetIds={selection.selectedSetIds}
                  templateId={selection.templateId}
                  placeholders={selection.placeholders}
                  customTemplate={selection.customTemplate}
                  useCustomTemplate={selection.useCustomTemplate}
                />
                <TemplateSelector
                  selectedTemplate={selection.templateId}
                  onTemplateChange={setTemplate}
                />
                {selection.selectedSetIds.length > 0 && (
                  <span className="text-sm text-mtg-accent font-medium">
                    {selection.selectedSetIds.length} sets selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {filteredSets.length > 0 && (
                  <button
                    onClick={handleSelectAllSets}
                    className="px-3 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors text-sm"
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

      <TemplateCustomizer
        customTemplate={selection.customTemplate}
        useCustomTemplate={selection.useCustomTemplate}
        templateId={selection.templateId}
        onCustomTemplateChange={setCustomTemplate}
        onUseCustomTemplateChange={setUseCustomTemplate}
      />

      <div className="container mt-4">
        <h1 className="mb-4 text-center">MTG Printable Label Generator</h1>

        <div className="flex flex-wrap items-center gap-3 mb-4 justify-center">
          <span className="px-3 py-2 text-sm text-mtg-text-muted">
            {totalLabels} labels
          </span>
          <PlaceholdersInput
            templateId={selection.templateId}
            placeholders={selection.placeholders}
            onPlaceholdersChange={setPlaceholders}
            customTemplate={selection.customTemplate}
            useCustomTemplate={selection.useCustomTemplate}
          />
        </div>

        <main>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-mtg-text-muted">Loading...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600">
                {(error as Error).message}
              </div>
            </div>
          ) : (
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
          )}
        </main>
      </div>
    </div>
  )
}

export default App
