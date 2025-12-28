/**
 * Gemini Video Service - AI Video Generation with Veo 3/3.1
 *
 * Handles video clip generation using Google's Veo 3 and 3.1 API.
 * Each user provides their own API key stored in their profile.
 *
 * Features:
 * - Text-to-video generation
 * - Image-to-video (start frame)
 * - Frame interpolation (start + end frames)
 * - Reference images for style/subject guidance
 * - Video extension
 * - Native audio generation (dialogue, SFX, ambient)
 *
 * Based on: gemini-video-agent.md / Veo 3.1 documentation
 */

import { GoogleGenAI } from '@google/genai'

// Singleton instance - initialized with user's API key
let genAI = null
let currentApiKey = null

/**
 * Video generation models with pricing
 * Note: Only Veo 3.1 models are shown since they have the same price as 3.0 but more features
 */
export const VIDEO_MODELS = {
  VEO_3_1: {
    id: 'veo-3.1-generate-preview',
    name: 'Veo 3.1',
    pricePerSecond: 0.4,
    description: 'Full features, reference images, video extension',
    supportsReferenceImages: true,
    supportsVideoExtension: true,
  },
  VEO_3_1_FAST: {
    id: 'veo-3.1-fast-generate-preview',
    name: 'Veo 3.1 Fast',
    pricePerSecond: 0.15,
    description: 'Faster generation, all Veo 3.1 features',
    supportsReferenceImages: true,
    supportsVideoExtension: true,
  },
}

/**
 * Video duration options
 */
export const VIDEO_DURATIONS = {
  SHORT: { value: 4, label: '4 seconds', priceMultiplier: 4 },
  MEDIUM: { value: 6, label: '6 seconds', priceMultiplier: 6 },
  LONG: { value: 8, label: '8 seconds', priceMultiplier: 8 },
}

/**
 * Video resolution options
 */
export const VIDEO_RESOLUTIONS = {
  HD: { value: '720p', label: '720p HD', requiresDuration: null },
  FULL_HD: { value: '1080p', label: '1080p Full HD', requiresDuration: 8 },
}

/**
 * Video aspect ratios
 */
export const VIDEO_ASPECT_RATIOS = {
  LANDSCAPE: { value: '16:9', label: 'Landscape (16:9)', icon: '🖼️' },
  PORTRAIT: { value: '9:16', label: 'Portrait (9:16)', icon: '📱' },
}

/**
 * Generation modes
 */
export const VIDEO_GENERATION_MODES = {
  TEXT_TO_VIDEO: {
    id: 'text',
    label: 'Text to Video',
    description: 'Generate video from text prompt only',
    requiresImages: false,
    maxImages: 0,
  },
  IMAGE_START_FRAME: {
    id: 'startFrame',
    label: 'Image Start Frame',
    description: 'Use an image as the first frame',
    requiresImages: true,
    maxImages: 1,
  },
  INTERPOLATION: {
    id: 'interpolation',
    label: 'Frame Interpolation',
    description: 'Animate between start and end images',
    requiresImages: true,
    maxImages: 2,
  },
  REFERENCE_IMAGES: {
    id: 'reference',
    label: 'Style References',
    description: 'Use up to 3 images for style/subject guidance (Veo 3.1 only)',
    requiresImages: true,
    maxImages: 3,
    requiresVeo31: true,
  },
  EXTEND_VIDEO: {
    id: 'extend',
    label: 'Extend Video',
    description: 'Extend an existing Veo video by 7 seconds (Veo 3.1 only)',
    requiresVideo: true,
    requiresVeo31: true,
  },
}

/**
 * Initialize Gemini with user's API key
 * @param {string} apiKey - User's Gemini API key
 * @returns {boolean} Success
 */
export const initializeGemini = (apiKey) => {
  if (!apiKey) {
    genAI = null
    currentApiKey = null
    return false
  }

  // Only reinitialize if key changed
  if (apiKey !== currentApiKey) {
    genAI = new GoogleGenAI({ apiKey })
    currentApiKey = apiKey
    console.log('[geminiVideoService] Initialized with new API key')
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
 * Calculate estimated cost for video generation
 * @param {string} modelKey - Key from VIDEO_MODELS
 * @param {number} duration - Duration in seconds (4, 6, or 8)
 * @param {boolean} includeAudio - Whether audio is included (affects price)
 * @returns {number} Estimated cost in USD
 */
export const calculateCost = (modelKey, duration, includeAudio = true) => {
  const model = VIDEO_MODELS[modelKey]
  if (!model) return 0

  let pricePerSecond = model.pricePerSecond
  // Silent videos are ~33% cheaper
  if (!includeAudio) {
    pricePerSecond = pricePerSecond * 0.67
  }

  return pricePerSecond * duration
}

/**
 * Generate video from text prompt
 * @param {string} prompt - Text description of the video
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Operation for polling
 */
export const generateVideo = async (prompt, options = {}) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  try {
    const modelId = options.model || VIDEO_MODELS.VEO_3_1_FAST.id

    console.log('[geminiVideoService] Starting video generation with prompt:', prompt)
    console.log('[geminiVideoService] Model:', modelId)
    console.log('[geminiVideoService] Options:', JSON.stringify(options))

    // Build generation config
    const config = {
      aspectRatio: options.aspectRatio || '9:16',
      numberOfVideos: 1,
    }

    // Add optional parameters
    if (options.negativePrompt) {
      config.negativePrompt = options.negativePrompt
    }
    if (options.duration) {
      config.durationSeconds = options.duration
    }
    if (options.personGeneration !== undefined) {
      config.personGeneration = options.personGeneration ? 'allow' : 'dont_allow'
    }

    // Start async generation
    const operation = await genAI.models.generateVideos({
      model: modelId,
      prompt: prompt,
      config: config,
    })

    console.log('[geminiVideoService] Operation started:', operation.name)

    return {
      success: true,
      operationName: operation.name,
      operation: operation,
      status: 'generating',
    }
  } catch (error) {
    console.error('[geminiVideoService] Generation error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate video from an image as the start frame
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} mimeType - Image MIME type
 * @param {string} prompt - Text description
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Operation for polling
 */
export const generateVideoFromImage = async (imageBase64, mimeType, prompt, options = {}) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  try {
    const modelId = options.model || VIDEO_MODELS.VEO_3_1_FAST.id

    console.log('[geminiVideoService] Starting image-to-video generation')

    const config = {
      aspectRatio: options.aspectRatio || '9:16',
      numberOfVideos: 1,
    }

    if (options.negativePrompt) {
      config.negativePrompt = options.negativePrompt
    }
    if (options.duration) {
      config.durationSeconds = options.duration
    }

    // Image object for start frame
    const imageInput = {
      image: {
        imageBytes: imageBase64,
        mimeType: mimeType,
      },
    }

    const operation = await genAI.models.generateVideos({
      model: modelId,
      prompt: prompt,
      image: imageInput,
      config: config,
    })

    console.log('[geminiVideoService] Image-to-video operation started:', operation.name)

    return {
      success: true,
      operationName: operation.name,
      operation: operation,
      status: 'generating',
      mode: 'startFrame',
    }
  } catch (error) {
    console.error('[geminiVideoService] Image-to-video error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate video with frame interpolation (start + end frames)
 * @param {Object} startImage - { base64: string, mimeType: string }
 * @param {Object} endImage - { base64: string, mimeType: string }
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Operation for polling
 */
export const generateVideoInterpolation = async (startImage, endImage, options = {}) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  try {
    const modelId = options.model || VIDEO_MODELS.VEO_3_1_FAST.id

    console.log('[geminiVideoService] Starting frame interpolation generation')

    const config = {
      aspectRatio: options.aspectRatio || '9:16',
      numberOfVideos: 1,
    }

    if (options.duration) {
      config.durationSeconds = options.duration
    }

    const operation = await genAI.models.generateVideos({
      model: modelId,
      image: {
        image: {
          imageBytes: startImage.base64,
          mimeType: startImage.mimeType,
        },
      },
      lastFrame: {
        image: {
          imageBytes: endImage.base64,
          mimeType: endImage.mimeType,
        },
      },
      config: config,
    })

    console.log('[geminiVideoService] Interpolation operation started:', operation.name)

    return {
      success: true,
      operationName: operation.name,
      operation: operation,
      status: 'generating',
      mode: 'interpolation',
    }
  } catch (error) {
    console.error('[geminiVideoService] Interpolation error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate video with reference images for style/subject guidance (Veo 3.1 only)
 * @param {string} prompt - Text description
 * @param {Array} referenceImages - Array of { base64: string, mimeType: string }
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Operation for polling
 */
export const generateVideoWithReferences = async (prompt, referenceImages, options = {}) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  // Reference images only supported on Veo 3.1
  const modelId = options.model || VIDEO_MODELS.VEO_3_1_FAST.id
  const modelInfo = Object.values(VIDEO_MODELS).find((m) => m.id === modelId)

  if (!modelInfo?.supportsReferenceImages) {
    return {
      success: false,
      error: 'Reference images are only supported with Veo 3.1 models.',
    }
  }

  try {
    console.log(
      '[geminiVideoService] Starting generation with',
      referenceImages.length,
      'reference images'
    )

    const config = {
      aspectRatio: options.aspectRatio || '9:16',
      numberOfVideos: 1,
    }

    if (options.negativePrompt) {
      config.negativePrompt = options.negativePrompt
    }
    if (options.duration) {
      config.durationSeconds = options.duration
    }

    // Format reference images
    const formattedRefs = referenceImages.slice(0, 3).map((img) => ({
      referenceImage: {
        image: {
          imageBytes: img.base64,
          mimeType: img.mimeType,
        },
      },
      referenceType: 'REFERENCE_TYPE_STYLE', // or REFERENCE_TYPE_SUBJECT
    }))

    const operation = await genAI.models.generateVideos({
      model: modelId,
      prompt: prompt,
      referenceImages: formattedRefs,
      config: config,
    })

    console.log('[geminiVideoService] Reference images operation started:', operation.name)

    return {
      success: true,
      operationName: operation.name,
      operation: operation,
      status: 'generating',
      mode: 'reference',
    }
  } catch (error) {
    console.error('[geminiVideoService] Reference images error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Extend an existing Veo video by 7 seconds (Veo 3.1 only)
 * @param {Object} sourceVideo - { uri: string } Video to extend
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Operation for polling
 */
export const extendVideo = async (sourceVideo, options = {}) => {
  if (!genAI) {
    return {
      success: false,
      error: 'Gemini not initialized. Please add your API key in Settings.',
    }
  }

  const modelId = options.model || VIDEO_MODELS.VEO_3_1_FAST.id
  const modelInfo = Object.values(VIDEO_MODELS).find((m) => m.id === modelId)

  if (!modelInfo?.supportsVideoExtension) {
    return {
      success: false,
      error: 'Video extension is only supported with Veo 3.1 models.',
    }
  }

  try {
    console.log('[geminiVideoService] Starting video extension')

    const config = {
      numberOfVideos: 1,
    }

    const operation = await genAI.models.generateVideos({
      model: modelId,
      video: {
        uri: sourceVideo.uri,
      },
      config: config,
    })

    console.log('[geminiVideoService] Video extension operation started:', operation.name)

    return {
      success: true,
      operationName: operation.name,
      operation: operation,
      status: 'generating',
      mode: 'extend',
    }
  } catch (error) {
    console.error('[geminiVideoService] Extension error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Poll for video generation completion
 * @param {Object} operation - The operation object from generation
 * @returns {Promise<Object>} Status and video data if complete
 */
export const pollVideoStatus = async (operation) => {
  if (!genAI || !operation) {
    return { success: false, error: 'Invalid operation or not initialized' }
  }

  try {
    // Poll for completion using the correct SDK method
    // Pass the whole operation object, not just the name
    const result = await genAI.operations.getVideosOperation({
      operation: operation,
    })

    if (result.done) {
      // Check for error
      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Generation failed',
          status: 'failed',
        }
      }

      // Get generated video
      console.log('[geminiVideoService] Result response:', JSON.stringify(result.response, null, 2))
      console.log('[geminiVideoService] Generated videos:', result.response?.generatedVideos)

      if (result.response?.generatedVideos?.[0]?.video) {
        const video = result.response.generatedVideos[0].video
        console.log('[geminiVideoService] Video object:', JSON.stringify(video, null, 2))
        console.log('[geminiVideoService] Video URI:', video.uri)
        return {
          success: true,
          status: 'completed',
          videoUri: video.uri,
          video: video,
        }
      }

      // Check if video is directly in generatedVideos
      if (result.response?.generatedVideos?.[0]) {
        const genVideo = result.response.generatedVideos[0]
        console.log('[geminiVideoService] GeneratedVideo object:', JSON.stringify(genVideo, null, 2))
        // Sometimes the video URI is at a different path
        const uri = genVideo.video?.uri || genVideo.uri || genVideo.videoUri
        if (uri) {
          return {
            success: true,
            status: 'completed',
            videoUri: uri,
            video: genVideo,
          }
        }
      }

      console.log('[geminiVideoService] Full result:', JSON.stringify(result, null, 2))
      return { success: false, error: 'No video in response', status: 'failed' }
    }

    // Still processing - update operation reference for next poll
    return {
      success: true,
      status: 'generating',
      done: false,
      operation: result, // Return updated operation for next poll
    }
  } catch (error) {
    console.error('[geminiVideoService] Polling error:', error)
    return { success: false, error: error.message, status: 'failed' }
  }
}

/**
 * Wait for video generation to complete with progress updates
 * @param {Object} initialOperation - The initial operation object
 * @param {Function} onProgress - Callback for progress updates
 * @param {number} maxWaitMs - Maximum wait time (default: 10 minutes)
 * @returns {Promise<Object>} Final result
 */
export const waitForVideoCompletion = async (initialOperation, onProgress, maxWaitMs = 600000) => {
  const startTime = Date.now()
  const pollInterval = 5000 // 5 seconds

  let attempts = 0
  let currentOperation = initialOperation // Track the updated operation from each poll

  while (Date.now() - startTime < maxWaitMs) {
    attempts++
    const elapsed = Date.now() - startTime
    // Estimate progress (Veo takes 11s to 6min, use linear estimate)
    const estimatedProgress = Math.min(95, Math.floor((elapsed / 180000) * 100))

    if (onProgress) {
      onProgress({
        progress: estimatedProgress,
        elapsed: elapsed,
        attempts: attempts,
      })
    }

    const status = await pollVideoStatus(currentOperation)

    if (status.status === 'completed') {
      if (onProgress) onProgress({ progress: 100, elapsed: Date.now() - startTime })
      return status
    }

    if (status.status === 'failed') {
      return status
    }

    // Update operation for next poll (the API may return updated metadata)
    if (status.operation) {
      currentOperation = status.operation
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  return {
    success: false,
    error: 'Video generation timed out after 10 minutes',
    status: 'timeout',
  }
}

/**
 * Download video from Veo URI (must be done within 2 days)
 *
 * IMPORTANT: The official approach from Google's documentation is to:
 * 1. Append the API key to the video URI: `${video.uri}&key=${API_KEY}`
 * 2. Use fetch() to download the video
 *
 * Reference: https://github.com/googleapis/js-genai/blob/main/codegen_instructions.md
 *
 * The genAI.files.download() method does NOT work with Veo video URIs.
 * Veo returns temporary Google Cloud Storage URIs that require the API key appended.
 *
 * @param {Object|string} videoOrUri - The video object from Veo (with .uri property) or video URI string
 * @returns {Promise<Object>} Video data as ArrayBuffer
 */
export const downloadVideo = async (videoOrUri) => {
  if (!currentApiKey) {
    return { success: false, error: 'API key not available for video download' }
  }

  try {
    // Extract the URI from either video object or string
    let videoUri
    if (typeof videoOrUri === 'string') {
      videoUri = videoOrUri
    } else if (videoOrUri?.uri) {
      videoUri = videoOrUri.uri
    } else if (videoOrUri?.video?.uri) {
      videoUri = videoOrUri.video.uri
    } else {
      console.error('[geminiVideoService] Invalid video input:', JSON.stringify(videoOrUri))
      return { success: false, error: 'Invalid video object - no URI found' }
    }

    console.log('[geminiVideoService] Downloading video from URI:', videoUri)

    // CRITICAL: Append API key to the video URI (official Google approach)
    // The URI already has query params, so use '&' to append the key
    const separator = videoUri.includes('?') ? '&' : '?'
    const authenticatedUrl = `${videoUri}${separator}key=${currentApiKey}`

    console.log('[geminiVideoService] Fetching video with authenticated URL...')

    // Use fetch to download the video
    const response = await fetch(authenticatedUrl)

    if (!response.ok) {
      console.error('[geminiVideoService] Fetch failed:', response.status, response.statusText)
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    // Get the video as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer()
    console.log('[geminiVideoService] Video downloaded successfully, size:', arrayBuffer.byteLength, 'bytes')

    return {
      success: true,
      videoData: arrayBuffer,
      mimeType: response.headers.get('content-type') || 'video/mp4',
      sizeBytes: arrayBuffer.byteLength,
    }
  } catch (error) {
    console.error('[geminiVideoService] Download error:', error)
    console.error('[geminiVideoService] Error stack:', error.stack)
    return { success: false, error: error.message }
  }
}

/**
 * Build audio-enhanced prompt with dialogue, SFX, and ambient sounds
 * @param {string} basePrompt - Base video description
 * @param {Object} audioOptions - Audio options
 * @returns {string} Enhanced prompt
 */
export const buildAudioEnhancedPrompt = (basePrompt, audioOptions = {}) => {
  let prompt = basePrompt

  // Add dialogue (must be in quotes for Veo to generate speech)
  if (audioOptions.dialogue) {
    prompt += ` "${audioOptions.dialogue}"`
  }

  // Add sound effects
  if (audioOptions.soundEffects) {
    prompt += `, ${audioOptions.soundEffects}`
  }

  // Add ambient sounds
  if (audioOptions.ambientNoise) {
    prompt += `. ${audioOptions.ambientNoise}`
  }

  return prompt
}

/**
 * Get models that support specific features
 * @param {string} feature - 'referenceImages' or 'videoExtension'
 * @returns {Array} Array of model keys that support the feature
 */
export const getModelsWithFeature = (feature) => {
  return Object.entries(VIDEO_MODELS)
    .filter(([, model]) => {
      if (feature === 'referenceImages') return model.supportsReferenceImages
      if (feature === 'videoExtension') return model.supportsVideoExtension
      return true
    })
    .map(([key]) => key)
}

export default {
  initializeGemini,
  isGeminiInitialized,
  calculateCost,
  generateVideo,
  generateVideoFromImage,
  generateVideoInterpolation,
  generateVideoWithReferences,
  extendVideo,
  pollVideoStatus,
  waitForVideoCompletion,
  downloadVideo,
  buildAudioEnhancedPrompt,
  getModelsWithFeature,
  VIDEO_MODELS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_GENERATION_MODES,
}
