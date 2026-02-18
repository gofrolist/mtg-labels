import { useState, useMemo, useCallback } from 'react'
import type { MTGSet } from '../types'

export function useOpenGroups(
  searchQuery: string,
  groupedSets: Record<string, MTGSet[]>,
  selectedSetIds: string[],
) {
  const [manualOpenGroups, setManualOpenGroups] = useState<Set<string> | null>(null)

  const openGroups = useMemo(() => {
    if (searchQuery.trim()) {
      return new Set(Object.keys(groupedSets))
    }
    if (manualOpenGroups !== null) return manualOpenGroups
    if (selectedSetIds.length > 0) {
      const groupsToOpen = new Set<string>()
      for (const [groupName, groupSets] of Object.entries(groupedSets)) {
        if (groupSets.some((set) => selectedSetIds.includes(set.id))) {
          groupsToOpen.add(groupName)
        }
      }
      return groupsToOpen
    }
    return new Set<string>()
  }, [searchQuery, manualOpenGroups, groupedSets, selectedSetIds])

  const toggleGroup = useCallback(
    (groupName: string) => {
      setManualOpenGroups((prev) => {
        const base = prev ?? openGroups
        const next = new Set(base)
        if (next.has(groupName)) {
          next.delete(groupName)
        } else {
          next.add(groupName)
        }
        return next
      })
    },
    [openGroups],
  )

  return { openGroups, toggleGroup }
}
