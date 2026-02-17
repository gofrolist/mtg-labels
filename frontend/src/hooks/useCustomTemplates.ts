import { useState, useCallback } from 'react'
import type { CustomTemplateDimensions, SavedCustomTemplate } from '../types'
import { getStorageItem, setStorageItem } from '../utils/localStorage'

const STORAGE_KEY = 'custom-templates'

export function useCustomTemplates() {
  const [templates, setTemplates] = useState<SavedCustomTemplate[]>(() => {
    return getStorageItem<SavedCustomTemplate[]>(STORAGE_KEY) ?? []
  })

  const persist = (updated: SavedCustomTemplate[]) => {
    setTemplates(updated)
    setStorageItem(STORAGE_KEY, updated)
  }

  const saveTemplate = useCallback(
    (name: string, template: CustomTemplateDimensions) => {
      const newTemplate: SavedCustomTemplate = {
        id: crypto.randomUUID(),
        name,
        template,
      }
      persist([...templates, newTemplate])
      return newTemplate
    },
    [templates],
  )

  const deleteTemplate = useCallback(
    (id: string) => {
      persist(templates.filter(t => t.id !== id))
    },
    [templates],
  )

  const loadTemplate = useCallback(
    (id: string): CustomTemplateDimensions | null => {
      const found = templates.find(t => t.id === id)
      return found?.template ?? null
    },
    [templates],
  )

  return { templates, saveTemplate, deleteTemplate, loadTemplate }
}
