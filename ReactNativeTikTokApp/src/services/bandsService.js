/**
 * Bands Service - Firebase integration for band collaboration
 *
 * Bands are channels with isBand: true, providing additional features:
 * - Shared songs (band_songs subcollection)
 * - Collaborative playlists (band_playlists subcollection)
 * - Band metadata (bandImageUrl, bandDescription)
 */

import { db } from '../core/firebase/config'
import ffirestore from '@react-native-firebase/firestore'

// Collection references
export const channelsRef = db.collection('channels')
export const bandSongsRef = (channelId) => channelsRef.doc(channelId).collection('band_songs')
export const bandPlaylistsRef = (channelId) => channelsRef.doc(channelId).collection('band_playlists')

/**
 * Subscribe to user's bands in real-time
 * Returns channels where isBand=true and user is a participant
 *
 * @param {string} userId - User ID
 * @param {Function} callback - Callback with bands array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUserBands = (userId, callback) => {
  console.log('[bandsService] Subscribing to bands for user:', userId)

  return channelsRef
    .where('isBand', '==', true)
    .onSnapshot(
      (querySnapshot) => {
        // Filter to only bands where user is a participant
        const bands = querySnapshot?.docs
          ?.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          ?.filter(band =>
            band.participants?.some(p => p.id === userId || p.userID === userId)
          ) || []

        console.log('[bandsService] Bands fetched:', bands.length)
        callback(bands)
      },
      (error) => {
        console.error('[bandsService] Error subscribing to bands:', error)
        callback([])
      }
    )
}

/**
 * Get all bands for a user (one-time fetch)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of bands
 */
export const getUserBands = async (userId) => {
  try {
    const snapshot = await channelsRef
      .where('isBand', '==', true)
      .get()

    // Filter to only bands where user is a participant
    const bands = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(band =>
        band.participants?.some(p => p.id === userId || p.userID === userId)
      )

    return bands
  } catch (error) {
    console.error('[bandsService] Error getting user bands:', error)
    throw error
  }
}

/**
 * Get a single band by ID
 *
 * @param {string} bandId - Band/Channel ID
 * @returns {Promise<Object|null>} Band data or null
 */
export const getBand = async (bandId) => {
  try {
    const doc = await channelsRef.doc(bandId).get()
    if (doc.exists && doc.data()?.isBand) {
      return {
        id: doc.id,
        ...doc.data(),
      }
    }
    return null
  } catch (error) {
    console.error('[bandsService] Error getting band:', error)
    throw error
  }
}

/**
 * Update band metadata (image, description, name)
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} userId - User ID (must be admin)
 * @param {Object} updates - Fields to update { name, bandImageUrl, bandDescription }
 * @returns {Promise<Object>} Updated band data
 */
export const updateBand = async (bandId, userId, updates) => {
  try {
    const doc = await channelsRef.doc(bandId).get()

    if (!doc.exists || !doc.data()?.isBand) {
      throw new Error('Band not found')
    }

    const bandData = doc.data()

    // Check if user is admin
    if (!bandData.admins?.includes(userId)) {
      throw new Error('Only band admins can update band details')
    }

    const updateData = {
      ...updates,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    }

    await channelsRef.doc(bandId).update(updateData)

    return {
      id: bandId,
      ...bandData,
      ...updateData,
    }
  } catch (error) {
    console.error('[bandsService] Error updating band:', error)
    throw error
  }
}

// ============================================
// BAND SONGS
// ============================================

/**
 * Subscribe to band songs in real-time
 *
 * @param {string} bandId - Band/Channel ID
 * @param {Function} callback - Callback with songs array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToBandSongs = (bandId, callback) => {
  console.log('[bandsService] Subscribing to band songs for:', bandId)

  return bandSongsRef(bandId)
    .orderBy('addedAt', 'desc')
    .onSnapshot(
      (querySnapshot) => {
        const songs = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) || []

        console.log('[bandsService] Band songs fetched:', songs.length)
        callback(songs)
      },
      (error) => {
        console.error('[bandsService] Error subscribing to band songs:', error)
        callback([])
      }
    )
}

/**
 * Add a song to a band
 * Stores denormalized song data for fast display
 *
 * @param {string} bandId - Band/Channel ID
 * @param {Object} songData - Song data { id, title, imageUrl, artist, audioUrl, duration }
 * @param {string} userId - User who is adding the song
 * @returns {Promise<Object>} Added song reference
 */
export const addSongToBand = async (bandId, songData, userId) => {
  try {
    const now = ffirestore.FieldValue.serverTimestamp()

    // Check if song already exists in band
    const existingDoc = await bandSongsRef(bandId).doc(songData.id).get()
    if (existingDoc.exists) {
      throw new Error('This song is already in the band')
    }

    const docData = {
      songId: songData.id,
      title: songData.title || 'Untitled',
      imageUrl: songData.imageUrl || null,
      artist: songData.artist || songData.author?.stageName || '',
      audioUrl: songData.audioUrl || songData.streamUrl || null,
      duration: songData.duration || 0,
      addedBy: userId,
      addedAt: now,
    }

    await bandSongsRef(bandId).doc(songData.id).set(docData)

    console.log('[bandsService] Song added to band:', songData.id)

    return {
      id: songData.id,
      ...docData,
    }
  } catch (error) {
    console.error('[bandsService] Error adding song to band:', error)
    throw error
  }
}

/**
 * Remove a song from a band
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} songId - Song ID to remove
 * @returns {Promise<Object>} Result
 */
export const removeSongFromBand = async (bandId, songId) => {
  try {
    await bandSongsRef(bandId).doc(songId).delete()
    console.log('[bandsService] Song removed from band:', songId)
    return { success: true }
  } catch (error) {
    console.error('[bandsService] Error removing song from band:', error)
    throw error
  }
}

/**
 * Get all songs for a band (one-time fetch)
 *
 * @param {string} bandId - Band/Channel ID
 * @returns {Promise<Array>} Array of songs
 */
export const getBandSongs = async (bandId) => {
  try {
    const snapshot = await bandSongsRef(bandId)
      .orderBy('addedAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('[bandsService] Error getting band songs:', error)
    throw error
  }
}

// ============================================
// BAND PLAYLISTS
// ============================================

/**
 * Subscribe to band playlists in real-time
 *
 * @param {string} bandId - Band/Channel ID
 * @param {Function} callback - Callback with playlists array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToBandPlaylists = (bandId, callback) => {
  console.log('[bandsService] Subscribing to band playlists for:', bandId)

  return bandPlaylistsRef(bandId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (querySnapshot) => {
        const playlists = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) || []

        console.log('[bandsService] Band playlists fetched:', playlists.length)
        callback(playlists)
      },
      (error) => {
        console.error('[bandsService] Error subscribing to band playlists:', error)
        callback([])
      }
    )
}

/**
 * Create a band playlist
 *
 * @param {string} bandId - Band/Channel ID
 * @param {Object} playlistData - { name, description, coverImageUrl }
 * @param {string} userId - Creator user ID
 * @returns {Promise<Object>} Created playlist
 */
export const createBandPlaylist = async (bandId, playlistData, userId) => {
  try {
    const now = ffirestore.FieldValue.serverTimestamp()

    const docData = {
      name: playlistData.name || 'Untitled Playlist',
      description: playlistData.description || '',
      coverImageUrl: playlistData.coverImageUrl || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      songs: [], // Array of { songId, order, addedBy, addedAt }
      songCount: 0,
    }

    const docRef = await bandPlaylistsRef(bandId).add(docData)

    console.log('[bandsService] Band playlist created:', docRef.id)

    return {
      id: docRef.id,
      ...docData,
    }
  } catch (error) {
    console.error('[bandsService] Error creating band playlist:', error)
    throw error
  }
}

/**
 * Update a band playlist
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} playlistId - Playlist ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated playlist
 */
export const updateBandPlaylist = async (bandId, playlistId, updates) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    }

    await bandPlaylistsRef(bandId).doc(playlistId).update(updateData)

    console.log('[bandsService] Band playlist updated:', playlistId)

    return { success: true }
  } catch (error) {
    console.error('[bandsService] Error updating band playlist:', error)
    throw error
  }
}

/**
 * Delete a band playlist
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} playlistId - Playlist ID
 * @returns {Promise<Object>} Result
 */
export const deleteBandPlaylist = async (bandId, playlistId) => {
  try {
    await bandPlaylistsRef(bandId).doc(playlistId).delete()
    console.log('[bandsService] Band playlist deleted:', playlistId)
    return { success: true }
  } catch (error) {
    console.error('[bandsService] Error deleting band playlist:', error)
    throw error
  }
}

/**
 * Add a song to a band playlist
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} playlistId - Playlist ID
 * @param {Object} songData - Song data { id, title, imageUrl, artist, audioUrl }
 * @param {string} userId - User adding the song
 * @returns {Promise<Object>} Updated playlist
 */
export const addSongToBandPlaylist = async (bandId, playlistId, songData, userId) => {
  try {
    const playlistDoc = await bandPlaylistsRef(bandId).doc(playlistId).get()

    if (!playlistDoc.exists) {
      throw new Error('Playlist not found')
    }

    const playlistData = playlistDoc.data()
    const currentSongs = playlistData.songs || []

    // Check if song already in playlist
    if (currentSongs.some(s => s.songId === songData.id)) {
      throw new Error('Song already in playlist')
    }

    const newSong = {
      songId: songData.id,
      title: songData.title || 'Untitled',
      imageUrl: songData.imageUrl || null,
      artist: songData.artist || '',
      audioUrl: songData.audioUrl || null,
      order: currentSongs.length,
      addedBy: userId,
      addedAt: new Date().toISOString(),
    }

    await bandPlaylistsRef(bandId).doc(playlistId).update({
      songs: ffirestore.FieldValue.arrayUnion(newSong),
      songCount: currentSongs.length + 1,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log('[bandsService] Song added to band playlist:', songData.id)

    return { success: true }
  } catch (error) {
    console.error('[bandsService] Error adding song to band playlist:', error)
    throw error
  }
}

/**
 * Remove a song from a band playlist
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} playlistId - Playlist ID
 * @param {string} songId - Song ID to remove
 * @returns {Promise<Object>} Result
 */
export const removeSongFromBandPlaylist = async (bandId, playlistId, songId) => {
  try {
    const playlistDoc = await bandPlaylistsRef(bandId).doc(playlistId).get()

    if (!playlistDoc.exists) {
      throw new Error('Playlist not found')
    }

    const playlistData = playlistDoc.data()
    const updatedSongs = (playlistData.songs || []).filter(s => s.songId !== songId)

    await bandPlaylistsRef(bandId).doc(playlistId).update({
      songs: updatedSongs,
      songCount: updatedSongs.length,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log('[bandsService] Song removed from band playlist:', songId)

    return { success: true }
  } catch (error) {
    console.error('[bandsService] Error removing song from band playlist:', error)
    throw error
  }
}

/**
 * Get a single band playlist with full data
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} playlistId - Playlist ID
 * @returns {Promise<Object|null>} Playlist data or null
 */
export const getBandPlaylist = async (bandId, playlistId) => {
  try {
    const doc = await bandPlaylistsRef(bandId).doc(playlistId).get()
    if (doc.exists) {
      return {
        id: doc.id,
        ...doc.data(),
      }
    }
    return null
  } catch (error) {
    console.error('[bandsService] Error getting band playlist:', error)
    throw error
  }
}

export default {
  // Bands
  subscribeToUserBands,
  getUserBands,
  getBand,
  updateBand,
  // Band Songs
  subscribeToBandSongs,
  addSongToBand,
  removeSongFromBand,
  getBandSongs,
  // Band Playlists
  subscribeToBandPlaylists,
  createBandPlaylist,
  updateBandPlaylist,
  deleteBandPlaylist,
  addSongToBandPlaylist,
  removeSongFromBandPlaylist,
  getBandPlaylist,
}
