import { useMemo } from 'react'
import type { MTGSet } from '../../types'
import { AccordionGroup } from '../AccordionGroup/AccordionGroup'
import { SetItem } from '../SetItem/SetItem'

interface SetListProps {
  groupedSets: Record<string, MTGSet[]>
  selectedSetIds: string[]
  quantities: Record<string, number>
  useCustomQuantity: boolean
  onToggleSet: (setId: string) => void
  onQuantityChange: (setId: string, quantity: number) => void
  openGroups?: Set<string>
  onToggleGroup?: (groupName: string) => void
  onSelectGroup?: (groupName: string, setIds: string[]) => void
  setIconsMap?: Record<string, string>
}

export function SetList({
  groupedSets,
  selectedSetIds,
  quantities,
  useCustomQuantity,
  onToggleSet,
  onQuantityChange,
  openGroups = new Set(),
  onToggleGroup = () => {},
  onSelectGroup,
  setIconsMap,
}: SetListProps) {
  const selectedSet = useMemo(() => new Set(selectedSetIds), [selectedSetIds])

  return (
    <div>
      {Object.entries(groupedSets).map(([groupName, sets]) => (
        <div key={groupName} id={`accordion-${groupName}`} className="mb-2">
          <AccordionGroup
            title={groupName}
            isOpen={openGroups.has(groupName)}
            onToggle={() => onToggleGroup(groupName)}
            onSelectGroup={onSelectGroup ? () => {
              const setIds = sets.map(s => s.id)
              onSelectGroup(groupName, setIds)
            } : undefined}
            isGroupSelected={sets.length > 0 && sets.every(s => selectedSet.has(s.id))}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {sets.map((set) => (
                <div key={set.id} className="col">
                  <SetItem
                    set={set}
                    isSelected={selectedSet.has(set.id)}
                    quantity={quantities[set.id] || 1}
                    showQuantityInput={useCustomQuantity}
                    onToggle={() => onToggleSet(set.id)}
                    onQuantityChange={(quantity) => onQuantityChange(set.id, quantity)}
                    iconSvg={setIconsMap?.[set.id]}
                    iconsLoaded={setIconsMap !== undefined}
                  />
                </div>
              ))}
            </div>
          </AccordionGroup>
        </div>
      ))}
    </div>
  )
}
