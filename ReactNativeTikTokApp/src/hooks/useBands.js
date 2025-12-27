/**
 * useBands Hook - State management for user's bands
 *
 * Subscribes to user's bands in real-time and provides
 * methods for band operations.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToUserBands,
  getBand,
  updateBand as updateBandAPI,
} from '../services/bandsService'

/**
 * Hook to manage user's bands
 *
 * @param {string} userId - Current user's ID
 * @returns {Object} { bands, bandsLoading, refreshBands, getBandById, updateBand }
 */
export const useBands = (userId) => {
  const [bands, setBands] = useState([])
  const [bandsLoading, setBandsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setBands([])
      setBandsLoading(false)
      return
    }

    setBandsLoading(true)

    const unsubscribe = subscribeToUserBands(userId, (newBands) => {
      setBands(newBands)
      setBandsLoading(false)
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [userId])

  /**
   * Get a band by ID
   */
  const getBandById = useCallback(async (bandId) => {
    try {
      return await getBand(bandId)
    } catch (error) {
      console.error('[useBands] Error getting band:', error)
      return null
    }
  }, [])

  /**
   * Update band metadata
   */
  const updateBand = useCallback(async (bandId, updates) => {
    if (!userId) return null

    try {
      return await updateBandAPI(bandId, userId, updates)
    } catch (error) {
      console.error('[useBands] Error updating band:', error)
      throw error
    }
  }, [userId])

  /**
   * Manually refresh bands (for pull-to-refresh)
   */
  const refreshBands = useCallback(() => {
    // The subscription will automatically update
    // This is a placeholder for manual refresh logic if needed
    setBandsLoading(true)
    // Re-triggering the effect by setting loading will cause UI update
    setTimeout(() => setBandsLoading(false), 500)
  }, [])

  return {
    bands,
    bandsLoading,
    bandsCount: bands.length,
    refreshBands,
    getBandById,
    updateBand,
  }
}

export default useBands
