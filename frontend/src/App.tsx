import { useState, useMemo } from 'react'
import { useApiSetsApiSetsGet } from './api/queries/default/default'
import { useSelection } from './hooks/useSelection'
import { groupSetsByType, filterSetsByQuery } from './utils/grouping'
import { LABEL_TEMPLATES } from './constants/templates'
import { SetList } from './components/SetList/SetList'
import { SearchBar } from './components/SearchBar/SearchBar'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'
import { PDFGenerator } from './components/PDFGenerator/PDFGenerator'
import { TemplateCustomizer, TemplateCustomizerNavButton } from './components/TemplateCustomizer/TemplateCustomizer'
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
    setUseCustomQuantity,
  } = useSelection()

  const sets: MTGSet[] = useMemo(() => setsResponse?.data ?? [], [setsResponse?.data])

  const [searchQuery, setSearchQuery] = useState('')
  const [manualOpenGroups, setManualOpenGroups] = useState<Set<string> | null>(null)
  const [templateCustomizerOpen, setTemplateCustomizerOpen] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)

  const filteredSets = useMemo(() => {
    return filterSetsByQuery(sets, searchQuery)
  }, [sets, searchQuery])

  const groupedSets = useMemo(() => {
    return groupSetsByType(filteredSets)
  }, [filteredSets])

  // Auto-expand groups: when searching, expand all groups that contain matches; else expand groups with selected sets
  const openGroups = useMemo(() => {
    if (searchQuery.trim()) {
      return new Set(Object.keys(groupedSets))
    }
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
  }, [searchQuery, manualOpenGroups, groupedSets, selection.selectedSetIds])

  const totalLabels = useMemo(() => {
    const qty = selection.useCustomQuantity
    let labels = 0
    for (const setId of selection.selectedSetIds) {
      labels += qty ? (selection.quantities[setId] || 1) : 1
    }
    return labels
  }, [selection.selectedSetIds, selection.quantities, selection.useCustomQuantity])

  const labelsPerPage = useMemo(() => {
    if (selection.useCustomTemplate && selection.customTemplate) {
      return selection.customTemplate.columns * selection.customTemplate.rows
    }
    const t = LABEL_TEMPLATES[selection.templateId] || LABEL_TEMPLATES.avery5160
    return t.labels_per_page
  }, [selection.useCustomTemplate, selection.customTemplate, selection.templateId])

  const pageCount = useMemo(() => {
    const totalSlots = selection.placeholders + totalLabels
    return totalSlots > 0 ? Math.ceil(totalSlots / labelsPerPage) : 0
  }, [selection.placeholders, totalLabels, labelsPerPage])

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
    <div className="min-h-screen flex flex-col bg-mtg-bg text-mtg-text transition-colors">
      {/* Header — v0 style: logo + theme left, sets count + Generate PDF right */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-mtg-nav-from to-mtg-nav-to text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 min-h-[40px]">
          <div className="flex items-center gap-2 min-h-[40px]">
            <a href="#" className="navbar-brand fw-bold text-xl text-mtg-accent">
              MTG Labels
            </a>
            <ThemeToggle />
            {/* Search — visible when >= 640px; below that it moves to hamburger */}
            <div className="hidden min-[640px]:block">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                variant="nav"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 min-h-[40px]">
            {/* Template — visible when >= 880px; below that it moves to hamburger */}
            <div className="hidden min-[880px]:block">
              <TemplateCustomizerNavButton
                isOpen={templateCustomizerOpen}
                onToggle={() => setTemplateCustomizerOpen((o) => !o)}
                templateId={selection.templateId}
                useCustomTemplate={selection.useCustomTemplate}
              />
            </div>

            {/* Hamburger — visible when < 880px; closing also collapses TemplateCustomizer */}
            <button
              type="button"
              onClick={() => {
                if (navMenuOpen) setTemplateCustomizerOpen(false)
                setNavMenuOpen((o) => !o)
              }}
              className="min-[880px]:hidden h-9 w-9 flex items-center justify-center rounded border border-white/30 hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={navMenuOpen}
            >
              {navMenuOpen ? (
                <span className="text-lg">✕</span>
              ) : (
                <span className="flex flex-col gap-1">
                  <span className="block w-4 h-0.5 bg-current" />
                  <span className="block w-4 h-0.5 bg-current" />
                  <span className="block w-4 h-0.5 bg-current" />
                </span>
              )}
            </button>

            <PDFGenerator
              selectedSetIds={selection.selectedSetIds}
              quantities={selection.quantities}
              useCustomQuantity={selection.useCustomQuantity}
              templateId={selection.templateId}
              placeholders={selection.placeholders}
              customTemplate={selection.customTemplate}
              useCustomTemplate={selection.useCustomTemplate}
            />
          </div>

          {/* Hamburger menu panel — expand animation, Search first (when < 640px), then Template */}
          <div
            className="w-full min-[880px]:hidden grid transition-[grid-template-rows] duration-200 ease-out overflow-hidden"
            style={{ gridTemplateRows: navMenuOpen ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-2 py-2 border-t border-white/20 mt-1">
                <div className="min-[640px]:hidden w-full">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery('')}
                    variant="navFull"
                  />
                </div>
                <div className="w-full min-w-0 [&_button]:w-full [&_button]:justify-start">
                  <TemplateCustomizerNavButton
                    isOpen={templateCustomizerOpen}
                    onToggle={() => setTemplateCustomizerOpen((o) => !o)}
                    templateId={selection.templateId}
                    useCustomTemplate={selection.useCustomTemplate}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-4 flex-1">
        <TemplateCustomizer
          isOpen={templateCustomizerOpen}
          onToggle={() => setTemplateCustomizerOpen((o) => !o)}
          customTemplate={selection.customTemplate}
          useCustomTemplate={selection.useCustomTemplate}
          useCustomQuantity={selection.useCustomQuantity}
          templateId={selection.templateId}
          placeholders={selection.placeholders}
          onCustomTemplateChange={setCustomTemplate}
          onUseCustomTemplateChange={setUseCustomTemplate}
          onUseCustomQuantityChange={setUseCustomQuantity}
          onPlaceholdersChange={setPlaceholders}
          onTemplateChange={setTemplate}
        />
        {/* Sets section header — v0 style */}
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
            useCustomQuantity={selection.useCustomQuantity}
            onToggleSet={toggleSetSelection}
            onQuantityChange={(setId, quantity) => setQuantity(setId, quantity)}
            openGroups={openGroups}
            onToggleGroup={handleToggleGroup}
            onSelectGroup={handleSelectGroup}
          />
        )}
      </div>

      <footer className="py-4 border-t border-mtg-border bg-mtg-section-bg mt-auto">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="mb-2 text-sm text-mtg-text-muted leading-relaxed">
              MTG Printable Label Generator is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
            </p>
            <p className="mb-2 text-sm text-mtg-text-muted leading-relaxed">
              <a href="https://company.wizards.com/en/legal/fancontentpolicy" target="_blank" rel="noopener noreferrer" className="text-mtg-accent hover:underline">View the full Fan Content Policy</a>.
            </p>
            <p className="mb-0 text-sm text-mtg-text-muted leading-relaxed">
              It uses set information provided by <a href="https://scryfall.com/" target="_blank" rel="noopener noreferrer" className="text-mtg-accent hover:underline">Scryfall</a> in accordance with their <a href="https://scryfall.com/docs/api#use-of-scryfall-data" target="_blank" rel="noopener noreferrer" className="text-mtg-accent hover:underline">guidelines</a>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
