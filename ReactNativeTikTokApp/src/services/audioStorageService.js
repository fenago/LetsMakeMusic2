/**
 * Audio Storage Service
 *
 * Uploads audio to Firebase Storage via Cloud Function.
 * This ensures we have a permanent copy of all songs in OUR database.
 *
 * NOTE: The old approach (downloading blob client-side and uploading) doesn't work
 * in React Native because URL.createObjectURL is not available. We now use a
 * Cloud Function that downloads from the source URL and uploads to Firebase Storage.
 */

import functions from '@react-native-firebase/functions'

/**
 * Upload audio from a URL to Firebase Storage via Cloud Function
 *
 * @param {string} audioUrl - Source audio URL (e.g., from Suno CDN)
 * @param {string} songId - Firebase song document ID
 * @param {string} sunoId - Suno song ID (for filename)
 * @param {string} userId - User ID who owns the song
 * @returns {Promise<string|null>} Firebase Storage download URL or null on failure
 */
export const uploadAudioToFirebase = async (audioUrl, songId, sunoId, userId) => {
  if (!audioUrl) {
    console.error('[audioStorage] Missing audioUrl')
    return null
  }
  if (!songId) {
    console.error('[audioStorage] Missing songId')
    return null
  }
  if (!userId) {
    console.error('[audioStorage] Missing userId')
    return null
  }

  try {
    console.log('[audioStorage] Uploading audio via Cloud Function...')
    console.log('[audioStorage] audioUrl:', audioUrl)
    console.log('[audioStorage] songId:', songId)

    // Call Cloud Function to download audio and upload to Firebase Storage
    const uploadAudioFromUrl = functions().httpsCallable('uploadAudioFromUrl')
    const result = await uploadAudioFromUrl({
      audioUrl,
      songId,
      sunoId: sunoId || songId,
      userId,
    })

    if (result.data?.success && result.data?.firebaseAudioUrl) {
      console.log('[audioStorage] Successfully uploaded:', result.data.firebaseAudioUrl)
      return result.data.firebaseAudioUrl
    }

    throw new Error('No firebaseAudioUrl in response')
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
 * @param {string} songId - Firebase song document ID
 * @param {string} userId - User ID who owns the song
 * @returns {Promise<string|null>} Firebase Storage download URL or null on failure
 */
export const uploadAudioFromSunoId = async (sunoId, songId, userId) => {
  if (!sunoId) {
    console.error('[audioStorage] Missing sunoId')
    return null
  }

  // Suno CDN URL pattern
  const sunoUrl = `https://cdn1.suno.ai/${sunoId}.mp3`
  return uploadAudioToFirebase(sunoUrl, songId, sunoId, userId)
}

export default {
  uploadAudioToFirebase,
  uploadAudioFromSunoId,
}
