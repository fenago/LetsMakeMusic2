import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { Audio } from 'expo-av'
import { Alert } from 'react-native'
import { subscribeToLikedSongs, toggleSongLike } from '../services/songsService'
import useCurrentUser from '../core/onboarding/hooks/useCurrentUser'

const MediaPlayerContext = createContext(null)

/**
 * MediaPlayerProvider - Unified media player for both audio and video
 *
 * CRITICAL: When playing audio, video should pause. When playing video, audio should pause.
 * This provider handles the global playback state across the app.
 */
export const MediaPlayerProvider = ({ children }) => {
  // Get current user for likes functionality
  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  // State
  const [mediaType, setMediaType] = useState(null) // 'audio' | 'video' | null
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentMedia, setCurrentMedia] = useState(null)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(-1)
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false)
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false)

  // Liked songs state - shared across all components
  const [likedSongIds, setLikedSongIds] = useState(new Set())

  // Refs
  const soundRef = useRef(null)
  const positionIntervalRef = useRef(null)
  const isPlayingRef = useRef(false) // For immediate state access in togglePlayPause
  const fallbackDurationRef = useRef(0) // Store item's duration as fallback (in ms)
  const loadingLockRef = useRef(false) // Prevent concurrent loads
  const currentLoadIdRef = useRef(0) // Track which load operation is current

  // Configure audio mode for background playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        })
      } catch (error) {
        console.error('Error setting audio mode:', error)
      }
    }
    setupAudio()
  }, [])

  // Subscribe to user's liked songs for real-time sync across all components
  useEffect(() => {
    if (!userId) {
      setLikedSongIds(new Set())
      return
    }

    console.log('[MediaPlayerContext] Subscribing to liked songs for user:', userId)
    const unsubscribe = subscribeToLikedSongs(userId, (likedIds) => {
      console.log('[MediaPlayerContext] Liked songs updated:', likedIds.size, 'songs')
      setLikedSongIds(likedIds)
    })

    return () => {
      console.log('[MediaPlayerContext] Unsubscribing from liked songs')
      unsubscribe()
    }
  }, [userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync()
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
    }
  }, [])

  // Update position periodically while playing
  useEffect(() => {
    if (isPlaying && mediaType === 'audio') {
      positionIntervalRef.current = setInterval(async () => {
        if (soundRef.current) {
          try {
            const status = await soundRef.current.getStatusAsync()
            if (status.isLoaded) {
              setPosition(status.positionMillis)
              if (status.didJustFinish) {
                // Auto-play next in queue
                playNext()
              }
            }
          } catch (error) {
            // Ignore errors during position updates
          }
        }
      }, 500)
    } else {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
    }

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
    }
  }, [isPlaying, mediaType])

  /**
   * Load and play a media item
   * @param {Object} item - Media item with id, title, audioUrl/videoUrl, thumbnailUrl, etc.
   */
  const loadMedia = useCallback(async (item) => {
    if (!item) {
      Alert.alert('loadMedia Error', 'No item provided')
      return
    }

    // Generate unique ID for this load operation
    const loadId = ++currentLoadIdRef.current
    console.log(`=== LOAD MEDIA START (loadId: ${loadId}) ===`)

    // Determine media type from item
    const type = item.videoUrl ? 'video' : 'audio'
    const mediaUrl = item.audioUrl || item.videoUrl

    try {
      setIsLoading(true)

      if (!mediaUrl) {
        Alert.alert('loadMedia Error', 'No media URL provided')
        console.error('No media URL provided')
        setIsLoading(false)
        return
      }

      // CRITICAL: Stop and unload any existing audio FIRST
      if (soundRef.current) {
        console.log(`=== STOPPING AND UNLOADING PREVIOUS SOUND (loadId: ${loadId}) ===`)
        try {
          // Stop playback immediately
          await soundRef.current.setStatusAsync({ shouldPlay: false })
          await soundRef.current.unloadAsync()
        } catch (e) {
          console.log('Error unloading previous sound:', e)
        }
        soundRef.current = null
      }

      // Check if this load is still the current one
      if (loadId !== currentLoadIdRef.current) {
        console.log(`=== LOAD CANCELLED - NEWER LOAD EXISTS (loadId: ${loadId}, current: ${currentLoadIdRef.current}) ===`)
        return
      }

      // If switching to audio, create new sound
      if (type === 'audio') {
        // Create and load new sound
        console.log(`=== CREATING NEW SOUND (loadId: ${loadId}) ===`)
        console.log('mediaUrl:', mediaUrl)
        const result = await Audio.Sound.createAsync(
          { uri: mediaUrl },
          { shouldPlay: false }, // Don't auto-play until we verify this load is still current
          onPlaybackStatusUpdate
        )

        // Check AGAIN if this load is still current after the async operation
        if (loadId !== currentLoadIdRef.current) {
          console.log(`=== LOAD CANCELLED AFTER CREATE - NEWER LOAD EXISTS (loadId: ${loadId}, current: ${currentLoadIdRef.current}) ===`)
          // Unload the sound we just created since it's no longer needed
          try {
            await result.sound.unloadAsync()
          } catch (e) {
            console.log('Error unloading cancelled sound:', e)
          }
          return
        }

        console.log(`=== SOUND CREATED (loadId: ${loadId}) ===`)
        const { sound, status } = result
        soundRef.current = sound

        // Duration priority: 1) from audio status, 2) from song data (convert seconds to ms)
        const audioDurationMs = status.durationMillis || 0
        const itemDurationMs = item.duration ? item.duration * 1000 : 0
        const finalDuration = audioDurationMs > 0 ? audioDurationMs : itemDurationMs
        console.log('Duration: audio =', audioDurationMs, 'ms, item =', itemDurationMs, 'ms, using:', finalDuration, 'ms')
        fallbackDurationRef.current = finalDuration
        setDuration(finalDuration)
        setPosition(0)

        // Now start playback - use setStatusAsync (playAsync doesn't exist in this expo-av version)
        console.log('=== CALLING setStatusAsync({ shouldPlay: true }) ===')
        await sound.setStatusAsync({ shouldPlay: true })
        console.log('=== setStatusAsync COMPLETED ===')
        isPlayingRef.current = true
        setIsPlaying(true)
        setIsMiniPlayerVisible(true)
      }

      setMediaType(type)
      setCurrentMedia(item)
      setIsLoading(false)
      console.log(`=== LOAD MEDIA COMPLETE (loadId: ${loadId}) ===`)
    } catch (error) {
      console.error('Error loading media:', error)
      Alert.alert('loadMedia ERROR', `${error.message || error}`)
      setIsLoading(false)
    }
  }, [])

  /**
   * Playback status callback for audio
   * NOTE: We don't set isPlaying here to avoid race conditions with manual play/pause
   */
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis)
      // Use fallback duration if status doesn't provide it (common with streaming audio)
      setDuration(status.durationMillis || fallbackDurationRef.current)

      if (status.didJustFinish) {
        isPlayingRef.current = false
        setIsPlaying(false)
        // Note: playNext is not called here to avoid stale closure - handled in position interval
      }
    }
  }, [])

  /**
   * Play current media
   */
  const play = useCallback(async () => {
    console.log('=== PLAY CALLED ===')
    console.log('mediaType:', mediaType)
    console.log('soundRef.current:', !!soundRef.current)

    if (mediaType === 'audio' && soundRef.current) {
      try {
        // Check current status before playing
        const status = await soundRef.current.getStatusAsync()
        console.log('Sound status:', JSON.stringify(status, null, 2))

        if (status.isLoaded) {
          // If at end of track, seek to beginning first
          if (status.didJustFinish || (status.durationMillis && status.positionMillis >= status.durationMillis - 100)) {
            console.log('>>> At end of track, seeking to 0')
            await soundRef.current.setStatusAsync({ positionMillis: 0 })
            setPosition(0)
          }

          console.log('>>> Calling setStatusAsync({ shouldPlay: true })')
          await soundRef.current.setStatusAsync({ shouldPlay: true })
          console.log('>>> setStatusAsync completed - audio playing')
          isPlayingRef.current = true
          setIsPlaying(true)
          console.log('>>> State updated, isPlayingRef.current now:', isPlayingRef.current)
        } else {
          console.warn('Sound not loaded, cannot play')
        }
      } catch (error) {
        console.error('Error playing audio:', error)
      }
    } else {
      console.log('>>> SKIPPED - conditions not met')
    }
  }, [mediaType])

  /**
   * Pause current media
   */
  const pause = useCallback(async () => {
    console.log('=== PAUSE CALLED ===')
    console.log('mediaType:', mediaType)
    console.log('soundRef.current:', !!soundRef.current)

    if (mediaType === 'audio' && soundRef.current) {
      try {
        console.log('>>> Calling setStatusAsync({ shouldPlay: false })')
        await soundRef.current.setStatusAsync({ shouldPlay: false })
        console.log('>>> setStatusAsync completed - audio paused')
        isPlayingRef.current = false
        setIsPlaying(false)
        console.log('>>> State updated, isPlayingRef.current now:', isPlayingRef.current)
      } catch (error) {
        console.error('Error pausing audio:', error)
      }
    } else {
      console.log('>>> SKIPPED - conditions not met')
    }
  }, [mediaType])

  /**
   * Toggle play/pause - Uses ref for immediate state access to avoid stale closure
   */
  const togglePlayPause = useCallback(async () => {
    console.log('=== TOGGLE PLAY/PAUSE ===')
    console.log('isPlayingRef.current:', isPlayingRef.current)
    console.log('soundRef.current exists:', !!soundRef.current)
    console.log('mediaType:', mediaType)

    if (isPlayingRef.current) {
      console.log('>>> Calling PAUSE')
      await pause()
    } else {
      console.log('>>> Calling PLAY')
      await play()
    }
  }, [play, pause, mediaType])

  /**
   * Stop playback and clear current media
   */
  const stop = useCallback(async () => {
    console.log('=== STOP CALLED ===')
    console.log('soundRef.current:', !!soundRef.current)

    if (soundRef.current) {
      try {
        // Stop playback and reset position using setStatusAsync
        console.log('>>> Calling setStatusAsync({ shouldPlay: false, positionMillis: 0 })')
        await soundRef.current.setStatusAsync({ shouldPlay: false, positionMillis: 0 })
        console.log('>>> Audio stopped')

        // Unload the sound to free resources
        console.log('>>> Calling unloadAsync()')
        await soundRef.current.unloadAsync()
        console.log('>>> Sound unloaded')
      } catch (error) {
        console.error('Error stopping audio:', error)
      }
      soundRef.current = null
    }
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentMedia(null)
    setMediaType(null)
    setPosition(0)
    setDuration(0)
    setIsMiniPlayerVisible(false)
    setIsFullPlayerVisible(false)
    console.log('=== STOP COMPLETED ===')
  }, [])

  /**
   * Seek to position in milliseconds
   */
  const seek = useCallback(async (positionMs) => {
    if (mediaType === 'audio' && soundRef.current) {
      await soundRef.current.setPositionAsync(positionMs)
      setPosition(positionMs)
    }
  }, [mediaType])

  /**
   * Add item to queue
   */
  const addToQueue = useCallback((item) => {
    setQueue(prev => [...prev, item])
  }, [])

  /**
   * Clear queue
   */
  const clearQueue = useCallback(() => {
    setQueue([])
    setQueueIndex(-1)
  }, [])

  /**
   * Play next item in queue
   */
  const playNext = useCallback(async () => {
    if (queue.length === 0) return

    const nextIndex = queueIndex + 1
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex)
      await loadMedia(queue[nextIndex])
    } else {
      // End of queue
      setIsPlaying(false)
    }
  }, [queue, queueIndex, loadMedia])

  /**
   * Play previous item in queue
   */
  const playPrevious = useCallback(async () => {
    // If we're more than 3 seconds into the track, restart it
    if (position > 3000) {
      await seek(0)
      return
    }

    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1
      setQueueIndex(prevIndex)
      await loadMedia(queue[prevIndex])
    }
  }, [position, queueIndex, queue, loadMedia, seek])

  /**
   * Play a list of items (sets queue and starts playing)
   */
  const playList = useCallback(async (items, startIndex = 0) => {
    console.log('[MediaPlayer] playList called:', {
      itemsCount: items?.length,
      startIndex,
    })
    if (!items || items.length === 0) {
      console.log('[MediaPlayer] playList: No items to play!')
      return
    }

    const itemToPlay = items[startIndex]
    console.log('[MediaPlayer] playList: Item to play:', {
      id: itemToPlay?.id,
      title: itemToPlay?.title || itemToPlay?.label || itemToPlay?.name,
      audioUrl: itemToPlay?.audioUrl,
      videoUrl: itemToPlay?.videoUrl,
    })

    setQueue(items)
    setQueueIndex(startIndex)
    await loadMedia(items[startIndex])
  }, [loadMedia])

  /**
   * Show full player
   */
  const showFullPlayer = useCallback(() => {
    setIsFullPlayerVisible(true)
  }, [])

  /**
   * Hide full player
   */
  const hideFullPlayer = useCallback(() => {
    setIsFullPlayerVisible(false)
  }, [])

  /**
   * Dismiss mini player and stop playback
   */
  const dismissPlayer = useCallback(async () => {
    await stop()
  }, [stop])

  // Format time helper (ms to mm:ss)
  const formatTime = useCallback((ms) => {
    if (!ms || ms < 0) return '0:00'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  /**
   * Alias for loadMedia - semantic helper for playing songs
   */
  const playSong = useCallback((song) => {
    return loadMedia(song)
  }, [loadMedia])

  /**
   * Check if a song is liked (uses shared state)
   */
  const isLiked = useCallback((songId) => {
    return likedSongIds.has(songId)
  }, [likedSongIds])

  /**
   * Toggle like status for a song (updates shared state via Firebase subscription)
   * @param {Object} song - Song object with id, title, imageUrl, etc.
   * @returns {Promise<boolean>} - New like status (true = liked, false = unliked)
   */
  const toggleLike = useCallback(async (song) => {
    if (!song?.id || !userId) {
      console.warn('[MediaPlayerContext] toggleLike: Missing song.id or userId')
      return false
    }

    try {
      const nowLiked = await toggleSongLike(song.id, userId, {
        title: song.title || song.name || song.label,
        imageUrl: song.imageUrl || song.thumbnailUrl || song.coverUrl,
        artist: song.artist || song.style || song.description || song.author?.firstName,
      })
      console.log('[MediaPlayerContext] toggleLike result:', nowLiked, 'for song:', song.id)
      // Note: likedSongIds will update automatically via Firebase subscription
      return nowLiked
    } catch (error) {
      console.error('[MediaPlayerContext] toggleLike error:', error)
      throw error
    }
  }, [userId])

  const value = {
    // State
    mediaType,
    isPlaying,
    isLoading,
    currentMedia,
    position,
    duration,
    queue,
    queueIndex,
    isFullPlayerVisible,
    isMiniPlayerVisible,

    // Likes - shared state for all components
    likedSongIds,
    isLiked,
    toggleLike,

    // Actions
    loadMedia,
    playSong, // Alias for loadMedia
    play,
    pause,
    togglePlayPause,
    stop,
    seek,

    // Queue management
    addToQueue,
    clearQueue,
    playNext,
    playPrevious,
    playList,

    // UI control
    showFullPlayer,
    hideFullPlayer,
    dismissPlayer,

    // Helpers
    formatTime,
  }

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
    </MediaPlayerContext.Provider>
  )
}

/**
 * Hook to access media player context
 */
export const useMediaPlayer = () => {
  const context = useContext(MediaPlayerContext)
  if (!context) {
    throw new Error('useMediaPlayer must be used within MediaPlayerProvider')
  }
  return context
}

export default MediaPlayerContext
