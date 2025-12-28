/**
 * Song Rights Schema
 *
 * Defines the security/permissions model for songs in the app.
 * These rights control visibility, monetization, and what derivative works
 * others can create from a user's song.
 *
 * Based on Suno API capabilities:
 * - Generate Audio (create new songs)
 * - Extend Audio (continue/extend existing songs)
 * - Vocal Removal (separate vocals from instrumentals)
 * - WAV Export (high-quality lossless format)
 * - Timestamped Lyrics (synchronized lyrics for karaoke)
 * - Lyrics Generation (create new lyrics)
 */

// Visibility options
export const VISIBILITY = {
  PRIVATE: 'private',   // Only owner can see
  SHARED: 'shared',     // Specific users can see (uses sharedWith array)
  PUBLIC: 'public',     // Everyone can see in feed
}

// Default rights for new songs
export const DEFAULT_SONG_RIGHTS = {
  // === VISIBILITY ===
  visibility: VISIBILITY.PUBLIC,  // Who can see this song
  sharedWith: [],                  // Array of user IDs if visibility is 'shared'

  // === MONETIZATION ===
  monetized: false,                // Is this song for sale?
  price: 0,                        // Price in cents if monetized
  allowTipping: true,              // Can others tip the creator?

  // === DERIVATIVE WORK RIGHTS ===
  // Based on Suno API capabilities

  // Extend Audio - Can others extend/continue this song?
  allowExtend: true,

  // Vocal Removal - Can others extract vocals/instrumentals (stems)?
  allowStemExtraction: false,

  // WAV Export - Can others download high-quality WAV?
  allowWavExport: false,

  // Timestamped Lyrics - Can others use the lyrics separately?
  allowLyricsUse: true,

  // Style Transfer - Can others create new versions in different styles?
  allowReinterpret: false,

  // Sampling - Can others sample this in new songs?
  allowSampling: false,

  // Synthetic Singer - Can others create a Synthetic Singer from this song?
  allowArtistVoice: false,

  // Video Creation - Can others pair this with their videos?
  allowVideoCreation: true,

  // === ATTRIBUTION & CREDIT ===
  requireAttribution: true,        // Must credit original creator?
  attributionText: '',             // Custom attribution text (optional)

  // === COMMERCIAL USE ===
  allowCommercialUse: false,       // Can derivatives be monetized?
  commercialLicenseFee: 0,         // Fee for commercial license in cents
}

// Rights descriptions for UI
export const RIGHTS_DESCRIPTIONS = {
  visibility: {
    label: 'Visibility',
    description: 'Who can see this song',
    options: {
      [VISIBILITY.PRIVATE]: 'Only you can see this song',
      [VISIBILITY.SHARED]: 'Only people you share with can see',
      [VISIBILITY.PUBLIC]: 'Anyone can see in the feed',
    },
  },
  monetized: {
    label: 'Monetize',
    description: 'Charge for access to this song',
  },
  allowTipping: {
    label: 'Allow Tips',
    description: 'Let others tip you for this song',
  },
  allowExtend: {
    label: 'Allow Extensions',
    description: 'Others can extend/continue this song with new verses',
  },
  allowStemExtraction: {
    label: 'Allow Stem Extraction',
    description: 'Others can extract vocals and instrumentals separately',
  },
  allowWavExport: {
    label: 'Allow WAV Download',
    description: 'Others can download high-quality lossless audio',
  },
  allowLyricsUse: {
    label: 'Allow Lyrics Use',
    description: 'Others can use your lyrics in their creations',
  },
  allowReinterpret: {
    label: 'Allow Reinterpretation',
    description: 'Others can create new versions in different styles',
  },
  allowSampling: {
    label: 'Allow Sampling',
    description: 'Others can sample parts of this song in new compositions',
  },
  allowArtistVoice: {
    label: 'Allow Synthetic Singer',
    description: 'Others can create a Synthetic Singer from this song',
  },
  allowVideoCreation: {
    label: 'Allow Video Creation',
    description: 'Others can pair this song with their videos',
  },
  requireAttribution: {
    label: 'Require Attribution',
    description: 'Derivatives must credit you as the original creator',
  },
  allowCommercialUse: {
    label: 'Allow Commercial Use',
    description: 'Derivatives can be monetized by others',
  },
}

// Group rights by category for UI organization
export const RIGHTS_CATEGORIES = {
  visibility: {
    label: 'Visibility',
    icon: 'eye',
    rights: ['visibility', 'sharedWith'],
  },
  monetization: {
    label: 'Monetization',
    icon: 'dollar-sign',
    rights: ['monetized', 'price', 'allowTipping'],
  },
  derivatives: {
    label: 'Derivative Works',
    icon: 'git-branch',
    rights: [
      'allowExtend',
      'allowStemExtraction',
      'allowWavExport',
      'allowLyricsUse',
      'allowReinterpret',
      'allowSampling',
      'allowArtistVoice',
      'allowVideoCreation',
    ],
  },
  attribution: {
    label: 'Attribution & Credit',
    icon: 'award',
    rights: ['requireAttribution', 'attributionText'],
  },
  commercial: {
    label: 'Commercial Use',
    icon: 'briefcase',
    rights: ['allowCommercialUse', 'commercialLicenseFee'],
  },
}

/**
 * Check if a user can see a song based on visibility settings
 *
 * @param {Object} song - Song object with rights
 * @param {string} currentUserId - Current user's ID
 * @returns {boolean} True if user can see the song
 */
export const canUserSeeSong = (song, currentUserId) => {
  // Owner can always see their own song
  if (song.userId === currentUserId) {
    return true
  }

  const visibility = song.rights?.visibility || song.visibility || VISIBILITY.PUBLIC

  switch (visibility) {
    case VISIBILITY.PUBLIC:
      return true
    case VISIBILITY.SHARED:
      const sharedWith = song.rights?.sharedWith || song.sharedWith || []
      return sharedWith.includes(currentUserId)
    case VISIBILITY.PRIVATE:
      return false
    default:
      return true // Default to public for legacy songs
  }
}

/**
 * Check if a user can perform a specific action on a song
 *
 * @param {Object} song - Song object with rights
 * @param {string} currentUserId - Current user's ID
 * @param {string} action - Action to check (e.g., 'extend', 'stemExtraction')
 * @returns {boolean} True if user can perform the action
 */
export const canUserPerformAction = (song, currentUserId, action) => {
  // Owner can always perform any action on their own song
  if (song.userId === currentUserId) {
    return true
  }

  // First check if user can even see the song
  if (!canUserSeeSong(song, currentUserId)) {
    return false
  }

  // Map action names to rights fields
  const actionToRightMap = {
    extend: 'allowExtend',
    stemExtraction: 'allowStemExtraction',
    wavExport: 'allowWavExport',
    lyricsUse: 'allowLyricsUse',
    reinterpret: 'allowReinterpret',
    sampling: 'allowSampling',
    artistVoice: 'allowArtistVoice',
    personaCreation: 'allowArtistVoice', // Legacy alias
    videoCreation: 'allowVideoCreation',
    commercialUse: 'allowCommercialUse',
    tip: 'allowTipping',
  }

  const rightField = actionToRightMap[action]
  if (!rightField) {
    console.warn(`Unknown action: ${action}`)
    return false
  }

  // Check the right in the song's rights object, falling back to defaults
  const rights = song.rights || {}

  // Handle backward compatibility for allowArtistVoice (was allowPersonaCreation)
  let rightValue = rights[rightField]
  if (rightField === 'allowArtistVoice' && rightValue === undefined) {
    // Check legacy field name
    rightValue = rights.allowPersonaCreation
  }

  const hasRight = rightValue !== undefined
    ? rightValue
    : DEFAULT_SONG_RIGHTS[rightField]

  return hasRight
}

/**
 * Merge user-provided rights with defaults
 *
 * @param {Object} userRights - Partial rights object from user
 * @returns {Object} Complete rights object with defaults filled in
 */
export const mergeWithDefaultRights = (userRights = {}) => {
  return {
    ...DEFAULT_SONG_RIGHTS,
    ...userRights,
  }
}

/**
 * Validate rights object
 *
 * @param {Object} rights - Rights object to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateRights = (rights) => {
  const errors = []

  // Validate visibility
  if (rights.visibility && !Object.values(VISIBILITY).includes(rights.visibility)) {
    errors.push(`Invalid visibility: ${rights.visibility}`)
  }

  // Validate sharedWith if visibility is shared
  if (rights.visibility === VISIBILITY.SHARED) {
    if (!Array.isArray(rights.sharedWith) || rights.sharedWith.length === 0) {
      errors.push('sharedWith must be a non-empty array when visibility is shared')
    }
  }

  // Validate price if monetized
  if (rights.monetized && (typeof rights.price !== 'number' || rights.price < 0)) {
    errors.push('price must be a non-negative number when monetized')
  }

  // Validate commercial license fee
  if (rights.commercialLicenseFee && typeof rights.commercialLicenseFee !== 'number') {
    errors.push('commercialLicenseFee must be a number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export default {
  VISIBILITY,
  DEFAULT_SONG_RIGHTS,
  RIGHTS_DESCRIPTIONS,
  RIGHTS_CATEGORIES,
  canUserSeeSong,
  canUserPerformAction,
  mergeWithDefaultRights,
  validateRights,
}
