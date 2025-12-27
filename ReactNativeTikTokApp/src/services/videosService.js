/**
 * videosService.js - Videos stored in Firebase Storage
 *
 * Simple: Download from Suno → Upload to Firebase Storage → Save URL in Firestore
 */

import firestore from '@react-native-firebase/firestore'
import storage from '@react-native-firebase/storage'
import RNFS from 'react-native-fs'

const COLLECTION = 'videos'

/**
 * Download video from URL and upload to Firebase Storage
 * @param {string} sourceUrl - Video URL to download (e.g., from Suno)
 * @param {string} userId - User ID for storage path
 * @param {string} filename - Filename for storage
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<{success: boolean, storageUrl?: string, error?: string}>}
 */
export const uploadVideoFromUrl = async (sourceUrl, userId, filename, onProgress) => {
  const localPath = `${RNFS.CachesDirectoryPath}/${filename}`

  try {
    console.log('[videosService] Downloading video from:', sourceUrl)
    onProgress?.(5)

    // Download the video file
    const downloadResult = await RNFS.downloadFile({
      fromUrl: sourceUrl,
      toFile: localPath,
      progress: (res) => {
        const percent = Math.round((res.bytesWritten / res.contentLength) * 40) + 5
        onProgress?.(percent)
      },
    }).promise

    if (downloadResult.statusCode !== 200) {
      throw new Error(`Download failed with status ${downloadResult.statusCode}`)
    }

    console.log('[videosService] Downloaded to:', localPath)
    onProgress?.(50)

    // Upload to Firebase Storage
    const storagePath = `videos/${userId}/${filename}`
    const reference = storage().ref(storagePath)

    const task = reference.putFile(localPath)

    task.on('state_changed', (snapshot) => {
      const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 45) + 50
      onProgress?.(percent)
    })

    await task

    // Get download URL
    const storageUrl = await reference.getDownloadURL()
    console.log('[videosService] Uploaded to Firebase Storage:', storageUrl)
    onProgress?.(100)

    // Clean up local file
    await RNFS.unlink(localPath).catch(() => {})

    return { success: true, storageUrl }
  } catch (error) {
    console.error('[videosService] Upload error:', error)
    // Clean up local file on error
    await RNFS.unlink(localPath).catch(() => {})
    return { success: false, error: error.message }
  }
}

/**
 * Create a video document in Firestore
 * @param {Object} data - Video data including all Suno metadata
 * @returns {Promise<{success: boolean, videoId?: string, error?: string}>}
 */
export const createVideo = async (data) => {
  try {
    const doc = {
      // User & Song references
      userId: data.userId,
      songId: data.songId || null,  // Ties video back to original song

      // Suno identifiers
      sunoId: data.sunoId || null,       // Original audio ID
      sunoTaskId: data.sunoTaskId || null,   // Video generation task ID
      sunoMusicId: data.sunoMusicId || null, // Music ID from Suno

      // Content
      title: data.title || 'Untitled Video',
      videoUrl: data.videoUrl,           // Firebase Storage URL (permanent)
      sunoVideoUrl: data.sunoVideoUrl || null, // Original Suno URL (expires in 15 days)
      thumbnailUrl: data.thumbnailUrl || null,
      audioUrl: data.audioUrl || null,

      // Branding (used in video generation)
      author: data.author || null,
      domainName: data.domainName || null,

      // Timestamps
      createdAt: firestore.FieldValue.serverTimestamp(),
      sunoCreateTime: data.sunoCreateTime || null,   // When Suno started generation
      sunoCompleteTime: data.sunoCompleteTime || null, // When Suno finished
    }

    const ref = await firestore().collection(COLLECTION).add(doc)
    console.log('[videosService] Created video document:', ref.id)

    return { success: true, videoId: ref.id }
  } catch (error) {
    console.error('[videosService] Error creating video:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all videos for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export const getUserVideos = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('[videosService] Error getting videos:', error)
    return []
  }
}

/**
 * Subscribe to user's videos (real-time)
 * @param {string} userId - User ID
 * @param {Function} onUpdate - Callback with videos array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUserVideos = (userId, onUpdate) => {
  if (!userId) {
    onUpdate([])
    return () => {}
  }

  return firestore()
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      snapshot => {
        const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        onUpdate(videos)
      },
      error => {
        console.error('[videosService] Subscription error:', error)
        onUpdate([])
      }
    )
}

/**
 * Delete a video (from Firestore and Storage)
 * @param {string} videoId - Video document ID
 * @param {string} userId - User ID for auth check
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteVideo = async (videoId, userId) => {
  try {
    const doc = await firestore().collection(COLLECTION).doc(videoId).get()
    if (!doc.exists) return { success: false, error: 'Video not found' }
    if (doc.data().userId !== userId) return { success: false, error: 'Not authorized' }

    // Delete from storage if it's a Firebase Storage URL
    const videoUrl = doc.data().videoUrl
    if (videoUrl?.includes('firebasestorage.googleapis.com')) {
      try {
        const ref = storage().refFromURL(videoUrl)
        await ref.delete()
      } catch (e) {
        console.warn('[videosService] Could not delete from storage:', e.message)
      }
    }

    // Delete Firestore document
    await firestore().collection(COLLECTION).doc(videoId).delete()

    return { success: true }
  } catch (error) {
    console.error('[videosService] Error deleting video:', error)
    return { success: false, error: error.message }
  }
}
