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
import { subscribeToLikedSongs, toggleSongLike, incrementPlayCount } from '../services/songsService'
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

  // Playback mode settings
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off') // 'off' | 'all' | 'one'
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true) // Auto-play next song when current ends

  // Refs
  const soundRef = useRef(null)
  const positionIntervalRef = useRef(null)
  const isPlayingRef = useRef(false) // For immediate state access in togglePlayPause
  const fallbackDurationRef = useRef(0) // Store item's duration as fallback (in ms)
  const loadingLockRef = useRef(false) // Prevent concurrent loads
  const currentLoadIdRef = useRef(0) // Track which load operation is current
  const lastPositionUpdateRef = useRef(0) // Throttle position updates to reduce re-renders
  const lastPositionValueRef = useRef(0) // Track last position value

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

  // Check for playback completion periodically (position updates are handled by the native callback)
  useEffect(() => {
    if (isPlaying && mediaType === 'audio') {
      positionIntervalRef.current = setInterval(async () => {
        if (soundRef.current) {
          try {
            const status = await soundRef.current.getStatusAsync()
            if (status.isLoaded && status.didJustFinish) {
              // Handle playback completion based on repeat mode
              handlePlaybackComplete()
            }
          } catch (error) {
            // Ignore errors during status check
          }
        }
      }, 200) // Only used for didJustFinish check; position updates via native callback at 100ms
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
  }, [isPlaying, mediaType, handlePlaybackComplete])

  /**
   * Load and play a media item
   * @param {Object} item - Media item with id, title, audioUrl/videoUrl, thumbnailUrl, etc.
   * @param {Object} options - Optional settings
   * @param {boolean} options.addToQueueIfNotPresent - If true, add to queue if not already there (default: true)
   * @param {boolean} options.skipQueueUpdate - If true, skip queue management (used internally by playQueueItem)
   */
  const loadMedia = useCallback(async (item, options = {}) => {
    const { addToQueueIfNotPresent = true, skipQueueUpdate = false } = options

    if (!item) {
      Alert.alert('loadMedia Error', 'No item provided')
      return
    }

    // Generate unique ID for this load operation
    const loadId = ++currentLoadIdRef.current
    console.log(`=== LOAD MEDIA START (loadId: ${loadId}) ===`)
    console.log('Song:', item.title || item.name || item.id)
    console.log('Available URLs:', {
      audioUrl: item.audioUrl ? 'YES' : 'NO',
      firebaseAudioUrl: item.firebaseAudioUrl ? 'YES' : 'NO',
      streamUrl: item.streamUrl ? 'YES' : 'NO',
      videoUrl: item.videoUrl ? 'YES (ignored for audio playback)' : 'NO',
    })

    // For songs, ALWAYS play audio. A song's videoUrl is for the music video feature,
    // not for regular playback. Songs should always be played as audio.
    // The audioUrl takes priority; only fall back to videoUrl if no audioUrl exists.
    const type = 'audio'
    const mediaUrl = item.audioUrl || item.firebaseAudioUrl || item.streamUrl

    try {
      setIsLoading(true)

      if (!mediaUrl) {
        Alert.alert('Playback Error', 'No audio URL available for this song')
        console.error('No audio URL found. Item has:', {
          audioUrl: item.audioUrl,
          firebaseAudioUrl: item.firebaseAudioUrl,
          streamUrl: item.streamUrl,
          videoUrl: item.videoUrl,
        })
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
          {
            shouldPlay: false, // Don't auto-play until we verify this load is still current
            progressUpdateIntervalMillis: 100, // Smoother timer updates (default is 500ms)
          },
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

        // Track play count in database
        if (item.id) {
          console.log('=== INCREMENTING PLAY COUNT for song:', item.id, '===')
          incrementPlayCount(item.id).catch(err =>
            console.warn('Failed to increment play count:', err)
          )
        }
      }

      setMediaType(type)
      setCurrentMedia(item)
      setIsLoading(false)

      // Add to queue if not already present (so playNext/playPrevious work)
      if (!skipQueueUpdate && addToQueueIfNotPresent) {
        setQueue(prevQueue => {
          const existingIndex = prevQueue.findIndex(q => q.id === item.id)
          if (existingIndex >= 0) {
            // Song already in queue, just update queueIndex
            console.log(`[MediaPlayerContext] Song already in queue at index ${existingIndex}`)
            setQueueIndex(existingIndex)
            return prevQueue
          } else {
            // Song not in queue - add it at the end
            console.log(`[MediaPlayerContext] Adding song to queue at index ${prevQueue.length}`)
            setQueueIndex(prevQueue.length) // Point to the new song
            return [...prevQueue, item]
          }
        })
      }

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
   * Only update position when actually playing to prevent slider from moving when paused
   * Position updates are throttled to 500ms to reduce re-renders in consuming components
   */
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (status.isLoaded) {
      // Only update position if playing - prevents slider from moving when paused
      if (status.isPlaying) {
        const now = Date.now()
        const timeSinceLastUpdate = now - lastPositionUpdateRef.current
        const positionChange = Math.abs(status.positionMillis - lastPositionValueRef.current)

        // Throttle updates to every 500ms, or if position changed by more than 1 second (seek)
        if (timeSinceLastUpdate >= 500 || positionChange >= 1000) {
          lastPositionUpdateRef.current = now
          lastPositionValueRef.current = status.positionMillis
          setPosition(status.positionMillis)
        }
      }
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
   * Uses optimistic UI update for instant feedback
   */
  const play = useCallback(async () => {
    if (mediaType === 'audio' && soundRef.current) {
      // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      isPlayingRef.current = true
      setIsPlaying(true)

      try {
        const status = await soundRef.current.getStatusAsync()
        if (status.isLoaded) {
          // If at end of track, seek to beginning first
          if (status.didJustFinish || (status.durationMillis && status.positionMillis >= status.durationMillis - 100)) {
            await soundRef.current.setStatusAsync({ positionMillis: 0 })
            setPosition(0)
          }
          await soundRef.current.setStatusAsync({ shouldPlay: true })
        } else {
          // Revert if not loaded
          isPlayingRef.current = false
          setIsPlaying(false)
        }
      } catch (error) {
        // Revert on error
        isPlayingRef.current = false
        setIsPlaying(false)
        console.error('Error playing audio:', error)
      }
    }
  }, [mediaType])

  /**
   * Pause current media
   * Uses optimistic UI update for instant feedback
   */
  const pause = useCallback(async () => {
    if (mediaType === 'audio' && soundRef.current) {
      // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      isPlayingRef.current = false
      setIsPlaying(false)

      try {
        await soundRef.current.setStatusAsync({ shouldPlay: false })
      } catch (error) {
        // Revert on error
        isPlayingRef.current = true
        setIsPlaying(true)
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
    if (isPlayingRef.current) {
      await pause()
    } else {
      await play()
    }
  }, [play, pause])

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
      // Update refs to sync with throttle mechanism
      lastPositionUpdateRef.current = Date.now()
      lastPositionValueRef.current = positionMs
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
   * Play a specific item from the queue by index
   */
  const playQueueItem = useCallback(async (index) => {
    if (index < 0 || index >= queue.length) {
      console.log('[MediaPlayerContext] playQueueItem - invalid index:', index)
      return
    }
    console.log('[MediaPlayerContext] playQueueItem - playing index:', index)
    setQueueIndex(index)
    await loadMedia(queue[index], { skipQueueUpdate: true })
  }, [queue, loadMedia])

  /**
   * Remove an item from the queue by index
   */
  const removeFromQueue = useCallback((index) => {
    if (index < 0 || index >= queue.length) return

    setQueue(prev => {
      const newQueue = [...prev]
      newQueue.splice(index, 1)
      return newQueue
    })

    // Adjust queueIndex if needed
    if (index < queueIndex) {
      setQueueIndex(prev => prev - 1)
    } else if (index === queueIndex && index >= queue.length - 1) {
      // Removed current and it was the last item
      setQueueIndex(prev => Math.max(0, prev - 1))
    }
  }, [queue.length, queueIndex])

  /**
   * Play next item in queue (handles shuffle mode)
   * @returns {boolean} - true if next song was played, false if at end of queue
   */
  const playNext = useCallback(async () => {
    console.log('[MediaPlayerContext] playNext called. queue.length:', queue.length, 'queueIndex:', queueIndex, 'isShuffleEnabled:', isShuffleEnabled, 'repeatMode:', repeatMode)
    if (queue.length === 0) {
      console.log('[MediaPlayerContext] playNext - no queue, returning false')
      return false
    }

    let nextIndex
    if (isShuffleEnabled) {
      // Shuffle: pick a random song (excluding current)
      if (queue.length === 1) {
        nextIndex = 0 // Only one song, replay it
      } else {
        // Get all indices except current
        const availableIndices = queue.map((_, idx) => idx).filter(idx => idx !== queueIndex)
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
      }
    } else {
      nextIndex = queueIndex + 1
    }

    if (nextIndex < queue.length) {
      console.log('[MediaPlayerContext] playNext - playing song at index:', nextIndex)
      setQueueIndex(nextIndex)
      await loadMedia(queue[nextIndex], { skipQueueUpdate: true })
      return true
    } else if (repeatMode === 'all') {
      // Loop back to start of queue
      console.log('[MediaPlayerContext] playNext - repeat all, looping to start')
      setQueueIndex(0)
      await loadMedia(queue[0], { skipQueueUpdate: true })
      return true
    } else {
      // End of queue - don't stop, just stay on current song
      console.log('[MediaPlayerContext] playNext - at end of queue, no action taken')
      return false
    }
  }, [queue, queueIndex, loadMedia, isShuffleEnabled, repeatMode])

  /**
   * Play previous item in queue
   */
  const playPrevious = useCallback(async () => {
    console.log('[MediaPlayerContext] playPrevious called. queueIndex:', queueIndex, 'position:', position, 'repeatMode:', repeatMode)
    // If we're more than 3 seconds into the track, restart it
    if (position > 3000) {
      console.log('[MediaPlayerContext] playPrevious - restarting current song (position > 3s)')
      await seek(0)
      return
    }

    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1
      console.log('[MediaPlayerContext] playPrevious - going to previous song at index:', prevIndex)
      setQueueIndex(prevIndex)
      await loadMedia(queue[prevIndex], { skipQueueUpdate: true })
    } else if (repeatMode === 'all' && queue.length > 0) {
      // Loop to end of queue
      const lastIndex = queue.length - 1
      console.log('[MediaPlayerContext] playPrevious - repeat all, looping to end at index:', lastIndex)
      setQueueIndex(lastIndex)
      await loadMedia(queue[lastIndex], { skipQueueUpdate: true })
    } else {
      // At beginning of queue, just restart current song
      console.log('[MediaPlayerContext] playPrevious - at beginning of queue, restarting current song')
      await seek(0)
    }
  }, [position, queueIndex, queue, loadMedia, seek, repeatMode])

  /**
   * Handle playback completion - called when a song finishes
   * Respects repeat mode and autoplay settings
   */
  const handlePlaybackComplete = useCallback(async () => {
    console.log('[MediaPlayer] Playback complete. repeatMode:', repeatMode, 'autoPlayEnabled:', autoPlayEnabled)

    if (repeatMode === 'one') {
      // Repeat current song
      console.log('[MediaPlayer] Repeat one - restarting current song')
      if (soundRef.current) {
        await soundRef.current.setStatusAsync({ positionMillis: 0, shouldPlay: true })
        setPosition(0)
      }
    } else if (autoPlayEnabled) {
      // Auto-play next song (playNext handles shuffle and repeat-all)
      console.log('[MediaPlayer] Auto-play enabled - playing next')
      await playNext()
    } else {
      // No autoplay - just stop
      console.log('[MediaPlayer] Auto-play disabled - stopping')
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }, [repeatMode, autoPlayEnabled, playNext])

  /**
   * Toggle shuffle mode
   */
  const toggleShuffle = useCallback(() => {
    console.log('[MediaPlayerContext] toggleShuffle called. Current:', isShuffleEnabled)
    setIsShuffleEnabled(prev => {
      console.log('[MediaPlayerContext] toggleShuffle - setting to:', !prev)
      return !prev
    })
  }, [isShuffleEnabled])

  /**
   * Cycle through repeat modes: off -> all -> one -> off
   */
  const cycleRepeatMode = useCallback(() => {
    console.log('[MediaPlayerContext] cycleRepeatMode called. Current:', repeatMode)
    setRepeatMode(prev => {
      const next = prev === 'off' ? 'all' : (prev === 'all' ? 'one' : 'off')
      console.log('[MediaPlayerContext] cycleRepeatMode - setting to:', next)
      return next
    })
  }, [repeatMode])

  /**
   * Toggle autoplay setting
   */
  const toggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled(prev => !prev)
  }, [])

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
    await loadMedia(items[startIndex], { skipQueueUpdate: true })
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
   * Stop playback if a specific song is currently playing
   * Used when a song is deleted to stop playback and dismiss the player
   * @param {string} songId - ID of the song to check
   * @returns {boolean} - true if the song was playing and stopped, false otherwise
   */
  const stopIfPlaying = useCallback(async (songId) => {
    if (!songId) return false

    const isCurrentSong = currentMedia?.id === songId
    console.log('[MediaPlayerContext] stopIfPlaying:', { songId, currentMediaId: currentMedia?.id, isCurrentSong })

    if (isCurrentSong) {
      console.log('[MediaPlayerContext] Stopping playback - deleted song is currently playing')
      await stop()
      return true
    }
    return false
  }, [currentMedia, stop])

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

    // Playback mode settings
    isShuffleEnabled,
    repeatMode,
    autoPlayEnabled,

    // Likes - shared state for all components
    likedSongIds,
    isLiked,
    toggleLike,

    // Song management
    stopIfPlaying,

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
    removeFromQueue,
    clearQueue,
    playNext,
    playPrevious,
    playList,
    playQueueItem,
    setQueueIndex, // For jumping to specific position in queue

    // Playback mode controls
    toggleShuffle,
    cycleRepeatMode,
    toggleAutoPlay,

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
