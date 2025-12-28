/**
 * Artist Voice Service - Firebase integration for Synthetic Singers
 *
 * Handles saving, fetching, and managing user's Artist Voices (Suno Personas)
 * An Artist Voice captures the vocal style from a song for reuse in future generations
 */

import { db } from '../core/firebase/config'
import firestore from '@react-native-firebase/firestore'
import { generatePersona, checkArtistVoiceEligibility } from './sunoApi'
import { canUserPerformAction } from '../constants/songRights'

// Collection references
export const userVoicesRef = (userId) => db.collection('users').doc(userId).collection('artistVoices')

/**
 * Create an Artist Voice from an existing song
 * Calls Suno API to generate persona, then saves to Firebase
 *
 * @param {Object} params - Voice creation parameters
 * @param {string} params.userId - User ID who owns the voice (the creator of the Artist Voice)
 * @param {Object} params.song - Source song object from Firebase
 * @param {string} params.name - User-given name for the voice
 * @param {string} params.description - Optional description of the voice style
 * @returns {Promise<Object>} Saved Artist Voice with ID
 */
export const createArtistVoice = async ({ userId, song, name, description = '' }) => {
  try {
    console.log('[artistVoiceService] Creating Artist Voice:', { userId, songId: song?.id, name })

    if (!userId) {
      throw new Error('User ID is required')
    }
    if (!song) {
      throw new Error('Source song is required')
    }
    if (!name || !name.trim()) {
      throw new Error('Voice name is required')
    }

    // Check song rights - does this user have permission to create an Artist Voice?
    const hasPermission = canUserPerformAction(song, userId, 'artistVoice')
    if (!hasPermission) {
      throw new Error('The song owner has not allowed Synthetic Singer creation from this song')
    }

    // Check technical eligibility (model version, expiration, etc.)
    const eligibility = checkArtistVoiceEligibility(song)
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason)
    }

    // Extract Suno IDs from song
    const audioId = song.sunoId || song.suno_id || song.audioId
    const taskId = song.taskId || song.task_id || song.sunoTaskId

    if (!audioId || !taskId) {
      throw new Error('Song is missing required Suno IDs')
    }

    // Call Suno API to create the persona
    const personaResult = await generatePersona({
      taskId,
      audioId,
      name: name.trim(),
      description: description.trim(),
    })

    if (!personaResult.personaId) {
      throw new Error('Failed to create Synthetic Singer - no persona ID returned')
    }

    // Save to Firebase
    const now = firestore.FieldValue.serverTimestamp()
    const voiceData = {
      // Suno persona ID - key for reuse
      personaId: personaResult.personaId,

      // User-provided metadata
      name: name.trim(),
      description: description.trim(),

      // Source song reference (denormalized for display)
      sourceSong: {
        songId: song.id,
        sunoId: audioId,
        taskId: taskId,
        title: song.title || 'Untitled',
        imageUrl: song.imageUrl || song.image_url || null,
        style: song.style || song.tags || '',
      },

      // Usage tracking
      usageCount: 0,
      lastUsedAt: null,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await userVoicesRef(userId).add(voiceData)
    console.log('[artistVoiceService] Artist Voice saved to Firebase:', docRef.id)

    // Also update the source song to mark it has a persona
    try {
      const songRef = db.collection('songs').doc(song.id)
      await songRef.update({
        artistVoiceId: docRef.id,
        personaId: personaResult.personaId,
        updatedAt: now,
      })
      console.log('[artistVoiceService] Updated source song with personaId')
    } catch (songUpdateError) {
      console.warn('[artistVoiceService] Could not update source song:', songUpdateError.message)
      // Non-fatal - voice was still created
    }

    return {
      id: docRef.id,
      ...voiceData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error) {
    console.error('[artistVoiceService] Error creating Artist Voice:', error)
    throw error
  }
}

/**
 * Get all Artist Voices for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of Artist Voice objects
 */
export const getUserVoices = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    const snapshot = await userVoicesRef(userId)
      .orderBy('createdAt', 'desc')
      .get()

    const voices = []
    snapshot.forEach((doc) => {
      voices.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastUsedAt: doc.data().lastUsedAt?.toDate(),
      })
    })

    console.log('[artistVoiceService] Fetched', voices.length, 'Artist Voices for user:', userId)
    return voices
  } catch (error) {
    console.error('[artistVoiceService] Error fetching user voices:', error)
    throw error
  }
}

/**
 * Subscribe to real-time updates for user's Artist Voices
 *
 * @param {string} userId - User ID
 * @param {function} onUpdate - Callback with voices array
 * @param {function} onError - Error callback
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserVoices = (userId, onUpdate, onError) => {
  if (!userId) {
    onError?.(new Error('User ID is required'))
    return () => {}
  }

  return userVoicesRef(userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const voices = []
        snapshot.forEach((doc) => {
          voices.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            lastUsedAt: doc.data().lastUsedAt?.toDate(),
          })
        })
        onUpdate(voices)
      },
      (error) => {
        console.error('[artistVoiceService] Subscription error:', error)
        onError?.(error)
      }
    )
}

/**
 * Get a single Artist Voice by ID
 *
 * @param {string} userId - User ID
 * @param {string} voiceId - Voice document ID
 * @returns {Promise<Object|null>} Artist Voice object or null
 */
export const getVoiceById = async (userId, voiceId) => {
  try {
    if (!userId || !voiceId) {
      return null
    }

    const doc = await userVoicesRef(userId).doc(voiceId).get()

    if (!doc.exists) {
      return null
    }

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastUsedAt: doc.data().lastUsedAt?.toDate(),
    }
  } catch (error) {
    console.error('[artistVoiceService] Error fetching voice by ID:', error)
    throw error
  }
}

/**
 * Update an Artist Voice (rename, update description)
 *
 * @param {string} userId - User ID
 * @param {string} voiceId - Voice document ID
 * @param {Object} updates - Fields to update (name, description)
 * @returns {Promise<void>}
 */
export const updateVoice = async (userId, voiceId, updates) => {
  try {
    if (!userId || !voiceId) {
      throw new Error('User ID and Voice ID are required')
    }

    const allowedFields = ['name', 'description']
    const sanitizedUpdates = {}

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = typeof updates[field] === 'string'
          ? updates[field].trim()
          : updates[field]
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      throw new Error('No valid fields to update')
    }

    sanitizedUpdates.updatedAt = firestore.FieldValue.serverTimestamp()

    await userVoicesRef(userId).doc(voiceId).update(sanitizedUpdates)
    console.log('[artistVoiceService] Updated Artist Voice:', voiceId)
  } catch (error) {
    console.error('[artistVoiceService] Error updating voice:', error)
    throw error
  }
}

/**
 * Delete an Artist Voice
 * Note: The Suno persona will still exist, but we remove our reference
 *
 * @param {string} userId - User ID
 * @param {string} voiceId - Voice document ID
 * @returns {Promise<void>}
 */
export const deleteVoice = async (userId, voiceId) => {
  try {
    if (!userId || !voiceId) {
      throw new Error('User ID and Voice ID are required')
    }

    // Get the voice to find the source song
    const voice = await getVoiceById(userId, voiceId)

    if (voice) {
      // Clear the reference from the source song
      try {
        if (voice.sourceSong?.songId) {
          const songRef = db.collection('songs').doc(voice.sourceSong.songId)
          await songRef.update({
            artistVoiceId: firestore.FieldValue.delete(),
            personaId: firestore.FieldValue.delete(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          })
        }
      } catch (songUpdateError) {
        console.warn('[artistVoiceService] Could not clear song reference:', songUpdateError.message)
      }
    }

    await userVoicesRef(userId).doc(voiceId).delete()
    console.log('[artistVoiceService] Deleted Artist Voice:', voiceId)
  } catch (error) {
    console.error('[artistVoiceService] Error deleting voice:', error)
    throw error
  }
}

/**
 * Increment usage count when a voice is used in a new song
 *
 * @param {string} userId - User ID
 * @param {string} voiceId - Voice document ID
 * @returns {Promise<void>}
 */
export const incrementVoiceUsage = async (userId, voiceId) => {
  try {
    if (!userId || !voiceId) {
      return
    }

    await userVoicesRef(userId).doc(voiceId).update({
      usageCount: firestore.FieldValue.increment(1),
      lastUsedAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    })

    console.log('[artistVoiceService] Incremented usage for voice:', voiceId)
  } catch (error) {
    console.warn('[artistVoiceService] Error incrementing usage:', error.message)
    // Non-fatal - don't throw
  }
}

/**
 * Check if a user can create an Artist Voice from a song
 * Checks both song rights AND technical eligibility
 *
 * @param {Object} song - Song object
 * @param {string} userId - User ID attempting to create the voice
 * @returns {Object} { eligible, reason, daysRemaining, noPermission, isOwner }
 */
export const canCreateVoiceFromSong = (song, userId) => {
  if (!song) {
    return { eligible: false, reason: 'Song not found' }
  }

  // Check multiple possible field names for song owner
  const songOwnerId = song.userId || song.authorID || song.ownerId || song.creatorId || song.author?.id
  const isOwner = songOwnerId === userId

  // Debug logging
  console.log('[canCreateVoiceFromSong] Checking eligibility:', {
    songId: song.id,
    userId,
    songOwnerId,
    isOwner,
    songKeys: Object.keys(song),
    songUserId: song.userId,
    songAuthorID: song.authorID,
    songOwnerId2: song.ownerId,
    songCreatorId: song.creatorId,
    songAuthor: song.author,
  })

  // Check song rights first (unless user is the owner)
  if (!isOwner) {
    const hasPermission = canUserPerformAction(song, userId, 'artistVoice')
    console.log('[canCreateVoiceFromSong] Not owner, checking permissions:', hasPermission)
    if (!hasPermission) {
      return {
        eligible: false,
        reason: 'The artist has not allowed Synthetic Singer creation from this song',
        noPermission: true,
        isOwner: false,
      }
    }
  }

  // Check technical eligibility (model version, expiration, etc.)
  const technicalEligibility = checkArtistVoiceEligibility(song)

  return {
    ...technicalEligibility,
    isOwner,
    noPermission: false,
  }
}

/**
 * Get voices by personaId (for finding which voice was used)
 *
 * @param {string} userId - User ID
 * @param {string} personaId - Suno persona ID
 * @returns {Promise<Object|null>} Artist Voice or null
 */
export const getVoiceByPersonaId = async (userId, personaId) => {
  try {
    if (!userId || !personaId) {
      return null
    }

    const snapshot = await userVoicesRef(userId)
      .where('personaId', '==', personaId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastUsedAt: doc.data().lastUsedAt?.toDate(),
    }
  } catch (error) {
    console.error('[artistVoiceService] Error fetching voice by personaId:', error)
    return null
  }
}

export default {
  createArtistVoice,
  getUserVoices,
  subscribeToUserVoices,
  getVoiceById,
  updateVoice,
  deleteVoice,
  incrementVoiceUsage,
  canCreateVoiceFromSong,
  getVoiceByPersonaId,
  userVoicesRef,
}
