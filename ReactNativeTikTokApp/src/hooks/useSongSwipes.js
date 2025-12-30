/**
 * useSongSwipes Hook - Like/Pass functionality for music discovery
 *
 * Provides methods for swiping on songs and tracking liked songs.
 * Supports three UI patterns:
 * 1. Swipe gestures on feed items
 * 2. Dedicated discovery screen with card stack
 * 3. Like/pass buttons on player
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  swipeSong,
  likeSong,
  passSong,
  fetchLikedSongs,
  fetchSwipedSongIds,
  undoSwipe,
  checkSwipe,
  getSwipeStats,
} from '../services/songSwipesService'

/**
 * Hook for song swipe functionality
 *
 * @param {string} userId - Current user's ID
 * @param {Object} options - Configuration options
 * @param {boolean} options.loadLikedSongs - Whether to load liked songs on mount
 * @param {boolean} options.loadSwipedIds - Whether to load swiped IDs on mount
 * @returns {Object} Swipe state and methods
 */
export const useSongSwipes = (userId, options = {}) => {
  const { loadLikedSongs = false, loadSwipedIds = false } = options

  // State
  const [likedSongs, setLikedSongs] = useState([])
  const [swipedSongIds, setSwipedSongIds] = useState(new Set())
  const [stats, setStats] = useState({ totalLikes: 0, totalPasses: 0 })
  const [loading, setLoading] = useState(false)
  const [lastSwipedSong, setLastSwipedSong] = useState(null)

  // Track local swipe state for optimistic UI
  const localSwipesRef = useRef({})

  // Load liked songs on mount if requested
  useEffect(() => {
    if (loadLikedSongs && userId) {
      handleFetchLikedSongs()
    }
  }, [userId, loadLikedSongs])

  // Load swiped IDs on mount if requested
  useEffect(() => {
    if (loadSwipedIds && userId) {
      handleFetchSwipedIds()
    }
  }, [userId, loadSwipedIds])

  /**
   * Swipe on a song (like or pass)
   * Updates local state optimistically
   */
  const handleSwipe = useCallback(
    async (songId, action, songData = null) => {
      if (!userId || !songId) {
        return { success: false, error: 'Missing userId or songId' }
      }

      // Optimistic update
      localSwipesRef.current[songId] = action
      setSwipedSongIds((prev) => new Set([...prev, songId]))
      setLastSwipedSong({ songId, action, songData })

      if (action === 'like') {
        setStats((prev) => ({ ...prev, totalLikes: prev.totalLikes + 1 }))
        if (songData) {
          setLikedSongs((prev) => [
            { id: songId, songId, action, songData, swipedAt: new Date() },
            ...prev,
          ])
        }
      } else {
        setStats((prev) => ({ ...prev, totalPasses: prev.totalPasses + 1 }))
      }

      try {
        const result = await swipeSong(songId, action, songData)
        return { success: true, ...result }
      } catch (error) {
        // Rollback on error
        delete localSwipesRef.current[songId]
        setSwipedSongIds((prev) => {
          const next = new Set(prev)
          next.delete(songId)
          return next
        })

        if (action === 'like') {
          setStats((prev) => ({ ...prev, totalLikes: prev.totalLikes - 1 }))
          setLikedSongs((prev) => prev.filter((s) => s.id !== songId))
        } else {
          setStats((prev) => ({ ...prev, totalPasses: prev.totalPasses - 1 }))
        }

        console.error('[useSongSwipes] handleSwipe error:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Like a song
   */
  const handleLike = useCallback(
    async (songId, songData = null) => {
      return handleSwipe(songId, 'like', songData)
    },
    [handleSwipe]
  )

  /**
   * Pass on a song
   */
  const handlePass = useCallback(
    async (songId, songData = null) => {
      return handleSwipe(songId, 'pass', songData)
    },
    [handleSwipe]
  )

  /**
   * Undo the last swipe
   */
  const handleUndo = useCallback(async () => {
    if (!lastSwipedSong) {
      return { success: false, error: 'No swipe to undo' }
    }

    const { songId, action } = lastSwipedSong

    try {
      const result = await undoSwipe(songId)

      // Update local state
      delete localSwipesRef.current[songId]
      setSwipedSongIds((prev) => {
        const next = new Set(prev)
        next.delete(songId)
        return next
      })

      if (action === 'like') {
        setStats((prev) => ({ ...prev, totalLikes: Math.max(0, prev.totalLikes - 1) }))
        setLikedSongs((prev) => prev.filter((s) => s.id !== songId))
      } else {
        setStats((prev) => ({ ...prev, totalPasses: Math.max(0, prev.totalPasses - 1) }))
      }

      setLastSwipedSong(null)
      return { success: true, ...result }
    } catch (error) {
      console.error('[useSongSwipes] handleUndo error:', error)
      return { success: false, error: error.message }
    }
  }, [lastSwipedSong])

  /**
   * Fetch liked songs
   */
  const handleFetchLikedSongs = useCallback(
    async (limit = 50, lastSongId = null) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      setLoading(true)
      try {
        const result = await fetchLikedSongs(limit, lastSongId)
        if (lastSongId) {
          // Pagination - append
          setLikedSongs((prev) => [...prev, ...result.songs])
        } else {
          setLikedSongs(result.songs || [])
        }
        setLoading(false)
        return { success: true, songs: result.songs }
      } catch (error) {
        setLoading(false)
        console.error('[useSongSwipes] handleFetchLikedSongs error:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Fetch all swiped song IDs (for filtering discovery)
   */
  const handleFetchSwipedIds = useCallback(async () => {
    if (!userId) return { success: false, error: 'Not logged in' }

    try {
      const result = await fetchSwipedSongIds()
      setSwipedSongIds(new Set(result.songIds || []))
      return { success: true, songIds: result.songIds }
    } catch (error) {
      console.error('[useSongSwipes] handleFetchSwipedIds error:', error)
      return { success: false, error: error.message }
    }
  }, [userId])

  /**
   * Check if a song has been swiped
   * Uses local cache first, then server if needed
   */
  const hasSwipedOn = useCallback(
    (songId) => {
      return swipedSongIds.has(songId) || localSwipesRef.current[songId] !== undefined
    },
    [swipedSongIds]
  )

  /**
   * Get local swipe action for a song
   */
  const getSwipeAction = useCallback(
    (songId) => {
      return localSwipesRef.current[songId] || null
    },
    []
  )

  /**
   * Check swipe status from server
   */
  const handleCheckSwipe = useCallback(async (songId) => {
    try {
      const result = await checkSwipe(songId)
      if (result.hasSwipe) {
        localSwipesRef.current[songId] = result.action
        setSwipedSongIds((prev) => new Set([...prev, songId]))
      }
      return result
    } catch (error) {
      console.error('[useSongSwipes] handleCheckSwipe error:', error)
      return { hasSwipe: false, action: null }
    }
  }, [])

  /**
   * Fetch swipe stats
   */
  const handleFetchStats = useCallback(async () => {
    if (!userId) return { success: false, error: 'Not logged in' }

    try {
      const result = await getSwipeStats()
      setStats(result.stats || { totalLikes: 0, totalPasses: 0 })
      return { success: true, stats: result.stats }
    } catch (error) {
      console.error('[useSongSwipes] handleFetchStats error:', error)
      return { success: false, error: error.message }
    }
  }, [userId])

  /**
   * Remove a song from liked songs (unlike)
   */
  const handleUnlikeSong = useCallback(
    async (songId) => {
      try {
        const result = await undoSwipe(songId)

        // Update local state
        delete localSwipesRef.current[songId]
        setSwipedSongIds((prev) => {
          const next = new Set(prev)
          next.delete(songId)
          return next
        })
        setLikedSongs((prev) => prev.filter((s) => s.id !== songId))
        setStats((prev) => ({ ...prev, totalLikes: Math.max(0, prev.totalLikes - 1) }))

        return { success: true, ...result }
      } catch (error) {
        console.error('[useSongSwipes] handleUnlikeSong error:', error)
        return { success: false, error: error.message }
      }
    },
    []
  )

  return {
    // State
    likedSongs,
    likedSongsCount: likedSongs.length,
    swipedSongIds,
    stats,
    loading,
    lastSwipedSong,
    canUndo: !!lastSwipedSong,

    // Actions
    swipe: handleSwipe,
    like: handleLike,
    pass: handlePass,
    undo: handleUndo,
    unlikeSong: handleUnlikeSong,

    // Queries
    fetchLikedSongs: handleFetchLikedSongs,
    fetchSwipedIds: handleFetchSwipedIds,
    fetchStats: handleFetchStats,
    checkSwipe: handleCheckSwipe,

    // Helpers
    hasSwipedOn,
    getSwipeAction,
  }
}

export default useSongSwipes
