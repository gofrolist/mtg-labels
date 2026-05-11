import { useId, useMemo } from 'react'
import type { MTGSet, SetFilterPreferences } from '../../types'
import { KNOWN_SET_TYPES, getSetTypeMeta } from '../../constants/setTypes'
import { DEFAULT_IGNORED_SET_CODES } from '../../constants/setFilterDefaults'

interface SetFilterCustomizerProps {
  isOpen: boolean
  preferences: SetFilterPreferences
  allSets: MTGSet[]
  onActiveSetTypesChange: (types: string[]) => void
  onIgnoredSetCodesChange: (codes: string[]) => void
  onMinimumSetSizeChange: (size: number) => void
  onReset: () => void
}

const SIZE_INPUT_MIN = 0
const SIZE_INPUT_MAX = 1000

export function SetFilterCustomizer({
  isOpen,
  preferences,
  allSets,
  onActiveSetTypesChange,
  onIgnoredSetCodesChange,
  onMinimumSetSizeChange,
  onReset,
}: SetFilterCustomizerProps) {
  const minSizeId = useId()

  // Union of known set types and any set_type observed in the data.
  const setTypeKeys = useMemo(() => {
    const keys = new Set<string>(KNOWN_SET_TYPES.map((t) => t.key))
    for (const s of allSets) keys.add(s.set_type)
    return [...keys].sort()
  }, [allSets])

  // Map of set code → set, for resolving ignored-set names.
  const setByCode = useMemo(() => {
    const map: Record<string, MTGSet> = {}
    for (const s of allSets) map[s.code.toLowerCase()] = s
    return map
  }, [allSets])

  // Union of default-ignored codes and any user-added codes already in prefs.
  const ignoredCodeRows = useMemo(() => {
    const codes = new Set<string>(DEFAULT_IGNORED_SET_CODES)
    for (const c of preferences.ignoredSetCodes) codes.add(c)
    return [...codes].sort()
  }, [preferences.ignoredSetCodes])

  const activeTypeSet = useMemo(
    () => new Set(preferences.activeSetTypes),
    [preferences.activeSetTypes],
  )
  const ignoredCodeSet = useMemo(
    () => new Set(preferences.ignoredSetCodes.map((c) => c.toLowerCase())),
    [preferences.ignoredSetCodes],
  )

  const toggleSetType = (key: string) => {
    if (activeTypeSet.has(key)) {
      onActiveSetTypesChange(preferences.activeSetTypes.filter((t) => t !== key))
    } else {
      onActiveSetTypesChange([...preferences.activeSetTypes, key])
    }
  }

  const toggleIgnoredCode = (code: string) => {
    const lower = code.toLowerCase()
    if (ignoredCodeSet.has(lower)) {
      onIgnoredSetCodesChange(
        preferences.ignoredSetCodes.filter((c) => c.toLowerCase() !== lower),
      )
    } else {
      onIgnoredSetCodesChange([...preferences.ignoredSetCodes, lower])
    }
  }

  return (
    <div
      className="overflow-hidden grid transition-[grid-template-rows] duration-200 ease-out bg-mtg-card-bg border-b border-mtg-border"
      style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* Set Types */}
            <section className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
              <h3 className="font-semibold text-mtg-text mb-3 text-sm">Set Types</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                {setTypeKeys.map((key) => {
                  const meta = getSetTypeMeta(key)
                  const checked = activeTypeSet.has(key)
                  const inputId = `set-type-${key}`
                  return (
                    <li key={key} className="col">
                      <div className="flex items-center hover:bg-mtg-hover-bg rounded px-1 py-0.5 transition-colors">
                        <input
                          type="checkbox"
                          id={inputId}
                          checked={checked}
                          onChange={() => toggleSetType(key)}
                          className="w-4 h-4 mr-2 accent-mtg-accent rounded focus:ring-2 focus:ring-mtg-accent cursor-pointer flex-shrink-0"
                        />
                        <label
                          htmlFor={inputId}
                          className="flex items-center cursor-pointer flex-1 min-w-0"
                          title={meta.description || meta.label}
                        >
                          <span className="truncate text-base">{meta.label}</span>
                        </label>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Ignored Sets */}
            <section className="rounded-lg border border-mtg-border bg-mtg-section-bg p-4">
              <h3 className="font-semibold text-mtg-text mb-3 text-sm">Ignored Sets</h3>
              <p className="text-xs text-mtg-text-muted mb-3">
                Uncheck a row to include that set in the list.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                {ignoredCodeRows.map((code) => {
                  const checked = ignoredCodeSet.has(code.toLowerCase())
                  const set = setByCode[code.toLowerCase()]
                  const name = set ? set.name : code.toUpperCase()
                  const inputId = `ignored-set-${code}`
                  return (
                    <li key={code} className="col">
                      <div className="flex items-center hover:bg-mtg-hover-bg rounded px-1 py-0.5 transition-colors">
                        <input
                          type="checkbox"
                          id={inputId}
                          checked={checked}
                          onChange={() => toggleIgnoredCode(code)}
                          className="w-4 h-4 mr-2 accent-mtg-accent rounded focus:ring-2 focus:ring-mtg-accent cursor-pointer flex-shrink-0"
                        />
                        <label
                          htmlFor={inputId}
                          className="flex items-center cursor-pointer flex-1 min-w-0"
                          title={`${name} (${code})`}
                        >
                          <span className="truncate text-base">{name}</span>
                        </label>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          {/* Minimum Set Size */}
          <div className="mt-4 rounded-lg border border-mtg-border bg-mtg-section-bg p-4 max-w-md">
            <label
              htmlFor={minSizeId}
              className="block font-semibold text-mtg-text mb-2 text-sm"
            >
              Minimum set size
            </label>
            <p className="text-xs text-mtg-text-muted mb-2">
              Hide sets with fewer cards than this.
            </p>
            <input
              id={minSizeId}
              type="number"
              min={SIZE_INPUT_MIN}
              max={SIZE_INPUT_MAX}
              value={preferences.minimumSetSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (Number.isNaN(v)) return
                const clamped = Math.max(SIZE_INPUT_MIN, Math.min(SIZE_INPUT_MAX, v))
                onMinimumSetSizeChange(clamped)
              }}
              aria-label="Minimum set size"
              className="h-9 w-32 px-3 border border-mtg-border rounded-lg bg-mtg-input-bg text-mtg-text text-sm"
            />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={onReset}
              className="h-9 px-3 py-0 flex items-center text-sm border border-mtg-border rounded hover:bg-mtg-hover-bg transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
