/**
 * Gemini Image Service - AI Image Generation
 *
 * Handles image generation using Google's Gemini API.
 * Each user provides their own API key stored in their profile.
 *
 * Based on: gemini-image-agent.md
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Singleton instance - initialized with user's API key
let genAI = null
let currentApiKey = null

/**
 * Initialize Gemini with user's API key
 * @param {string} apiKey - User's Gemini API key
 */
export const initializeGemini = (apiKey) => {
  if (!apiKey) {
    genAI = null
    currentApiKey = null
    return false
  }

  // Only reinitialize if key changed
  if (apiKey !== currentApiKey) {
    genAI = new GoogleGenerativeAI(apiKey)
    currentApiKey = apiKey
    console.log('[geminiImageService] Initialized with new API key')
  }

  return true
}

/**
 * Check if Gemini is initialized
 * @returns {boolean}
 */
export const isGeminiInitialized = () => {
  return genAI !== null
}

/**
 * Test if an API key is valid
 * @param {string} apiKey - API key to test
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const testApiKey = async (apiKey) => {
  try {
    if (!apiKey || apiKey.length < 20) {
      return { success: false, error: 'Invalid key format' }
    }

    const testAI = new GoogleGenerativeAI(apiKey)
    const model = testAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Simple test request
    const result = await model.generateContent('Say "hello" in one word')
    const response = await result.response
    const text = response.text()

    if (text) {
      return { success: true }
    }

    return { success: false, error: 'No response from API' }
  } catch (error) {
    console.error('[geminiImageService] API key test failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Aspect ratio configurations
 */
export const ASPECT_RATIOS = {
  SQUARE: '1:1',
  PORTRAIT: '9:16',
  LANDSCAPE: '16:9',
  STANDARD: '4:3',
  WIDE: '3:2',
}

/**
 * Style presets for image generation
 * Organized by category for flexible use across the app
 */
export const STYLE_PRESETS = {
  // Creative Styles
  NONE: {
    name: 'None',
    prompt: '',
    aspectRatio: '1:1',
    category: 'creative',
  },
  ABSTRACT: {
    name: 'Abstract',
    prompt: 'abstract art, modern digital art, vibrant colors, artistic composition',
    aspectRatio: '1:1',
    category: 'creative',
  },
  MINIMALIST: {
    name: 'Minimalist',
    prompt: 'minimalist design, clean lines, simple elegant composition, white space',
    aspectRatio: '1:1',
    category: 'creative',
  },
  SURREAL: {
    name: 'Surreal',
    prompt: 'surrealist art, dreamlike, imaginative, unexpected elements',
    aspectRatio: '1:1',
    category: 'creative',
  },
  GEOMETRIC: {
    name: 'Geometric',
    prompt: 'geometric patterns, shapes, mathematical precision, modern design',
    aspectRatio: '1:1',
    category: 'creative',
  },
  WATERCOLOR: {
    name: 'Watercolor',
    prompt: 'watercolor painting style, soft edges, flowing colors, artistic',
    aspectRatio: '1:1',
    category: 'creative',
  },
  DIGITAL_ART: {
    name: 'Digital Art',
    prompt: 'digital art, high quality, detailed, modern aesthetic',
    aspectRatio: '1:1',
    category: 'creative',
  },

  // Aesthetic Styles
  NEON: {
    name: 'Neon',
    prompt: 'neon lights, glowing, cyberpunk aesthetic, vibrant colors on dark background',
    aspectRatio: '1:1',
    category: 'aesthetic',
  },
  VINTAGE: {
    name: 'Vintage',
    prompt: 'vintage aesthetic, retro style, nostalgic, aged look, classic',
    aspectRatio: '1:1',
    category: 'aesthetic',
  },
  DARK_MOODY: {
    name: 'Dark & Moody',
    prompt: 'dark moody atmosphere, dramatic lighting, shadows, intense',
    aspectRatio: '1:1',
    category: 'aesthetic',
  },
  VIBRANT: {
    name: 'Vibrant',
    prompt: 'vibrant colors, bold, energetic, eye-catching, saturated',
    aspectRatio: '1:1',
    category: 'aesthetic',
  },
  PASTEL: {
    name: 'Pastel',
    prompt: 'pastel colors, soft, gentle, dreamy, light aesthetic',
    aspectRatio: '1:1',
    category: 'aesthetic',
  },
  MONOCHROME: {
    name: 'Monochrome',
    prompt: 'monochromatic, single color palette, elegant, sophisticated',
    aspectRatio: '1:1',
    category: 'aesthetic',
  },
  GRADIENT: {
    name: 'Gradient',
    prompt: 'beautiful gradient colors, smooth color transitions, modern',
    aspectRatio: '1:1',
    category: 'aesthetic',
  },

  // Use Case Styles
  ALBUM_COVER: {
    name: 'Album Art',
    prompt: 'professional album cover art, high quality, music industry standard',
    aspectRatio: '1:1',
    category: 'use-case',
  },
  PROFILE_PHOTO: {
    name: 'Profile',
    prompt: 'professional profile photo, high quality portrait, polished',
    aspectRatio: '1:1',
    category: 'use-case',
  },
  POSTER: {
    name: 'Poster',
    prompt: 'poster design, bold composition, promotional, eye-catching',
    aspectRatio: '9:16',
    category: 'use-case',
  },
  BANNER: {
    name: 'Banner',
    prompt: 'banner design, wide format, promotional, social media ready',
    aspectRatio: '16:9',
    category: 'use-case',
  },
  THUMBNAIL: {
    name: 'Thumbnail',
    prompt: 'thumbnail design, attention-grabbing, clear focal point',
    aspectRatio: '16:9',
    category: 'use-case',
  },

  // Genre-Inspired Styles
  SYNTHWAVE: {
    name: 'Synthwave',
    prompt: 'synthwave aesthetic, 80s retro-futurism, neon grids, sunset gradients',
    aspectRatio: '1:1',
    category: 'genre',
  },
  LO_FI: {
    name: 'Lo-Fi',
    prompt: 'lo-fi aesthetic, cozy, relaxed atmosphere, warm tones, anime influence',
    aspectRatio: '1:1',
    category: 'genre',
  },
  PSYCHEDELIC: {
    name: 'Psychedelic',
    prompt: 'psychedelic art, trippy, colorful patterns, mind-bending visuals',
    aspectRatio: '1:1',
    category: 'genre',
  },
  GRUNGE: {
    name: 'Grunge',
    prompt: 'grunge aesthetic, textured, raw, distressed, underground',
    aspectRatio: '1:1',
    category: 'genre',
  },
  FUTURISTIC: {
    name: 'Futuristic',
    prompt: 'futuristic, sci-fi, technology, sleek, advanced',
    aspectRatio: '1:1',
    category: 'genre',
  },
  NATURE: {
    name: 'Nature',
    prompt: 'natural elements, organic, earth tones, landscapes, peaceful',
    aspectRatio: '1:1',
    category: 'nature',
  },
  COSMIC: {
    name: 'Cosmic',
    prompt: 'cosmic, space, stars, galaxies, celestial, universe',
    aspectRatio: '1:1',
    category: 'genre',
  },
}

/**
 * Get styles grouped by category
 */
export const getStylesByCategory = () => {
  const categories = {}
  Object.entries(STYLE_PRESETS).forEach(([key, value]) => {
    const category = value.category || 'other'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push({ key, ...value })
  })
  return categories
}

/**
 * Category labels for display
 */
export const STYLE_CATEGORIES = {
  creative: 'Creative',
  aesthetic: 'Aesthetic',
  'use-case': 'Use Case',
  genre: 'Genre-Inspired',
}

/**
 * Generate an image using Gemini
 * @param {string} prompt - Text description of the image to generate
 * @param {Object} options - Generation options
 * @param {string} options.aspectRatio - Aspect ratio (default: '1:1')
 * @param {string} options.style - Style preset key from STYLE_PRESETS
 * @param {string} options.model - Model to use (default: 'gemini-2.0-flash-exp')
 * @returns {Promise<{success: boolean, imageData?: string, mimeType?: string, error?: string}>}
 */
export const generateImage = async (prompt, options = {}) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  try {
    // Build enhanced prompt with style
    let enhancedPrompt = prompt
    if (options.style && STYLE_PRESETS[options.style]) {
      enhancedPrompt = `${prompt}. ${STYLE_PRESETS[options.style].prompt}`
    }

    // Use imagen model for image generation
    // Note: As of late 2024, Gemini image generation uses specific models
    const model = genAI.getGenerativeModel({
      model: options.model || 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['Text', 'Image'],
      },
    })

    console.log('[geminiImageService] Generating image with prompt:', enhancedPrompt)

    const result = await model.generateContent(enhancedPrompt)
    const response = await result.response

    // Extract image from response
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      return { success: false, error: 'No response from API' }
    }

    const parts = candidates[0].content.parts
    const imagePart = parts.find((part) => part.inlineData)

    if (imagePart && imagePart.inlineData) {
      return {
        success: true,
        imageData: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png',
        text: parts.find((p) => p.text)?.text,
      }
    }

    // If no image in response, it might be text-only
    const textPart = parts.find((p) => p.text)
    if (textPart) {
      return {
        success: false,
        error: `Image generation not available. Response: ${textPart.text.substring(0, 100)}`,
      }
    }

    return { success: false, error: 'No image generated' }
  } catch (error) {
    console.error('[geminiImageService] Generation error:', error)

    // Handle specific error types
    if (error.message?.includes('SAFETY')) {
      return {
        success: false,
        error: 'Content was filtered for safety. Try a different prompt.',
      }
    }

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return {
        success: false,
        error: 'API rate limit reached. Please wait a moment and try again.',
      }
    }

    if (error.message?.includes('API_KEY')) {
      return {
        success: false,
        error: 'Invalid API key. Please check your key in Settings.',
      }
    }

    return { success: false, error: error.message }
  }
}

/**
 * Generate an image with a specific style preset
 * @param {string} prompt - Base prompt
 * @param {string} styleKey - Key from STYLE_PRESETS
 * @returns {Promise<Object>}
 */
export const generateWithStyle = async (prompt, styleKey) => {
  const preset = STYLE_PRESETS[styleKey]
  if (!preset) {
    return generateImage(prompt)
  }

  return generateImage(prompt, {
    style: styleKey,
    aspectRatio: preset.aspectRatio,
  })
}

/**
 * Generate album cover art
 * @param {Object} songInfo - Song information for context
 * @param {string} songInfo.title - Song title
 * @param {string} songInfo.style - Music style/genre
 * @param {string} songInfo.mood - Mood description
 * @param {string} additionalPrompt - Additional user prompt
 * @returns {Promise<Object>}
 */
export const generateAlbumCover = async (songInfo, additionalPrompt = '') => {
  const basePrompt = `Album cover for a ${songInfo.style || 'music'} song called "${songInfo.title || 'Untitled'}"${songInfo.mood ? `, with a ${songInfo.mood} mood` : ''}${additionalPrompt ? `. ${additionalPrompt}` : ''}`

  return generateImage(basePrompt, { style: 'ALBUM_COVER' })
}

/**
 * Generate artist profile photo
 * @param {string} artistDescription - Description of the artist style
 * @returns {Promise<Object>}
 */
export const generateArtistPhoto = async (artistDescription) => {
  return generateImage(artistDescription, { style: 'PROFILE_PHOTO' })
}

/**
 * Edit an existing image (if supported by the model)
 * Note: Full image editing requires specific model support
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} mimeType - Image MIME type
 * @param {string} editPrompt - Description of edits to make
 * @returns {Promise<Object>}
 */
export const editImage = async (imageBase64, mimeType, editPrompt) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['Text', 'Image'],
      },
    })

    const result = await model.generateContent([
      editPrompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ])

    const response = await result.response
    const parts = response.candidates?.[0]?.content?.parts

    if (!parts) {
      return { success: false, error: 'No response from API' }
    }

    const imagePart = parts.find((part) => part.inlineData)

    if (imagePart && imagePart.inlineData) {
      return {
        success: true,
        imageData: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png',
      }
    }

    return { success: false, error: 'No edited image generated' }
  } catch (error) {
    console.error('[geminiImageService] Edit error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Describe an image using Gemini's vision capabilities
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<{success: boolean, description?: string, error?: string}>}
 */
export const describeImage = async (imageBase64, mimeType) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      'Describe this image in detail. What would make it suitable as album cover art or music-related imagery?',
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ])

    const response = await result.response
    const text = response.text()

    return { success: true, description: text }
  } catch (error) {
    console.error('[geminiImageService] Describe error:', error)
    return { success: false, error: error.message }
  }
}

export default {
  initializeGemini,
  isGeminiInitialized,
  testApiKey,
  generateImage,
  generateWithStyle,
  generateAlbumCover,
  generateArtistPhoto,
  editImage,
  describeImage,
  ASPECT_RATIOS,
  STYLE_PRESETS,
}
