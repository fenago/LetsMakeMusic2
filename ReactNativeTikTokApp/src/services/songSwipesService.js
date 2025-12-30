/**
 * Song Swipes Service
 *
 * Handles like/pass swiping on songs for music discovery.
 * Calls Firebase Cloud Functions for backend operations.
 */

import { functions } from '../core/firebase/config'

/**
 * Swipe on a song (like or pass)
 *
 * @param {string} songId - The song ID to swipe on
 * @param {string} action - 'like' or 'pass'
 * @param {Object} songData - Song metadata to denormalize
 * @returns {Promise<Object>} Result of the swipe
 */
export const swipeSong = async (songId, action, songData = null) => {
  try {
    // React Native Firebase uses functions().httpsCallable() syntax
    const swipeSongFn = functions().httpsCallable('swipeSong')
    const result = await swipeSongFn({ songId, action, songData })
    return result.data
  } catch (error) {
    console.error('[songSwipesService] swipeSong error:', error)
    throw error
  }
}

/**
 * Like a song (shorthand for swipeSong with action='like')
 */
export const likeSong = async (songId, songData = null) => {
  return swipeSong(songId, 'like', songData)
}

/**
 * Pass on a song (shorthand for swipeSong with action='pass')
 */
export const passSong = async (songId, songData = null) => {
  return swipeSong(songId, 'pass', songData)
}

/**
 * Fetch user's liked songs with pagination
 *
 * @param {number} limit - Max number of songs to fetch
 * @param {string} lastSongId - For pagination
 * @returns {Promise<Object>} { songs, success }
 */
export const fetchLikedSongs = async (limit = 50, lastSongId = null) => {
  try {
    const fetchLikedSongsFn = functions().httpsCallable('fetchLikedSongs')
    const result = await fetchLikedSongsFn({ limit, lastSongId })
    return result.data
  } catch (error) {
    console.error('[songSwipesService] fetchLikedSongs error:', error)
    throw error
  }
}

/**
 * Fetch IDs of songs the user has already swiped on
 * Used to filter discovery feed
 *
 * @param {number} limit - Max number of IDs to fetch
 * @returns {Promise<Object>} { songIds, success }
 */
export const fetchSwipedSongIds = async (limit = 1000) => {
  try {
    const fetchSwipedSongIdsFn = functions().httpsCallable('fetchSwipedSongIds')
    const result = await fetchSwipedSongIdsFn({ limit })
    return result.data
  } catch (error) {
    console.error('[songSwipesService] fetchSwipedSongIds error:', error)
    throw error
  }
}

/**
 * Undo/remove a swipe on a song
 *
 * @param {string} songId - The song ID to undo swipe on
 * @returns {Promise<Object>} Result
 */
export const undoSwipe = async (songId) => {
  try {
    const undoSwipeFn = functions().httpsCallable('undoSwipe')
    const result = await undoSwipeFn({ songId })
    return result.data
  } catch (error) {
    console.error('[songSwipesService] undoSwipe error:', error)
    throw error
  }
}

/**
 * Check if user has swiped on a specific song
 *
 * @param {string} songId - The song ID to check
 * @returns {Promise<Object>} { hasSwipe, action, success }
 */
export const checkSwipe = async (songId) => {
  try {
    const checkSwipeFn = functions().httpsCallable('checkSwipe')
    const result = await checkSwipeFn({ songId })
    return result.data
  } catch (error) {
    console.error('[songSwipesService] checkSwipe error:', error)
    throw error
  }
}

/**
 * Get user's swipe statistics
 *
 * @returns {Promise<Object>} { stats: { totalLikes, totalPasses, lastSwipedAt }, success }
 */
export const getSwipeStats = async () => {
  try {
    const getSwipeStatsFn = functions().httpsCallable('getSwipeStats')
    const result = await getSwipeStatsFn({})
    return result.data
  } catch (error) {
    console.error('[songSwipesService] getSwipeStats error:', error)
    throw error
  }
}
