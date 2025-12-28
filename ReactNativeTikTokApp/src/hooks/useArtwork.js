/**
 * useArtwork Hook - State management for user's artwork collection
 *
 * Subscribes to user's artwork in real-time and provides
 * methods for artwork CRUD operations.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToUserArtwork,
  getArtwork,
  saveArtwork,
  deleteArtwork,
  applyArtworkToSong,
  applyArtworkAsProfilePicture,
  applyArtworkToBand,
  updateArtwork,
} from '../services/artworkService'

/**
 * Hook to manage user's artwork collection
 *
 * @param {string} userId - Current user's ID
 * @param {Object} author - Author info for new artwork (stageName, profilePictureURL)
 * @returns {Object} Artwork state and methods
 */
export const useArtwork = (userId, author = null) => {
  const [artwork, setArtwork] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setArtwork([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeToUserArtwork(userId, (fetchedArtwork) => {
        setArtwork(fetchedArtwork)
        setLoading(false)
        setError(null)
      })

      return () => {
        unsubscribe && unsubscribe()
      }
    } catch (err) {
      console.error('[useArtwork] Subscription error:', err)
      setError(err.message || 'Failed to load artwork')
      setLoading(false)
    }
  }, [userId])

  /**
   * Save new artwork to the collection
   */
  const handleSaveArtwork = useCallback(
    async (artworkData) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      setOperationLoading(true)
      setError(null)

      try {
        const result = await saveArtwork({
          ...artworkData,
          userId,
          author: author || {
            id: userId,
            stageName: 'Unknown',
            profilePictureURL: null,
          },
        })
        if (!result.success) {
          setError(result.error)
        }
        return result
      } catch (err) {
        console.error('[useArtwork] Error saving artwork:', err)
        setError(err.message)
        return { success: false, error: err.message }
      } finally {
        setOperationLoading(false)
      }
    },
    [userId, author]
  )

  /**
   * Delete artwork from collection
   */
  const handleDeleteArtwork = useCallback(
    async (artworkId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await deleteArtwork(artworkId, userId)
        return result
      } catch (error) {
        console.error('[useArtwork] Error deleting artwork:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Apply artwork as a song's cover
   */
  const handleApplyToSong = useCallback(
    async (artworkId, songId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await applyArtworkToSong(artworkId, songId, userId)
        return result
      } catch (error) {
        console.error('[useArtwork] Error applying artwork to song:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Apply artwork as profile picture
   */
  const handleApplyAsProfile = useCallback(
    async (artworkId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await applyArtworkAsProfilePicture(artworkId, userId)
        return result
      } catch (error) {
        console.error('[useArtwork] Error applying artwork as profile:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Apply artwork to a band/channel
   */
  const handleApplyToBand = useCallback(
    async (artworkId, bandId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await applyArtworkToBand(artworkId, bandId, userId)
        return result
      } catch (error) {
        console.error('[useArtwork] Error applying artwork to band:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Update artwork metadata (tags, visibility)
   */
  const handleUpdateArtwork = useCallback(
    async (artworkId, updates) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await updateArtwork(artworkId, userId, updates)
        return result
      } catch (error) {
        console.error('[useArtwork] Error updating artwork:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Get filtered artwork by source
   */
  const getArtworkBySource = useCallback(
    (source) => {
      return artwork.filter((item) => item.source === source)
    },
    [artwork]
  )

  return {
    artwork,
    artworkLoading: loading,
    artworkError: error,
    operationLoading,
    artworkCount: artwork.length,
    generatedArtwork: artwork.filter((a) => a.source === 'generated'),
    stockArtwork: artwork.filter((a) => a.source === 'stock'),
    saveArtwork: handleSaveArtwork,
    deleteArtwork: handleDeleteArtwork,
    applyToSong: handleApplyToSong,
    applyAsProfile: handleApplyAsProfile,
    applyToBand: handleApplyToBand,
    updateArtwork: handleUpdateArtwork,
    getArtworkBySource,
    clearError: () => setError(null),
  }
}

/**
 * Hook to get a single artwork by ID with real-time updates
 *
 * @param {string} artworkId - Artwork document ID
 * @returns {Object} { artwork, loading, error, refetch }
 */
export const useArtworkDetail = (artworkId) => {
  const [artworkDetail, setArtworkDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!artworkId) {
      setArtworkDetail(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Import db directly for subscription
    const { db } = require('../core/firebase/config')

    // Subscribe to real-time updates
    const unsubscribe = db
      .collection('artwork')
      .doc(artworkId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setArtworkDetail({ id: doc.id, ...doc.data() })
            setError(null)
          } else {
            setError('Artwork not found')
            setArtworkDetail(null)
          }
          setLoading(false)
        },
        (err) => {
          console.error('[useArtworkDetail] Subscription error:', err)
          setError(err.message)
          setLoading(false)
        }
      )

    return () => unsubscribe()
  }, [artworkId])

  // Manual refetch function (for backwards compatibility)
  const refetch = async () => {
    if (!artworkId) return
    const result = await getArtwork(artworkId)
    if (result.success) {
      setArtworkDetail(result.artwork)
    }
  }

  return {
    artwork: artworkDetail,
    artworkLoading: loading,
    artworkError: error,
    refetch,
  }
}

export default useArtwork
