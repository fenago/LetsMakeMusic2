/**
 * useLyrics Hook - State management for user's lyrics collection
 *
 * Subscribes to user's lyrics in real-time and provides
 * methods for lyrics CRUD operations and generation.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToUserLyrics,
  getLyrics,
  saveLyrics,
  saveLyricsVariations,
  updateLyrics,
  deleteLyrics,
  markLyricsUsedInSong,
  toggleLyricsFavorite,
} from '../services/lyricsService'
import { generateLyrics, pollForLyricsCompletion } from '../services/sunoApi'

/**
 * Hook to manage user's lyrics collection
 *
 * @param {string} userId - Current user's ID
 * @returns {Object} Lyrics state and methods
 */
export const useLyrics = (userId) => {
  const [lyrics, setLyrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(null)

  useEffect(() => {
    if (!userId) {
      setLyrics([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[useLyrics] Setting up subscription for userId:', userId)
      const unsubscribe = subscribeToUserLyrics(userId, (fetchedLyrics) => {
        console.log('[useLyrics] Received', fetchedLyrics.length, 'lyrics from subscription')
        setLyrics(fetchedLyrics)
        setLoading(false)
        setError(null)
      })

      return () => {
        unsubscribe && unsubscribe()
      }
    } catch (err) {
      console.error('[useLyrics] Subscription error:', err)
      setError(err.message || 'Failed to load lyrics')
      setLoading(false)
    }
  }, [userId])

  /**
   * Generate new lyrics using the Suno API
   *
   * @param {string} prompt - User's prompt for lyrics generation (max 200 words)
   * @returns {Promise<Object>} Result with generated lyrics
   */
  const handleGenerateLyrics = useCallback(
    async (prompt) => {
      if (!userId) return { success: false, error: 'Not logged in' }
      if (!prompt || prompt.trim().length === 0) {
        return { success: false, error: 'Please enter a prompt' }
      }

      setOperationLoading(true)
      setError(null)
      setGenerationProgress({ stage: 'starting', message: 'Starting lyrics generation...' })

      try {
        // Start the generation
        const startResult = await generateLyrics(prompt)
        if (!startResult.success) {
          throw new Error(startResult.error || 'Failed to start lyrics generation')
        }

        setGenerationProgress({ stage: 'generating', message: 'AI is writing your lyrics...' })

        // Poll for completion
        const result = await pollForLyricsCompletion(
          startResult.taskId,
          24, // max attempts
          5000, // 5 second interval
          (progress) => {
            setGenerationProgress({
              stage: 'generating',
              message: `Generating lyrics... (attempt ${progress.attempt}/${progress.maxAttempts})`,
            })
          }
        )

        if (result.status === 'error') {
          throw new Error(result.error || 'Lyrics generation failed')
        }

        setGenerationProgress({ stage: 'saving', message: 'Saving your lyrics...' })

        console.log('[useLyrics] Saving lyrics for userId:', userId)
        console.log('[useLyrics] Lyrics to save:', result.lyrics?.length, 'items')

        // Save the lyrics variations to Firestore
        const saveResult = await saveLyricsVariations(
          userId,
          prompt,
          startResult.taskId,
          result.lyrics
        )

        console.log('[useLyrics] Save result:', saveResult)

        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save lyrics')
        }

        setGenerationProgress(null)

        return {
          success: true,
          lyrics: result.lyrics,
          lyricsIds: saveResult.lyricsIds,
        }
      } catch (err) {
        console.error('[useLyrics] Error generating lyrics:', err)
        setError(err.message)
        setGenerationProgress(null)
        return { success: false, error: err.message }
      } finally {
        setOperationLoading(false)
      }
    },
    [userId]
  )

  /**
   * Save manually created lyrics
   */
  const handleSaveLyrics = useCallback(
    async (lyricsData) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      setOperationLoading(true)
      setError(null)

      try {
        const result = await saveLyrics({
          ...lyricsData,
          userId,
        })
        if (!result.success) {
          setError(result.error)
        }
        return result
      } catch (err) {
        console.error('[useLyrics] Error saving lyrics:', err)
        setError(err.message)
        return { success: false, error: err.message }
      } finally {
        setOperationLoading(false)
      }
    },
    [userId]
  )

  /**
   * Update lyrics (title, text, tags)
   */
  const handleUpdateLyrics = useCallback(
    async (lyricsId, updates) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await updateLyrics(lyricsId, userId, updates)
        return result
      } catch (error) {
        console.error('[useLyrics] Error updating lyrics:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Delete lyrics from collection
   */
  const handleDeleteLyrics = useCallback(
    async (lyricsId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await deleteLyrics(lyricsId, userId)
        return result
      } catch (error) {
        console.error('[useLyrics] Error deleting lyrics:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Mark lyrics as used in a song
   */
  const handleMarkUsedInSong = useCallback(async (lyricsId, songId) => {
    try {
      const result = await markLyricsUsedInSong(lyricsId, songId)
      return result
    } catch (error) {
      console.error('[useLyrics] Error marking lyrics used:', error)
      return { success: false, error: error.message }
    }
  }, [])

  /**
   * Toggle favorite status
   */
  const handleToggleFavorite = useCallback(
    async (lyricsId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await toggleLyricsFavorite(lyricsId, userId)
        return result
      } catch (error) {
        console.error('[useLyrics] Error toggling favorite:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Get lyrics by ID from local state
   */
  const getLyricsById = useCallback(
    (lyricsId) => {
      return lyrics.find((item) => item.id === lyricsId)
    },
    [lyrics]
  )

  return {
    lyrics,
    lyricsLoading: loading,
    lyricsError: error,
    operationLoading,
    generationProgress,
    lyricsCount: lyrics.length,
    favoriteLyrics: lyrics.filter((l) => l.isFavorite),
    editedLyrics: lyrics.filter((l) => l.isEdited),
    generateLyrics: handleGenerateLyrics,
    saveLyrics: handleSaveLyrics,
    updateLyrics: handleUpdateLyrics,
    deleteLyrics: handleDeleteLyrics,
    markUsedInSong: handleMarkUsedInSong,
    toggleFavorite: handleToggleFavorite,
    getLyricsById,
    clearError: () => setError(null),
    cancelGeneration: () => setGenerationProgress(null),
  }
}

/**
 * Hook to get a single lyrics document by ID with real-time updates
 *
 * @param {string} lyricsId - Lyrics document ID
 * @returns {Object} { lyrics, loading, error, refetch }
 */
export const useLyricsDetail = (lyricsId) => {
  const [lyricsDetail, setLyricsDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!lyricsId) {
      setLyricsDetail(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Import db directly for subscription
    const { db } = require('../core/firebase/config')

    // Subscribe to real-time updates
    const unsubscribe = db
      .collection('lyrics')
      .doc(lyricsId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setLyricsDetail({ id: doc.id, ...doc.data() })
            setError(null)
          } else {
            setError('Lyrics not found')
            setLyricsDetail(null)
          }
          setLoading(false)
        },
        (err) => {
          console.error('[useLyricsDetail] Subscription error:', err)
          setError(err.message)
          setLoading(false)
        }
      )

    return () => unsubscribe()
  }, [lyricsId])

  // Manual refetch function
  const refetch = async () => {
    if (!lyricsId) return
    const result = await getLyrics(lyricsId)
    if (result.success) {
      setLyricsDetail(result.lyrics)
    }
  }

  return {
    lyrics: lyricsDetail,
    lyricsLoading: loading,
    lyricsError: error,
    refetch,
  }
}

export default useLyrics
