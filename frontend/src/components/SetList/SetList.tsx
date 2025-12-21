import type { MTGSet } from '../../types'
import { AccordionGroup } from '../AccordionGroup/AccordionGroup'
import { SetItem } from '../SetItem/SetItem'

interface SetListProps {
  groupedSets: Record<string, MTGSet[]>
  selectedSetIds: string[]
  quantities: Record<string, number>
  onToggleSet: (setId: string) => void
  onQuantityChange: (setId: string, quantity: number) => void
  openGroups?: Set<string>
  onToggleGroup?: (groupName: string) => void
}

export function SetList({
  groupedSets,
  selectedSetIds,
  quantities,
  onToggleSet,
  onQuantityChange,
  openGroups = new Set(),
  onToggleGroup = () => {},
}: SetListProps) {
  return (
    <div className="space-y-2">
      {Object.entries(groupedSets).map(([groupName, sets]) => (
        <AccordionGroup
          key={groupName}
          title={groupName}
          isOpen={openGroups.has(groupName)}
          onToggle={() => onToggleGroup(groupName)}
        >
          <div className="space-y-1">
            {sets.map((set) => (
              <SetItem
                key={set.id}
                set={set}
                isSelected={selectedSetIds.includes(set.id)}
                quantity={quantities[set.id] || 1}
                onToggle={() => onToggleSet(set.id)}
                onQuantityChange={(quantity) => onQuantityChange(set.id, quantity)}
              />
            ))}
          </div>
        </AccordionGroup>
      ))}
    </div>
  )
}
