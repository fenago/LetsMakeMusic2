/**
 * Suno API Service
 *
 * Uses sunoapi.org for AI music generation
 * API Documentation: https://sunoapi.org/docs
 *
 * API Base: https://api.sunoapi.org
 * Auth: Bearer token
 */

const SUNO_API_BASE = 'https://api.sunoapi.org/api/v1'
const SUNO_API_KEY = '55fc5a26ff12dd6a1ab709d8d37e0cd4'

// Placeholder callback URL - the API requires one but we'll poll for status
const CALLBACK_URL = 'https://letsmakemusic-4e0fe.web.app/api/suno-callback'

/**
 * Model versions and their capabilities
 * V5, V4.5+ - up to 8 min, 5000 char prompt, 1000 char style
 * V4, V3.5 - up to 4 min, 3000 char prompt, 200 char style
 */
export const MODEL_VERSIONS = {
  V5: { value: 'V5', label: 'V5 (Latest)', maxPrompt: 5000, maxStyle: 1000, maxDuration: 8 },
  V4_5PLUS: { value: 'V4_5PLUS', label: 'V4.5+', maxPrompt: 5000, maxStyle: 1000, maxDuration: 8 },
  V4_5ALL: { value: 'V4_5ALL', label: 'V4.5 All', maxPrompt: 5000, maxStyle: 1000, maxDuration: 8 },
  V4_5: { value: 'V4_5', label: 'V4.5', maxPrompt: 5000, maxStyle: 1000, maxDuration: 8 },
  V4: { value: 'V4', label: 'V4', maxPrompt: 3000, maxStyle: 200, maxDuration: 4 },
  V3_5: { value: 'V3_5', label: 'V3.5', maxPrompt: 3000, maxStyle: 200, maxDuration: 4 },
}

export const DEFAULT_MODEL = 'V5'

/**
 * Generate a song using Simple Mode (non-custom)
 *
 * @param {string} description - Song description/prompt (max varies by model)
 * @param {boolean} instrumental - Whether to generate instrumental only
 * @param {string} model - Model version (V5, V4_5PLUS, V4_5ALL, V4_5, V4, V3_5)
 * @param {object} advancedOptions - Optional advanced generation parameters
 * @param {string} advancedOptions.negativeTags - Styles to exclude (e.g., "Heavy Metal, Screaming")
 * @param {string} advancedOptions.vocalGender - 'm' for male, 'f' for female vocals
 * @param {number} advancedOptions.styleWeight - Style influence weight 0.00-1.00
 * @param {number} advancedOptions.weirdnessConstraint - Creative deviation 0.00-1.00 (lower = more cohesive)
 * @returns {Promise<object>} Task ID for polling
 */
export const generateSongSimple = async (description, instrumental = false, model = DEFAULT_MODEL, advancedOptions = {}) => {
  try {
    // Check credits first
    try {
      const quota = await getQuota()
      console.log('[sunoApi] Current credits:', quota?.data)
      if (quota?.data?.remainingCredits !== undefined && quota.data.remainingCredits < 10) {
        throw new Error('Insufficient credits. Please add more credits to continue generating songs.')
      }
    } catch (quotaError) {
      console.warn('[sunoApi] Could not check quota:', quotaError.message)
      // Continue anyway - quota check is optional
    }

    const modelConfig = MODEL_VERSIONS[model] || MODEL_VERSIONS[DEFAULT_MODEL]
    const maxPrompt = modelConfig.maxPrompt

    const body = {
      prompt: description.substring(0, maxPrompt),
      customMode: false,
      instrumental: instrumental,
      model: modelConfig.value,
      callBackUrl: CALLBACK_URL,
    }

    // Add advanced options if provided
    const { negativeTags, vocalGender, styleWeight, weirdnessConstraint } = advancedOptions
    if (negativeTags && negativeTags.trim()) {
      body.negativeTags = negativeTags.trim()
    }
    if (vocalGender && (vocalGender === 'm' || vocalGender === 'f')) {
      body.vocalGender = vocalGender
    }
    if (typeof styleWeight === 'number' && styleWeight >= 0 && styleWeight <= 1) {
      body.styleWeight = styleWeight
    }
    if (typeof weirdnessConstraint === 'number' && weirdnessConstraint >= 0 && weirdnessConstraint <= 1) {
      body.weirdnessConstraint = weirdnessConstraint
    }

    console.log('[sunoApi] Simple mode request body:', JSON.stringify(body, null, 2))

    const response = await fetch(`${SUNO_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (data.code !== 200) {
      throw new Error(data.msg || 'Generation failed')
    }

    // Return task ID for polling
    return {
      taskId: data.data?.taskId,
      status: 'pending',
    }
  } catch (error) {
    console.error('Error generating song (simple):', error)
    throw error
  }
}

/**
 * Generate a song using Custom Mode
 *
 * @param {object} params - Custom song parameters
 * @param {string} params.title - Song title (max 80 chars)
 * @param {string} params.style - Style of music/tags (max varies by model)
 * @param {string} params.lyrics - Song lyrics/prompt (max varies by model)
 * @param {boolean} params.instrumental - Whether to generate instrumental only
 * @param {string} params.model - Model version (V5, V4_5PLUS, V4_5ALL, V4_5, V4, V3_5)
 * @param {string} params.negativeTags - Styles to exclude (e.g., "Heavy Metal, Screaming")
 * @param {string} params.vocalGender - 'm' for male, 'f' for female vocals
 * @param {number} params.styleWeight - Style influence weight 0.00-1.00
 * @param {number} params.weirdnessConstraint - Creative deviation 0.00-1.00 (lower = more cohesive)
 * @param {string} params.personaId - Custom persona ID (Custom Mode only)
 * @returns {Promise<object>} Task ID for polling
 */
export const generateSongCustom = async ({
  title,
  style,
  lyrics,
  instrumental = false,
  model = DEFAULT_MODEL,
  // Advanced options
  negativeTags = '',
  vocalGender = null,
  styleWeight = null,
  weirdnessConstraint = null,
  personaId = null,
}) => {
  try {
    const modelConfig = MODEL_VERSIONS[model] || MODEL_VERSIONS[DEFAULT_MODEL]

    const body = {
      title: title.substring(0, 80),
      style: style.substring(0, modelConfig.maxStyle),
      customMode: true,
      instrumental: instrumental,
      model: modelConfig.value,
      callBackUrl: CALLBACK_URL,
    }

    // Only include prompt/lyrics if not instrumental
    if (!instrumental && lyrics) {
      body.prompt = lyrics.substring(0, modelConfig.maxPrompt)
    }

    // Add advanced options if provided
    if (negativeTags && negativeTags.trim()) {
      body.negativeTags = negativeTags.trim()
    }
    if (vocalGender && (vocalGender === 'm' || vocalGender === 'f')) {
      body.vocalGender = vocalGender
    }
    if (typeof styleWeight === 'number' && styleWeight >= 0 && styleWeight <= 1) {
      body.styleWeight = styleWeight
    }
    if (typeof weirdnessConstraint === 'number' && weirdnessConstraint >= 0 && weirdnessConstraint <= 1) {
      body.weirdnessConstraint = weirdnessConstraint
    }
    // personaId is Custom Mode only
    if (personaId && personaId.trim()) {
      body.personaId = personaId.trim()
    }

    console.log('[sunoApi] Custom mode request body:', JSON.stringify(body, null, 2))

    const response = await fetch(`${SUNO_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (data.code !== 200) {
      throw new Error(data.msg || 'Generation failed')
    }

    return {
      taskId: data.data?.taskId,
      status: 'pending',
    }
  } catch (error) {
    console.error('Error generating song (custom):', error)
    throw error
  }
}

/**
 * Get generation status/info by task ID
 *
 * @param {string} taskId - Task ID from generate call
 * @returns {Promise<object>} Song generation status and data
 */
export const getGenerationStatus = async (taskId) => {
  try {
    const response = await fetch(`${SUNO_API_BASE}/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting generation status:', error)
    throw error
  }
}

/**
 * Get API quota/credits remaining
 *
 * @returns {Promise<object>} Quota information
 */
export const getQuota = async () => {
  try {
    const response = await fetch(`${SUNO_API_BASE}/generate/credit`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting quota:', error)
    throw error
  }
}

/**
 * Poll for song completion
 *
 * @param {string} taskId - Task ID to poll
 * @param {number} maxAttempts - Maximum polling attempts (default 60 = ~5 mins)
 * @param {number} interval - Polling interval in ms (default 5000 = 5s)
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {Promise<object>} Completed song data
 */
export const pollForCompletion = async (taskId, maxAttempts = 60, interval = 5000, onProgress = null) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Report progress
    if (onProgress) {
      onProgress({
        attempt: attempt + 1,
        maxAttempts,
        elapsedSeconds: (attempt + 1) * (interval / 1000),
      })
    }

    const result = await getGenerationStatus(taskId)
    console.log('Poll attempt', attempt + 1, 'status:', result?.data?.status)

    if (result.code === 200 && result.data) {
      const taskStatus = result.data.status

      // Check for success - API returns status as 'SUCCESS'
      if (taskStatus === 'SUCCESS') {
        // Songs are at data.response.sunoData (camelCase properties)
        const songs = result.data.response?.sunoData || []

        // DEBUG: Log FULL API response structure for diagnosis
        console.log('[sunoApi] SUCCESS response - full structure:', JSON.stringify(result.data, null, 2))
        console.log('[sunoApi] Songs array length:', songs.length)
        if (songs.length > 0) {
          const firstSong = songs[0]
          console.log('[sunoApi] First song ALL fields:', JSON.stringify(firstSong, null, 2))
          console.log('[sunoApi] First song key fields:', {
            id: firstSong.id,
            audioUrl: firstSong.audioUrl,
            audio_url: firstSong.audio_url, // Check if API uses snake_case
            streamAudioUrl: firstSong.streamAudioUrl,
            stream_url: firstSong.stream_url, // Check if API uses snake_case
            imageUrl: firstSong.imageUrl,
            title: firstSong.title,
          })
        }

        if (songs.length > 0 && (songs[0].audioUrl || songs[0].audio_url)) {
          return {
            status: 'complete',
            songs: songs.map(song => ({
              id: song.id,
              // Handle both camelCase and snake_case from API - save ALL URLs for backup
              audio_url: song.audioUrl || song.audio_url,
              source_audio_url: song.sourceAudioUrl || song.source_audio_url,
              stream_url: song.streamAudioUrl || song.stream_audio_url || song.stream_url,
              source_stream_url: song.sourceStreamAudioUrl || song.source_stream_audio_url,
              image_url: song.imageUrl || song.image_url,
              source_image_url: song.sourceImageUrl || song.source_image_url,
              // Song metadata
              title: song.title,
              tags: song.tags, // Suno-generated genre tags
              style: song.tags, // Also map to style for compatibility
              lyric: song.prompt,
              duration: song.duration,
              model_name: song.modelName || song.model_name,
              create_time: song.createTime || song.create_time,
            })),
          }
        } else {
          console.error('[sunoApi] No audioUrl found in songs:', songs.map(s => ({
            id: s.id,
            audioUrl: s.audioUrl,
            audio_url: s.audio_url,
          })))
        }
      }

      // Check for intermediate states
      if (taskStatus === 'FIRST_SUCCESS' || taskStatus === 'TEXT_SUCCESS') {
        // Still processing, continue polling
        console.log('Song still processing, status:', taskStatus)
      }

      // Check for error states with user-friendly messages
      if (taskStatus === 'CREATE_TASK_FAILED') {
        throw new Error('Failed to start song generation. Please try again.')
      }
      if (taskStatus === 'GENERATE_AUDIO_FAILED') {
        throw new Error('Audio generation failed. Try a different description or style, or try again in a moment.')
      }
      if (taskStatus === 'CALLBACK_EXCEPTION') {
        throw new Error('Server error during generation. Please try again.')
      }
      if (taskStatus === 'SENSITIVE_WORD_ERROR') {
        throw new Error('Your prompt contains words that cannot be processed. Please modify your description.')
      }
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error('Song generation timed out after 5 minutes')
}

/**
 * Extend a song to make it longer
 * Uses the Suno Extend API to generate additional content that continues the original song
 *
 * @param {object} params - Extension parameters
 * @param {string} params.audioId - The Suno song ID to extend (sunoId from our database)
 * @param {string} params.model - Model version (V5, V4_5PLUS, etc.)
 * @param {boolean} params.defaultParamFlag - If true, use original song's params; if false, provide new ones
 * @param {string} params.prompt - New lyrics/prompt (required if defaultParamFlag is false)
 * @param {string} params.style - New style/tags (required if defaultParamFlag is false)
 * @param {string} params.title - New title (required if defaultParamFlag is false)
 * @param {number} params.continueAt - Time in seconds to start extension from (optional)
 * @returns {Promise<object>} Task ID for polling
 */
export const extendSong = async ({
  audioId,
  model = DEFAULT_MODEL,
  defaultParamFlag = true,
  prompt = '',
  style = '',
  title = '',
  continueAt = null,
  // New parameters for better extension quality
  audioWeight = 0.7, // How much the original audio influences the extension (0-1)
  weirdnessConstraint = 0.3, // Controls creative deviation - lower = more cohesive (0-1)
  styleWeight = 0.6, // Weight of style guidance (0-1)
}) => {
  try {
    console.log('[sunoApi] ========== EXTEND SONG DEBUG START ==========')
    console.log('[sunoApi] Input params:', JSON.stringify({
      audioId,
      audioIdType: typeof audioId,
      audioIdLength: audioId?.length,
      model,
      defaultParamFlag,
      promptLength: prompt?.length,
      promptPreview: prompt?.substring(0, 50) + (prompt?.length > 50 ? '...' : ''),
      style,
      title,
      continueAt,
    }, null, 2))

    if (!audioId) {
      throw new Error('audioId is required to extend a song')
    }

    // Validate audioId format - Suno IDs are typically UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidUUID = uuidRegex.test(audioId)
    console.log('[sunoApi] audioId format check:', {
      audioId,
      isValidUUID,
      expectedFormat: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    })
    if (!isValidUUID) {
      console.warn('[sunoApi] ⚠️ WARNING: audioId does NOT match UUID format!')
    }

    // Check credits first
    try {
      const quota = await getQuota()
      console.log('[sunoApi] Credit check response:', JSON.stringify(quota, null, 2))
      if (quota?.data?.remainingCredits !== undefined && quota.data.remainingCredits < 10) {
        throw new Error('Insufficient credits. Please add more credits to continue.')
      }
    } catch (quotaError) {
      console.warn('[sunoApi] Could not check quota:', quotaError.message)
    }

    const modelConfig = MODEL_VERSIONS[model] || MODEL_VERSIONS[DEFAULT_MODEL]
    console.log('[sunoApi] Model config:', JSON.stringify(modelConfig, null, 2))

    // IMPORTANT: API parameter logic (from docs.sunoapi.org):
    // - defaultParamFlag: true = Use CUSTOM parameters (requires continueAt, prompt, style, title)
    // - defaultParamFlag: false = Use ORIGINAL audio parameters (only audioId required)
    // Our UI: useOriginalParams = true means user wants original params, so we pass false to API
    const apiDefaultParamFlag = !defaultParamFlag // INVERT: our "useOriginal" = API's "false"

    console.log('[sunoApi] Parameter flag logic:', {
      uiUseOriginalParams: defaultParamFlag,
      apiDefaultParamFlag,
      explanation: apiDefaultParamFlag
        ? 'API will use CUSTOM params (prompt/style/title required)'
        : 'API will use ORIGINAL audio params (only audioId needed)',
    })

    const body = {
      audioId,
      model: modelConfig.value,
      defaultParamFlag: apiDefaultParamFlag,
      callBackUrl: CALLBACK_URL,
    }

    // If using custom params (apiDefaultParamFlag = true), provide the required fields
    if (apiDefaultParamFlag) {
      // When custom mode, continueAt is required per docs
      body.continueAt = continueAt !== null && continueAt >= 0 ? continueAt : 0
      if (prompt) body.prompt = prompt.substring(0, modelConfig.maxPrompt)
      if (style) body.style = style.substring(0, modelConfig.maxStyle)
      if (title) body.title = title.substring(0, 80)
    } else {
      // Using original params - continueAt is optional
      if (continueAt !== null && continueAt >= 0) {
        body.continueAt = continueAt
      }
    }

    // Add advanced options for extension quality control
    // These apply regardless of defaultParamFlag
    if (typeof audioWeight === 'number' && audioWeight >= 0 && audioWeight <= 1) {
      body.audioWeight = audioWeight
    }
    if (typeof styleWeight === 'number' && styleWeight >= 0 && styleWeight <= 1) {
      body.styleWeight = styleWeight
    }
    if (typeof weirdnessConstraint === 'number' && weirdnessConstraint >= 0 && weirdnessConstraint <= 1) {
      body.weirdnessConstraint = weirdnessConstraint
    }

    console.log('[sunoApi] FULL REQUEST BODY:', JSON.stringify(body, null, 2))
    console.log('[sunoApi] Request URL:', `${SUNO_API_BASE}/generate/extend`)

    const response = await fetch(`${SUNO_API_BASE}/generate/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    console.log('[sunoApi] Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[sunoApi] HTTP ERROR - Status:', response.status)
      console.error('[sunoApi] HTTP ERROR - Body:', errorText)
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[sunoApi] ========== FULL API RESPONSE ==========')
    console.log('[sunoApi] Response:', JSON.stringify(data, null, 2))
    console.log('[sunoApi] Response code:', data.code, '| msg:', data.msg)
    console.log('[sunoApi] ==========================================')

    if (data.code !== 200) {
      // Provide more helpful error messages
      const apiMsg = data.msg || ''
      let userMessage = apiMsg

      if (apiMsg.toLowerCase().includes('internal error')) {
        userMessage = 'Suno API is temporarily unavailable. This may be due to:\n• High demand on the service\n• The original song is too old to extend\n• Insufficient credits\n\nPlease try again in a few minutes.'
      } else if (apiMsg.toLowerCase().includes('credit')) {
        userMessage = 'Insufficient Suno API credits. Please check your account.'
      } else if (apiMsg.toLowerCase().includes('not found') || apiMsg.toLowerCase().includes('invalid')) {
        userMessage = 'The original song could not be found on Suno. It may have expired or been removed.'
      }

      throw new Error(userMessage)
    }

    console.log('[sunoApi] Extend request submitted, taskId:', data.data?.taskId)

    return {
      taskId: data.data?.taskId,
      status: 'pending',
    }
  } catch (error) {
    console.error('[sunoApi] Error extending song:', error)
    throw error
  }
}

/**
 * Get timestamped lyrics for a song
 * Perfect for karaoke-style lyric synchronization
 *
 * @param {string} songId - The Suno song ID
 * @returns {Promise<object>} Timestamped lyrics data
 */
export const getTimestampedLyrics = async (songId) => {
  try {
    const response = await fetch(`${SUNO_API_BASE}/timestamped-lyrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        songId: songId,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (data.code !== 200) {
      throw new Error(data.msg || 'Failed to get timestamped lyrics')
    }

    // Return formatted lyrics data
    // Expected format: array of { text, startTime, endTime }
    return {
      lyrics: data.data?.lyrics || [],
      rawLyrics: data.data?.rawLyrics || '',
    }
  } catch (error) {
    console.error('Error getting timestamped lyrics:', error)
    throw error
  }
}

/**
 * Generate a music video for a song
 * Uses the Suno MP4 generation API
 *
 * @param {object} params - Video generation parameters
 * @param {string} params.taskId - The original task ID from song generation
 * @param {string} params.audioId - The Suno audio ID (sunoId from our database)
 * @param {string} params.author - Optional artist name to display in video
 * @param {string} params.domainName - Optional watermark/branding text
 * @returns {Promise<object>} Task ID for polling video generation status
 */
/**
 * Generate a UUID v4 for taskId
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const generateMusicVideo = async ({
  taskId,
  audioId,
  author = '',
  domainName = 'LetsMakeMusic',
}) => {
  try {
    console.log('[sunoApi] ========== GENERATE MUSIC VIDEO START ==========')
    console.log('[sunoApi] Params:', { taskId, audioId, author, domainName })
    console.log('[sunoApi] audioId type:', typeof audioId)
    console.log('[sunoApi] audioId value:', audioId)

    if (!audioId) {
      throw new Error('audioId is required to generate a music video')
    }

    // Note: taskId is used to track the video generation request
    // If not provided, we'll generate a new one - the original song's taskId isn't required
    if (!taskId) {
      console.log('[sunoApi] No taskId provided, will generate a new one for tracking')
    }

    // Validate audioId format - Suno IDs are typically UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidAudioUUID = uuidRegex.test(audioId)
    console.log('[sunoApi] audioId UUID validation:', {
      audioId,
      isValidUUID: isValidAudioUUID,
      expectedFormat: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    })
    if (!isValidAudioUUID) {
      console.error('[sunoApi] ⚠️ WARNING: audioId does NOT match UUID format!')
    }

    console.log('[sunoApi] Using ORIGINAL taskId from song generation:', taskId)

    // Check credits first
    try {
      const quota = await getQuota()
      console.log('[sunoApi] Credit check for video:', quota?.data)
      if (quota?.data?.remainingCredits !== undefined && quota.data.remainingCredits < 10) {
        throw new Error('Insufficient credits. Please add more credits to continue.')
      }
    } catch (quotaError) {
      console.warn('[sunoApi] Could not check quota:', quotaError.message)
    }

    // Generate a taskId if not provided - API requires it
    const generatedTaskId = taskId || generateUUID()
    console.log('[sunoApi] Using taskId:', generatedTaskId)

    const body = {
      audioId,
      taskId: generatedTaskId, // Always provide taskId
      callBackUrl: CALLBACK_URL,
    }

    // Add optional fields
    if (author && author.length <= 50) {
      body.author = author
    }
    if (domainName && domainName.length <= 50) {
      body.domainName = domainName
    }

    console.log('[sunoApi] Video request body:', JSON.stringify(body, null, 2))
    console.log('[sunoApi] Generated taskId:', generatedTaskId)

    const response = await fetch(`${SUNO_API_BASE}/mp4/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    console.log('[sunoApi] Video response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[sunoApi] Video generation HTTP error:', errorText)
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[sunoApi] Video generation response:', JSON.stringify(data, null, 2))

    if (data.code !== 200) {
      // Log the full error for debugging
      console.error('[sunoApi] Video API error response:', JSON.stringify(data, null, 2))
      console.error('[sunoApi] audioId that failed:', audioId)

      const errorMsg = data.msg || 'Video generation failed'

      // Check if video already exists - try to fetch it instead of failing
      if (errorMsg.toLowerCase().includes('already exists') || errorMsg.toLowerCase().includes('record already')) {
        console.log('[sunoApi] Video already exists for this audioId, fetching existing video...')
        const existingVideo = await getExistingVideoByAudioId(audioId)
        if (existingVideo && existingVideo.videoUrl) {
          console.log('[sunoApi] Found existing video:', existingVideo.videoUrl)
          return {
            taskId: existingVideo.taskId || generatedTaskId,
            status: 'already_exists',
            existingVideo: existingVideo,
          }
        }
        // If we can't find the existing video via API, return a special status
        // The caller should check Firebase directly for the video
        console.log('[sunoApi] Could not retrieve existing video via API, returning already_exists status')
        return {
          taskId: generatedTaskId,
          status: 'already_exists_no_url',
          message: 'A video already exists for this song on Suno servers. Please refresh the page or check your Library.',
        }
      }

      // Show the actual error message so we can debug
      throw new Error(`Video generation failed: ${errorMsg} (audioId: ${audioId})`)
    }

    // Return the taskId we generated - don't rely on API to echo it back
    return {
      taskId: data.data?.taskId || generatedTaskId,
      status: 'pending',
    }
  } catch (error) {
    console.error('[sunoApi] Error generating music video:', error)
    throw error
  }
}

/**
 * Get video generation status by task ID
 *
 * @param {string} taskId - Task ID from generateMusicVideo call
 * @returns {Promise<object>} Video generation status and data
 */
export const getVideoGenerationStatus = async (taskId) => {
  try {
    const response = await fetch(`${SUNO_API_BASE}/mp4/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('[sunoApi] Error getting video generation status:', error)
    throw error
  }
}

/**
 * Get existing video by audioId
 * Used when video already exists for a song
 *
 * @param {string} audioId - The Suno audio ID
 * @returns {Promise<object|null>} Video data or null if not found
 */
export const getExistingVideoByAudioId = async (audioId) => {
  try {
    console.log('[sunoApi] Looking up existing video for audioId:', audioId)
    const response = await fetch(`${SUNO_API_BASE}/mp4/record-info?audioId=${audioId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    })

    if (!response.ok) {
      console.log('[sunoApi] No existing video found for audioId:', audioId)
      return null
    }

    const data = await response.json()
    console.log('[sunoApi] Existing video lookup result:', JSON.stringify(data, null, 2))

    if (data.code === 200 && data.data) {
      const videoData = data.data.response || data.data
      if (videoData.videoUrl) {
        return {
          status: 'complete',
          videoUrl: videoData.videoUrl,
          taskId: data.data.taskId,
          musicId: data.data.musicId,
          audioId: data.data.audioId,
          createTime: data.data.createTime,
          completeTime: data.data.completeTime,
        }
      }
    }
    return null
  } catch (error) {
    console.log('[sunoApi] Error looking up existing video:', error.message)
    return null
  }
}

/**
 * Poll for video generation completion
 * Status values: PENDING, SUCCESS, CREATE_TASK_FAILED, GENERATE_MP4_FAILED, CALLBACK_EXCEPTION
 *
 * @param {string} taskId - Task ID to poll
 * @param {number} maxAttempts - Maximum polling attempts (default 120 = ~10 mins)
 * @param {number} interval - Polling interval in ms (default 5000 = 5s)
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {Promise<object>} Completed video data
 */
export const pollForVideoCompletion = async (taskId, maxAttempts = 120, interval = 5000, onProgress = null) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Report progress
    if (onProgress) {
      onProgress({
        attempt: attempt + 1,
        maxAttempts,
        elapsedSeconds: (attempt + 1) * (interval / 1000),
      })
    }

    const result = await getVideoGenerationStatus(taskId)
    const successFlag = result?.data?.successFlag || result?.data?.status
    console.log('[sunoApi] Video poll attempt', attempt + 1, 'successFlag:', successFlag)

    if (result.code === 200 && result.data) {
      // Check for success - API uses successFlag field
      if (successFlag === 'SUCCESS') {
        const videoData = result.data.response || result.data
        console.log('[sunoApi] Video generation SUCCESS:', JSON.stringify(result.data, null, 2))

        return {
          status: 'complete',
          videoUrl: videoData.videoUrl || result.data.response?.videoUrl,
          taskId: result.data.taskId,
          musicId: result.data.musicId,
          audioId: result.data.audioId,
          createTime: result.data.createTime,
          completeTime: result.data.completeTime,
        }
      }

      // Still pending
      if (successFlag === 'PENDING') {
        console.log('[sunoApi] Video still generating...')
      }

      // Check for error states
      if (successFlag === 'CREATE_TASK_FAILED') {
        throw new Error('Failed to start video generation. Please try again.')
      }
      if (successFlag === 'GENERATE_MP4_FAILED') {
        const errorMsg = result.data.errorMessage || 'Video generation failed'
        throw new Error(`Video generation failed: ${errorMsg}`)
      }
      if (successFlag === 'CALLBACK_EXCEPTION') {
        throw new Error('Server error during video generation. Please try again.')
      }
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error('Video generation timed out after 10 minutes')
}

/**
 * Generate a Persona (Synthetic Singer) from an existing song
 * Creates a reusable vocal/style identity that can be applied to future songs
 *
 * IMPORTANT: The source song must:
 * - Be complete (status = SUCCESS)
 * - Have been generated with Model V4 or higher
 * - Still exist on Suno servers (within 15-day retention period)
 * - Not already have a persona created from it (one persona per audioId)
 *
 * @param {object} params - Persona generation parameters
 * @param {string} params.taskId - The task ID from the original song generation
 * @param {string} params.audioId - The Suno audio ID (sunoId from our database)
 * @param {string} params.name - Name for the Synthetic Singer (max 50 chars)
 * @param {string} params.description - Description of the voice style (max 200 chars)
 * @returns {Promise<object>} Persona data including personaId
 */
export const generatePersona = async ({
  taskId,
  audioId,
  name,
  description = '',
}) => {
  try {
    console.log('[sunoApi] ========== GENERATE PERSONA (SYNTHETIC SINGER) START ==========')
    console.log('[sunoApi] Params:', { taskId, audioId, name, description })

    if (!taskId) {
      throw new Error('taskId is required to create a Synthetic Singer')
    }
    if (!audioId) {
      throw new Error('audioId is required to create a Synthetic Singer')
    }
    if (!name || !name.trim()) {
      throw new Error('A name is required for the Synthetic Singer')
    }

    // Validate audioId format - Suno IDs are typically UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidAudioUUID = uuidRegex.test(audioId)
    console.log('[sunoApi] audioId UUID validation:', {
      audioId,
      isValidUUID: isValidAudioUUID,
    })
    if (!isValidAudioUUID) {
      console.warn('[sunoApi] ⚠️ WARNING: audioId does NOT match UUID format!')
    }

    // Check credits first
    try {
      const quota = await getQuota()
      console.log('[sunoApi] Credit check for persona:', quota?.data)
      if (quota?.data?.remainingCredits !== undefined && quota.data.remainingCredits < 10) {
        throw new Error('Insufficient credits. Please add more credits to continue.')
      }
    } catch (quotaError) {
      console.warn('[sunoApi] Could not check quota:', quotaError.message)
    }

    const body = {
      taskId,
      audioId,
      name: name.trim().substring(0, 50),
      description: (description || '').trim().substring(0, 200),
      callBackUrl: CALLBACK_URL,
    }

    console.log('[sunoApi] Persona request body:', JSON.stringify(body, null, 2))

    const response = await fetch(`${SUNO_API_BASE}/generate/generate-persona`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    console.log('[sunoApi] Persona response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[sunoApi] Persona generation HTTP error:', errorText)
      throw new Error(`Suno API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[sunoApi] Persona generation response:', JSON.stringify(data, null, 2))

    if (data.code !== 200) {
      const errorMsg = data.msg || 'Synthetic Singer creation failed'

      // Handle specific error cases
      if (errorMsg.toLowerCase().includes('already exists') || errorMsg.toLowerCase().includes('persona exists')) {
        throw new Error('A Synthetic Singer has already been created from this song. Each song can only create one voice.')
      }
      if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('expired')) {
        throw new Error('This song has expired on Suno servers. Synthetic Singers must be created within 15 days of song generation.')
      }
      if (errorMsg.toLowerCase().includes('model') || errorMsg.toLowerCase().includes('v3')) {
        throw new Error('Synthetic Singers can only be created from songs generated with Model V4 or higher.')
      }
      if (errorMsg.toLowerCase().includes('not complete') || errorMsg.toLowerCase().includes('pending')) {
        throw new Error('The song must be fully generated before creating a Synthetic Singer. Please wait for the song to complete.')
      }

      throw new Error(`Synthetic Singer creation failed: ${errorMsg}`)
    }

    // Extract the personaId from the response
    const personaId = data.data?.personaId || data.data?.persona_id
    if (!personaId) {
      console.error('[sunoApi] No personaId in response:', data)
      throw new Error('Synthetic Singer was created but no ID was returned. Please try again.')
    }

    console.log('[sunoApi] Synthetic Singer created successfully! personaId:', personaId)

    return {
      personaId,
      name: body.name,
      description: body.description,
      sourceTaskId: taskId,
      sourceAudioId: audioId,
      status: 'complete',
    }
  } catch (error) {
    console.error('[sunoApi] Error generating persona (Synthetic Singer):', error)
    throw error
  }
}

/**
 * Check if a song is eligible to create a Synthetic Singer
 * Must be V4+ model, complete, and within 15-day window
 *
 * @param {object} song - The song object from our database
 * @returns {object} Eligibility status and reason
 */
export const checkArtistVoiceEligibility = (song) => {
  // Check if song has required fields
  if (!song) {
    return { eligible: false, reason: 'Song not found' }
  }

  // Check if already has a persona
  if (song.personaId || song.artistVoiceId) {
    return { eligible: false, reason: 'Synthetic Singer already created from this song', alreadyCreated: true }
  }

  // Check model version - must be V4 or higher
  // Suno's generatePersona API only works with songs from chirp-v4 or later models
  const modelName = song.model_name || song.modelName || song.model || song.sunoModelName || ''
  const modelVersion = modelName.toUpperCase().replace(/[^V0-9]/g, '')
  const versionNumber = parseFloat(modelVersion.replace('V', '')) || 0

  // Debug logging
  console.log('[checkArtistVoiceEligibility] Model check:', {
    songId: song.id,
    model_name: song.model_name,
    modelName: song.modelName,
    model: song.model,
    sunoModelName: song.sunoModelName,
    parsed: modelName,
    versionNumber,
  })

  // If no model info exists but song has valid Suno IDs, assume it's V4+
  // (Songs created after V4 release that just didn't store the model field)
  const hasValidSunoIds = (song.sunoId || song.suno_id || song.audioId) &&
                          (song.taskId || song.task_id || song.sunoTaskId)

  if (versionNumber < 4 && versionNumber > 0) {
    // Explicitly marked as older model
    return {
      eligible: false,
      reason: 'Synthetic Singers require songs generated with Model V4 or higher',
      modelIssue: true,
    }
  }

  // If versionNumber is 0 (no model info) but has valid Suno IDs, assume eligible
  // This handles legacy songs that didn't store model version

  // Check if song has required Suno IDs
  if (!song.sunoId && !song.suno_id && !song.audioId) {
    return { eligible: false, reason: 'Song is missing Suno audio ID' }
  }
  if (!song.taskId && !song.task_id && !song.sunoTaskId) {
    return { eligible: false, reason: 'Song is missing Suno task ID' }
  }

  // Check 15-day expiration window
  const createdAt = song.createdAt?.toDate?.() || song.createdAt || song.create_time
  if (createdAt) {
    const createdDate = new Date(createdAt)
    const now = new Date()
    const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24))

    if (daysSinceCreation >= 15) {
      return {
        eligible: false,
        reason: 'This song has expired on Suno servers (15-day limit)',
        expired: true,
        daysAgo: daysSinceCreation,
      }
    }

    // Return days remaining for UI display
    const daysRemaining = 15 - daysSinceCreation
    return {
      eligible: true,
      daysRemaining,
      reason: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left to create Synthetic Singer`,
    }
  }

  // If no creation date, assume eligible but warn
  return {
    eligible: true,
    daysRemaining: null,
    reason: 'Eligible (creation date unknown)',
  }
}

export default {
  generateSongSimple,
  generateSongCustom,
  extendSong,
  getGenerationStatus,
  getQuota,
  pollForCompletion,
  getTimestampedLyrics,
  generateMusicVideo,
  getVideoGenerationStatus,
  getExistingVideoByAudioId,
  pollForVideoCompletion,
  generatePersona,
  checkArtistVoiceEligibility,
  MODEL_VERSIONS,
  DEFAULT_MODEL,
}
