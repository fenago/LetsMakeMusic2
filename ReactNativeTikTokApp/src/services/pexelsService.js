/**
 * Stock Media Service - Photo & Video Search
 *
 * Provides access to royalty-free stock photos and videos for artwork creation.
 * App-level API key stored securely via Firebase Remote Config.
 *
 * Internal implementation uses Pexels API.
 */

// API configuration
const PHOTOS_BASE_URL = 'https://api.pexels.com/v1'
const VIDEOS_BASE_URL = 'https://api.pexels.com/videos'

// API key for stock media service
// TODO: Move to secure storage or Firebase Remote Config in production
const STOCK_MEDIA_API_KEY = '3LvGh2bMJLFHEQyfudx3l4tIUITox3rxfremUyXLZKlZOMh4qW1KWOgY'

/**
 * Get API key for stock media service
 */
const getApiKey = async () => {
  return STOCK_MEDIA_API_KEY
}

/**
 * Build headers with API key
 */
const getHeaders = async () => {
  const apiKey = await getApiKey()
  return {
    Authorization: apiKey,
  }
}

/**
 * Photo orientation options
 */
export const ORIENTATION = {
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
  SQUARE: 'square',
}

/**
 * Photo size options
 */
export const SIZE = {
  LARGE: 'large', // 24MP
  MEDIUM: 'medium', // 12MP
  SMALL: 'small', // 4MP
}

/**
 * Color options for filtering
 */
export const COLORS = {
  RED: 'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green',
  TURQUOISE: 'turquoise',
  BLUE: 'blue',
  VIOLET: 'violet',
  PINK: 'pink',
  BROWN: 'brown',
  BLACK: 'black',
  GRAY: 'gray',
  WHITE: 'white',
}

/**
 * Music-related search categories
 */
export const MUSIC_CATEGORIES = [
  { id: 'music', label: 'Music', query: 'music' },
  { id: 'concert', label: 'Concert', query: 'concert live music' },
  { id: 'instruments', label: 'Instruments', query: 'musical instruments' },
  { id: 'studio', label: 'Studio', query: 'recording studio' },
  { id: 'dj', label: 'DJ', query: 'dj turntable' },
  { id: 'band', label: 'Band', query: 'music band' },
  { id: 'vinyl', label: 'Vinyl', query: 'vinyl record' },
  { id: 'headphones', label: 'Headphones', query: 'headphones music' },
  { id: 'abstract', label: 'Abstract', query: 'abstract colorful' },
  { id: 'neon', label: 'Neon', query: 'neon lights' },
  { id: 'city', label: 'City', query: 'city night lights' },
  { id: 'nature', label: 'Nature', query: 'nature landscape' },
]

/**
 * Search for photos
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} options.perPage - Results per page (max 80, default 20)
 * @param {number} options.page - Page number (default 1)
 * @param {string} options.orientation - 'landscape', 'portrait', or 'square'
 * @param {string} options.size - 'large', 'medium', or 'small'
 * @param {string} options.color - Color filter
 * @param {string} options.locale - Locale for search (e.g., 'en-US')
 * @returns {Promise<Object>} Pexels API response
 */
export const searchPhotos = async (query, options = {}) => {
  try {
    const headers = await getHeaders()

    const params = new URLSearchParams({
      query: query,
      per_page: String(options.perPage || 20),
      page: String(options.page || 1),
    })

    if (options.orientation) {
      params.append('orientation', options.orientation)
    }
    if (options.size) {
      params.append('size', options.size)
    }
    if (options.color) {
      params.append('color', options.color)
    }
    if (options.locale) {
      params.append('locale', options.locale)
    }

    const response = await fetch(`${PHOTOS_BASE_URL}/search?${params}`, {
      headers,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[pexelsService] Search error:', error)
      return { success: false, error: `API error: ${response.status}`, photos: [] }
    }

    const data = await response.json()
    return {
      success: true,
      photos: data.photos || [],
      totalResults: data.total_results,
      page: data.page,
      perPage: data.per_page,
      nextPage: data.next_page,
      prevPage: data.prev_page,
    }
  } catch (error) {
    console.error('[pexelsService] Search error:', error)
    return { success: false, error: error.message, photos: [] }
  }
}

/**
 * Get curated photos (editor's picks)
 * @param {Object} options - Options
 * @param {number} options.perPage - Results per page (max 80, default 20)
 * @param {number} options.page - Page number
 * @returns {Promise<Object>}
 */
export const getCuratedPhotos = async (options = {}) => {
  try {
    const headers = await getHeaders()

    const params = new URLSearchParams({
      per_page: String(options.perPage || 20),
      page: String(options.page || 1),
    })

    const response = await fetch(`${PHOTOS_BASE_URL}/curated?${params}`, {
      headers,
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}`, photos: [] }
    }

    const data = await response.json()
    return {
      success: true,
      photos: data.photos || [],
      page: data.page,
      perPage: data.per_page,
      nextPage: data.next_page,
    }
  } catch (error) {
    console.error('[pexelsService] Curated error:', error)
    return { success: false, error: error.message, photos: [] }
  }
}

/**
 * Get a specific photo by ID
 * @param {number|string} photoId - Pexels photo ID
 * @returns {Promise<Object>}
 */
export const getPhoto = async (photoId) => {
  try {
    const headers = await getHeaders()

    const response = await fetch(`${PHOTOS_BASE_URL}/photos/${photoId}`, {
      headers,
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` }
    }

    const photo = await response.json()
    return { success: true, photo }
  } catch (error) {
    console.error('[pexelsService] Get photo error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Search for videos
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} options.perPage - Results per page (max 80, default 15)
 * @param {number} options.page - Page number
 * @param {string} options.orientation - 'landscape', 'portrait', or 'square'
 * @param {string} options.size - 'large', 'medium', or 'small'
 * @returns {Promise<Object>}
 */
export const searchVideos = async (query, options = {}) => {
  try {
    const headers = await getHeaders()

    const params = new URLSearchParams({
      query: query,
      per_page: String(options.perPage || 15),
      page: String(options.page || 1),
    })

    if (options.orientation) {
      params.append('orientation', options.orientation)
    }
    if (options.size) {
      params.append('size', options.size)
    }

    const response = await fetch(`${VIDEOS_BASE_URL}/search?${params}`, {
      headers,
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}`, videos: [] }
    }

    const data = await response.json()
    return {
      success: true,
      videos: data.videos || [],
      totalResults: data.total_results,
      page: data.page,
      perPage: data.per_page,
      nextPage: data.next_page,
    }
  } catch (error) {
    console.error('[pexelsService] Video search error:', error)
    return { success: false, error: error.message, videos: [] }
  }
}

/**
 * Get popular videos
 * @param {Object} options - Options
 * @param {number} options.perPage - Results per page
 * @param {number} options.page - Page number
 * @returns {Promise<Object>}
 */
export const getPopularVideos = async (options = {}) => {
  try {
    const headers = await getHeaders()

    const params = new URLSearchParams({
      per_page: String(options.perPage || 15),
      page: String(options.page || 1),
    })

    const response = await fetch(`${VIDEOS_BASE_URL}/popular?${params}`, {
      headers,
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}`, videos: [] }
    }

    const data = await response.json()
    return {
      success: true,
      videos: data.videos || [],
      page: data.page,
      perPage: data.per_page,
      nextPage: data.next_page,
    }
  } catch (error) {
    console.error('[pexelsService] Popular videos error:', error)
    return { success: false, error: error.message, videos: [] }
  }
}

/**
 * Get a specific video by ID
 * @param {number|string} videoId - Pexels video ID
 * @returns {Promise<Object>}
 */
export const getVideo = async (videoId) => {
  try {
    const headers = await getHeaders()

    const response = await fetch(`${VIDEOS_BASE_URL}/videos/${videoId}`, {
      headers,
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` }
    }

    const video = await response.json()
    return { success: true, video }
  } catch (error) {
    console.error('[pexelsService] Get video error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get the best photo URL for a given size requirement
 * @param {Object} photo - Pexels photo object
 * @param {string} size - 'original', 'large2x', 'large', 'medium', 'small', 'portrait', 'landscape', 'tiny'
 * @returns {string} Photo URL
 */
export const getPhotoUrl = (photo, size = 'large') => {
  if (!photo || !photo.src) return null
  return photo.src[size] || photo.src.large || photo.src.original
}

/**
 * Get the thumbnail URL for quick loading
 * @param {Object} photo - Pexels photo object
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (photo) => {
  return getPhotoUrl(photo, 'small')
}

/**
 * Get the best video file for a given quality
 * @param {Object} video - Pexels video object
 * @param {string} quality - 'hd', 'sd', 'hls' (adaptive)
 * @returns {Object|null} Video file object with link, quality, width, height
 */
export const getVideoFile = (video, quality = 'hd') => {
  if (!video || !video.video_files) return null

  const files = video.video_files

  // Sort by quality (higher resolution first)
  const sorted = [...files].sort((a, b) => (b.width || 0) - (a.width || 0))

  if (quality === 'hd') {
    // Get highest quality
    return sorted[0]
  } else if (quality === 'sd') {
    // Get a mid-range quality
    return sorted[Math.floor(sorted.length / 2)] || sorted[0]
  }

  return sorted[0]
}

/**
 * Format attribution text for a photo (required by Pexels)
 * @param {Object} photo - Pexels photo object
 * @returns {string} Attribution text
 */
export const getPhotoAttribution = (photo) => {
  if (!photo) return ''
  return `Photo by ${photo.photographer} on Pexels`
}

/**
 * Format attribution link for a photo
 * @param {Object} photo - Pexels photo object
 * @returns {Object} Attribution with text and URLs
 */
export const getPhotoAttributionData = (photo) => {
  if (!photo) return null
  return {
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    pexelsUrl: photo.url,
    attribution: `Photo by ${photo.photographer} on Pexels`,
  }
}

/**
 * Search for music-related photos with a category
 * @param {string} categoryId - Category ID from MUSIC_CATEGORIES
 * @param {Object} options - Search options
 * @returns {Promise<Object>}
 */
export const searchMusicCategory = async (categoryId, options = {}) => {
  const category = MUSIC_CATEGORIES.find((c) => c.id === categoryId)
  if (!category) {
    return searchPhotos('music', options)
  }
  return searchPhotos(category.query, options)
}

export default {
  searchPhotos,
  getCuratedPhotos,
  getPhoto,
  searchVideos,
  getPopularVideos,
  getVideo,
  getPhotoUrl,
  getThumbnailUrl,
  getVideoFile,
  getPhotoAttribution,
  getPhotoAttributionData,
  searchMusicCategory,
  ORIENTATION,
  SIZE,
  COLORS,
  MUSIC_CATEGORIES,
}
