/**
 * Recommendations Service - AI-powered song recommendations
 *
 * MVP Algorithm: Popularity + Style Matching
 * 1. Get user's liked song styles (genres)
 * 2. Query songs with matching styles
 * 3. Filter out: user's own songs, already liked songs
 * 4. Score by weighted combination of play count and like count
 * 5. Return top results
 */

import { db } from '../core/firebase/config'

// Weights for scoring
const PLAY_COUNT_WEIGHT = 0.6
const LIKE_COUNT_WEIGHT = 0.4

/**
 * Calculate recommendation score for a song
 * @param {Object} song - Song document
 * @returns {number} Weighted score
 */
const calculateScore = (song) => {
  const playCount = song.playCount || 0
  const likeCount = song.likeCount || 0

  // Normalize scores (assuming max of 1000 plays/likes for now)
  const normalizedPlays = Math.min(playCount / 1000, 1)
  const normalizedLikes = Math.min(likeCount / 1000, 1)

  return normalizedPlays * PLAY_COUNT_WEIGHT + normalizedLikes * LIKE_COUNT_WEIGHT
}

/**
 * Extract unique styles/genres from a list of songs
 * @param {Array} songs - List of song objects
 * @returns {Array} Unique styles
 */
const extractStyles = (songs) => {
  const styles = new Set()

  songs.forEach((song) => {
    if (song.style) {
      // Split by common delimiters (comma, slash, &)
      const parts = song.style.split(/[,\/&]/).map((s) => s.trim().toLowerCase())
      parts.forEach((part) => {
        if (part && part.length > 2) {
          styles.add(part)
        }
      })
    }
  })

  return Array.from(styles)
}

/**
 * Get recommendations for a user
 *
 * @param {string} userId - Current user's ID
 * @param {Object} options - Options
 * @param {Array} options.likedSongs - User's liked songs (from context)
 * @param {Array} options.userSongs - User's own created songs
 * @param {Array} options.recentlyPlayed - Recently played songs (to optionally filter)
 * @param {number} options.limit - Max number of recommendations (default: 10)
 * @returns {Promise<Array>} Recommended songs
 */
export const getRecommendationsForUser = async (
  userId,
  { likedSongs = [], userSongs = [], recentlyPlayed = [], limit: resultLimit = 10 } = {}
) => {
  try {
    if (!userId) {
      console.log('[Recommendations] No userId provided')
      return []
    }

    // Extract styles from liked songs and user's own songs
    const allUserSongs = [...likedSongs, ...userSongs]
    const preferredStyles = extractStyles(allUserSongs)

    console.log('[Recommendations] User preferred styles:', preferredStyles)

    // Build set of song IDs to exclude
    const excludeIds = new Set()

    // Exclude user's own songs
    userSongs.forEach((song) => excludeIds.add(song.id))

    // Exclude already liked songs
    likedSongs.forEach((song) => excludeIds.add(song.id))

    // Optionally exclude recently played (within last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    recentlyPlayed.forEach((song) => {
      const playedAt = song.playedAt?.toMillis?.() || song.playedAt
      if (playedAt && playedAt > oneHourAgo) {
        excludeIds.add(song.songId || song.id)
      }
    })

    console.log('[Recommendations] Excluding', excludeIds.size, 'songs')

    // Query songs from Firestore using React Native Firebase
    let candidateSongs = []

    // Strategy 1: If user has preferred styles, query by popularity within those styles
    if (preferredStyles.length > 0) {
      // Query songs ordered by playCount (most popular first)
      try {
        const snapshot = await db
          .collection('songs')
          .where('isPublic', '==', true)
          .orderBy('playCount', 'desc')
          .limit(100)
          .get()

        snapshot.forEach((doc) => {
          const song = { id: doc.id, ...doc.data() }
          candidateSongs.push(song)
        })
      } catch (error) {
        console.warn('[Recommendations] Error querying by playCount:', error)
        // Fallback: query without orderBy
        try {
          const snapshot = await db
            .collection('songs')
            .where('isPublic', '==', true)
            .limit(100)
            .get()

          snapshot.forEach((doc) => {
            const song = { id: doc.id, ...doc.data() }
            candidateSongs.push(song)
          })
        } catch (fallbackError) {
          console.warn('[Recommendations] Fallback query also failed:', fallbackError)
        }
      }
    } else {
      // No preferences yet - just get popular songs
      try {
        const snapshot = await db
          .collection('songs')
          .where('isPublic', '==', true)
          .orderBy('playCount', 'desc')
          .limit(50)
          .get()

        snapshot.forEach((doc) => {
          candidateSongs.push({ id: doc.id, ...doc.data() })
        })
      } catch (error) {
        console.warn('[Recommendations] Error querying popular songs:', error)
        // Fallback without ordering
        try {
          const snapshot = await db
            .collection('songs')
            .where('isPublic', '==', true)
            .limit(50)
            .get()

          snapshot.forEach((doc) => {
            candidateSongs.push({ id: doc.id, ...doc.data() })
          })
        } catch (fallbackError) {
          console.warn('[Recommendations] Fallback query also failed:', fallbackError)
        }
      }
    }

    console.log('[Recommendations] Found', candidateSongs.length, 'candidate songs')

    // Filter out excluded songs
    candidateSongs = candidateSongs.filter((song) => !excludeIds.has(song.id))

    console.log('[Recommendations] After exclusion:', candidateSongs.length, 'songs')

    // Score songs
    const scoredSongs = candidateSongs.map((song) => {
      const songStyles = extractStyles([song])
      const styleMatchScore =
        preferredStyles.length > 0
          ? songStyles.filter((s) => preferredStyles.includes(s)).length /
            Math.max(preferredStyles.length, 1)
          : 0

      const popularityScore = calculateScore(song)

      // Combined score: 40% popularity + 60% style match (if user has preferences)
      const finalScore =
        preferredStyles.length > 0
          ? popularityScore * 0.4 + styleMatchScore * 0.6
          : popularityScore

      return {
        ...song,
        recommendationScore: finalScore,
        recommendationReason:
          styleMatchScore > 0.5
            ? 'Matches your taste'
            : popularityScore > 0.3
            ? 'Popular on LetsMakeMusic'
            : 'You might like this',
      }
    })

    // Sort by score descending
    scoredSongs.sort((a, b) => b.recommendationScore - a.recommendationScore)

    // Return top results
    const recommendations = scoredSongs.slice(0, resultLimit)

    console.log('[Recommendations] Returning', recommendations.length, 'recommendations')

    return recommendations
  } catch (error) {
    console.error('[Recommendations] Error getting recommendations:', error)
    return []
  }
}

/**
 * Get trending songs (most played in last 7 days)
 * Useful as a fallback or for new users
 *
 * @param {number} resultLimit - Max results
 * @returns {Promise<Array>} Trending songs
 */
export const getTrendingSongs = async (resultLimit = 10) => {
  try {
    const snapshot = await db
      .collection('songs')
      .where('isPublic', '==', true)
      .orderBy('playCount', 'desc')
      .limit(resultLimit)
      .get()

    const songs = []

    snapshot.forEach((doc) => {
      songs.push({
        id: doc.id,
        ...doc.data(),
        recommendationReason: 'Trending now',
      })
    })

    return songs
  } catch (error) {
    console.error('[Recommendations] Error getting trending songs:', error)
    return []
  }
}

/**
 * Get songs by a specific style/genre
 *
 * @param {string} style - Genre/style to search for
 * @param {number} resultLimit - Max results
 * @returns {Promise<Array>} Songs matching the style
 */
export const getSongsByStyle = async (style, resultLimit = 20) => {
  try {
    if (!style) return []

    // Note: Firestore doesn't support contains for strings,
    // so we'll fetch and filter client-side
    const snapshot = await db
      .collection('songs')
      .where('isPublic', '==', true)
      .orderBy('playCount', 'desc')
      .limit(100)
      .get()

    const songs = []

    snapshot.forEach((doc) => {
      const song = { id: doc.id, ...doc.data() }
      const songStyle = (song.style || '').toLowerCase()

      if (songStyle.includes(style.toLowerCase())) {
        songs.push({
          ...song,
          recommendationReason: `${style} picks`,
        })
      }
    })

    return songs.slice(0, resultLimit)
  } catch (error) {
    console.error('[Recommendations] Error getting songs by style:', error)
    return []
  }
}

export default {
  getRecommendationsForUser,
  getTrendingSongs,
  getSongsByStyle,
}
