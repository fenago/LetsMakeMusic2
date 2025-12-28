/**
 * useVideoClips Hook - State management for user's video clips collection
 *
 * Subscribes to user's video clips in real-time and provides
 * methods for video clip CRUD operations.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToUserVideoClips,
  getVideoClip,
  saveVideoClip,
  deleteVideoClip,
  applyVideoClipToSong,
  updateVideoClip,
  getPendingVideoClips,
  VIDEO_CLIP_STATUS,
} from '../services/videoClipsService'

/**
 * Hook to manage user's video clips collection
 *
 * @param {string} userId - Current user's ID
 * @param {Object} author - Author info for new clips (stageName, profilePictureURL)
 * @returns {Object} Video clips state and methods
 */
export const useVideoClips = (userId, author = null) => {
  const [videoClips, setVideoClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [operationLoading, setOperationLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setVideoClips([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeToUserVideoClips(userId, (fetchedClips) => {
        setVideoClips(fetchedClips)
        setLoading(false)
        setError(null)
      })

      return () => {
        unsubscribe && unsubscribe()
      }
    } catch (err) {
      console.error('[useVideoClips] Subscription error:', err)
      setError(err.message || 'Failed to load video clips')
      setLoading(false)
    }
  }, [userId])

  /**
   * Save new video clip to the collection
   */
  const handleSaveVideoClip = useCallback(
    async (clipData) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      setOperationLoading(true)
      setError(null)

      try {
        const result = await saveVideoClip({
          ...clipData,
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
        console.error('[useVideoClips] Error saving video clip:', err)
        setError(err.message)
        return { success: false, error: err.message }
      } finally {
        setOperationLoading(false)
      }
    },
    [userId, author]
  )

  /**
   * Delete video clip from collection
   */
  const handleDeleteVideoClip = useCallback(
    async (clipId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await deleteVideoClip(clipId, userId)
        return result
      } catch (err) {
        console.error('[useVideoClips] Error deleting video clip:', err)
        return { success: false, error: err.message }
      }
    },
    [userId]
  )

  /**
   * Apply video clip to a song
   */
  const handleApplyToSong = useCallback(
    async (clipId, songId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await applyVideoClipToSong(clipId, songId, userId)
        return result
      } catch (err) {
        console.error('[useVideoClips] Error applying video clip to song:', err)
        return { success: false, error: err.message }
      }
    },
    [userId]
  )

  /**
   * Update video clip metadata
   */
  const handleUpdateVideoClip = useCallback(
    async (clipId, updates) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await updateVideoClip(clipId, userId, updates)
        return result
      } catch (err) {
        console.error('[useVideoClips] Error updating video clip:', err)
        return { success: false, error: err.message }
      }
    },
    [userId]
  )

  /**
   * Get clips by generation mode
   */
  const getClipsByMode = useCallback(
    (mode) => {
      return videoClips.filter((clip) => clip.generationMode === mode)
    },
    [videoClips]
  )

  /**
   * Get clips by status
   */
  const getClipsByStatus = useCallback(
    (status) => {
      return videoClips.filter((clip) => clip.status === status)
    },
    [videoClips]
  )

  /**
   * Get completed clips only
   */
  const completedClips = videoClips.filter(
    (clip) => clip.status === VIDEO_CLIP_STATUS.COMPLETED
  )

  /**
   * Get generating/pending clips
   */
  const pendingClips = videoClips.filter(
    (clip) => clip.status === VIDEO_CLIP_STATUS.GENERATING
  )

  /**
   * Get failed clips
   */
  const failedClips = videoClips.filter(
    (clip) => clip.status === VIDEO_CLIP_STATUS.FAILED
  )

  return {
    videoClips,
    completedClips,
    pendingClips,
    failedClips,
    videoClipsLoading: loading,
    videoClipsError: error,
    operationLoading,
    videoClipsCount: videoClips.length,
    saveVideoClip: handleSaveVideoClip,
    deleteVideoClip: handleDeleteVideoClip,
    applyToSong: handleApplyToSong,
    updateVideoClip: handleUpdateVideoClip,
    getClipsByMode,
    getClipsByStatus,
    clearError: () => setError(null),
  }
}

/**
 * Hook to get a single video clip by ID with real-time updates
 *
 * @param {string} clipId - Video clip document ID
 * @returns {Object} { clip, loading, error, refetch }
 */
export const useVideoClipDetail = (clipId) => {
  const [clipDetail, setClipDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!clipId) {
      setClipDetail(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Import db directly for subscription
    const { db } = require('../core/firebase/config')

    // Subscribe to real-time updates
    const unsubscribe = db
      .collection('video_clips')
      .doc(clipId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setClipDetail({ id: doc.id, ...doc.data() })
            setError(null)
          } else {
            setError('Video clip not found')
            setClipDetail(null)
          }
          setLoading(false)
        },
        (err) => {
          console.error('[useVideoClipDetail] Subscription error:', err)
          setError(err.message)
          setLoading(false)
        }
      )

    return () => unsubscribe()
  }, [clipId])

  // Manual refetch function
  const refetch = async () => {
    if (!clipId) return
    const result = await getVideoClip(clipId)
    if (result.success) {
      setClipDetail(result.clip)
    }
  }

  return {
    clip: clipDetail,
    clipLoading: loading,
    clipError: error,
    refetch,
  }
}

export default useVideoClips
