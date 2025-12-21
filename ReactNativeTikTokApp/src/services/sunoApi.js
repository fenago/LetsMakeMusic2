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

export const DEFAULT_MODEL = 'V4'

/**
 * Generate a song using Simple Mode (non-custom)
 *
 * @param {string} description - Song description/prompt (max varies by model)
 * @param {boolean} instrumental - Whether to generate instrumental only
 * @param {string} model - Model version (V5, V4_5PLUS, V4_5ALL, V4_5, V4, V3_5)
 * @returns {Promise<object>} Task ID for polling
 */
export const generateSongSimple = async (description, instrumental = false, model = DEFAULT_MODEL) => {
  try {
    const modelConfig = MODEL_VERSIONS[model] || MODEL_VERSIONS[DEFAULT_MODEL]
    const maxPrompt = modelConfig.maxPrompt

    const response = await fetch(`${SUNO_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: description.substring(0, maxPrompt),
        customMode: false,
        instrumental: instrumental,
        model: modelConfig.value,
        callBackUrl: CALLBACK_URL,
      }),
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
 * @returns {Promise<object>} Task ID for polling
 */
export const generateSongCustom = async ({
  title,
  style,
  lyrics,
  instrumental = false,
  model = DEFAULT_MODEL,
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
              // Handle both camelCase and snake_case from API
              audio_url: song.audioUrl || song.audio_url,
              stream_url: song.streamAudioUrl || song.stream_url,
              image_url: song.imageUrl || song.image_url,
              title: song.title,
              style: song.tags,
              lyric: song.prompt,
              duration: song.duration,
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

      // Check for error states
      if (taskStatus === 'CREATE_TASK_FAILED' ||
          taskStatus === 'GENERATE_AUDIO_FAILED' ||
          taskStatus === 'CALLBACK_EXCEPTION' ||
          taskStatus === 'SENSITIVE_WORD_ERROR') {
        throw new Error(`Generation failed: ${taskStatus}`)
      }
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error('Song generation timed out after 5 minutes')
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

export default {
  generateSongSimple,
  generateSongCustom,
  getGenerationStatus,
  getQuota,
  getTimestampedLyrics,
  MODEL_VERSIONS,
  DEFAULT_MODEL,
}
