/**
 * Songs Service - Firebase integration for AI-generated songs
 *
 * Handles saving, fetching, and managing user's AI-generated songs
 * Stores full song data including timestamped lyrics for karaoke sync
 */

import { db } from '../core/firebase/config'
import ffirestore from '@react-native-firebase/firestore'

// Collection references
export const songsRef = db.collection('songs')
export const userSongsRef = (userId) => db.collection('users').doc(userId).collection('songs')
export const userLikedSongsRef = (userId) => db.collection('users').doc(userId).collection('likedSongs')
export const songLikesRef = (songId) => db.collection('songs').doc(songId).collection('likes')

/**
 * Save an AI-generated song to Firebase
 *
 * @param {Object} songData - Song data to save
 * @param {string} songData.userId - User ID who created the song
 * @param {string} songData.sunoId - Suno API song ID
 * @param {string} songData.audioUrl - URL to audio file
 * @param {string} songData.streamUrl - URL for streaming
 * @param {string} songData.imageUrl - Cover image URL
 * @param {string} songData.title - Song title
 * @param {string} songData.style - Music style/tags
 * @param {string} songData.rawLyrics - Full lyrics text
 * @param {Array} songData.timestampedLyrics - Array of { text, startTime, endTime }
 * @param {number} songData.duration - Song duration in seconds
 * @param {string} songData.model - AI model version used (V4, V5, etc.)
 * @param {boolean} songData.instrumental - Whether song is instrumental
 * @param {string} songData.prompt - Original prompt/description used
 * @returns {Promise<Object>} Saved song with ID
 */
export const saveSong = async (songData) => {
  try {
    const now = ffirestore.FieldValue.serverTimestamp()

    const docData = {
      // User info
      userId: songData.userId,

      // Author info (denormalized for display)
      // This stores artist profile info for quick access without additional queries
      author: songData.author || null, // { id, stageName, bio, profilePictureURL, firstName, lastName }

      // Suno API data
      sunoId: songData.sunoId || null,
      audioUrl: songData.audioUrl,
      streamUrl: songData.streamUrl || songData.audioUrl,
      imageUrl: songData.imageUrl || null,
      videoUrl: songData.videoUrl || null, // Some Suno songs have video
      firebaseAudioUrl: songData.firebaseAudioUrl || null, // Our backup copy in Firebase Storage

      // Additional Suno metadata
      sunoModelName: songData.sunoModelName || null,
      sunoStatus: songData.sunoStatus || null,
      sunoCreatedAt: songData.sunoCreatedAt || null,

      // Song metadata
      title: songData.title || 'Untitled',
      style: songData.style || '',
      duration: songData.duration || 0,

      // Lyrics - both raw and timestamped for karaoke sync
      rawLyrics: songData.rawLyrics || '',
      timestampedLyrics: songData.timestampedLyrics || [],

      // Generation info
      model: songData.model || 'V4',
      instrumental: songData.instrumental || false,
      prompt: songData.prompt || '',

      // Timestamps
      createdAt: now,
      updatedAt: now,

      // Stats (for future features)
      playCount: 0,
      likeCount: 0,
      shareCount: 0,

      // Visibility
      isPublic: false, // Default to private
      isDeleted: false,
    }

    // Save to global songs collection
    const songRef = await songsRef.add(docData)

    // Also save a reference in user's songs subcollection for quick access
    await userSongsRef(songData.userId).doc(songRef.id).set({
      songId: songRef.id,
      title: docData.title,
      imageUrl: docData.imageUrl,
      duration: docData.duration,
      createdAt: now,
    })

    console.log('Song saved to Firebase:', songRef.id)

    return {
      id: songRef.id,
      ...docData,
    }
  } catch (error) {
    console.error('Error saving song to Firebase:', error)
    throw error
  }
}

/**
 * Get a song by ID
 *
 * @param {string} songId - Song document ID
 * @returns {Promise<Object|null>} Song data or null
 */
export const getSong = async (songId) => {
  try {
    const doc = await songsRef.doc(songId).get()
    if (doc.exists) {
      return {
        id: doc.id,
        ...doc.data(),
      }
    }
    return null
  } catch (error) {
    console.error('Error getting song:', error)
    throw error
  }
}

/**
 * Get all public songs (for discovery/feed)
 *
 * @param {number} limit - Max songs to fetch
 * @returns {Promise<Array>} Array of songs
 */
export const getAllSongs = async (limit = 50) => {
  try {
    const snapshot = await songsRef
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error getting all songs:', error)
    throw error
  }
}

/**
 * Get latest songs for "Today's Picks" section
 *
 * @param {number} limit - Max songs to fetch
 * @returns {Promise<Array>} Array of songs
 */
export const getLatestSongs = async (limit = 10) => {
  try {
    const snapshot = await songsRef
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error getting latest songs:', error)
    throw error
  }
}

/**
 * Get popular songs (sorted by play count)
 *
 * @param {number} limit - Max songs to fetch
 * @returns {Promise<Array>} Array of songs
 */
export const getPopularSongs = async (limit = 20) => {
  try {
    const snapshot = await songsRef
      .where('isDeleted', '==', false)
      .orderBy('playCount', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error getting popular songs:', error)
    throw error
  }
}

/**
 * Subscribe to all songs in real-time (for discovery feed)
 *
 * @param {Function} callback - Callback with songs array
 * @param {number} limit - Max songs to fetch
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllSongs = (callback, limit = 50) => {
  console.log('Subscribing to all songs')
  return songsRef
    .where('isDeleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .onSnapshot(
      (querySnapshot) => {
        const songs = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) || []
        console.log('All songs fetched from Firebase:', songs.length)
        callback(songs)
      },
      (error) => {
        console.error('Error subscribing to all songs:', error)
        callback([])
      }
    )
}

/**
 * Get all songs for a user
 *
 * @param {string} userId - User ID
 * @param {number} limit - Max songs to fetch
 * @returns {Promise<Array>} Array of songs
 */
export const getUserSongs = async (userId, limit = 50) => {
  try {
    const snapshot = await songsRef
      .where('userId', '==', userId)
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error getting user songs:', error)
    throw error
  }
}

/**
 * Subscribe to user's songs in real-time
 *
 * @param {string} userId - User ID
 * @param {Function} callback - Callback with songs array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUserSongs = (userId, callback) => {
  console.log('Subscribing to songs for user:', userId)
  return songsRef
    .where('userId', '==', userId)
    .where('isDeleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot(
      (querySnapshot) => {
        const songs = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) || []
        console.log('Songs fetched from Firebase:', songs.length, songs.map(s => s.title))
        callback(songs)
      },
      (error) => {
        console.error('Error subscribing to songs:', error)
        // Log detailed error info
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        callback([])
      }
    )
}

/**
 * Update song play count
 *
 * @param {string} songId - Song document ID
 */
export const incrementPlayCount = async (songId) => {
  try {
    await songsRef.doc(songId).update({
      playCount: ffirestore.FieldValue.increment(1),
      lastPlayedAt: ffirestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('Error incrementing play count:', error)
  }
}

/**
 * Delete a song (soft delete)
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for verification)
 */
export const deleteSong = async (songId, userId) => {
  try {
    const songDoc = await songsRef.doc(songId).get()

    if (!songDoc.exists) {
      throw new Error('Song not found')
    }

    if (songDoc.data().userId !== userId) {
      throw new Error('Unauthorized to delete this song')
    }

    // Soft delete
    await songsRef.doc(songId).update({
      isDeleted: true,
      deletedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    // Also remove from user's songs subcollection
    await userSongsRef(userId).doc(songId).delete()

    return true
  } catch (error) {
    console.error('Error deleting song:', error)
    throw error
  }
}

/**
 * Toggle song public/private visibility
 *
 * @param {string} songId - Song document ID
 * @param {boolean} isPublic - New visibility state
 */
export const updateSongVisibility = async (songId, isPublic) => {
  try {
    await songsRef.doc(songId).update({
      isPublic,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('Error updating song visibility:', error)
    throw error
  }
}

/**
 * Toggle like on a song
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID who is liking
 * @param {Object} songData - Song data for storing in user's liked songs
 * @returns {Promise<boolean>} True if now liked, false if unliked
 */
export const toggleSongLike = async (songId, userId, songData = {}) => {
  try {
    const now = ffirestore.FieldValue.serverTimestamp()
    const likeDoc = await songLikesRef(songId).doc(userId).get()
    // React Native Firebase: exists can be property or method depending on version
    const docExists = typeof likeDoc.exists === 'function' ? likeDoc.exists() : likeDoc.exists

    if (docExists) {
      // Unlike - remove from both places
      await Promise.all([
        songLikesRef(songId).doc(userId).delete(),
        userLikedSongsRef(userId).doc(songId).delete(),
        songsRef.doc(songId).update({
          likeCount: ffirestore.FieldValue.increment(-1),
        }),
      ])
      console.log('Song unliked:', songId)
      return false
    } else {
      // Like - add to both places
      await Promise.all([
        songLikesRef(songId).doc(userId).set({
          likedAt: now,
        }),
        userLikedSongsRef(userId).doc(songId).set({
          songId,
          title: songData.title || '',
          imageUrl: songData.imageUrl || null,
          artist: songData.artist || '',
          likedAt: now,
        }),
        songsRef.doc(songId).update({
          likeCount: ffirestore.FieldValue.increment(1),
        }),
      ])
      console.log('Song liked:', songId)
      return true
    }
  } catch (error) {
    console.error('Error toggling song like:', error)
    throw error
  }
}

/**
 * Check if a user has liked a song
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if liked
 */
export const isSongLiked = async (songId, userId) => {
  console.log('[songsService] isSongLiked called - songId:', songId, 'userId:', userId)
  try {
    const likeDoc = await songLikesRef(songId).doc(userId).get()
    // React Native Firebase: exists can be property or method depending on version
    const exists = typeof likeDoc.exists === 'function' ? likeDoc.exists() : likeDoc.exists
    console.log('[songsService] isSongLiked result - songId:', songId, 'exists:', exists)
    return exists
  } catch (error) {
    console.error('[songsService] isSongLiked error:', error)
    return false
  }
}

/**
 * Subscribe to user's liked songs in real-time
 *
 * @param {string} userId - User ID
 * @param {Function} callback - Callback with liked song IDs set
 * @returns {Function} Unsubscribe function
 */
export const subscribeToLikedSongs = (userId, callback) => {
  return userLikedSongsRef(userId).onSnapshot(
    (querySnapshot) => {
      const likedSongIds = new Set()
      querySnapshot?.docs?.forEach(doc => {
        likedSongIds.add(doc.id)
      })
      callback(likedSongIds)
    },
    (error) => {
      console.error('Error subscribing to liked songs:', error)
      callback(new Set())
    }
  )
}

/**
 * Get all liked songs for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of liked song data
 */
export const getUserLikedSongs = async (userId) => {
  try {
    const snapshot = await userLikedSongsRef(userId)
      .orderBy('likedAt', 'desc')
      .limit(100)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error getting liked songs:', error)
    return []
  }
}

export default {
  saveSong,
  getSong,
  getUserSongs,
  getAllSongs,
  getLatestSongs,
  getPopularSongs,
  subscribeToUserSongs,
  subscribeToAllSongs,
  incrementPlayCount,
  deleteSong,
  updateSongVisibility,
  toggleSongLike,
  isSongLiked,
  subscribeToLikedSongs,
  getUserLikedSongs,
}
