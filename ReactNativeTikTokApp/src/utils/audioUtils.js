/**
 * Audio Utilities - Centralized audio URL resolution and playback helpers
 *
 * SINGLE SOURCE OF TRUTH for audio URL resolution across the entire app.
 * This ensures consistent behavior on Home Feed, Discover, Library, and all screens.
 */

/**
 * Check if a Firebase Storage URL is from an accessible bucket
 * Known issue: development-69cdc.appspot.com returns 403
 */
const isFirebaseUrlAccessible = (url) => {
  if (!url) return false
  // Skip URLs from the broken development bucket
  if (url.includes('development-69cdc.appspot.com')) {
    console.warn('[audioUtils] ⚠️ Skipping inaccessible Firebase bucket: development-69cdc')
    return false
  }
  // Check it's from our actual project bucket
  if (url.includes('letsmakemusic-4e0fe.appspot.com')) {
    return true
  }
  // For any other Firebase URL, be cautious
  if (url.includes('firebasestorage.googleapis.com')) {
    console.warn('[audioUtils] ⚠️ Unknown Firebase bucket, skipping:', url.substring(0, 80))
    return false
  }
  return true
}

/**
 * Get playable audio URL from a song object
 *
 * PRIORITY ORDER:
 * 1. Firebase Storage URL (our permanent backup) - firebaseAudioUrl
 *    BUT only if it's from an accessible bucket (not development-69cdc)
 * 2. Original audioUrl from Suno API
 * 3. Stream URL from Suno API - streamUrl
 * 4. Suno CDN fallback (construct from sunoId) - keeps files ~2 weeks
 *
 * @param {Object} song - Song object from Firebase or API
 * @returns {string|null} Playable audio URL or null if none found
 */
export const getPlayableUrl = (song) => {
  if (!song) {
    console.warn('[audioUtils] getPlayableUrl: song is null/undefined')
    return null
  }

  // ENHANCED DEBUG: Log all URL fields for every song
  console.log('[audioUtils] getPlayableUrl checking song:', {
    id: song.id,
    title: song.title || song.name || song.label,
    firebaseAudioUrl: song.firebaseAudioUrl ? `${song.firebaseAudioUrl.substring(0, 50)}...` : 'NULL',
    audioUrl: song.audioUrl ? `${song.audioUrl.substring(0, 50)}...` : 'NULL',
    streamUrl: song.streamUrl ? `${song.streamUrl.substring(0, 50)}...` : 'NULL',
    sunoId: song.sunoId || 'NULL',
  })

  // Priority 1: Our Firebase Storage backup - permanent
  // BUT validate that it's from an accessible bucket
  if (song.firebaseAudioUrl && isFirebaseUrlAccessible(song.firebaseAudioUrl)) {
    console.log('[audioUtils] ✓ RESOLVED via firebaseAudioUrl')
    return song.firebaseAudioUrl
  }

  // Priority 2: Original audioUrl from song data
  if (song.audioUrl) {
    console.log('[audioUtils] ✓ RESOLVED via audioUrl')
    return song.audioUrl
  }

  // Priority 3: Stream URL from Suno API
  if (song.streamUrl) {
    console.log('[audioUtils] ✓ RESOLVED via streamUrl')
    return song.streamUrl
  }

  // Priority 4: Suno CDN fallback - construct from sunoId
  if (song.sunoId) {
    const cdnUrl = `https://cdn1.suno.ai/${song.sunoId}.mp3`
    console.log('[audioUtils] ✓ RESOLVED via Suno CDN fallback:', cdnUrl)
    return cdnUrl
  }

  console.error('[audioUtils] ✗ FAILED: No valid audio URL found for song:', song.id)
  return null
}

/**
 * Transform a song object into a format suitable for the media player
 *
 * This is the SINGLE function that should be used to prepare songs for playback.
 * Use this when passing songs to playList, playSong, or loadMedia.
 *
 * @param {Object} song - Raw song object from Firebase or any source
 * @returns {Object} Song object ready for media player
 */
export const prepareSongForPlayer = (song) => {
  if (!song) {
    console.warn('[audioUtils] prepareSongForPlayer: song is null/undefined')
    return null
  }

  const audioUrl = getPlayableUrl(song)

  // CRITICAL: For "About the Artist" section to work, we need:
  // 1. author object with stageName, bio, profilePictureURL
  // 2. artist field (display name fallback)
  // Priority: author.stageName > author.firstName > 'AI Generated'
  // DO NOT use song.artist as it may contain style/genre text from bad data

  const artistName = song.author?.stageName || song.author?.firstName || 'AI Generated'

  const preparedSong = {
    // Spread original song data FIRST to preserve all fields including author object
    ...song,
    // Then override with resolved values
    id: song.id,
    title: song.title || song.name || song.label || 'Untitled Song',
    // Use author-derived name, NOT song.artist (which may have style text)
    artist: artistName,
    audioUrl: audioUrl,
    thumbnailUrl: song.thumbnailUrl || song.imageUrl || song.coverUrl,
    duration: song.duration || 0,
    type: 'audio',
    // ENSURE author object is explicitly preserved for "About the Artist" section
    author: song.author || null,
  }

  console.log('[audioUtils] prepareSongForPlayer result:', {
    id: preparedSong.id,
    title: preparedSong.title,
    hasAudioUrl: !!preparedSong.audioUrl,
    audioUrlPreview: preparedSong.audioUrl?.substring(0, 50) + '...',
  })

  return preparedSong
}

/**
 * Transform an array of songs for playback as a playlist
 *
 * @param {Array} songs - Array of raw song objects
 * @returns {Array} Array of songs ready for media player
 */
export const prepareSongsForPlaylist = (songs) => {
  if (!songs || !Array.isArray(songs)) {
    console.warn('[audioUtils] prepareSongsForPlaylist: songs is not an array')
    return []
  }

  const prepared = songs.map(prepareSongForPlayer).filter(song => song && song.audioUrl)

  console.log('[audioUtils] prepareSongsForPlaylist:', {
    inputCount: songs.length,
    outputCount: prepared.length,
    filteredOut: songs.length - prepared.length,
  })

  return prepared
}

export default {
  getPlayableUrl,
  prepareSongForPlayer,
  prepareSongsForPlaylist,
}
