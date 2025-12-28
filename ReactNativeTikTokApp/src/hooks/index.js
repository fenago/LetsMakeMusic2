/**
 * Hooks Index
 *
 * Exports all custom hooks for easy importing.
 */

// Media & Playback Hooks
export * from './useMediaPlayer'
export * from './useRecentlyPlayed'
export * from './useRecommendations'
export * from './usePlaylists'

// Band & Song Hooks
export * from './useBands'
export * from './useBandSongs'

// Lyrics Hooks
export * from './useLyrics'

// Beats Hooks
export * from './useBeats'

// Artwork & Media Creation Hooks
export * from './useArtwork'
export * from './useImageGeneration'
export * from './useStockMedia'

// Artist Voice Hooks
export * from './useArtistVoices'

// Video Hooks
export * from './useVideoClips'
export * from './useVideoGeneration'

// Default exports for convenience
export { default as useMediaPlayer } from './useMediaPlayer'
export { default as usePlaylists } from './usePlaylists'
export { default as useArtwork } from './useArtwork'
export { default as useImageGeneration } from './useImageGeneration'
export { default as useStockMedia } from './useStockMedia'
export { default as useVideoClips } from './useVideoClips'
export { default as useVideoGeneration } from './useVideoGeneration'
export { default as useLyrics } from './useLyrics'
export { default as useBeats } from './useBeats'
