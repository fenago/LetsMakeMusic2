/**
 * Audio Storage Service
 *
 * Downloads audio from external URLs (like Suno CDN) and uploads to Firebase Storage.
 * This ensures we have a permanent copy of all songs in OUR database.
 */

import { Platform } from 'react-native'
import { uploadMediaFunctionURL } from '../core/firebase/config'

/**
 * Download audio from a URL and upload to Firebase Storage
 *
 * @param {string} audioUrl - Source audio URL (e.g., from Suno CDN)
 * @param {string} sunoId - Suno song ID (used for filename)
 * @returns {Promise<string|null>} Firebase Storage download URL or null on failure
 */
export const uploadAudioToFirebase = async (audioUrl, sunoId) => {
  if (!audioUrl || !sunoId) {
    console.error('[audioStorage] Missing audioUrl or sunoId')
    return null
  }

  try {
    console.log('[audioStorage] Downloading audio from:', audioUrl)

    // Step 1: Fetch the audio file from Suno
    const response = await fetch(audioUrl)

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`)
    }

    // Get the audio as a blob
    const audioBlob = await response.blob()
    console.log('[audioStorage] Downloaded audio blob:', {
      size: audioBlob.size,
      type: audioBlob.type
    })

    // Step 2: Create form data for upload
    const formData = new FormData()

    // Create a file-like object from the blob
    const fileName = `${sunoId}.mp3`

    if (Platform.OS === 'web') {
      // Web: Create a File object
      const file = new File([audioBlob], fileName, { type: 'audio/mpeg' })
      formData.append('file', file)
    } else {
      // React Native: Use the blob URI approach
      // Create a temporary URI for the blob
      const blobUri = URL.createObjectURL(audioBlob)

      formData.append('file', {
        uri: blobUri,
        name: fileName,
        type: 'audio/mpeg',
      })
    }

    console.log('[audioStorage] Uploading to Firebase Storage...')

    // Step 3: Upload to Firebase Storage via Cloud Function
    const uploadResponse = await fetch(uploadMediaFunctionURL, {
      method: 'POST',
      body: formData,
      headers: Platform.select({
        web: new Headers({
          Accept: 'application/json',
        }),
        default: new Headers({
          'Content-Type': 'multipart/form-data',
        }),
      }),
    })

    const jsonData = await uploadResponse.json()
    console.log('[audioStorage] Upload response:', jsonData)

    if (jsonData?.downloadURL) {
      console.log('[audioStorage] Successfully uploaded to Firebase:', jsonData.downloadURL)
      return jsonData.downloadURL
    }

    throw new Error('No downloadURL in response')
  } catch (error) {
    console.error('[audioStorage] Error uploading audio to Firebase:', error)
    return null
  }
}

/**
 * Upload audio from Suno CDN URL pattern
 * Constructs the Suno CDN URL from sunoId if needed
 *
 * @param {string} sunoId - Suno song ID
 * @returns {Promise<string|null>} Firebase Storage download URL or null on failure
 */
export const uploadAudioFromSunoId = async (sunoId) => {
  if (!sunoId) {
    console.error('[audioStorage] Missing sunoId')
    return null
  }

  // Suno CDN URL pattern
  const sunoUrl = `https://cdn1.suno.ai/${sunoId}.mp3`
  return uploadAudioToFirebase(sunoUrl, sunoId)
}

export default {
  uploadAudioToFirebase,
  uploadAudioFromSunoId,
}
