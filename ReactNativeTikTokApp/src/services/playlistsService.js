/**
 * Playlists Service - Firebase integration for user playlists
 *
 * Handles creating, updating, and managing user playlists with
 * embedded song arrays for atomic updates.
 */

import { db } from '../core/firebase/config'
import ffirestore from '@react-native-firebase/firestore'

// Collection reference
export const userPlaylistsRef = (userId) =>
  db.collection('users').doc(userId).collection('playlists')

/**
 * Create a new playlist
 *
 * @param {string} userId - User ID
 * @param {Object} playlistData - Playlist data
 * @param {string} playlistData.name - Playlist name
 * @param {string} playlistData.description - Optional description
 * @param {string} playlistData.coverImageUrl - Optional cover image URL
 * @returns {Promise<Object>} Created playlist with ID
 */
export const createPlaylist = async (userId, { name, description = '', coverImageUrl = null }) => {
  if (!userId || !name) {
    throw new Error('userId and name are required')
  }

  try {
    const now = ffirestore.FieldValue.serverTimestamp()

    const playlistData = {
      name: name.trim(),
      description: description.trim(),
      coverImageUrl: coverImageUrl || null, // Custom cover or first song's image
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      isPublic: false,
      songCount: 0,
      songs: [],
    }

    const docRef = await userPlaylistsRef(userId).add(playlistData)

    console.log('[Playlists] Created playlist:', docRef.id, name)

    return {
      id: docRef.id,
      ...playlistData,
    }
  } catch (error) {
    console.error('[Playlists] Error creating playlist:', error)
    throw error
  }
}

/**
 * Update a playlist's metadata
 *
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @param {Object} updates - Fields to update (name, description, isPublic, coverImageUrl)
 * @returns {Promise<Object>} Updated playlist
 */
export const updatePlaylist = async (userId, playlistId, updates) => {
  if (!userId || !playlistId) {
    throw new Error('userId and playlistId are required')
  }

  try {
    const updateData = {
      ...updates,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    }

    await userPlaylistsRef(userId).doc(playlistId).update(updateData)

    console.log('[Playlists] Updated playlist:', playlistId)

    return { id: playlistId, ...updateData }
  } catch (error) {
    console.error('[Playlists] Error updating playlist:', error)
    throw error
  }
}

/**
 * Delete a playlist
 *
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @returns {Promise<Object>} Result with success status
 */
export const deletePlaylist = async (userId, playlistId) => {
  if (!userId || !playlistId) {
    throw new Error('userId and playlistId are required')
  }

  try {
    await userPlaylistsRef(userId).doc(playlistId).delete()

    console.log('[Playlists] Deleted playlist:', playlistId)

    return { success: true }
  } catch (error) {
    console.error('[Playlists] Error deleting playlist:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Add a song to a playlist
 *
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @param {Object} songData - Song data to add
 * @param {string} songData.id - Song ID (becomes songId in playlist)
 * @param {string} songData.title - Song title
 * @param {string} songData.imageUrl - Cover image URL
 * @param {string} songData.artist - Artist name
 * @param {string} songData.audioUrl - Audio URL
 * @param {number} songData.duration - Duration in seconds
 * @returns {Promise<Object>} Updated playlist
 */
export const addSongToPlaylist = async (userId, playlistId, songData) => {
  if (!userId || !playlistId || !songData?.id) {
    throw new Error('userId, playlistId, and songData.id are required')
  }

  try {
    const playlistRef = userPlaylistsRef(userId).doc(playlistId)
    const doc = await playlistRef.get()

    if (!doc.exists) {
      throw new Error('Playlist not found')
    }

    const playlist = doc.data()
    const existingSongs = playlist.songs || []

    // Check if song already exists in playlist
    if (existingSongs.some(s => s.songId === songData.id)) {
      console.log('[Playlists] Song already in playlist')
      return { id: playlistId, ...playlist, alreadyExists: true }
    }

    const now = ffirestore.FieldValue.serverTimestamp()

    // Create song entry with order based on current songs
    const songEntry = {
      songId: songData.id,
      title: songData.title || 'Untitled',
      imageUrl: songData.imageUrl || songData.thumbnailUrl || null,
      artist: songData.artist || songData.style || '',
      audioUrl: songData.audioUrl || songData.streamUrl || '',
      duration: songData.duration || 0,
      order: existingSongs.length,
      addedAt: new Date().toISOString(), // Use ISO string for array (serverTimestamp doesn't work in arrays)
    }

    // Update playlist with new song
    const updateData = {
      songs: ffirestore.FieldValue.arrayUnion(songEntry),
      songCount: existingSongs.length + 1,
      updatedAt: now,
    }

    // Set cover image to first song's image if not already set
    if (!playlist.coverImageUrl && songEntry.imageUrl) {
      updateData.coverImageUrl = songEntry.imageUrl
    }

    await playlistRef.update(updateData)

    console.log('[Playlists] Added song to playlist:', playlistId, songData.title)

    return {
      id: playlistId,
      ...playlist,
      songs: [...existingSongs, songEntry],
      songCount: existingSongs.length + 1,
    }
  } catch (error) {
    console.error('[Playlists] Error adding song to playlist:', error)
    throw error
  }
}

/**
 * Remove a song from a playlist
 *
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @param {string} songId - Song ID to remove
 * @returns {Promise<Object>} Updated playlist
 */
export const removeSongFromPlaylist = async (userId, playlistId, songId) => {
  if (!userId || !playlistId || !songId) {
    throw new Error('userId, playlistId, and songId are required')
  }

  try {
    const playlistRef = userPlaylistsRef(userId).doc(playlistId)
    const doc = await playlistRef.get()

    if (!doc.exists) {
      throw new Error('Playlist not found')
    }

    const playlist = doc.data()
    const existingSongs = playlist.songs || []

    // Find the song entry to remove
    const songIndex = existingSongs.findIndex(s => s.songId === songId)
    if (songIndex === -1) {
      console.log('[Playlists] Song not in playlist')
      return { id: playlistId, ...playlist }
    }

    // Remove song and reorder remaining
    const updatedSongs = existingSongs
      .filter(s => s.songId !== songId)
      .map((song, index) => ({ ...song, order: index }))

    // Update cover image if we removed the cover song
    let newCoverImageUrl = playlist.coverImageUrl
    if (existingSongs[songIndex]?.imageUrl === playlist.coverImageUrl) {
      newCoverImageUrl = updatedSongs[0]?.imageUrl || null
    }

    await playlistRef.update({
      songs: updatedSongs,
      songCount: updatedSongs.length,
      coverImageUrl: newCoverImageUrl,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log('[Playlists] Removed song from playlist:', playlistId, songId)

    return {
      id: playlistId,
      ...playlist,
      songs: updatedSongs,
      songCount: updatedSongs.length,
      coverImageUrl: newCoverImageUrl,
    }
  } catch (error) {
    console.error('[Playlists] Error removing song from playlist:', error)
    throw error
  }
}

/**
 * Reorder songs in a playlist
 *
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @param {Array} newOrder - Array of song IDs in new order
 * @returns {Promise<Object>} Updated playlist
 */
export const reorderPlaylistSongs = async (userId, playlistId, newOrder) => {
  if (!userId || !playlistId || !Array.isArray(newOrder)) {
    throw new Error('userId, playlistId, and newOrder array are required')
  }

  try {
    const playlistRef = userPlaylistsRef(userId).doc(playlistId)
    const doc = await playlistRef.get()

    if (!doc.exists) {
      throw new Error('Playlist not found')
    }

    const playlist = doc.data()
    const existingSongs = playlist.songs || []

    // Create a map of songId to song data
    const songMap = {}
    existingSongs.forEach(song => {
      songMap[song.songId] = song
    })

    // Reorder songs based on newOrder
    const reorderedSongs = newOrder
      .map((songId, index) => {
        const song = songMap[songId]
        if (song) {
          return { ...song, order: index }
        }
        return null
      })
      .filter(Boolean)

    // Update cover image to first song in new order
    const newCoverImageUrl = reorderedSongs[0]?.imageUrl || null

    await playlistRef.update({
      songs: reorderedSongs,
      coverImageUrl: newCoverImageUrl,
      updatedAt: ffirestore.FieldValue.serverTimestamp(),
    })

    console.log('[Playlists] Reordered playlist songs:', playlistId)

    return {
      id: playlistId,
      ...playlist,
      songs: reorderedSongs,
      coverImageUrl: newCoverImageUrl,
    }
  } catch (error) {
    console.error('[Playlists] Error reordering playlist songs:', error)
    throw error
  }
}

/**
 * Get a single playlist by ID
 *
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @returns {Promise<Object|null>} Playlist or null
 */
export const getPlaylist = async (userId, playlistId) => {
  if (!userId || !playlistId) {
    return null
  }

  try {
    const doc = await userPlaylistsRef(userId).doc(playlistId).get()

    if (!doc.exists) {
      return null
    }

    return {
      id: doc.id,
      ...doc.data(),
    }
  } catch (error) {
    console.error('[Playlists] Error getting playlist:', error)
    return null
  }
}

/**
 * Subscribe to user's playlists in real-time
 *
 * @param {string} userId - User ID
 * @param {Function} callback - Callback with playlists array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUserPlaylists = (userId, callback) => {
  if (!userId) {
    console.log('[Playlists] No userId for subscription')
    callback([])
    return () => {}
  }

  console.log('[Playlists] Subscribing to playlists for user:', userId)

  return userPlaylistsRef(userId)
    .orderBy('updatedAt', 'desc')
    .onSnapshot(
      (querySnapshot) => {
        const playlists = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) || []
        console.log('[Playlists] Fetched', playlists.length, 'playlists')
        callback(playlists)
      },
      (error) => {
        console.error('[Playlists] Subscription error:', error)
        callback([])
      }
    )
}

/**
 * Subscribe to a single playlist in real-time
 *
 * @param {string} userId - User ID
 * @param {string} playlistId - Playlist ID
 * @param {Function} callback - Callback with playlist object
 * @returns {Function} Unsubscribe function
 */
export const subscribeToPlaylist = (userId, playlistId, callback) => {
  if (!userId || !playlistId) {
    console.log('[Playlists] Missing userId or playlistId for subscription')
    callback(null)
    return () => {}
  }

  console.log('[Playlists] Subscribing to playlist:', playlistId)

  return userPlaylistsRef(userId).doc(playlistId).onSnapshot(
    (doc) => {
      if (doc.exists) {
        callback({
          id: doc.id,
          ...doc.data(),
        })
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error('[Playlists] Single playlist subscription error:', error)
      callback(null)
    }
  )
}

export default {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
  getPlaylist,
  subscribeToUserPlaylists,
  subscribeToPlaylist,
}
