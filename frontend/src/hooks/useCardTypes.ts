import { useState, useEffect } from 'react'
import type { CardTypesByColor } from '../types'
import { fetchCardTypes } from '../services/api'

/**
 * Custom hook for fetching and managing card types organized by color.
 */
export function useCardTypes() {
  const [cardTypes, setCardTypes] = useState<CardTypesByColor>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCardTypes() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchCardTypes()

        if (!cancelled) {
          setCardTypes(data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load card types')
          setLoading(false)
        }
      }
    }

    loadCardTypes()

    return () => {
      cancelled = true
    }
  }, [])

  return { cardTypes, loading, error, refetch: () => {
    setLoading(true)
    setError(null)
    fetchCardTypes()
      .then((data) => {
        setCardTypes(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load card types')
        setLoading(false)
      })
  } }
}
