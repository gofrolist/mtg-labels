import { useId } from 'react'
import type { AlphabetSelection } from '../../types'
import { formatDividerTypeLabel, sortDividerTypeIds } from '../../utils/dividerTypes'
import { parseLetterSpec, resolveLetters } from '../../utils/letters'

/** The first selected set, previewed as it will print. */
export interface MatrixSampleSet {
  name: string
  code: string
  releasedAt?: string | null
}

interface MatrixBuilderProps {
  selectedSetCount: number
  sampleSet: MatrixSampleSet | null
  selectedTypeIds: string[]
  groupedTypes: Record<string, string[]>
  alphabet: AlphabetSelection
  dividersPerSet: number
  totalLabels: number
  onAlphabetChange: (value: AlphabetSelection) => void
  onGoToSets: () => void
  onGoToTypes: () => void
}

/** Mirror the backend's "April 2021" second-line date format. */
function formatReleaseDate(releasedAt: string | null | undefined): string {
  if (!releasedAt) return ''
  const parsed = new Date(`${releasedAt}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? releasedAt
    : parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Builds the label matrix: the sets picked in the Sets tab crossed with the
 * types picked in the Types tab and/or alphabet letters. Each combination
 * prints one label, so a set with two types and letters A-C yields six.
 *
 * Both item axes are owned by their own tab — this tab only summarizes them
 * and links back, so there is one place to change each selection.
 */
export function MatrixBuilder({
  selectedSetCount,
  sampleSet,
  selectedTypeIds,
  groupedTypes,
  alphabet,
  dividersPerSet,
  totalLabels,
  onAlphabetChange,
  onGoToSets,
  onGoToTypes,
}: MatrixBuilderProps) {
  const alphabetModeId = useId()
  const alphabetCustomId = useId()

  const letters = resolveLetters(alphabet)
  const customSpec = alphabet.mode === 'custom' ? parseLetterSpec(alphabet.customInput) : null
  const orderedTypeIds = sortDividerTypeIds(selectedTypeIds, groupedTypes)
  const sampleSetName = sampleSet?.name ?? 'Secrets of Strixhaven'
  const sampleTypeLine =
    orderedTypeIds.length > 0 ? formatDividerTypeLabel(orderedTypeIds[0]) : null
  const sampleCodeLine = sampleSet
    ? [sampleSet.code.toUpperCase(), formatReleaseDate(sampleSet.releasedAt)]
        .filter(Boolean)
        .join(' - ')
    : 'STX - April 2021'

  const axisButtonClasses =
    'flex items-center justify-between gap-2 bg-mtg-card-bg border border-mtg-border rounded-md px-3 py-2 text-sm text-mtg-text hover:bg-mtg-hover-bg focus-visible:ring-2 focus-visible:ring-mtg-accent'

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      <div className="rounded-lg border border-mtg-border bg-mtg-card-bg p-4">
        <h2 className="text-base font-medium text-mtg-text mb-1">Matrix</h2>
        <p className="text-sm text-mtg-text-muted mb-4">
          Every selected set is printed once per type and once per letter. Leave an axis empty to
          drop it from the matrix.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Sets axis — owned by the Sets tab, summarized here. */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-mtg-text">Sets</span>
            <button
              type="button"
              onClick={onGoToSets}
              aria-label="Edit the set selection in the Sets tab"
              className={axisButtonClasses}
            >
              <span className="truncate">
                {selectedSetCount === 0
                  ? 'None'
                  : selectedSetCount === 1
                    ? sampleSetName
                    : `${selectedSetCount} selected`}
              </span>
              <span className="text-xs text-mtg-text-muted shrink-0">Edit in Sets</span>
            </button>
          </div>

          {/* Types axis — owned by the Types tab, summarized here. */}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-mtg-text flex items-center gap-1">
              Types
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-mtg-text-muted/20 text-mtg-text-muted text-xs cursor-help"
                title="Print one label per color and card type for each selected set, e.g. White - Creature. Pick the types in the Types tab."
              >
                ?
              </span>
            </span>
            <button
              type="button"
              onClick={onGoToTypes}
              aria-label="Edit the type selection in the Types tab"
              className={axisButtonClasses}
            >
              <span className="truncate">
                {orderedTypeIds.length === 0
                  ? 'None'
                  : orderedTypeIds.length === 1
                    ? formatDividerTypeLabel(orderedTypeIds[0])
                    : `${orderedTypeIds.length} selected`}
              </span>
              <span className="text-xs text-mtg-text-muted shrink-0">Edit in Types</span>
            </button>
          </div>

          {/* Letters axis */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={alphabetModeId}
              className="text-sm text-mtg-text flex items-center gap-1"
            >
              Alphabet divider letters
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-mtg-text-muted/20 text-mtg-text-muted text-xs cursor-help"
                title="Print one label per letter for each selected set. Use Custom to choose letters and ranges, e.g. A-F, H, L-Z."
              >
                ?
              </span>
            </label>
            <select
              id={alphabetModeId}
              className="bg-mtg-card-bg border border-mtg-border rounded-md px-3 py-2 text-sm text-mtg-text focus-visible:ring-2 focus-visible:ring-mtg-accent"
              value={alphabet.mode}
              onChange={e =>
                onAlphabetChange({
                  ...alphabet,
                  mode: e.target.value as AlphabetSelection['mode'],
                })
              }
            >
              <option value="off">Off</option>
              <option value="all">All (A–Z)</option>
              <option value="custom">Custom…</option>
            </select>

            {alphabet.mode === 'custom' && (
              <div className="flex flex-col gap-1">
                <input
                  id={alphabetCustomId}
                  type="text"
                  aria-label="Custom divider letters"
                  placeholder="e.g. A-F, H, L-Z"
                  value={alphabet.customInput}
                  onChange={e => onAlphabetChange({ ...alphabet, customInput: e.target.value })}
                  className="bg-mtg-card-bg border border-mtg-border rounded-md px-3 py-2 text-sm text-mtg-text focus-visible:ring-2 focus-visible:ring-mtg-accent"
                />
                {alphabet.customInput.trim() === '' ? (
                  <span className="text-xs text-mtg-text-muted">
                    Enter letters and ranges, e.g. A-F, H, L-Z
                  </span>
                ) : customSpec?.ok ? (
                  <span className="text-xs text-mtg-text-muted">
                    {customSpec.letters.length} letter
                    {customSpec.letters.length === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="text-xs text-red-400">{customSpec?.message}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-mtg-text-muted mt-4">
          {selectedSetCount === 0 ? (
            <>Select at least one set in the Sets tab to print labels.</>
          ) : (
            <>
              {dividersPerSet} label{dividersPerSet === 1 ? '' : 's'} per set × {selectedSetCount}{' '}
              set{selectedSetCount === 1 ? '' : 's'} ={' '}
              <span className="text-mtg-text">{totalLabels}</span> labels
            </>
          )}
        </p>
      </div>

      {/* Label preview */}
      <div className="rounded-lg border border-mtg-border bg-mtg-card-bg p-4">
        <h3 className="text-sm font-medium text-mtg-text mb-3">Label preview</h3>
        <div className="rounded border border-mtg-border bg-white text-black px-3 py-2 flex items-start gap-2">
          {sampleTypeLine && <span className="text-lg leading-none shrink-0">◉</span>}
          <div className="min-w-0 flex-1">
            <p className="font-serif font-bold text-sm truncate">{sampleSetName}</p>
            <p className="text-xs truncate">{sampleTypeLine ?? sampleCodeLine}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {letters.length > 0 && (
              <span className="font-serif font-bold text-lg">{letters[0]}</span>
            )}
            <span className="text-lg leading-none">✦</span>
          </div>
        </div>
        <p className="text-xs text-mtg-text-muted mt-2">
          {sampleTypeLine
            ? 'The type replaces the set code and release date, and puts the color’s mana symbol on the left.'
            : 'Pick types in the Types tab to replace the set code and release date with a color and card type.'}
        </p>
      </div>
    </div>
  )
}
