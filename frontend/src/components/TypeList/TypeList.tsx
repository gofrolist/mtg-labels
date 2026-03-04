import { useMemo } from 'react'
import { AccordionGroup } from '../AccordionGroup/AccordionGroup'
import { TypeItem } from '../TypeItem/TypeItem'

interface TypeListProps {
  groupedTypes: Record<string, string[]> // color -> types
  selectedTypeIds: string[] // "color:type" format
  quantities: Record<string, number>
  useCustomQuantity: boolean
  onToggleType: (typeId: string) => void
  onQuantityChange: (typeId: string, quantity: number) => void
  openGroups?: Set<string>
  onToggleGroup?: (groupName: string) => void
  onSelectGroup?: (groupName: string, typeIds: string[]) => void
}

export function TypeList({
  groupedTypes,
  selectedTypeIds,
  quantities,
  useCustomQuantity,
  onToggleType,
  onQuantityChange,
  openGroups = new Set(),
  onToggleGroup = () => {},
  onSelectGroup,
}: TypeListProps) {
  const selectedSet = useMemo(() => new Set(selectedTypeIds), [selectedTypeIds])

  // Convert color:types to grouped structure with IDs
  const groupsWithIds = useMemo(() => {
    return Object.entries(groupedTypes).map(([color, types]) => ({
      color,
      types: types.map((type) => ({
        id: `${color}:${type}`,
        name: type,
      })),
    }))
  }, [groupedTypes])

  return (
    <div>
      {groupsWithIds.map(({ color, types }) => (
        <div key={color} id={`accordion-${color}`} className="mb-2">
          <AccordionGroup
            title={color}
            isOpen={openGroups.has(color)}
            onToggle={() => onToggleGroup(color)}
            onSelectGroup={
              onSelectGroup
                ? () => {
                    const typeIds = types.map((t) => t.id)
                    onSelectGroup(color, typeIds)
                  }
                : undefined
            }
            isGroupSelected={types.length > 0 && types.every((t) => selectedSet.has(t.id))}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {types.map((type) => (
                <div key={type.id} className="col">
                  <TypeItem
                    typeId={type.id}
                    typeName={type.name}
                    isSelected={selectedSet.has(type.id)}
                    quantity={quantities[type.id] || 1}
                    showQuantityInput={useCustomQuantity}
                    onToggle={() => onToggleType(type.id)}
                    onQuantityChange={(quantity) => onQuantityChange(type.id, quantity)}
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
