/**
 * useBandSongs Hook - State management for band songs
 *
 * Subscribes to a band's shared songs in real-time and provides
 * methods for adding/removing songs.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToBandSongs,
  addSongToBand as addSongAPI,
  removeSongFromBand as removeSongAPI,
  getBandSongs,
} from '../services/bandsService'

/**
 * Hook to manage songs for a specific band
 *
 * @param {string} bandId - Band/Channel ID
 * @param {string} userId - Current user's ID (for mutations)
 * @returns {Object} { songs, songsLoading, addSong, removeSong, refreshSongs }
 */
export const useBandSongs = (bandId, userId) => {
  const [songs, setSongs] = useState([])
  const [songsLoading, setSongsLoading] = useState(true)

  useEffect(() => {
    if (!bandId) {
      setSongs([])
      setSongsLoading(false)
      return
    }

    setSongsLoading(true)

    const unsubscribe = subscribeToBandSongs(bandId, (newSongs) => {
      setSongs(newSongs)
      setSongsLoading(false)
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [bandId])

  /**
   * Add a song to the band
   *
   * @param {Object} songData - Song data to add
   * @returns {Promise<Object>} Added song reference
   */
  const addSong = useCallback(async (songData) => {
    if (!bandId || !userId) {
      throw new Error('Band ID and User ID required')
    }

    try {
      return await addSongAPI(bandId, songData, userId)
    } catch (error) {
      console.error('[useBandSongs] Error adding song:', error)
      throw error
    }
  }, [bandId, userId])

  /**
   * Remove a song from the band
   *
   * @param {string} songId - Song ID to remove
   * @returns {Promise<Object>} Result
   */
  const removeSong = useCallback(async (songId) => {
    if (!bandId) {
      throw new Error('Band ID required')
    }

    try {
      return await removeSongAPI(bandId, songId)
    } catch (error) {
      console.error('[useBandSongs] Error removing song:', error)
      throw error
    }
  }, [bandId])

  /**
   * Manually refresh songs (one-time fetch)
   */
  const refreshSongs = useCallback(async () => {
    if (!bandId) return

    setSongsLoading(true)
    try {
      const fetchedSongs = await getBandSongs(bandId)
      setSongs(fetchedSongs)
    } catch (error) {
      console.error('[useBandSongs] Error refreshing songs:', error)
    } finally {
      setSongsLoading(false)
    }
  }, [bandId])

  return {
    songs,
    songsLoading,
    songsCount: songs.length,
    addSong,
    removeSong,
    refreshSongs,
  }
}

export default useBandSongs
