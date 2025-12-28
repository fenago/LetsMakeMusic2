/**
 * Recently Played Service - Firebase integration for tracking play history
 *
 * Tracks songs a user has played, with deduplication and auto-cleanup
 * to prevent unbounded growth.
 */

import { db } from '../core/firebase/config'
import ffirestore from '@react-native-firebase/firestore'

// Collection reference
export const userRecentlyPlayedRef = (userId) =>
  db.collection('users').doc(userId).collection('recentlyPlayed')

// Constants
const MAX_RECENT_ENTRIES = 50 // Maximum entries to keep
const DEDUPE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes - don't re-add same song within this window

/**
 * Log a song as recently played
 *
 * - If the same song was played within the dedupe window, just update the timestamp
 * - Otherwise, add a new entry
 * - Automatically removes oldest entries if over the limit
 *
 * @param {string} userId - User ID
 * @param {Object} songData - Song data to log
 * @param {string} songData.id - Song ID
 * @param {string} songData.title - Song title
 * @param {string} songData.imageUrl - Cover image URL
 * @param {string} songData.artist - Artist name or style
 * @param {string} songData.audioUrl - Audio URL
 * @param {number} songData.duration - Duration in seconds
 * @returns {Promise<Object>} Result with success status
 */
export const logRecentlyPlayed = async (userId, songData) => {
  if (!userId || !songData?.id) {
    console.log('[RecentlyPlayed] Missing userId or songData.id')
    return { success: false, error: 'Missing required data' }
  }

  try {
    const now = ffirestore.FieldValue.serverTimestamp()
    const nowMs = Date.now()
    const recentRef = userRecentlyPlayedRef(userId)

    // Check if this song was played recently (within dedupe window)
    const existingQuery = await recentRef
      .where('songId', '==', songData.id)
      .orderBy('playedAt', 'desc')
      .limit(1)
      .get()

    if (!existingQuery.empty) {
      const lastPlay = existingQuery.docs[0]
      const lastPlayData = lastPlay.data()
      const lastPlayTime = lastPlayData.playedAt?.toMillis?.() || 0

      // If played within dedupe window, just update the timestamp
      if (nowMs - lastPlayTime < DEDUPE_WINDOW_MS) {
        console.log('[RecentlyPlayed] Song played recently, updating timestamp:', songData.title)
        await lastPlay.ref.update({
          playedAt: now,
        })
        return { success: true, dedupe: true }
      }
    }

    // Add new entry
    const entryData = {
      songId: songData.id,
      title: songData.title || 'Untitled',
      imageUrl: songData.imageUrl || songData.thumbnailUrl || songData.coverUrl || null,
      artist: songData.artist || songData.style || songData.author?.firstName || '',
      audioUrl: songData.audioUrl || songData.streamUrl || '',
      duration: songData.duration || 0,
      playedAt: now,
    }

    console.log('[RecentlyPlayed] Logging play:', entryData.title)
    await recentRef.add(entryData)

    // Cleanup old entries if over the limit (async, don't await)
    cleanupOldEntries(userId).catch(err =>
      console.warn('[RecentlyPlayed] Cleanup error:', err)
    )

    return { success: true }
  } catch (error) {
    console.error('[RecentlyPlayed] Error logging play:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove oldest entries if we have more than MAX_RECENT_ENTRIES
 *
 * @param {string} userId - User ID
 */
const cleanupOldEntries = async (userId) => {
  try {
    const recentRef = userRecentlyPlayedRef(userId)

    // Get all entries ordered by playedAt
    const snapshot = await recentRef
      .orderBy('playedAt', 'desc')
      .get()

    // If we have more than the limit, delete the oldest
    if (snapshot.size > MAX_RECENT_ENTRIES) {
      const docsToDelete = snapshot.docs.slice(MAX_RECENT_ENTRIES)
      console.log('[RecentlyPlayed] Cleaning up', docsToDelete.length, 'old entries')

      const batch = db.batch()
      docsToDelete.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()
    }
  } catch (error) {
    console.error('[RecentlyPlayed] Cleanup error:', error)
  }
}

/**
 * Subscribe to user's recently played songs in real-time
 *
 * @param {string} userId - User ID
 * @param {Function} callback - Callback with songs array
 * @param {number} limit - Max songs to fetch (default 20)
 * @returns {Function} Unsubscribe function
 */
export const subscribeToRecentlyPlayed = (userId, callback, limit = 20) => {
  if (!userId) {
    console.log('[RecentlyPlayed] No userId for subscription')
    callback([])
    return () => {}
  }

  console.log('[RecentlyPlayed] Subscribing for user:', userId)

  return userRecentlyPlayedRef(userId)
    .orderBy('playedAt', 'desc')
    .limit(limit)
    .onSnapshot(
      (querySnapshot) => {
        const songs = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) || []
        console.log('[RecentlyPlayed] Fetched', songs.length, 'recently played songs')
        callback(songs)
      },
      (error) => {
        console.error('[RecentlyPlayed] Subscription error:', error)
        callback([])
      }
    )
}

/**
 * Get recently played songs (one-time fetch)
 *
 * @param {string} userId - User ID
 * @param {number} limit - Max songs to fetch
 * @returns {Promise<Array>} Array of recently played songs
 */
export const getRecentlyPlayed = async (userId, limit = 20) => {
  if (!userId) {
    return []
  }

  try {
    const snapshot = await userRecentlyPlayedRef(userId)
      .orderBy('playedAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('[RecentlyPlayed] Error fetching:', error)
    return []
  }
}

/**
 * Clear all recently played history for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with success status
 */
export const clearRecentlyPlayed = async (userId) => {
  if (!userId) {
    return { success: false, error: 'Missing userId' }
  }

  try {
    const snapshot = await userRecentlyPlayedRef(userId).get()

    if (snapshot.empty) {
      return { success: true, count: 0 }
    }

    const batch = db.batch()
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    await batch.commit()

    console.log('[RecentlyPlayed] Cleared', snapshot.size, 'entries for user:', userId)
    return { success: true, count: snapshot.size }
  } catch (error) {
    console.error('[RecentlyPlayed] Error clearing history:', error)
    return { success: false, error: error.message }
  }
}

export default {
  logRecentlyPlayed,
  subscribeToRecentlyPlayed,
  getRecentlyPlayed,
  clearRecentlyPlayed,
}
