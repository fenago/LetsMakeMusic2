/**
 * useMediaPlayer hook - Re-exported from MediaPlayerContext for convenience
 *
 * Usage:
 * import { useMediaPlayer } from '../hooks/useMediaPlayer'
 *
 * const {
 *   // State
 *   mediaType,        // 'audio' | 'video' | null
 *   isPlaying,        // boolean
 *   isLoading,        // boolean
 *   currentMedia,     // object with track info
 *   position,         // milliseconds
 *   duration,         // milliseconds
 *   queue,            // array of tracks
 *   queueIndex,       // current index in queue
 *   isFullPlayerVisible,
 *   isMiniPlayerVisible,
 *
 *   // Actions
 *   loadMedia,        // (item) => Promise - load and play a track
 *   play,             // () => Promise
 *   pause,            // () => Promise
 *   togglePlayPause,  // () => Promise
 *   stop,             // () => Promise - stop and unload
 *   seek,             // (positionMs) => Promise
 *
 *   // Queue management
 *   addToQueue,       // (item) => void
 *   clearQueue,       // () => void
 *   playNext,         // () => Promise
 *   playPrevious,     // () => Promise
 *   playList,         // (items, startIndex?) => Promise
 *
 *   // UI control
 *   showFullPlayer,   // () => void
 *   hideFullPlayer,   // () => void
 *   dismissPlayer,    // () => Promise
 *
 *   // Helpers
 *   formatTime,       // (ms) => string "m:ss"
 * } = useMediaPlayer()
 */

export { useMediaPlayer } from '../contexts/MediaPlayerContext'
