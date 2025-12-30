import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { Audio } from 'expo-av'
import { Alert } from 'react-native'
import { subscribeToLikedSongs, toggleSongLike, incrementPlayCount } from '../services/songsService'
import { logRecentlyPlayed } from '../services/recentlyPlayedService'
import useCurrentUser from '../core/onboarding/hooks/useCurrentUser'

const MediaPlayerContext = createContext(null)
// Separate context for position - updates frequently (100ms) and should NOT cause main context re-renders
const PositionContext = createContext({ position: 0, duration: 0 })
// PERFORMANCE: Separate context for liked songs - prevents re-renders of all consumers when likes change
const LikedSongsContext = createContext({ likedSongIds: new Set(), isLiked: () => false, toggleLike: async () => {} })
// PERFORMANCE FIX: Separate context for playback state (isPlaying/isLoading)
// Only components that need to react to play/pause should subscribe to this
const PlaybackStateContext = createContext({ isPlaying: false, isLoading: false })

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
  const likedSongIdsRef = useRef(new Set()) // Ref for stable isLiked function (prevents re-renders)

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
        if (__DEV__) console.error('Error setting audio mode:', error)
      }
    }
    setupAudio()
  }, [])

  // Subscribe to user's liked songs for real-time sync across all components
  useEffect(() => {
    if (!userId) {
      setLikedSongIds(new Set())
      likedSongIdsRef.current = new Set()
      return
    }

    const unsubscribe = subscribeToLikedSongs(userId, (likedIds) => {
      // Update both state (for UI that needs to react) and ref (for stable isLiked)
      setLikedSongIds(likedIds)
      likedSongIdsRef.current = likedIds
    })

    return () => {
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

  // Ref to store the latest handlePlaybackComplete without causing effect re-runs
  const handlePlaybackCompleteRef = useRef(null)

  // Check for playback completion periodically (position updates are handled by the native callback)
  // PERFORMANCE: Using ref for callback to prevent effect re-runs when handlePlaybackComplete recreates
  useEffect(() => {
    handlePlaybackCompleteRef.current = handlePlaybackComplete
  }, [handlePlaybackComplete])

  useEffect(() => {
    if (isPlaying && mediaType === 'audio') {
      positionIntervalRef.current = setInterval(async () => {
        if (soundRef.current) {
          try {
            const status = await soundRef.current.getStatusAsync()
            if (status.isLoaded && status.didJustFinish) {
              // Handle playback completion based on repeat mode
              handlePlaybackCompleteRef.current?.()
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
  }, [isPlaying, mediaType]) // Removed handlePlaybackComplete - uses ref instead

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

    // For songs, ALWAYS play audio. A song's videoUrl is for the music video feature,
    // not for regular playback. Songs should always be played as audio.
    // The audioUrl takes priority; only fall back to videoUrl if no audioUrl exists.
    const type = 'audio'
    const mediaUrl = item.audioUrl || item.firebaseAudioUrl || item.streamUrl

    if (!mediaUrl) {
      Alert.alert('Playback Error', 'No audio URL available for this song')
      return
    }

    // IMMEDIATELY show mini-player with loading state
    // This provides instant visual feedback while audio loads
    setMediaType(type)
    setCurrentMedia(item)
    setIsMiniPlayerVisible(true)
    setIsLoading(true)
    setPosition(0)

    try {
      // CRITICAL: Stop and unload any existing audio FIRST
      if (soundRef.current) {
        try {
          await soundRef.current.setStatusAsync({ shouldPlay: false })
          await soundRef.current.unloadAsync()
        } catch (e) {
          // Ignore unload errors
        }
        soundRef.current = null
      }

      // Check if this load is still the current one
      if (loadId !== currentLoadIdRef.current) {
        // CRITICAL: Reset loading state on cancellation to prevent stuck spinner
        setIsLoading(false)
        return
      }

      // Create new sound
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
        // CRITICAL: Reset loading state on cancellation to prevent stuck spinner
        setIsLoading(false)
        try {
          await result.sound.unloadAsync()
        } catch (e) {
          // Ignore
        }
        return
      }
      const { sound, status } = result
      soundRef.current = sound

      // Duration priority: 1) from audio status, 2) from song data (convert seconds to ms)
      const audioDurationMs = status.durationMillis || 0
      const itemDurationMs = item.duration ? item.duration * 1000 : 0
      const finalDuration = audioDurationMs > 0 ? audioDurationMs : itemDurationMs
      fallbackDurationRef.current = finalDuration
      setDuration(finalDuration)

      // Now start playback
      await sound.setStatusAsync({ shouldPlay: true })
      isPlayingRef.current = true
      setIsPlaying(true)
      setIsLoading(false)

      // Track play count and recently played in background (silently)
      if (item.id) {
        incrementPlayCount(item.id).catch(() => {})
        if (userId) {
          logRecentlyPlayed(userId, item).catch(() => {})
        }
      }

      // Add to queue if not already present (so playNext/playPrevious work)
      // NOTE: We calculate index BEFORE setQueue to avoid calling setState inside setState updater
      if (!skipQueueUpdate && addToQueueIfNotPresent) {
        const existingIndex = queue.findIndex(q => q.id === item.id)
        if (existingIndex >= 0) {
          setQueueIndex(existingIndex)
          // Already in queue, no need to add
        } else {
          setQueueIndex(queue.length) // Will be the new index after adding
          setQueue(prevQueue => [...prevQueue, item])
        }
      }
    } catch (error) {
      if (__DEV__) console.error('loadMedia error:', error.message)
      Alert.alert('Playback Error', 'Failed to load audio')
      setIsLoading(false)
    }
  }, [userId, queue]) // userId for logRecentlyPlayed, queue for findIndex

  /**
   * Playback status callback for audio
   * PERFORMANCE CRITICAL: This runs every 100ms during playback - keep it minimal!
   */
  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) return

    // Throttled position updates (every 250ms or on seek)
    if (status.isPlaying) {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastPositionUpdateRef.current
      if (timeSinceLastUpdate >= 250 || Math.abs(status.positionMillis - lastPositionValueRef.current) >= 500) {
        lastPositionUpdateRef.current = now
        lastPositionValueRef.current = status.positionMillis
        setPosition(status.positionMillis)
      }
    }

    // Only update duration if changed
    if (status.durationMillis && status.durationMillis !== fallbackDurationRef.current) {
      fallbackDurationRef.current = status.durationMillis
      setDuration(status.durationMillis)
    }

    // Handle playback finish
    if (status.didJustFinish) {
      isPlayingRef.current = false
      setIsPlaying(false)
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
      }
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
    if (soundRef.current) {
      try {
        await soundRef.current.setStatusAsync({ shouldPlay: false, positionMillis: 0 })
        await soundRef.current.unloadAsync()
      } catch (error) {
        // Ignore stop errors
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
    if (index < 0 || index >= queue.length) return
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
    if (queue.length === 0) {
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
      setQueueIndex(nextIndex)
      await loadMedia(queue[nextIndex], { skipQueueUpdate: true })
      return true
    } else if (repeatMode === 'all') {
      // Loop back to start of queue
      setQueueIndex(0)
      await loadMedia(queue[0], { skipQueueUpdate: true })
      return true
    } else {
      // End of queue - don't stop, just stay on current song
      return false
    }
  }, [queue, queueIndex, loadMedia, isShuffleEnabled, repeatMode])

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
      await loadMedia(queue[prevIndex], { skipQueueUpdate: true })
    } else if (repeatMode === 'all' && queue.length > 0) {
      // Loop to end of queue
      const lastIndex = queue.length - 1
      setQueueIndex(lastIndex)
      await loadMedia(queue[lastIndex], { skipQueueUpdate: true })
    } else {
      // At beginning of queue, just restart current song
      await seek(0)
    }
  }, [position, queueIndex, queue, loadMedia, seek, repeatMode])

  /**
   * Handle playback completion - called when a song finishes
   * Respects repeat mode and autoplay settings
   */
  const handlePlaybackComplete = useCallback(async () => {
    if (repeatMode === 'one') {
      // Repeat current song
      if (soundRef.current) {
        await soundRef.current.setStatusAsync({ positionMillis: 0, shouldPlay: true })
        setPosition(0)
      }
    } else if (autoPlayEnabled) {
      // Auto-play next song (playNext handles shuffle and repeat-all)
      await playNext()
    } else {
      // No autoplay - just stop
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }, [repeatMode, autoPlayEnabled, playNext])

  /**
   * Toggle shuffle mode
   */
  const toggleShuffle = useCallback(() => {
    setIsShuffleEnabled(prev => !prev)
  }, [])

  /**
   * Cycle through repeat modes: off -> all -> one -> off
   */
  const cycleRepeatMode = useCallback(() => {
    setRepeatMode(prev => prev === 'off' ? 'all' : (prev === 'all' ? 'one' : 'off'))
  }, [])

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
    if (!items || items.length === 0) {
      return
    }

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
   * Check if a song is liked (uses ref for stable function - prevents re-renders)
   * NOTE: Uses ref instead of state to keep this function stable across re-renders
   */
  const isLiked = useCallback((songId) => {
    return likedSongIdsRef.current.has(songId)
  }, []) // Empty deps - uses ref for stable access

  /**
   * Stop playback if a specific song is currently playing
   * Used when a song is deleted to stop playback and dismiss the player
   * @param {string} songId - ID of the song to check
   * @returns {boolean} - true if the song was playing and stopped, false otherwise
   */
  const stopIfPlaying = useCallback(async (songId) => {
    if (!songId) return false

    if (currentMedia?.id === songId) {
      await stop()
      return true
    }
    return false
  }, [currentMedia, stop])

  /**
   * Update current media with new properties (e.g., after fetching timestamped lyrics)
   * @param {Object} updates - Properties to merge into currentMedia
   */
  const updateCurrentMedia = useCallback((updates) => {
    if (!currentMedia) return
    setCurrentMedia(prev => ({
      ...prev,
      ...updates,
    }))
  }, [currentMedia])

  /**
   * Toggle like status for a song (updates shared state via Firebase subscription)
   * @param {Object} song - Song object with id, title, imageUrl, etc.
   * @returns {Promise<boolean>} - New like status (true = liked, false = unliked)
   */
  const toggleLike = useCallback(async (song) => {
    if (!song?.id || !userId) {
      return false
    }

    const nowLiked = await toggleSongLike(song.id, userId, {
      title: song.title || song.name || song.label,
      imageUrl: song.imageUrl || song.thumbnailUrl || song.coverUrl,
      artist: song.artist || song.style || song.description || song.author?.firstName,
    })
    // Note: likedSongIds will update automatically via Firebase subscription
    return nowLiked
  }, [userId])

  // Memoize position context value - only changes when position/duration change
  const positionValue = useMemo(() => ({
    position,
    duration,
  }), [position, duration])

  // Memoize main context value - should NOT include position/duration to prevent re-renders
  const value = useMemo(() => ({
    // State (excluding position/duration - they're in PositionContext)
    // PERFORMANCE: isPlaying, isLoading, play, pause, togglePlayPause moved to PlaybackStateContext
    // Use usePlaybackState() hook for these values
    mediaType,
    currentMedia,
    queue,
    queueIndex,
    isFullPlayerVisible,
    isMiniPlayerVisible,

    // Playback mode settings
    isShuffleEnabled,
    repeatMode,
    autoPlayEnabled,

    // Likes - MOVED TO SEPARATE LikedSongsContext for performance
    // Use useLikedSongs() hook instead to avoid re-renders
    isLiked,      // Stable function - uses ref for immediate access (kept here for backward compat)
    toggleLike,   // Kept here for backward compat

    // Song management
    stopIfPlaying,
    updateCurrentMedia,

    // Actions (play, pause, togglePlayPause moved to PlaybackStateContext)
    loadMedia,
    playSong, // Alias for loadMedia
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
  }), [
    mediaType,
    // PERFORMANCE: isPlaying, isLoading removed - moved to PlaybackStateContext
    currentMedia,
    queue,
    queueIndex,
    isFullPlayerVisible,
    isMiniPlayerVisible,
    isShuffleEnabled,
    repeatMode,
    autoPlayEnabled,
    // PERFORMANCE: likedSongIds REMOVED from deps - moved to separate LikedSongsContext
    // isLiked uses ref so it's stable, toggleLike is useCallback so it's stable
    toggleLike,
    stopIfPlaying,
    updateCurrentMedia,
    loadMedia,
    playSong,
    // PERFORMANCE: play, pause, togglePlayPause removed - moved to PlaybackStateContext
    stop,
    seek,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playNext,
    playPrevious,
    playList,
    playQueueItem,
    toggleShuffle,
    cycleRepeatMode,
    toggleAutoPlay,
    showFullPlayer,
    hideFullPlayer,
    dismissPlayer,
    formatTime,
  ])

  // PERFORMANCE: Separate memoized value for liked songs context
  // This only re-renders components that specifically subscribe to likes
  const likedSongsValue = useMemo(() => ({
    likedSongIds,
    isLiked,
    toggleLike,
  }), [likedSongIds, toggleLike])

  // PERFORMANCE: Separate memoized value for playback state (isPlaying/togglePlayPause)
  // Only FullPlayerControls and MiniPlayer need to react to play/pause changes
  // This prevents FullPlayer and other components from re-rendering on every play/pause
  const playbackStateValue = useMemo(() => ({
    isPlaying,
    isLoading,
    togglePlayPause,
    play,
    pause,
  }), [isPlaying, isLoading, togglePlayPause, play, pause])

  return (
    <MediaPlayerContext.Provider value={value}>
      <LikedSongsContext.Provider value={likedSongsValue}>
        <PlaybackStateContext.Provider value={playbackStateValue}>
          <PositionContext.Provider value={positionValue}>
            {children}
          </PositionContext.Provider>
        </PlaybackStateContext.Provider>
      </LikedSongsContext.Provider>
    </MediaPlayerContext.Provider>
  )
}

/**
 * Hook to access ONLY position updates - use this in components that need position
 * (ProgressSection, KaraokeLyrics, MiniPlayer progress bar)
 * This hook updates frequently (100ms) so only use where needed!
 */
export const usePlaybackPosition = () => {
  return useContext(PositionContext)
}

/**
 * PERFORMANCE: Hook to access liked songs state
 * Use this instead of useMediaPlayer() for like-related UI to avoid unnecessary re-renders
 * Only components that need to react to like changes should use this hook
 */
export const useLikedSongs = () => {
  return useContext(LikedSongsContext)
}

/**
 * PERFORMANCE: Hook to access playback state (isPlaying, togglePlayPause)
 * Use this for play/pause buttons to prevent parent components from re-rendering
 * Only FullPlayerControls, MiniPlayer and other playback controls should use this
 */
export const usePlaybackState = () => {
  return useContext(PlaybackStateContext)
}

/**
 * Hook to access media player context (STABLE - no position, no frequent re-renders)
 *
 * IMPORTANT: This hook does NOT include position/duration to prevent re-renders.
 * Components that need position should ALSO call usePlaybackPosition().
 */
export const useMediaPlayer = () => {
  const context = useContext(MediaPlayerContext)
  if (!context) {
    throw new Error('useMediaPlayer must be used within MediaPlayerProvider')
  }
  return context
}

export default MediaPlayerContext
