/**
 * Songs Service - Firebase integration for AI-generated songs
 *
 * Handles saving, fetching, and managing user's AI-generated songs
 * Stores full song data including timestamped lyrics for karaoke sync
 */

import { db } from '../core/firebase/config'
import ffirestore from '@react-native-firebase/firestore'
import { DEFAULT_SONG_RIGHTS, mergeWithDefaultRights, VISIBILITY } from '../constants/songRights'

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
 * @param {Object} songData.rights - Song rights/permissions (visibility, monetization, derivatives)
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
      videoUrl: songData.videoUrl || null, // Suno-generated music video URL
      firebaseAudioUrl: songData.firebaseAudioUrl || null, // Our backup copy in Firebase Storage
      firebaseVideoUrl: songData.firebaseVideoUrl || null, // Our backup video in Firebase Storage

      // Video metadata (for Suno-generated music videos)
      videoMetadata: songData.videoMetadata || null, // { duration, resolution, fileSize, thumbnailUrl, createdAt, expiresAt, taskId }
      videoGenerationStatus: songData.videoGenerationStatus || null, // 'pending' | 'generating' | 'complete' | 'failed'
      videoTaskId: songData.videoTaskId || null, // Task ID for polling video generation

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

      // Song Rights - visibility, monetization, derivative works permissions
      // Merge user-provided rights with defaults
      rights: mergeWithDefaultRights(songData.rights || {}),

      // Legacy visibility field (keeping for backwards compatibility)
      // New code should use rights.visibility instead
      isPublic: songData.rights?.visibility === VISIBILITY.PUBLIC ||
                songData.isPublic ||
                false,
      isDeleted: false,

      // Suno availability tracking
      sunoAudioAvailable: true, // Tracks if audio is still available on Suno servers
      sunoTaskId: songData.sunoTaskId || null, // Required for video generation
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

    return { success: true }
  } catch (error) {
    console.error('Error deleting song:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Toggle song public/private visibility
 * Updates both the legacy isPublic field and the new rights.visibility field
 *
 * @param {string} songId - Song document ID
 * @param {boolean} isPublic - New visibility state
 */
export const updateSongVisibility = async (songId, isPublic) => {
  try {
    const visibility = isPublic ? VISIBILITY.PUBLIC : VISIBILITY.PRIVATE
    await songsRef.doc(songId).update({
      isPublic,
      'rights.visibility': visibility,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('Error updating song visibility:', error)
    throw error
  }
}

/**
 * Update song rights/permissions
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for verification)
 * @param {Object} rightsUpdates - Partial rights object with fields to update
 * @returns {Promise<Object>} Updated song data
 */
export const updateSongRights = async (songId, userId, rightsUpdates) => {
  try {
    console.log('[updateSongRights] Updating rights for song:', songId)
    const songDoc = await songsRef.doc(songId).get()

    if (!songDoc.exists) {
      throw new Error('Song not found')
    }

    const songData = songDoc.data()
    if (songData.userId !== userId) {
      throw new Error('Unauthorized to update this song')
    }

    // Get current rights or defaults
    const currentRights = songData.rights || DEFAULT_SONG_RIGHTS

    // Merge updates with current rights
    const updatedRights = {
      ...currentRights,
      ...rightsUpdates,
    }

    // Build update object with dot notation for nested rights fields
    const updateData = {
      rights: updatedRights,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    }

    // Also update legacy isPublic field for backwards compatibility
    if (rightsUpdates.visibility !== undefined) {
      updateData.isPublic = rightsUpdates.visibility === VISIBILITY.PUBLIC
    }

    await songsRef.doc(songId).update(updateData)

    console.log('[updateSongRights] Rights updated successfully:', Object.keys(rightsUpdates))

    return {
      id: songId,
      ...songData,
      rights: updatedRights,
    }
  } catch (error) {
    console.error('[updateSongRights] Error:', error.message)
    throw error
  }
}

/**
 * Get a song's current rights, merging with defaults for any missing fields
 *
 * @param {string} songId - Song document ID
 * @returns {Promise<Object>} Complete rights object
 */
export const getSongRights = async (songId) => {
  try {
    const doc = await songsRef.doc(songId).get()
    if (!doc.exists) {
      throw new Error('Song not found')
    }

    const songData = doc.data()
    return mergeWithDefaultRights(songData.rights || {})
  } catch (error) {
    console.error('[getSongRights] Error:', error.message)
    throw error
  }
}

/**
 * Update a song's fields (cover image, media assets, etc.)
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for verification)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated song data
 */
export const updateSong = async (songId, userId, updates) => {
  try {
    console.log('[updateSong] Starting update for song:', songId, 'by user:', userId)
    const songDoc = await songsRef.doc(songId).get()

    if (!songDoc.exists) {
      console.error('[updateSong] Song not found:', songId)
      throw new Error('Song not found')
    }

    const songData = songDoc.data()
    console.log('[updateSong] Song owner:', songData.userId, 'Requester:', userId)

    if (songData.userId !== userId) {
      console.error('[updateSong] Unauthorized - song owner:', songData.userId, 'requester:', userId)
      throw new Error('Unauthorized to update this song')
    }

    // Add timestamp to updates
    const updateData = {
      ...updates,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    }

    console.log('[updateSong] Applying updates:', Object.keys(updates))
    console.log('[updateSong] Update values:', JSON.stringify(updates, null, 2))
    await songsRef.doc(songId).update(updateData)
    console.log('[updateSong] Firestore update complete')

    // READ-BACK VERIFICATION: Confirm the update actually persisted
    const verifyDoc = await songsRef.doc(songId).get()
    const verifyData = verifyDoc.data()
    console.log('[updateSong] VERIFY READ-BACK:', {
      songId,
      imageUrl: verifyData?.imageUrl?.substring(0, 80),
      updatedAt: verifyData?.updatedAt,
    })

    // Also update the user's songs subcollection if imageUrl was updated
    if (updates.imageUrl) {
      await userSongsRef(userId).doc(songId).update({
        imageUrl: updates.imageUrl,
      }).catch(() => {
        // Subcollection doc might not exist for older songs
        console.log('[updateSong] Note: Could not update user songs subcollection')
      })
    }

    console.log('[updateSong] Song updated successfully:', songId)

    // Return the VERIFIED data, not the old data
    return {
      id: songId,
      ...verifyData,
    }
  } catch (error) {
    console.error('[updateSong] Error:', error.message)
    throw error
  }
}

/**
 * Add media assets to a song (for custom video creation)
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for verification)
 * @param {Array} mediaAssets - Array of { url, type, thumbnailUrl, duration?, order }
 * @returns {Promise<Object>} Updated song data
 */
export const addSongMediaAssets = async (songId, userId, mediaAssets) => {
  try {
    const songDoc = await songsRef.doc(songId).get()

    if (!songDoc.exists) {
      throw new Error('Song not found')
    }

    const songData = songDoc.data()
    if (songData.userId !== userId) {
      throw new Error('Unauthorized to update this song')
    }

    // Get existing media assets and append new ones
    const existingAssets = songData.mediaAssets || []
    const updatedAssets = [...existingAssets, ...mediaAssets]

    await songsRef.doc(songId).update({
      mediaAssets: updatedAssets,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log('Media assets added to song:', songId, mediaAssets.length, 'new assets')

    return {
      id: songId,
      ...songData,
      mediaAssets: updatedAssets,
    }
  } catch (error) {
    console.error('Error adding media assets to song:', error)
    throw error
  }
}

/**
 * Remove a media asset from a song
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for verification)
 * @param {number} assetIndex - Index of the asset to remove
 * @returns {Promise<Object>} Updated song data
 */
export const removeSongMediaAsset = async (songId, userId, assetIndex) => {
  try {
    const songDoc = await songsRef.doc(songId).get()

    if (!songDoc.exists) {
      throw new Error('Song not found')
    }

    const songData = songDoc.data()
    if (songData.userId !== userId) {
      throw new Error('Unauthorized to update this song')
    }

    const existingAssets = songData.mediaAssets || []
    if (assetIndex < 0 || assetIndex >= existingAssets.length) {
      throw new Error('Invalid asset index')
    }

    // Remove the asset at the specified index
    const updatedAssets = existingAssets.filter((_, i) => i !== assetIndex)

    await songsRef.doc(songId).update({
      mediaAssets: updatedAssets,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log('Media asset removed from song:', songId)

    return {
      id: songId,
      ...songData,
      mediaAssets: updatedAssets,
    }
  } catch (error) {
    console.error('Error removing media asset from song:', error)
    throw error
  }
}

/**
 * Update author info on all songs owned by a user
 * Useful when user updates their profile (stageName, bio, profilePictureURL)
 *
 * @param {string} userId - User ID whose songs to update
 * @param {Object} authorInfo - New author info { stageName, bio, profilePictureURL, firstName, lastName }
 * @returns {Promise<number>} Number of songs updated
 */
export const updateUserSongsAuthorInfo = async (userId, authorInfo) => {
  try {
    // Get all songs by this user
    const snapshot = await songsRef
      .where('userId', '==', userId)
      .where('isDeleted', '==', false)
      .get()

    if (snapshot.empty) {
      console.log('No songs found for user:', userId)
      return 0
    }

    const batch = db.batch()
    const now = ffirestore.FieldValue.serverTimestamp()

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        author: {
          id: userId,
          stageName: authorInfo.stageName || null,
          bio: authorInfo.bio || null,
          profilePictureURL: authorInfo.profilePictureURL || null,
          firstName: authorInfo.firstName || null,
          lastName: authorInfo.lastName || null,
        },
        updatedAt: now,
      })
    })

    await batch.commit()
    console.log('Updated author info on', snapshot.docs.length, 'songs for user:', userId)

    return snapshot.docs.length
  } catch (error) {
    console.error('Error updating songs author info:', error)
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
      // First check current likeCount to prevent going negative
      const songDoc = await songsRef.doc(songId).get()
      const currentLikeCount = songDoc.data()?.likeCount || 0

      await Promise.all([
        songLikesRef(songId).doc(userId).delete(),
        userLikedSongsRef(userId).doc(songId).delete(),
        // Only decrement if count is > 0 to prevent negative values
        currentLikeCount > 0
          ? songsRef.doc(songId).update({
              likeCount: ffirestore.FieldValue.increment(-1),
            })
          : Promise.resolve(),
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

    // Get song IDs and likedAt timestamps
    const likedSongsData = snapshot.docs.map(doc => ({
      songId: doc.id,
      likedAt: doc.data().likedAt,
    }))

    if (likedSongsData.length === 0) {
      return []
    }

    // Fetch fresh song data from the main songs collection
    const songIds = likedSongsData.map(s => s.songId)
    const songsSnapshot = await songsRef
      .where(ffirestore.FieldPath.documentId(), 'in', songIds.slice(0, 10)) // Firestore 'in' limit is 10
      .get()

    // Create a map of song data
    const songsMap = {}
    songsSnapshot.docs.forEach(doc => {
      songsMap[doc.id] = { id: doc.id, ...doc.data() }
    })

    // For songs beyond the first 10, fetch in batches
    for (let i = 10; i < songIds.length; i += 10) {
      const batchIds = songIds.slice(i, i + 10)
      const batchSnapshot = await songsRef
        .where(ffirestore.FieldPath.documentId(), 'in', batchIds)
        .get()
      batchSnapshot.docs.forEach(doc => {
        songsMap[doc.id] = { id: doc.id, ...doc.data() }
      })
    }

    // Return songs in order of likedAt, with fresh data
    return likedSongsData
      .map(liked => songsMap[liked.songId])
      .filter(song => song && !song.isDeleted) // Filter out deleted songs
  } catch (error) {
    console.error('Error getting liked songs:', error)
    return []
  }
}

/**
 * Mark a song's Suno audio as unavailable
 * Called when we detect that Suno returns "song not found" during video generation
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for verification)
 * @returns {Promise<Object>} Result with success status
 */
export const markSunoAudioUnavailable = async (songId, userId) => {
  try {
    console.log('[markSunoAudioUnavailable] Marking song as unavailable:', songId)
    const songDoc = await songsRef.doc(songId).get()

    if (!songDoc.exists) {
      throw new Error('Song not found')
    }

    const songData = songDoc.data()
    if (songData.userId !== userId) {
      throw new Error('Unauthorized to update this song')
    }

    await songsRef.doc(songId).update({
      sunoAudioAvailable: false,
      sunoAudioUnavailableAt: ffirestore.FieldValue.serverTimestamp(),
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log('[markSunoAudioUnavailable] Song marked as unavailable:', songId)
    return { success: true }
  } catch (error) {
    console.error('[markSunoAudioUnavailable] Error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Update video data for a song
 * Used when generating or updating music videos
 *
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for verification)
 * @param {Object} videoData - Video data to update
 * @param {string} videoData.videoUrl - URL to the generated video
 * @param {Object} videoData.videoMetadata - Video metadata (duration, resolution, etc.)
 * @param {string} videoData.videoGenerationStatus - 'pending' | 'generating' | 'complete' | 'failed'
 * @param {string} videoData.videoTaskId - Task ID for polling
 * @returns {Promise<Object>} Updated song data
 */
export const updateSongVideo = async (songId, userId, videoData) => {
  try {
    console.log('[updateSongVideo] ========== UPDATE SONG VIDEO ==========')
    console.log('[updateSongVideo] songId:', songId, '| type:', typeof songId)
    console.log('[updateSongVideo] userId:', userId, '| type:', typeof userId)
    console.log('[updateSongVideo] videoData:', JSON.stringify(videoData, null, 2))

    // Validate inputs FIRST
    if (!songId || typeof songId !== 'string') {
      throw new Error(`Invalid songId: ${songId}`)
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error(`Invalid userId: ${userId}`)
    }

    const songDoc = await songsRef.doc(songId).get()

    if (!songDoc.exists) {
      throw new Error('Song not found')
    }

    const songDocData = songDoc.data()
    if (songDocData.userId !== userId) {
      throw new Error('Unauthorized to update this song')
    }

    const updateFields = {
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    }

    // Only update fields that are provided AND not undefined
    if (videoData.videoUrl !== undefined && videoData.videoUrl !== null) {
      updateFields.videoUrl = videoData.videoUrl
    }
    if (videoData.videoMetadata !== undefined && videoData.videoMetadata !== null) {
      // Sanitize videoMetadata to remove any undefined values
      const sanitizedMetadata = {}
      for (const [key, value] of Object.entries(videoData.videoMetadata)) {
        if (value !== undefined) {
          sanitizedMetadata[key] = value === null ? null : value
        }
      }
      updateFields.videoMetadata = sanitizedMetadata
    }
    if (videoData.videoGenerationStatus !== undefined && videoData.videoGenerationStatus !== null) {
      updateFields.videoGenerationStatus = videoData.videoGenerationStatus
    }
    if (videoData.videoTaskId !== undefined && videoData.videoTaskId !== null) {
      updateFields.videoTaskId = videoData.videoTaskId
    }
    if (videoData.firebaseVideoUrl !== undefined && videoData.firebaseVideoUrl !== null) {
      updateFields.firebaseVideoUrl = videoData.firebaseVideoUrl
    }

    console.log('[updateSongVideo] Update fields:', JSON.stringify(updateFields, null, 2))
    await songsRef.doc(songId).update(updateFields)

    console.log('[updateSongVideo] Video data updated successfully')
    return {
      id: songId,
      ...songDocData,
      ...updateFields,
    }
  } catch (error) {
    console.error('[updateSongVideo] Error:', error.message)
    throw error
  }
}

/**
 * Recalculate and fix the likeCount for a song based on actual likes subcollection
 * Use this to fix songs with corrupted (negative) like counts
 *
 * @param {string} songId - Song document ID
 * @returns {Promise<number>} The corrected like count
 */
export const recalculateLikeCount = async (songId) => {
  try {
    // Count actual likes in the subcollection
    const likesSnapshot = await songLikesRef(songId).get()
    const actualCount = likesSnapshot.size

    // Update the song with the correct count
    await songsRef.doc(songId).update({
      likeCount: actualCount,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log(`[recalculateLikeCount] Fixed song ${songId}: likeCount = ${actualCount}`)
    return actualCount
  } catch (error) {
    console.error('[recalculateLikeCount] Error:', error)
    throw error
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
  updateSongRights,
  getSongRights,
  updateSong,
  updateSongVideo,
  addSongMediaAssets,
  removeSongMediaAsset,
  updateUserSongsAuthorInfo,
  toggleSongLike,
  isSongLiked,
  subscribeToLikedSongs,
  getUserLikedSongs,
  markSunoAudioUnavailable,
  recalculateLikeCount,
}
