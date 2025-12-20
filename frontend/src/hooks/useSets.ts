import { useState, useEffect } from 'react'
import type { MTGSet } from '../types'
import { fetchSets } from '../services/api'

/**
 * Custom hook for fetching and managing MTG sets.
 */
export function useSets() {
  const [sets, setSets] = useState<MTGSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSets() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchSets()

        if (!cancelled) {
          setSets(data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sets')
          setLoading(false)
        }
      }
    }

    loadSets()

    return () => {
      cancelled = true
    }
  }, [])

  return { sets, loading, error, refetch: () => {
    setLoading(true)
    setError(null)
    fetchSets()
      .then((data) => {
        setSets(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load sets')
        setLoading(false)
      })
  } }
}
