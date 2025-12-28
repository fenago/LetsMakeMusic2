/**
 * usePlaylists Hook - State management for user playlists
 *
 * Subscribes to user's playlists in real-time and provides
 * methods for playlist CRUD operations.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToUserPlaylists,
  subscribeToPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
} from '../services/playlistsService'

/**
 * Hook to manage user's playlists
 *
 * @param {string} userId - Current user's ID
 * @returns {Object} Playlists state and methods
 */
export const usePlaylists = (userId) => {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setPlaylists([])
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeToUserPlaylists(userId, (fetchedPlaylists) => {
      setPlaylists(fetchedPlaylists)
      setLoading(false)
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [userId])

  /**
   * Create a new playlist
   */
  const handleCreatePlaylist = useCallback(
    async (name, description = '') => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await createPlaylist(userId, { name, description })
        return { success: true, playlist: result }
      } catch (error) {
        console.error('[usePlaylists] Error creating playlist:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Update a playlist's metadata
   */
  const handleUpdatePlaylist = useCallback(
    async (playlistId, updates) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await updatePlaylist(userId, playlistId, updates)
        return { success: true, playlist: result }
      } catch (error) {
        console.error('[usePlaylists] Error updating playlist:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Delete a playlist
   */
  const handleDeletePlaylist = useCallback(
    async (playlistId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await deletePlaylist(userId, playlistId)
        return result
      } catch (error) {
        console.error('[usePlaylists] Error deleting playlist:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Add a song to a playlist
   */
  const handleAddSongToPlaylist = useCallback(
    async (playlistId, songData) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await addSongToPlaylist(userId, playlistId, songData)
        if (result.alreadyExists) {
          return { success: true, alreadyExists: true }
        }
        return { success: true, playlist: result }
      } catch (error) {
        console.error('[usePlaylists] Error adding song to playlist:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Remove a song from a playlist
   */
  const handleRemoveSongFromPlaylist = useCallback(
    async (playlistId, songId) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await removeSongFromPlaylist(userId, playlistId, songId)
        return { success: true, playlist: result }
      } catch (error) {
        console.error('[usePlaylists] Error removing song from playlist:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  /**
   * Reorder songs in a playlist
   */
  const handleReorderSongs = useCallback(
    async (playlistId, newOrder) => {
      if (!userId) return { success: false, error: 'Not logged in' }

      try {
        const result = await reorderPlaylistSongs(userId, playlistId, newOrder)
        return { success: true, playlist: result }
      } catch (error) {
        console.error('[usePlaylists] Error reordering songs:', error)
        return { success: false, error: error.message }
      }
    },
    [userId]
  )

  return {
    playlists,
    playlistsLoading: loading,
    playlistsCount: playlists.length,
    createPlaylist: handleCreatePlaylist,
    updatePlaylist: handleUpdatePlaylist,
    deletePlaylist: handleDeletePlaylist,
    addSongToPlaylist: handleAddSongToPlaylist,
    removeSongFromPlaylist: handleRemoveSongFromPlaylist,
    reorderSongs: handleReorderSongs,
  }
}

/**
 * Hook to subscribe to a single playlist
 *
 * @param {string} userId - Current user's ID
 * @param {string} playlistId - Playlist ID to subscribe to
 * @returns {Object} { playlist, loading }
 */
export const usePlaylist = (userId, playlistId) => {
  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !playlistId) {
      setPlaylist(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const unsubscribe = subscribeToPlaylist(userId, playlistId, (fetchedPlaylist) => {
      setPlaylist(fetchedPlaylist)
      setLoading(false)
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [userId, playlistId])

  return {
    playlist,
    playlistLoading: loading,
    songs: playlist?.songs || [],
    songCount: playlist?.songCount || 0,
  }
}

export default usePlaylists
