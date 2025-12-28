/**
 * useRecentlyPlayed Hook - State management for recently played songs
 *
 * Subscribes to user's recently played songs in real-time and provides
 * methods for history operations.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToRecentlyPlayed,
  clearRecentlyPlayed,
} from '../services/recentlyPlayedService'

/**
 * Hook to manage user's recently played songs
 *
 * @param {string} userId - Current user's ID
 * @param {number} limit - Max songs to fetch (default 20)
 * @returns {Object} { recentlyPlayed, loading, clearHistory }
 */
export const useRecentlyPlayed = (userId, limit = 20) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setRecentlyPlayed([])
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeToRecentlyPlayed(userId, (songs) => {
      // Transform to match song item format for playback
      const transformedSongs = songs.map(song => ({
        id: song.songId,
        title: song.title,
        imageUrl: song.imageUrl,
        artist: song.artist,
        audioUrl: song.audioUrl,
        duration: song.duration,
        playedAt: song.playedAt,
        // For display in history list
        recentlyPlayedId: song.id,
      }))
      setRecentlyPlayed(transformedSongs)
      setLoading(false)
    }, limit)

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [userId, limit])

  /**
   * Clear all recently played history
   */
  const clearHistory = useCallback(async () => {
    if (!userId) return { success: false }

    try {
      const result = await clearRecentlyPlayed(userId)
      if (result.success) {
        setRecentlyPlayed([])
      }
      return result
    } catch (error) {
      console.error('[useRecentlyPlayed] Error clearing history:', error)
      return { success: false, error: error.message }
    }
  }, [userId])

  return {
    recentlyPlayed,
    recentlyPlayedLoading: loading,
    recentlyPlayedCount: recentlyPlayed.length,
    clearHistory,
  }
}

export default useRecentlyPlayed
