/**
 * Video Clips Service - User Video Clip Collection Management
 *
 * Handles CRUD operations for AI-generated video clips using Veo 3/3.1.
 * Supports uploading videos to Firebase Storage and tracking in Firestore.
 *
 * Collections:
 * - video_clips (global collection for discoverability)
 * - users/{userId}/video_clips (user's personal collection)
 */

import { db, firestore } from '../core/firebase/config'
import storage from '@react-native-firebase/storage'
import * as VideoThumbnails from 'expo-video-thumbnails'
import * as FileSystem from 'expo-file-system'
import { downloadVideo as downloadVideoFromGemini } from './geminiVideoService'

// Collection references
export const videoClipsRef = db.collection('video_clips')
export const userVideoClipsRef = (userId) =>
  db.collection('users').doc(userId).collection('video_clips')

/**
 * Status values for video clips
 */
export const VIDEO_CLIP_STATUS = {
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DOWNLOADING: 'downloading',
}

/**
 * Download video from Veo temporary URI and upload to Firebase Storage
 * Veo returns a temporary Google Cloud URI that expires in 2 days and requires auth.
 * We must download it immediately and store in our own Firebase Storage.
 *
 * IMPORTANT: Veo URIs require the API key appended to download.
 * The official approach from Google's docs is: `${video.uri}&key=${API_KEY}`
 * FileSystem.downloadAsync() WILL NOT WORK with Veo URIs.
 * We use fetch() with the API key appended via geminiVideoService.downloadVideo().
 *
 * @param {Object|string} veoVideoOrUri - Veo video object (with .uri) or temporary Veo video URI
 * @param {string} userId - User ID for storage path
 * @returns {Promise<{success: boolean, videoUrl?: string, fileSizeBytes?: number, error?: string}>}
 */
export const downloadAndUploadVeoVideo = async (veoVideoOrUri, userId) => {
  try {
    console.log('[videoClipsService] Downloading video from Veo using authenticated fetch:', typeof veoVideoOrUri === 'string' ? veoVideoOrUri : 'video object')

    const timestamp = Date.now()

    // Download using fetch with API key appended (official Google approach)
    const downloadResult = await downloadVideoFromGemini(veoVideoOrUri)

    if (!downloadResult.success) {
      console.error('[videoClipsService] Video download failed:', downloadResult.error)
      return {
        success: false,
        error: downloadResult.error || 'Failed to download video from Veo',
      }
    }

    console.log('[videoClipsService] Video downloaded via fetch, size:', downloadResult.sizeBytes || downloadResult.videoData?.byteLength || 'unknown', 'bytes')

    // Convert the video data to base64 for Firebase Storage upload
    let videoBase64
    let fileSizeBytes = 0

    if (downloadResult.videoData) {
      // The download returns video data as ArrayBuffer (from fetch)
      // Handle ArrayBuffer, Blob, or base64 string for robustness
      if (typeof downloadResult.videoData === 'string') {
        // Already base64
        videoBase64 = downloadResult.videoData
        fileSizeBytes = Math.ceil((videoBase64.length * 3) / 4)
      } else if (downloadResult.videoData instanceof ArrayBuffer) {
        // Convert ArrayBuffer to base64
        const uint8Array = new Uint8Array(downloadResult.videoData)
        fileSizeBytes = uint8Array.length
        let binary = ''
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i])
        }
        videoBase64 = btoa(binary)
      } else if (downloadResult.videoData.arrayBuffer) {
        // Blob - convert to ArrayBuffer then base64
        const arrayBuffer = await downloadResult.videoData.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        fileSizeBytes = uint8Array.length
        let binary = ''
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i])
        }
        videoBase64 = btoa(binary)
      } else {
        console.error('[videoClipsService] Unknown video data type:', typeof downloadResult.videoData)
        return { success: false, error: 'Unknown video data format from download' }
      }
    } else {
      return { success: false, error: 'No video data received from download' }
    }

    console.log('[videoClipsService] Video converted to base64, size:', fileSizeBytes, 'bytes')

    // Upload to Firebase Storage
    const storagePath = `video_clips/${userId}/${timestamp}.mp4`
    const storageRef = storage().ref(storagePath)

    console.log('[videoClipsService] Uploading to Firebase Storage:', storagePath)
    await storageRef.putString(videoBase64, 'base64', {
      contentType: downloadResult.mimeType || 'video/mp4',
    })

    const videoUrl = await storageRef.getDownloadURL()
    console.log('[videoClipsService] Upload complete, Firebase URL:', videoUrl)

    return {
      success: true,
      videoUrl,
      fileSizeBytes,
    }
  } catch (error) {
    console.error('[videoClipsService] Download/upload error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate a thumbnail from a video
 * @param {string} videoUri - Local or remote video URI
 * @param {number} timeMs - Timestamp in milliseconds (default: 1000ms)
 * @returns {Promise<{uri: string, base64?: string}>}
 */
export const generateThumbnail = async (videoUri, timeMs = 1000) => {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: timeMs,
      quality: 0.7,
    })

    // Read as base64 for upload
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    return { uri, base64 }
  } catch (error) {
    console.error('[videoClipsService] Thumbnail generation failed:', error)
    return null
  }
}

/**
 * Save a video clip to Firebase (Storage + Firestore)
 * @param {Object} clipData - Video clip data
 * @param {string} clipData.userId - Owner's user ID
 * @param {Object} clipData.author - Denormalized author info
 * @param {string} clipData.videoUri - Local video file URI
 * @param {string} clipData.prompt - Text prompt used
 * @param {string} clipData.negativePrompt - Negative prompt (optional)
 * @param {string} clipData.model - Model used
 * @param {string} clipData.generationMode - Generation mode used
 * @param {number} clipData.duration - Video duration in seconds
 * @param {string} clipData.resolution - Video resolution
 * @param {string} clipData.aspectRatio - Aspect ratio
 * @param {Array} clipData.referenceImages - Reference images used (optional)
 * @returns {Promise<{success: boolean, clipId?: string, videoUrl?: string, error?: string}>}
 */
export const saveVideoClip = async (clipData) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()
    const timestamp = Date.now()

    const storagePath = `video_clips/${clipData.userId}/${timestamp}.mp4`

    // 1. Upload video to Storage
    let videoUrl
    let thumbnailUrl
    let fileSizeBytes = 0

    if (clipData.videoUri) {
      // Read video file info
      const fileInfo = await FileSystem.getInfoAsync(clipData.videoUri)
      fileSizeBytes = fileInfo.size || 0

      // Upload video
      const storageRef = storage().ref(storagePath)
      await storageRef.putFile(clipData.videoUri)
      videoUrl = await storageRef.getDownloadURL()

      // Generate and upload thumbnail
      const thumbnailData = await generateThumbnail(clipData.videoUri)
      if (thumbnailData?.base64) {
        const thumbnailPath = `video_clips/${clipData.userId}/thumb_${timestamp}.jpg`
        const thumbnailRef = storage().ref(thumbnailPath)
        await thumbnailRef.putString(thumbnailData.base64, 'base64', {
          contentType: 'image/jpeg',
        })
        thumbnailUrl = await thumbnailRef.getDownloadURL()
        console.log('[videoClipsService] Thumbnail uploaded')
      }
    } else if (clipData.videoBase64) {
      // Handle base64 video data
      const storageRef = storage().ref(storagePath)
      await storageRef.putString(clipData.videoBase64, 'base64', {
        contentType: 'video/mp4',
      })
      videoUrl = await storageRef.getDownloadURL()
      fileSizeBytes = Math.ceil((clipData.videoBase64.length * 3) / 4) // Approximate
    } else if (clipData.videoUrl) {
      // Already have a URL (from Veo direct)
      videoUrl = clipData.videoUrl
      thumbnailUrl = clipData.thumbnailUrl
    } else {
      throw new Error('No video data provided')
    }

    // 2. Prepare reference images metadata (store URLs, not base64)
    const referenceImagesMetadata = (clipData.referenceImages || []).map((img, idx) => ({
      url: img.url || null, // Will be populated if we upload reference images
      type: img.type || 'reference',
      order: idx,
    }))

    // 3. Prepare document data
    const docData = {
      // Ownership
      userId: clipData.userId,
      author: clipData.author || {
        id: clipData.userId,
        stageName: 'Unknown',
        profilePictureURL: null,
      },

      // Content
      videoUrl,
      thumbnailUrl: thumbnailUrl || null,

      // Generation Metadata
      prompt: clipData.prompt || null,
      negativePrompt: clipData.negativePrompt || null,
      generationMode: clipData.generationMode || 'text',
      modelUsed: clipData.model || null,

      // Input images
      referenceImages: referenceImagesMetadata,

      // Video Properties
      duration: clipData.duration || 8,
      resolution: clipData.resolution || '720p',
      aspectRatio: clipData.aspectRatio || '9:16',
      fileSizeBytes,

      // Usage Tracking
      usedInSongs: [],
      usedInPosts: [],

      // Status
      status: VIDEO_CLIP_STATUS.COMPLETED,
      errorMessage: null,

      // Privacy & Stats
      visibility: 'private',
      viewCount: 0,
      tags: clipData.tags || [],

      // Timestamps
      createdAt: now,
      updatedAt: now,
    }

    // 4. Save to global collection
    const docRef = await videoClipsRef.add(docData)

    // 5. Save to user's subcollection (minimal data for list display)
    await userVideoClipsRef(clipData.userId).doc(docRef.id).set({
      id: docRef.id,
      videoUrl,
      thumbnailUrl: thumbnailUrl || null,
      prompt: clipData.prompt || null,
      generationMode: clipData.generationMode || 'text',
      duration: clipData.duration || 8,
      aspectRatio: clipData.aspectRatio || '9:16',
      usedInSongs: [],
      status: VIDEO_CLIP_STATUS.COMPLETED,
      createdAt: now,
    })

    console.log('[videoClipsService] Saved video clip:', docRef.id)

    return {
      success: true,
      clipId: docRef.id,
      videoUrl,
      thumbnailUrl,
    }
  } catch (error) {
    console.error('[videoClipsService] Save error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a pending video clip entry (for generation tracking)
 * @param {Object} clipData - Initial clip data
 * @returns {Promise<{success: boolean, clipId?: string, error?: string}>}
 */
export const createPendingVideoClip = async (clipData) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()

    const docData = {
      userId: clipData.userId,
      author: clipData.author || {
        id: clipData.userId,
        stageName: 'Unknown',
        profilePictureURL: null,
      },
      prompt: clipData.prompt,
      negativePrompt: clipData.negativePrompt || null,
      generationMode: clipData.generationMode || 'text',
      modelUsed: clipData.model,
      duration: clipData.duration || 8,
      resolution: clipData.resolution || '720p',
      aspectRatio: clipData.aspectRatio || '9:16',

      // Operation tracking
      operationName: clipData.operationName,
      status: VIDEO_CLIP_STATUS.GENERATING,
      generationProgress: 0,

      // Empty until generation completes
      videoUrl: null,
      thumbnailUrl: null,

      createdAt: now,
      updatedAt: now,
    }

    const docRef = await videoClipsRef.add(docData)

    // Also add to user's subcollection
    await userVideoClipsRef(clipData.userId).doc(docRef.id).set({
      id: docRef.id,
      prompt: clipData.prompt,
      generationMode: clipData.generationMode || 'text',
      duration: clipData.duration || 8,
      status: VIDEO_CLIP_STATUS.GENERATING,
      generationProgress: 0,
      createdAt: now,
    })

    console.log('[videoClipsService] Created pending clip:', docRef.id)

    return { success: true, clipId: docRef.id }
  } catch (error) {
    console.error('[videoClipsService] Create pending error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update video clip generation progress
 * @param {string} clipId - Video clip ID
 * @param {number} progress - Progress 0-100
 */
export const updateGenerationProgress = async (clipId, progress) => {
  try {
    await videoClipsRef.doc(clipId).update({
      generationProgress: progress,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('[videoClipsService] Progress update error:', error)
  }
}

/**
 * Mark video clip generation as complete
 * @param {string} clipId - Video clip ID
 * @param {string} userId - User ID
 * @param {Object} completionData - Video URL and metadata
 */
export const completeVideoClipGeneration = async (clipId, userId, completionData) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()

    const updateData = {
      status: VIDEO_CLIP_STATUS.COMPLETED,
      videoUrl: completionData.videoUrl,
      thumbnailUrl: completionData.thumbnailUrl || null,
      fileSizeBytes: completionData.fileSizeBytes || 0,
      generationProgress: 100,
      updatedAt: now,
    }

    await videoClipsRef.doc(clipId).update(updateData)

    await userVideoClipsRef(userId).doc(clipId).update({
      status: VIDEO_CLIP_STATUS.COMPLETED,
      videoUrl: completionData.videoUrl,
      thumbnailUrl: completionData.thumbnailUrl || null,
      generationProgress: 100,
    })

    console.log('[videoClipsService] Generation completed:', clipId)
    return { success: true }
  } catch (error) {
    console.error('[videoClipsService] Complete generation error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark video clip generation as failed
 * @param {string} clipId - Video clip ID
 * @param {string} userId - User ID
 * @param {string} errorMessage - Error message
 */
export const failVideoClipGeneration = async (clipId, userId, errorMessage) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()

    await videoClipsRef.doc(clipId).update({
      status: VIDEO_CLIP_STATUS.FAILED,
      errorMessage,
      updatedAt: now,
    })

    await userVideoClipsRef(userId).doc(clipId).update({
      status: VIDEO_CLIP_STATUS.FAILED,
    })

    console.log('[videoClipsService] Generation failed:', clipId)
    return { success: true }
  } catch (error) {
    console.error('[videoClipsService] Fail generation error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get a single video clip by ID
 * @param {string} clipId - Video clip document ID
 * @returns {Promise<{success: boolean, clip?: Object, error?: string}>}
 */
export const getVideoClip = async (clipId) => {
  try {
    const doc = await videoClipsRef.doc(clipId).get()

    if (!doc.exists) {
      return { success: false, error: 'Video clip not found' }
    }

    return {
      success: true,
      clip: { id: doc.id, ...doc.data() },
    }
  } catch (error) {
    console.error('[videoClipsService] Get error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Subscribe to user's video clips collection
 * @param {string} userId - User ID
 * @param {function} onUpdate - Callback with clips array
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserVideoClips = (userId, onUpdate) => {
  if (!userId) {
    onUpdate([])
    return () => {}
  }

  return userVideoClipsRef(userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const clips = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        onUpdate(clips)
      },
      (error) => {
        console.error('[videoClipsService] Subscription error:', error)
        onUpdate([])
      }
    )
}

/**
 * Get user's video clips (one-time fetch)
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, clips?: Array, error?: string}>}
 */
export const getUserVideoClips = async (userId, options = {}) => {
  try {
    let query = userVideoClipsRef(userId).orderBy('createdAt', 'desc')

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const snapshot = await query.get()
    const clips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Filter by status if specified
    const filtered = options.status ? clips.filter((c) => c.status === options.status) : clips

    return { success: true, clips: filtered }
  } catch (error) {
    console.error('[videoClipsService] Get user clips error:', error)
    return { success: false, error: error.message, clips: [] }
  }
}

/**
 * Get pending (generating) video clips for a user
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, clips?: Array, error?: string}>}
 */
export const getPendingVideoClips = async (userId) => {
  try {
    const snapshot = await userVideoClipsRef(userId)
      .where('status', '==', VIDEO_CLIP_STATUS.GENERATING)
      .get()

    const clips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return { success: true, clips }
  } catch (error) {
    console.error('[videoClipsService] Get pending clips error:', error)
    return { success: false, error: error.message, clips: [] }
  }
}

/**
 * Apply video clip to a song as video content
 * @param {string} clipId - Video clip document ID
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const applyVideoClipToSong = async (clipId, songId, userId) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()

    // Get clip data
    const clipDoc = await videoClipsRef.doc(clipId).get()
    if (!clipDoc.exists) {
      return { success: false, error: 'Video clip not found' }
    }

    const clipData = clipDoc.data()

    if (clipData.status !== VIDEO_CLIP_STATUS.COMPLETED) {
      return { success: false, error: 'Video clip is not ready' }
    }

    // Update song with video clip
    await db.collection('songs').doc(songId).update({
      videoClipUrl: clipData.videoUrl,
      videoClip: {
        clipId,
        thumbnailUrl: clipData.thumbnailUrl,
        duration: clipData.duration,
        aspectRatio: clipData.aspectRatio,
        appliedAt: now,
      },
      updatedAt: now,
    })

    // Update user's songs subcollection
    await db.collection('users').doc(userId).collection('songs').doc(songId).update({
      videoClipUrl: clipData.videoUrl,
      updatedAt: now,
    })

    // Update clip usedInSongs tracking
    await videoClipsRef.doc(clipId).update({
      usedInSongs: firestore.FieldValue.arrayUnion(songId),
      updatedAt: now,
    })

    await userVideoClipsRef(userId).doc(clipId).update({
      usedInSongs: firestore.FieldValue.arrayUnion(songId),
    })

    console.log('[videoClipsService] Applied video clip to song:', songId)
    return { success: true }
  } catch (error) {
    console.error('[videoClipsService] Apply to song error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete video clip
 * @param {string} clipId - Video clip document ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteVideoClip = async (clipId, userId) => {
  try {
    const doc = await videoClipsRef.doc(clipId).get()

    if (!doc.exists) {
      return { success: false, error: 'Video clip not found' }
    }

    const clipData = doc.data()

    // Authorization check
    if (clipData.userId !== userId) {
      return { success: false, error: 'Not authorized to delete this video clip' }
    }

    // Check if clip is in use
    if (clipData.usedInSongs?.length > 0) {
      return {
        success: false,
        error: 'Cannot delete video clip that is currently in use by songs',
      }
    }

    // Delete from Storage
    const videoUrl = clipData.videoUrl
    if (videoUrl?.includes('firebasestorage.googleapis.com')) {
      try {
        await storage().refFromURL(videoUrl).delete()
      } catch (storageError) {
        console.warn('[videoClipsService] Could not delete video from storage:', storageError.message)
      }
    }

    // Delete thumbnail from Storage
    const thumbnailUrl = clipData.thumbnailUrl
    if (thumbnailUrl?.includes('firebasestorage.googleapis.com')) {
      try {
        await storage().refFromURL(thumbnailUrl).delete()
      } catch (storageError) {
        console.warn('[videoClipsService] Could not delete thumbnail:', storageError.message)
      }
    }

    // Delete from Firestore
    await videoClipsRef.doc(clipId).delete()
    await userVideoClipsRef(userId).doc(clipId).delete()

    console.log('[videoClipsService] Deleted video clip:', clipId)
    return { success: true }
  } catch (error) {
    console.error('[videoClipsService] Delete error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update video clip metadata
 * @param {string} clipId - Video clip document ID
 * @param {string} userId - User ID (for authorization)
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateVideoClip = async (clipId, userId, updates) => {
  try {
    const doc = await videoClipsRef.doc(clipId).get()

    if (!doc.exists) {
      return { success: false, error: 'Video clip not found' }
    }

    if (doc.data().userId !== userId) {
      return { success: false, error: 'Not authorized' }
    }

    const now = firestore.FieldValue.serverTimestamp()

    // Only allow certain fields to be updated
    const allowedUpdates = {
      visibility: updates.visibility,
      tags: updates.tags,
    }

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(
      (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    )

    await videoClipsRef.doc(clipId).update({
      ...allowedUpdates,
      updatedAt: now,
    })

    return { success: true }
  } catch (error) {
    console.error('[videoClipsService] Update error:', error)
    return { success: false, error: error.message }
  }
}

export default {
  downloadAndUploadVeoVideo,
  generateThumbnail,
  saveVideoClip,
  createPendingVideoClip,
  updateGenerationProgress,
  completeVideoClipGeneration,
  failVideoClipGeneration,
  getVideoClip,
  subscribeToUserVideoClips,
  getUserVideoClips,
  getPendingVideoClips,
  applyVideoClipToSong,
  deleteVideoClip,
  updateVideoClip,
  VIDEO_CLIP_STATUS,
}
