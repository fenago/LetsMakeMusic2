/**
 * useRecommendations Hook - Fetch personalized song recommendations
 *
 * Uses the recommendations service to get songs based on:
 * - User's liked songs (style/genre preferences)
 * - User's own created songs
 * - Song popularity metrics
 */

import { useEffect, useState, useCallback } from 'react'
import { getRecommendationsForUser, getTrendingSongs } from '../services/recommendationsService'

/**
 * Hook to get personalized recommendations for a user
 *
 * @param {string} userId - Current user's ID
 * @param {Object} options - Options
 * @param {Array} options.likedSongs - User's liked songs (from MediaPlayerContext)
 * @param {Array} options.userSongs - User's own created songs
 * @param {Array} options.recentlyPlayed - Recently played songs
 * @param {number} options.limit - Max number of recommendations
 * @returns {Object} { recommendations, loading, error, refresh }
 */
export const useRecommendations = (
  userId,
  { likedSongs = [], userSongs = [], recentlyPlayed = [], limit = 10 } = {}
) => {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!userId) {
      setRecommendations([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await getRecommendationsForUser(userId, {
        likedSongs,
        userSongs,
        recentlyPlayed,
        limit,
      })

      // If no personalized recommendations, fall back to trending
      if (results.length === 0) {
        console.log('[useRecommendations] No personalized results, fetching trending')
        const trending = await getTrendingSongs(limit)
        setRecommendations(trending)
      } else {
        setRecommendations(results)
      }
    } catch (err) {
      console.error('[useRecommendations] Error fetching recommendations:', err)
      setError(err.message)

      // Fallback to trending on error
      try {
        const trending = await getTrendingSongs(limit)
        setRecommendations(trending)
      } catch (fallbackErr) {
        console.error('[useRecommendations] Fallback also failed:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }, [userId, likedSongs.length, userSongs.length, recentlyPlayed.length, limit])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  return {
    recommendations,
    recommendationsLoading: loading,
    recommendationsError: error,
    recommendationsCount: recommendations.length,
    refreshRecommendations: refresh,
  }
}

export default useRecommendations
