import { useState, lazy, Suspense } from 'react'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { SearchBar } from '../SearchBar/SearchBar'
import { TemplateNavButton } from '../TemplateCustomizer/TemplateNavButton'
import { PDFGenerator } from '../PDFGenerator/PDFGenerator'

const DonateModal = lazy(() =>
  import('../DonateModal').then((m) => ({ default: m.DonateModal })),
)
import type { CustomTemplateDimensions } from '../../types'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  templateCustomizerOpen: boolean
  onTemplateToggle: () => void
  templateBadgeLabel?: string
  selectedSetIds: string[]
  quantities: Record<string, number>
  useCustomQuantity: boolean
  templateId: string | null
  placeholders: number
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
}

export function Header({
  searchQuery,
  onSearchChange,
  templateCustomizerOpen,
  onTemplateToggle,
  templateBadgeLabel,
  selectedSetIds,
  quantities,
  useCustomQuantity,
  templateId,
  placeholders,
  customTemplate,
  useCustomTemplate,
}: HeaderProps) {
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [showDonateModal, setShowDonateModal] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-mtg-nav-from to-mtg-nav-to text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 min-h-[40px]">
          <div className="flex items-center gap-2 min-h-[40px]">
            <a href="#" className="navbar-brand fw-bold text-xl text-mtg-accent">
              MTG Labels
            </a>
            <ThemeToggle />
            <div className="hidden min-[640px]:block">
              <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                onClear={() => onSearchChange('')}
                variant="nav"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 min-h-[40px]">
            <div className="hidden min-[880px]:block">
              <TemplateNavButton
                isOpen={templateCustomizerOpen}
                onToggle={onTemplateToggle}
                badgeLabel={templateBadgeLabel}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (navMenuOpen && templateCustomizerOpen) onTemplateToggle()
                setNavMenuOpen((o) => !o)
              }}
              className="min-[880px]:hidden h-9 w-9 flex items-center justify-center rounded border border-white/30 hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={navMenuOpen}
            >
              {navMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              ) : (
                <span className="flex flex-col gap-1">
                  <span className="block w-4 h-0.5 bg-current" />
                  <span className="block w-4 h-0.5 bg-current" />
                  <span className="block w-4 h-0.5 bg-current" />
                </span>
              )}
            </button>

            <PDFGenerator
              selectedSetIds={selectedSetIds}
              quantities={quantities}
              useCustomQuantity={useCustomQuantity}
              templateId={templateId}
              placeholders={placeholders}
              customTemplate={customTemplate}
              useCustomTemplate={useCustomTemplate}
              onSuccess={() => setShowDonateModal(true)}
            />
          </div>

          {/* Hamburger menu panel */}
          <div
            className="w-full min-[880px]:hidden grid transition-[grid-template-rows] duration-200 ease-out overflow-hidden"
            style={{ gridTemplateRows: navMenuOpen ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-2 py-2 border-t border-white/20 mt-1">
                <div className="min-[640px]:hidden w-full">
                  <SearchBar
                    value={searchQuery}
                    onChange={onSearchChange}
                    onClear={() => onSearchChange('')}
                    variant="nav"
                    className="w-full min-w-0"
                  />
                </div>
                <div className="w-full min-w-0 [&_button]:w-full [&_button]:justify-start">
                  <TemplateNavButton
                    isOpen={templateCustomizerOpen}
                    onToggle={onTemplateToggle}
                    badgeLabel={templateBadgeLabel}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {showDonateModal && (
        <Suspense fallback={null}>
          <DonateModal onClose={() => setShowDonateModal(false)} />
        </Suspense>
      )}
    </>
  )
}
