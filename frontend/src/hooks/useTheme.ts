import { useState, useEffect } from 'react'
import type { ThemePreference } from '../types'
import { getStorageItem, setStorageItem, isStorageAvailable } from '../utils/localStorage'

const THEME_STORAGE_KEY = 'theme'

/**
 * Custom hook for theme management with localStorage persistence.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    // Try to get saved theme from localStorage
    if (isStorageAvailable()) {
      const saved = getStorageItem<ThemePreference>(THEME_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') {
        return saved
      }
    }

    // Fallback to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }

    return 'light'
  })

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Persist to localStorage
    if (isStorageAvailable()) {
      setStorageItem(THEME_STORAGE_KEY, theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme, setTheme }
}
