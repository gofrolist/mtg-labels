/**
 * Utility functions for localStorage with error handling.
 * Gracefully handles cases where localStorage is disabled or unavailable.
 */

const STORAGE_PREFIX = 'mtg-label-'

/**
 * Get a value from localStorage.
 * Returns null if key doesn't exist or if localStorage is unavailable.
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (item === null) {
      return null
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.warn(`Failed to get localStorage item "${key}":`, error)
    return null
  }
}

/**
 * Set a value in localStorage.
 * Silently fails if localStorage is unavailable or quota is exceeded.
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded for key "${key}"`)
    } else {
      console.warn(`Failed to set localStorage item "${key}":`, error)
    }
    return false
  }
}

/**
 * Remove a value from localStorage.
 * Silently fails if localStorage is unavailable.
 */
export function removeStorageItem(key: string): boolean {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    return true
  } catch (error) {
    console.warn(`Failed to remove localStorage item "${key}":`, error)
    return false
  }
}

/**
 * Check if localStorage is available.
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}
