/**
 * Beats Service - Firestore operations for user-created beats (instrumentals)
 *
 * Handles CRUD operations for AI-generated beats stored in the 'beats' collection.
 * Beats are instrumental tracks created via Suno API with instrumental: true
 *
 * Schema:
 * - id: string (auto-generated)
 * - userId: string (owner)
 * - title: string (AI-generated or user-provided title)
 * - prompt: string (user's original prompt/description)
 * - style: string (genre/style tags from Suno)
 * - audioUrl: string (main audio URL)
 * - streamUrl: string (streaming URL)
 * - imageUrl: string (cover art URL)
 * - duration: number (duration in seconds)
 * - sunoId: string (Suno audio ID)
 * - taskId: string (Suno API task ID)
 * - modelName: string (Suno model used - V4, V5, etc.)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - isEdited: boolean (true if user has modified metadata)
 * - usedInSongs: array of song IDs where this beat was used
 * - tags: array of strings for categorization
 * - isFavorite: boolean
 * - bpm: number (beats per minute, if detected)
 * - key: string (musical key, if detected)
 * - isPublic: boolean (for beat marketplace - future feature)
 * - price: number (for selling beats - future feature)
 */

import { db, firestore } from '../core/firebase/config'

const BEATS_COLLECTION = 'beats'

/**
 * Save a beat to Firestore
 *
 * @param {object} beatData - Beat data to save
 * @returns {Promise<object>} Result with success status and beat ID
 */
export const saveBeat = async (beatData) => {
  try {
    const {
      userId,
      title,
      prompt,
      style,
      audioUrl,
      streamUrl,
      imageUrl,
      duration,
      sunoId,
      taskId,
      modelName,
      bpm,
      key,
    } = beatData

    if (!userId) {
      throw new Error('User ID is required')
    }
    if (!audioUrl) {
      throw new Error('Audio URL is required')
    }

    const docRef = await db.collection(BEATS_COLLECTION).add({
      userId,
      title: title || 'Untitled Beat',
      prompt: prompt || '',
      style: style || '',
      audioUrl,
      streamUrl: streamUrl || audioUrl,
      imageUrl: imageUrl || '',
      duration: duration || 0,
      sunoId: sunoId || '',
      taskId: taskId || '',
      modelName: modelName || '',
      bpm: bpm || null,
      key: key || null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      isEdited: false,
      usedInSongs: [],
      tags: [],
      isFavorite: false,
      isPublic: false,
      price: 0,
    })

    console.log('[beatsService] Beat saved with ID:', docRef.id)

    return {
      success: true,
      beatId: docRef.id,
    }
  } catch (error) {
    console.error('[beatsService] Error saving beat:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Save multiple beats from a single generation
 * (Suno typically returns 2 variations per generation)
 *
 * @param {string} userId - User ID
 * @param {string} prompt - Original prompt
 * @param {string} taskId - Suno API task ID
 * @param {array} beatsArray - Array of beat objects from Suno API
 * @returns {Promise<object>} Result with success status and saved IDs
 */
export const saveBeatsVariations = async (userId, prompt, taskId, beatsArray) => {
  try {
    console.log('[beatsService] saveBeatsVariations called:')
    console.log('[beatsService] - userId:', userId)
    console.log('[beatsService] - beatsArray length:', beatsArray?.length)

    if (!userId) {
      console.error('[beatsService] ERROR: userId is null/undefined!')
      return { success: false, error: 'User ID is required' }
    }

    const savedIds = []
    const batch = db.batch()

    for (let i = 0; i < beatsArray.length; i++) {
      const beat = beatsArray[i]
      const docRef = db.collection(BEATS_COLLECTION).doc()

      batch.set(docRef, {
        userId,
        title: beat.title || `Beat ${i + 1}`,
        prompt: prompt || '',
        style: beat.tags || beat.style || '',
        audioUrl: beat.audio_url || beat.audioUrl || '',
        streamUrl: beat.stream_url || beat.streamUrl || beat.audio_url || beat.audioUrl || '',
        imageUrl: beat.image_url || beat.imageUrl || '',
        duration: beat.duration || 0,
        sunoId: beat.id || '',
        taskId: taskId || '',
        modelName: beat.model_name || beat.modelName || '',
        bpm: null,
        key: null,
        variationIndex: i,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        isEdited: false,
        usedInSongs: [],
        tags: [],
        isFavorite: false,
        isPublic: false,
        price: 0,
      })

      savedIds.push(docRef.id)
    }

    await batch.commit()
    console.log('[beatsService] Saved', savedIds.length, 'beat variations')

    return {
      success: true,
      beatIds: savedIds,
    }
  } catch (error) {
    console.error('[beatsService] Error saving beat variations:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get a single beat document by ID
 *
 * @param {string} beatId - Beat document ID
 * @returns {Promise<object>} Result with beat data
 */
export const getBeat = async (beatId) => {
  try {
    const doc = await db.collection(BEATS_COLLECTION).doc(beatId).get()

    if (!doc.exists) {
      return {
        success: false,
        error: 'Beat not found',
      }
    }

    return {
      success: true,
      beat: {
        id: doc.id,
        ...doc.data(),
      },
    }
  } catch (error) {
    console.error('[beatsService] Error getting beat:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Update beat metadata
 *
 * @param {string} beatId - Beat document ID
 * @param {string} userId - User ID (for ownership verification)
 * @param {object} updates - Fields to update (title, tags, bpm, key, etc.)
 * @returns {Promise<object>} Result with success status
 */
export const updateBeat = async (beatId, userId, updates) => {
  try {
    const docRef = db.collection(BEATS_COLLECTION).doc(beatId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Beat not found' }
    }

    if (doc.data().userId !== userId) {
      return { success: false, error: 'Not authorized to edit this beat' }
    }

    const allowedUpdates = {}
    if (updates.title !== undefined) allowedUpdates.title = updates.title
    if (updates.tags !== undefined) allowedUpdates.tags = updates.tags
    if (updates.isFavorite !== undefined) allowedUpdates.isFavorite = updates.isFavorite
    if (updates.bpm !== undefined) allowedUpdates.bpm = updates.bpm
    if (updates.key !== undefined) allowedUpdates.key = updates.key
    if (updates.isPublic !== undefined) allowedUpdates.isPublic = updates.isPublic
    if (updates.price !== undefined) allowedUpdates.price = updates.price

    // Mark as edited if any metadata changed
    if (Object.keys(allowedUpdates).length > 0 && !updates.isFavorite) {
      allowedUpdates.isEdited = true
    }

    allowedUpdates.updatedAt = firestore.FieldValue.serverTimestamp()

    await docRef.update(allowedUpdates)

    console.log('[beatsService] Beat updated:', beatId)

    return { success: true }
  } catch (error) {
    console.error('[beatsService] Error updating beat:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Delete a beat
 *
 * @param {string} beatId - Beat document ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<object>} Result with success status
 */
export const deleteBeat = async (beatId, userId) => {
  try {
    const docRef = db.collection(BEATS_COLLECTION).doc(beatId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Beat not found' }
    }

    if (doc.data().userId !== userId) {
      return { success: false, error: 'Not authorized to delete this beat' }
    }

    await docRef.delete()

    console.log('[beatsService] Beat deleted:', beatId)

    return { success: true }
  } catch (error) {
    console.error('[beatsService] Error deleting beat:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Subscribe to user's beats collection (real-time updates)
 *
 * @param {string} userId - User ID
 * @param {function} callback - Callback with beats array
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserBeats = (userId, callback) => {
  console.log('[beatsService] subscribeToUserBeats called with userId:', userId)

  if (!userId) {
    console.log('[beatsService] No userId, returning empty array')
    callback([])
    return () => {}
  }

  console.log('[beatsService] Setting up Firestore subscription for beats collection')

  return db
    .collection(BEATS_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        console.log('[beatsService] Snapshot received, doc count:', snapshot.docs.length)
        const beats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        callback(beats)
      },
      (error) => {
        console.error('[beatsService] Subscription error:', error)
        console.error('[beatsService] Error code:', error.code)
        console.error('[beatsService] Error message:', error.message)
        callback([])
      }
    )
}

/**
 * Mark beat as used in a song
 *
 * @param {string} beatId - Beat document ID
 * @param {string} songId - Song ID that uses this beat
 * @returns {Promise<object>} Result with success status
 */
export const markBeatUsedInSong = async (beatId, songId) => {
  try {
    await db
      .collection(BEATS_COLLECTION)
      .doc(beatId)
      .update({
        usedInSongs: firestore.FieldValue.arrayUnion(songId),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      })

    console.log('[beatsService] Beat', beatId, 'marked as used in song', songId)

    return { success: true }
  } catch (error) {
    console.error('[beatsService] Error marking beat used:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Toggle favorite status
 *
 * @param {string} beatId - Beat document ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Result with success status and new favorite state
 */
export const toggleBeatFavorite = async (beatId, userId) => {
  try {
    const docRef = db.collection(BEATS_COLLECTION).doc(beatId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return { success: false, error: 'Beat not found' }
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
    console.error('[beatsService] Error toggling favorite:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get public beats for marketplace (future feature)
 *
 * @param {number} limit - Number of beats to fetch
 * @returns {Promise<object>} Result with beats array
 */
export const getPublicBeats = async (limit = 20) => {
  try {
    const snapshot = await db
      .collection(BEATS_COLLECTION)
      .where('isPublic', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    const beats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return {
      success: true,
      beats,
    }
  } catch (error) {
    console.error('[beatsService] Error getting public beats:', error)
    return {
      success: false,
      error: error.message,
      beats: [],
    }
  }
}

export default {
  saveBeat,
  saveBeatsVariations,
  getBeat,
  updateBeat,
  deleteBeat,
  subscribeToUserBeats,
  markBeatUsedInSong,
  toggleBeatFavorite,
  getPublicBeats,
}
