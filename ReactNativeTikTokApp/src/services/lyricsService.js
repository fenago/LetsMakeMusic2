/**
 * Lyrics Service - Firestore operations for user lyrics
 *
 * Handles CRUD operations for AI-generated lyrics stored in the 'lyrics' collection.
 *
 * Schema:
 * - id: string (auto-generated)
 * - userId: string (owner)
 * - title: string (AI-generated title)
 * - text: string (lyrics content with structure markers like [Verse], [Chorus])
 * - prompt: string (user's original prompt)
 * - taskId: string (Suno API task ID)
 * - variationIndex: number (0 or 1 - which variation from the API)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - isEdited: boolean (true if user has modified the lyrics)
 * - usedInSongs: array of song IDs where this lyrics was used
 * - tags: array of strings for categorization
 * - isFavorite: boolean
 */

import { db, firestore } from '../core/firebase/config'

const LYRICS_COLLECTION = 'lyrics'

/**
 * Save lyrics to Firestore
 *
 * @param {object} lyricsData - Lyrics data to save
 * @returns {Promise<object>} Result with success status and lyrics ID
 */
export const saveLyrics = async (lyricsData) => {
  try {
    const { userId, title, text, prompt, taskId, variationIndex = 0 } = lyricsData

    if (!userId) {
      throw new Error('User ID is required')
    }
    if (!text) {
      throw new Error('Lyrics text is required')
    }

    const docRef = await db.collection(LYRICS_COLLECTION).add({
      userId,
      title: title || 'Untitled',
      text,
      prompt: prompt || '',
      taskId: taskId || '',
      variationIndex,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      isEdited: false,
      usedInSongs: [],
      tags: [],
      isFavorite: false,
    })

    console.log('[lyricsService] Lyrics saved with ID:', docRef.id)

    return {
      success: true,
      lyricsId: docRef.id,
    }
  } catch (error) {
    console.error('[lyricsService] Error saving lyrics:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Save multiple lyrics variations from a single generation
 *
 * @param {string} userId - User ID
 * @param {string} prompt - Original prompt
 * @param {string} taskId - Suno API task ID
 * @param {array} lyricsArray - Array of lyrics objects from API
 * @returns {Promise<object>} Result with success status and saved IDs
 */
export const saveLyricsVariations = async (userId, prompt, taskId, lyricsArray) => {
  try {
    console.log('[lyricsService] saveLyricsVariations called:')
    console.log('[lyricsService] - userId:', userId)
    console.log('[lyricsService] - lyricsArray length:', lyricsArray?.length)
    console.log('[lyricsService] - lyricsArray:', JSON.stringify(lyricsArray, null, 2))

    if (!userId) {
      console.error('[lyricsService] ERROR: userId is null/undefined!')
      return { success: false, error: 'User ID is required' }
    }

    const savedIds = []
    const batch = db.batch()

    for (let i = 0; i < lyricsArray.length; i++) {
      const lyrics = lyricsArray[i]
      const docRef = db.collection(LYRICS_COLLECTION).doc()

      batch.set(docRef, {
        userId,
        title: lyrics.title || `Lyrics ${i + 1}`,
        text: lyrics.text || '',
        prompt: prompt || '',
        taskId: taskId || '',
        variationIndex: i,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        isEdited: false,
        usedInSongs: [],
        tags: [],
        isFavorite: false,
      })

      savedIds.push(docRef.id)
    }

    await batch.commit()
    console.log('[lyricsService] Saved', savedIds.length, 'lyrics variations')

    return {
      success: true,
      lyricsIds: savedIds,
    }
  } catch (error) {
    console.error('[lyricsService] Error saving lyrics variations:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get a single lyrics document by ID
 *
 * @param {string} lyricsId - Lyrics document ID
 * @returns {Promise<object>} Result with lyrics data
 */
export const getLyrics = async (lyricsId) => {
  try {
    const doc = await db.collection(LYRICS_COLLECTION).doc(lyricsId).get()

    if (!doc.exists) {
      return {
        success: false,
        error: 'Lyrics not found',
      }
    }

    return {
      success: true,
      lyrics: {
        id: doc.id,
        ...doc.data(),
      },
    }
  } catch (error) {
    console.error('[lyricsService] Error getting lyrics:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Update lyrics text (marks as edited)
 *
 * @param {string} lyricsId - Lyrics document ID
 * @param {string} userId - User ID (for ownership verification)
 * @param {object} updates - Fields to update (title, text, tags)
 * @returns {Promise<object>} Result with success status
 */
export const updateLyrics = async (lyricsId, userId, updates) => {
  try {
    const docRef = db.collection(LYRICS_COLLECTION).doc(lyricsId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Lyrics not found' }
    }

    if (doc.data().userId !== userId) {
      return { success: false, error: 'Not authorized to edit these lyrics' }
    }

    const allowedUpdates = {}
    if (updates.title !== undefined) allowedUpdates.title = updates.title
    if (updates.text !== undefined) {
      allowedUpdates.text = updates.text
      allowedUpdates.isEdited = true
    }
    if (updates.tags !== undefined) allowedUpdates.tags = updates.tags
    if (updates.isFavorite !== undefined) allowedUpdates.isFavorite = updates.isFavorite

    allowedUpdates.updatedAt = firestore.FieldValue.serverTimestamp()

    await docRef.update(allowedUpdates)

    console.log('[lyricsService] Lyrics updated:', lyricsId)

    return { success: true }
  } catch (error) {
    console.error('[lyricsService] Error updating lyrics:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Delete lyrics
 *
 * @param {string} lyricsId - Lyrics document ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<object>} Result with success status
 */
export const deleteLyrics = async (lyricsId, userId) => {
  try {
    const docRef = db.collection(LYRICS_COLLECTION).doc(lyricsId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Lyrics not found' }
    }

    if (doc.data().userId !== userId) {
      return { success: false, error: 'Not authorized to delete these lyrics' }
    }

    await docRef.delete()

    console.log('[lyricsService] Lyrics deleted:', lyricsId)

    return { success: true }
  } catch (error) {
    console.error('[lyricsService] Error deleting lyrics:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Subscribe to user's lyrics collection (real-time updates)
 *
 * @param {string} userId - User ID
 * @param {function} callback - Callback with lyrics array
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserLyrics = (userId, callback) => {
  console.log('[lyricsService] subscribeToUserLyrics called with userId:', userId)

  if (!userId) {
    console.log('[lyricsService] No userId, returning empty array')
    callback([])
    return () => {}
  }

  console.log('[lyricsService] Setting up Firestore subscription for lyrics collection')

  return db
    .collection(LYRICS_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        console.log('[lyricsService] Snapshot received, doc count:', snapshot.docs.length)
        const lyrics = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        callback(lyrics)
      },
      (error) => {
        console.error('[lyricsService] Subscription error:', error)
        console.error('[lyricsService] Error code:', error.code)
        console.error('[lyricsService] Error message:', error.message)
        callback([])
      }
    )
}

/**
 * Mark lyrics as used in a song
 *
 * @param {string} lyricsId - Lyrics document ID
 * @param {string} songId - Song ID that uses these lyrics
 * @returns {Promise<object>} Result with success status
 */
export const markLyricsUsedInSong = async (lyricsId, songId) => {
  try {
    await db
      .collection(LYRICS_COLLECTION)
      .doc(lyricsId)
      .update({
        usedInSongs: firestore.FieldValue.arrayUnion(songId),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      })

    console.log('[lyricsService] Lyrics', lyricsId, 'marked as used in song', songId)

    return { success: true }
  } catch (error) {
    console.error('[lyricsService] Error marking lyrics used:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Toggle favorite status
 *
 * @param {string} lyricsId - Lyrics document ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Result with success status and new favorite state
 */
export const toggleLyricsFavorite = async (lyricsId, userId) => {
  try {
    const docRef = db.collection(LYRICS_COLLECTION).doc(lyricsId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Lyrics not found' }
    }

    if (doc.data().userId !== userId) {
      return { success: false, error: 'Not authorized' }
    }

    const newFavoriteState = !doc.data().isFavorite

    await docRef.update({
      isFavorite: newFavoriteState,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    })

    return { success: true, isFavorite: newFavoriteState }
  } catch (error) {
    console.error('[lyricsService] Error toggling favorite:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export default {
  saveLyrics,
  saveLyricsVariations,
  getLyrics,
  updateLyrics,
  deleteLyrics,
  subscribeToUserLyrics,
  markLyricsUsedInSong,
  toggleLyricsFavorite,
}
