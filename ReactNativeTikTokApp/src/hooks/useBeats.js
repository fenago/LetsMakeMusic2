/**
 * useBeats Hook - State management for user's beats (instrumentals) collection
 *
 * Subscribes to user's beats in real-time and provides
 * methods for beats CRUD operations and generation.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToUserBeats,
  getBeat,
  saveBeat,
  saveBeatsVariations,
  updateBeat,
  deleteBeat,
  markBeatUsedInSong,
  toggleBeatFavorite,
} from '../services/beatsService'
import { generateSongSimple, pollForCompletion, MODEL_VERSIONS } from '../services/sunoApi'

/**
 * Hook to manage user's beats collection
 *
 * @param {string} userId - Current user's ID
 * @returns {Object} Beats state and methods
 */
export const useBeats = (userId) => {
  const [beats, setBeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [operationLoading, setOperationLoading] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(null)

  useEffect(() => {
    if (!userId) {
      setBeats([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[useBeats] Setting up subscription for userId:', userId)
      const unsubscribe = subscribeToUserBeats(userId, (fetchedBeats) => {
        console.log('[useBeats] Received', fetchedBeats.length, 'beats from subscription')
        setBeats(fetchedBeats)
        setLoading(false)
        setError(null)
      })

      return () => {
        unsubscribe && unsubscribe()
      }
    } catch (err) {
      console.error('[useBeats] Subscription error:', err)
      setError(err.message || 'Failed to load beats')
      setLoading(false)
    }
  }, [userId])

  /**
   * Generate new beat/instrumental using the Suno API
   *
   * @param {string} prompt - User's prompt for beat generation
   * @param {string} model - Suno model version (V5, V4_5PLUS, etc.)
   * @param {object} advancedOptions - Optional advanced generation parameters
   * @returns {Promise<Object>} Result with generated beat
   */
  const handleGenerateBeat = useCallback(
    async (prompt, model = 'V5', advancedOptions = {}) => {
      if (!userId) return { success: false, error: 'Not logged in' }
      if (!prompt || prompt.trim().length === 0) {
        return { success: false, error: 'Please enter a prompt' }
      }

      setOperationLoading(true)
      setError(null)
      setGenerationProgress({ stage: 'starting', message: 'Starting beat generation...' })

      try {
        // Start the generation with instrumental: true
        const startResult = await generateSongSimple(
          prompt.trim(),
          true, // instrumental = true for beats
          model,
          advancedOptions
        )

        if (!startResult.success) {
          throw new Error(startResult.error || 'Failed to start beat generation')
        }
        if (!startResult.taskId) {
          throw new Error('No task ID returned from beat generation')
        }

        setGenerationProgress({ stage: 'generating', message: 'AI is creating your beat...' })

        // Poll for completion (beats take ~2-4 minutes)
        const result = await pollForCompletion(
          startResult.taskId,
          60, // max attempts (5 mins)
          5000, // 5 second interval
          (progress) => {
            const elapsedMins = Math.floor(progress.elapsedSeconds / 60)
            const elapsedSecs = progress.elapsedSeconds % 60
            setGenerationProgress({
              stage: 'generating',
              message: `Creating beat... ${elapsedMins}:${elapsedSecs.toString().padStart(2, '0')}`,
              attempt: progress.attempt,
              maxAttempts: progress.maxAttempts,
            })
          }
        )

        if (result.status === 'error') {
          throw new Error(result.error || 'Beat generation failed')
        }

        setGenerationProgress({ stage: 'saving', message: 'Saving your beat...' })

        console.log('[useBeats] Saving beats for userId:', userId)
        console.log('[useBeats] Beats to save:', result.songs?.length, 'items')

        // Save the beat variations to Firestore
        const saveResult = await saveBeatsVariations(
          userId,
          prompt,
          startResult.taskId,
          result.songs // Suno returns songs array even for instrumentals
        )

        console.log('[useBeats] Save result:', saveResult)

        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save beat')
        }

        setGenerationProgress(null)

        return {
          success: true,
          beats: result.songs,
          beatIds: saveResult.beatIds,
        }
      } catch (err) {
        console.error('[useBeats] Error generating beat:', err)
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
   * Save manually created beat
   */
  const handleSaveBeat = useCallback(
    async (beatData) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      setOperationLoading(true)
      setError(null)

      try {
        const result = await saveBeat({
          ...beatData,
          userId,
        })
        if (!result.success) {
          setError(result.error)
        }
        return result
      } catch (err) {
        console.error('[useBeats] Error saving beat:', err)
        setError(err.message)
        return { success: false, error: err.message }
      } finally {
        setOperationLoading(false)
      }
    },
    [userId]
  )

  /**
   * Update beat metadata (title, tags, bpm, etc.)
   */
  const handleUpdateBeat = useCallback(
    async (beatId, updates) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await updateBeat(beatId, userId, updates)
        return result
      } catch (error) {
        console.error('[useBeats] Error updating beat:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Delete beat from collection
   */
  const handleDeleteBeat = useCallback(
    async (beatId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await deleteBeat(beatId, userId)
        return result
      } catch (error) {
        console.error('[useBeats] Error deleting beat:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Mark beat as used in a song
   */
  const handleMarkUsedInSong = useCallback(async (beatId, songId) => {
    try {
      const result = await markBeatUsedInSong(beatId, songId)
      return result
    } catch (error) {
      console.error('[useBeats] Error marking beat used:', error)
      return { success: false, error: error.message }
    }
  }, [])

  /**
   * Toggle favorite status
   */
  const handleToggleFavorite = useCallback(
    async (beatId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await toggleBeatFavorite(beatId, userId)
        return result
      } catch (error) {
        console.error('[useBeats] Error toggling favorite:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Get beat by ID from local state
   */
  const getBeatById = useCallback(
    (beatId) => {
      return beats.find((item) => item.id === beatId)
    },
    [beats]
  )

  return {
    beats,
    beatsLoading: loading,
    beatsError: error,
    operationLoading,
    generationProgress,
    beatsCount: beats.length,
    favoriteBeats: beats.filter((b) => b.isFavorite),
    editedBeats: beats.filter((b) => b.isEdited),
    generateBeat: handleGenerateBeat,
    saveBeat: handleSaveBeat,
    updateBeat: handleUpdateBeat,
    deleteBeat: handleDeleteBeat,
    markUsedInSong: handleMarkUsedInSong,
    toggleFavorite: handleToggleFavorite,
    getBeatById,
    clearError: () => setError(null),
    cancelGeneration: () => setGenerationProgress(null),
    modelVersions: MODEL_VERSIONS,
  }
}

/**
 * Hook to get a single beat document by ID with real-time updates
 *
 * @param {string} beatId - Beat document ID
 * @returns {Object} { beat, loading, error, refetch }
 */
export const useBeatDetail = (beatId) => {
  const [beatDetail, setBeatDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!beatId) {
      setBeatDetail(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Import db directly for subscription
    const { db } = require('../core/firebase/config')

    // Subscribe to real-time updates
    const unsubscribe = db
      .collection('beats')
      .doc(beatId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setBeatDetail({ id: doc.id, ...doc.data() })
            setError(null)
          } else {
            setError('Beat not found')
            setBeatDetail(null)
          }
          setLoading(false)
        },
        (err) => {
          console.error('[useBeatDetail] Subscription error:', err)
          setError(err.message)
          setLoading(false)
        }
      )

    return () => unsubscribe()
  }, [beatId])

  // Manual refetch function
  const refetch = async () => {
    if (!beatId) return
    const result = await getBeat(beatId)
    if (result.success) {
      setBeatDetail(result.beat)
    }
  }

  return {
    beat: beatDetail,
    beatLoading: loading,
    beatError: error,
    refetch,
  }
}

export default useBeats
