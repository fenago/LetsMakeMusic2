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
const MAX_RECENT_ENTRIES = 12 // Maximum entries to keep
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
  console.log('[RecentlyPlayed] logRecentlyPlayed called with:', {
    userId: userId || 'MISSING',
    songId: songData?.id || 'MISSING',
    songTitle: songData?.title || 'MISSING',
  })

  if (!userId || !songData?.id) {
    console.log('[RecentlyPlayed] ❌ Missing userId or songData.id:', {
      hasUserId: !!userId,
      hasSongId: !!songData?.id,
    })
    return { success: false, error: 'Missing required data' }
  }

  try {
    console.log('[RecentlyPlayed] ✅ Data validation passed, proceeding to log...')
    const now = ffirestore.FieldValue.serverTimestamp()
    const nowMs = Date.now()
    const recentRef = userRecentlyPlayedRef(userId)
    console.log('[RecentlyPlayed] Firestore ref path:', `users/${userId}/recentlyPlayed`)

    // Check if this song was played recently (within dedupe window)
    // Note: This query requires a composite index (songId + playedAt)
    // If the index doesn't exist yet, we skip deduplication and just add a new entry
    let existingQuery = null
    try {
      existingQuery = await recentRef
        .where('songId', '==', songData.id)
        .orderBy('playedAt', 'desc')
        .limit(1)
        .get()
    } catch (indexError) {
      // Composite index might not exist - log a warning and proceed without deduplication
      console.warn('[RecentlyPlayed] Index query failed (composite index may be needed):', indexError.message)
      // Check Firestore console for link to create index automatically
    }

    if (existingQuery && !existingQuery.empty) {
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

    console.log('[RecentlyPlayed] 📝 Writing to Firestore:', {
      title: entryData.title,
      songId: entryData.songId,
    })
    const docRef = await recentRef.add(entryData)
    console.log('[RecentlyPlayed] ✅ Successfully wrote doc:', docRef.id)

    // Cleanup old entries if over the limit (async, don't await)
    cleanupOldEntries(userId).catch(err =>
      console.warn('[RecentlyPlayed] Cleanup error:', err)
    )

    return { success: true, docId: docRef.id }
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
export const subscribeToRecentlyPlayed = (userId, callback, limitCount = 20) => {
  console.log('[RecentlyPlayed] 🔔 subscribeToRecentlyPlayed called:', {
    userId: userId || 'MISSING',
    limitCount,
  })

  if (!userId) {
    console.log('[RecentlyPlayed] ❌ No userId for subscription')
    callback([])
    return () => {}
  }

  console.log('[RecentlyPlayed] ✅ Setting up subscription for user:', userId, 'limit:', limitCount)
  console.log('[RecentlyPlayed] Firestore path:', `users/${userId}/recentlyPlayed`)

  try {
    return userRecentlyPlayedRef(userId)
      .orderBy('playedAt', 'desc')
      .limit(limitCount)
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
          // If index error, try without ordering as fallback
          if (error.message?.includes('index')) {
            console.log('[RecentlyPlayed] Trying fallback query without ordering')
            userRecentlyPlayedRef(userId)
              .limit(limitCount)
              .get()
              .then(snapshot => {
                const songs = snapshot?.docs?.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                })) || []
                callback(songs)
              })
              .catch(() => callback([]))
          } else {
            callback([])
          }
        }
      )
  } catch (error) {
    console.error('[RecentlyPlayed] Failed to create subscription:', error)
    callback([])
    return () => {}
  }
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
