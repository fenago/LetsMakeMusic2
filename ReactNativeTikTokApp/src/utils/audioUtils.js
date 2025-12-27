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
  // Check it's from our actual project bucket (firebasestorage.app is the new format)
  if (url.includes('letsmakemusic-4e0fe.firebasestorage.app') || url.includes('letsmakemusic-4e0fe.appspot.com')) {
    return true
  }
  // For any other Firebase URL, be cautious (but our bucket should match above)
  if (url.includes('firebasestorage.googleapis.com') && !url.includes('letsmakemusic-4e0fe')) {
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

  // Debug: Log URL resolution (minimal for production)
  console.log('[audioUtils] getPlayableUrl:', {
    id: song.id?.substring?.(0, 8) || song.id,
    hasFirebase: !!song.firebaseAudioUrl,
    hasAudio: !!song.audioUrl,
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

/**
 * Get playable image URL from a song object
 *
 * PRIORITY ORDER:
 * 1. Firebase Storage URL (our permanent backup) - firebaseImageUrl (if stored)
 * 2. Our app bucket images (letsmakemusic-4e0fe)
 * 3. Original imageUrl from Suno API
 * 4. thumbnailUrl fallback
 * 5. Picsum placeholder with song ID for consistency
 *
 * @param {Object} song - Song object from Firebase or API
 * @returns {string} Playable image URL (never null - always has fallback)
 */
export const getPlayableImageUrl = (song) => {
  if (!song) {
    console.warn('[audioUtils] getPlayableImageUrl: song is null/undefined')
    return 'https://picsum.photos/400/400?music'
  }

  const songId = song.id || 'unknown'
  const songTitle = song.title || song.label || song.name || 'unknown'

  console.log('[audioUtils] getPlayableImageUrl checking:', {
    id: songId?.substring?.(0, 8) || songId,
    title: songTitle?.substring?.(0, 20),
    hasFirebaseImageUrl: !!song.firebaseImageUrl,
    hasImageUrl: !!song.imageUrl,
    hasThumbnailUrl: !!song.thumbnailUrl,
    hasSunoId: !!song.sunoId,
    imageUrlPreview: song.imageUrl?.substring?.(0, 50),
  })

  // Priority 1: Firebase Storage backup for images (if we stored it)
  if (song.firebaseImageUrl && isFirebaseUrlAccessible(song.firebaseImageUrl)) {
    console.log('[audioUtils] ✓ IMAGE via firebaseImageUrl')
    return song.firebaseImageUrl
  }

  // Priority 2: imageUrl from our app bucket (permanent)
  if (song.imageUrl && song.imageUrl.includes('letsmakemusic-4e0fe')) {
    console.log('[audioUtils] ✓ IMAGE via imageUrl (our bucket)')
    return song.imageUrl
  }

  // Priority 3: Any imageUrl - try it even if potentially expired
  // The image component will handle failed loads gracefully
  if (song.imageUrl && song.imageUrl.startsWith('http')) {
    console.log('[audioUtils] ✓ IMAGE via imageUrl (may be expired)')
    return song.imageUrl
  }

  // Priority 4: thumbnailUrl fallback
  if (song.thumbnailUrl && song.thumbnailUrl.startsWith('http')) {
    console.log('[audioUtils] ✓ IMAGE via thumbnailUrl')
    return song.thumbnailUrl
  }

  // Priority 5: Suno CDN image fallback (if we have sunoId)
  // Note: These also expire, but worth trying
  if (song.sunoId) {
    const cdnImageUrl = `https://cdn1.suno.ai/image_${song.sunoId}.jpeg`
    console.log('[audioUtils] ✓ IMAGE via Suno CDN fallback')
    return cdnImageUrl
  }

  // Final fallback: Gradient placeholder with consistent seed
  // Using a more reliable placeholder service
  const fallbackUrl = `https://picsum.photos/seed/${songId}/400/400`
  console.log('[audioUtils] ⚠️ IMAGE using fallback for:', songTitle)
  return fallbackUrl
}

/**
 * Check if a Suno URL is likely expired based on creation date
 * Suno CDN URLs typically expire after ~2 weeks
 */
const isSunoUrlLikelyExpired = (url, createdAt) => {
  if (!url) return true
  if (!url.includes('suno.ai') && !url.includes('cdn1.suno.ai')) return false

  // If no createdAt, assume it might be expired if it's a Suno URL
  if (!createdAt) return true

  // Convert Firestore timestamp to Date if needed
  let createdDate
  if (createdAt?.toDate) {
    createdDate = createdAt.toDate()
  } else if (createdAt?.seconds) {
    createdDate = new Date(createdAt.seconds * 1000)
  } else if (typeof createdAt === 'string') {
    createdDate = new Date(createdAt)
  } else {
    return true // Can't determine, assume expired
  }

  // Check if older than 14 days
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const isExpired = createdDate < twoWeeksAgo
  if (isExpired) {
    console.log('[audioUtils] ⚠️ Suno URL likely expired (>14 days old)')
  }
  return isExpired
}

export default {
  getPlayableUrl,
  getPlayableImageUrl,
  prepareSongForPlayer,
  prepareSongsForPlaylist,
}
