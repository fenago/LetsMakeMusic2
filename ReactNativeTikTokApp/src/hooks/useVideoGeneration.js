/**
 * useVideoGeneration Hook - AI-powered video generation
 *
 * Provides interface for generating video clips using Veo 3/3.1.
 * Requires user to have configured their API key in Backstage settings.
 *
 * Features:
 * - Text-to-video
 * - Image-to-video (start frame)
 * - Frame interpolation
 * - Reference images for style guidance
 * - Video extension
 * - Progress tracking with polling
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import storage from '@react-native-firebase/storage'
import {
  initializeGemini,
  isGeminiInitialized,
  generateVideo,
  generateVideoFromImage,
  generateVideoInterpolation,
  generateVideoWithReferences,
  extendVideo,
  waitForVideoCompletion,
  calculateCost,
  buildAudioEnhancedPrompt,
  VIDEO_MODELS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_GENERATION_MODES,
} from '../services/geminiVideoService'

import {
  createPendingVideoClip,
  completeVideoClipGeneration,
  failVideoClipGeneration,
  updateGenerationProgress,
  downloadAndUploadVeoVideo,
  generateThumbnail,
} from '../services/videoClipsService'

/**
 * Hook for AI video generation
 *
 * @param {Object} currentUser - Current user object with integrations
 * @returns {Object} Generation state and methods
 */
export const useVideoGeneration = (currentUser) => {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentClipId, setCurrentClipId] = useState(null)

  // Track active generation for cancellation
  const generationRef = useRef({ cancelled: false })

  // Initialize with user's API key when available
  useEffect(() => {
    const apiKey = currentUser?.integrations?.gemini?.apiKey
    if (apiKey) {
      const success = initializeGemini(apiKey)
      setIsInitialized(success)
    } else {
      setIsInitialized(false)
    }
  }, [currentUser?.integrations?.gemini?.apiKey])

  /**
   * Check if user has API key configured
   */
  const hasApiKey = Boolean(currentUser?.integrations?.gemini?.apiKey)

  /**
   * Get estimated cost for generation
   */
  const getEstimatedCost = useCallback((modelKey, duration, includeAudio = true) => {
    return calculateCost(modelKey, duration, includeAudio)
  }, [])

  /**
   * Handle progress updates during generation
   */
  const handleProgress = useCallback(
    (progressData) => {
      if (generationRef.current.cancelled) return

      setProgress(progressData.progress)

      // Update Firestore if we have a pending clip
      if (currentClipId) {
        updateGenerationProgress(currentClipId, progressData.progress)
      }
    },
    [currentClipId]
  )

  /**
   * Generate video from text prompt
   * @param {string} prompt - Text description
   * @param {Object} options - Generation options
   */
  const generate = useCallback(
    async (prompt, options = {}) => {
      if (!isInitialized) {
        const errorMsg =
          'Please add your API key in Backstage Settings to use AI video generation.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      // Reset state
      setLoading(true)
      setGenerating(true)
      setProgress(0)
      setError(null)
      setResult(null)
      generationRef.current.cancelled = false

      try {
        // Build prompt with audio enhancements if provided
        let finalPrompt = prompt
        if (options.audio) {
          finalPrompt = buildAudioEnhancedPrompt(prompt, options.audio)
        }

        // Get author info for saving
        const author = {
          id: currentUser?.id,
          stageName: currentUser?.stageName || currentUser?.username || 'Unknown',
          profilePictureURL: currentUser?.profilePictureURL || null,
        }

        // Start generation
        const startResult = await generateVideo(finalPrompt, {
          model: options.model || VIDEO_MODELS.VEO_3_1_FAST.id,
          aspectRatio: options.aspectRatio || '9:16',
          duration: options.duration || 8,
          negativePrompt: options.negativePrompt,
        })

        if (!startResult.success) {
          setError(startResult.error)
          setLoading(false)
          setGenerating(false)
          return startResult
        }

        // Create pending clip in Firestore
        const pendingResult = await createPendingVideoClip({
          userId: currentUser?.id,
          author,
          prompt: finalPrompt,
          negativePrompt: options.negativePrompt,
          generationMode: 'text',
          model: options.model || VIDEO_MODELS.VEO_3_1_FAST.id,
          duration: options.duration || 8,
          resolution: options.resolution || '720p',
          aspectRatio: options.aspectRatio || '9:16',
          operationName: startResult.operationName,
        })

        if (pendingResult.success) {
          setCurrentClipId(pendingResult.clipId)
        }

        // Wait for completion with progress updates
        const completionResult = await waitForVideoCompletion(
          startResult.operation,
          handleProgress
        )

        if (generationRef.current.cancelled) {
          return { success: false, error: 'Generation cancelled' }
        }

        if (completionResult.success && completionResult.status === 'completed') {
          // Download from Veo's temporary URI and upload to Firebase Storage
          // Veo URIs expire in 2 days and require auth, so we must transfer immediately
          console.log('[useVideoGeneration] Downloading video from Veo and uploading to Firebase...')
          console.log('[useVideoGeneration] Video object:', completionResult.video ? 'present' : 'missing')
          console.log('[useVideoGeneration] Video URI:', completionResult.videoUri)
          setProgress(96) // Update progress to show we're downloading

          // Pass the full video object (not just URI) for proper SDK download
          const uploadResult = await downloadAndUploadVeoVideo(
            completionResult.video || completionResult.videoUri,
            currentUser?.id
          )

          if (!uploadResult.success) {
            const errMsg = `Failed to save video: ${uploadResult.error}`
            setError(errMsg)

            if (pendingResult.success) {
              await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
            }

            return { success: false, error: errMsg }
          }

          // Generate thumbnail from the local file
          let thumbnailUrl = null
          if (uploadResult.localUri) {
            try {
              const thumbResult = await generateThumbnail(uploadResult.localUri)
              if (thumbResult?.uri) {
                // Upload thumbnail to storage
                const thumbTimestamp = Date.now()
                const thumbPath = `video_clips/${currentUser?.id}/thumb_${thumbTimestamp}.jpg`
                const thumbRef = storage().ref(thumbPath)
                await thumbRef.putString(thumbResult.base64, 'base64', {
                  contentType: 'image/jpeg',
                })
                thumbnailUrl = await thumbRef.getDownloadURL()
              }
            } catch (thumbError) {
              console.warn('[useVideoGeneration] Thumbnail generation failed:', thumbError)
            }
          }

          const generatedResult = {
            videoUri: uploadResult.videoUrl, // Use Firebase Storage URL, not Veo URI
            prompt: finalPrompt,
            model: options.model || VIDEO_MODELS.VEO_3_1_FAST.id,
            duration: options.duration || 8,
            aspectRatio: options.aspectRatio || '9:16',
            mode: 'text',
            thumbnailUrl,
          }
          setResult(generatedResult)

          // Update Firestore with Firebase Storage URL
          if (pendingResult.success) {
            await completeVideoClipGeneration(pendingResult.clipId, currentUser?.id, {
              videoUrl: uploadResult.videoUrl,
              thumbnailUrl,
              fileSizeBytes: uploadResult.fileSizeBytes,
            })
          }

          return { success: true, result: generatedResult, clipId: pendingResult.clipId }
        } else {
          const errMsg = completionResult.error || 'Generation failed'
          setError(errMsg)

          // Mark as failed in Firestore
          if (pendingResult.success) {
            await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
          }

          return { success: false, error: errMsg }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
        setGenerating(false)
        setCurrentClipId(null)
      }
    },
    [isInitialized, currentUser, handleProgress]
  )

  /**
   * Generate video from image as start frame
   * @param {Object} image - { base64: string, mimeType: string }
   * @param {string} prompt - Text description
   * @param {Object} options - Generation options
   */
  const generateFromImage = useCallback(
    async (image, prompt, options = {}) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setGenerating(true)
      setProgress(0)
      setError(null)
      setResult(null)
      generationRef.current.cancelled = false

      try {
        const author = {
          id: currentUser?.id,
          stageName: currentUser?.stageName || currentUser?.username || 'Unknown',
          profilePictureURL: currentUser?.profilePictureURL || null,
        }

        // Start generation
        const startResult = await generateVideoFromImage(
          image.base64,
          image.mimeType,
          prompt,
          {
            model: options.model || VIDEO_MODELS.VEO_3_1_FAST.id,
            aspectRatio: options.aspectRatio || '9:16',
            duration: options.duration || 8,
            negativePrompt: options.negativePrompt,
          }
        )

        if (!startResult.success) {
          setError(startResult.error)
          setLoading(false)
          setGenerating(false)
          return startResult
        }

        // Create pending clip
        const pendingResult = await createPendingVideoClip({
          userId: currentUser?.id,
          author,
          prompt,
          generationMode: 'startFrame',
          model: options.model || VIDEO_MODELS.VEO_3_1_FAST.id,
          duration: options.duration || 8,
          aspectRatio: options.aspectRatio || '9:16',
          operationName: startResult.operationName,
        })

        if (pendingResult.success) {
          setCurrentClipId(pendingResult.clipId)
        }

        // Wait for completion
        const completionResult = await waitForVideoCompletion(
          startResult.operation,
          handleProgress
        )

        if (generationRef.current.cancelled) {
          return { success: false, error: 'Generation cancelled' }
        }

        if (completionResult.success && completionResult.status === 'completed') {
          // Download from Veo and upload to Firebase Storage
          console.log('[useVideoGeneration] Downloading image-to-video from Veo...')
          console.log('[useVideoGeneration] Video object:', completionResult.video ? 'present' : 'missing')
          console.log('[useVideoGeneration] Video URI:', completionResult.videoUri)

          // Pass the full video object (not just URI) for proper SDK download
          const uploadResult = await downloadAndUploadVeoVideo(
            completionResult.video || completionResult.videoUri,
            currentUser?.id
          )

          if (!uploadResult.success) {
            const errMsg = `Failed to save video: ${uploadResult.error}`
            setError(errMsg)

            if (pendingResult.success) {
              await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
            }

            return { success: false, error: errMsg }
          }

          // Generate thumbnail
          let thumbnailUrl = null
          if (uploadResult.localUri) {
            try {
              const thumbResult = await generateThumbnail(uploadResult.localUri)
              if (thumbResult?.uri) {
                const thumbTimestamp = Date.now()
                const thumbPath = `video_clips/${currentUser?.id}/thumb_${thumbTimestamp}.jpg`
                const thumbRef = storage().ref(thumbPath)
                await thumbRef.putString(thumbResult.base64, 'base64', {
                  contentType: 'image/jpeg',
                })
                thumbnailUrl = await thumbRef.getDownloadURL()
              }
            } catch (thumbError) {
              console.warn('[useVideoGeneration] Thumbnail generation failed:', thumbError)
            }
          }

          const generatedResult = {
            videoUri: uploadResult.videoUrl,
            prompt,
            mode: 'startFrame',
            thumbnailUrl,
          }
          setResult(generatedResult)

          if (pendingResult.success) {
            await completeVideoClipGeneration(pendingResult.clipId, currentUser?.id, {
              videoUrl: uploadResult.videoUrl,
              thumbnailUrl,
              fileSizeBytes: uploadResult.fileSizeBytes,
            })
          }

          return { success: true, result: generatedResult, clipId: pendingResult.clipId }
        } else {
          const errMsg = completionResult.error || 'Generation failed'
          setError(errMsg)

          if (pendingResult.success) {
            await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
          }

          return { success: false, error: errMsg }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
        setGenerating(false)
        setCurrentClipId(null)
      }
    },
    [isInitialized, currentUser, handleProgress]
  )

  /**
   * Generate video with frame interpolation
   * @param {Object} startImage - { base64: string, mimeType: string }
   * @param {Object} endImage - { base64: string, mimeType: string }
   * @param {Object} options - Generation options
   */
  const generateInterpolation = useCallback(
    async (startImage, endImage, options = {}) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setGenerating(true)
      setProgress(0)
      setError(null)
      setResult(null)
      generationRef.current.cancelled = false

      try {
        const author = {
          id: currentUser?.id,
          stageName: currentUser?.stageName || currentUser?.username || 'Unknown',
          profilePictureURL: currentUser?.profilePictureURL || null,
        }

        const startResult = await generateVideoInterpolation(startImage, endImage, {
          model: options.model || VIDEO_MODELS.VEO_3_1_FAST.id,
          aspectRatio: options.aspectRatio || '9:16',
          duration: options.duration || 8,
        })

        if (!startResult.success) {
          setError(startResult.error)
          setLoading(false)
          setGenerating(false)
          return startResult
        }

        const pendingResult = await createPendingVideoClip({
          userId: currentUser?.id,
          author,
          prompt: 'Frame interpolation',
          generationMode: 'interpolation',
          model: options.model || VIDEO_MODELS.VEO_3_1_FAST.id,
          duration: options.duration || 8,
          aspectRatio: options.aspectRatio || '9:16',
          operationName: startResult.operationName,
        })

        if (pendingResult.success) {
          setCurrentClipId(pendingResult.clipId)
        }

        const completionResult = await waitForVideoCompletion(
          startResult.operation,
          handleProgress
        )

        if (generationRef.current.cancelled) {
          return { success: false, error: 'Generation cancelled' }
        }

        if (completionResult.success && completionResult.status === 'completed') {
          // Download from Veo and upload to Firebase Storage
          console.log('[useVideoGeneration] Downloading interpolation video from Veo...')
          console.log('[useVideoGeneration] Video object:', completionResult.video ? 'present' : 'missing')
          console.log('[useVideoGeneration] Video URI:', completionResult.videoUri)

          // Pass the full video object (not just URI) for proper SDK download
          const uploadResult = await downloadAndUploadVeoVideo(
            completionResult.video || completionResult.videoUri,
            currentUser?.id
          )

          if (!uploadResult.success) {
            const errMsg = `Failed to save video: ${uploadResult.error}`
            setError(errMsg)

            if (pendingResult.success) {
              await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
            }

            return { success: false, error: errMsg }
          }

          // Generate thumbnail
          let thumbnailUrl = null
          if (uploadResult.localUri) {
            try {
              const thumbResult = await generateThumbnail(uploadResult.localUri)
              if (thumbResult?.uri) {
                const thumbTimestamp = Date.now()
                const thumbPath = `video_clips/${currentUser?.id}/thumb_${thumbTimestamp}.jpg`
                const thumbRef = storage().ref(thumbPath)
                await thumbRef.putString(thumbResult.base64, 'base64', {
                  contentType: 'image/jpeg',
                })
                thumbnailUrl = await thumbRef.getDownloadURL()
              }
            } catch (thumbError) {
              console.warn('[useVideoGeneration] Thumbnail generation failed:', thumbError)
            }
          }

          const generatedResult = {
            videoUri: uploadResult.videoUrl,
            mode: 'interpolation',
            thumbnailUrl,
          }
          setResult(generatedResult)

          if (pendingResult.success) {
            await completeVideoClipGeneration(pendingResult.clipId, currentUser?.id, {
              videoUrl: uploadResult.videoUrl,
              thumbnailUrl,
              fileSizeBytes: uploadResult.fileSizeBytes,
            })
          }

          return { success: true, result: generatedResult, clipId: pendingResult.clipId }
        } else {
          const errMsg = completionResult.error || 'Generation failed'
          setError(errMsg)

          if (pendingResult.success) {
            await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
          }

          return { success: false, error: errMsg }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
        setGenerating(false)
        setCurrentClipId(null)
      }
    },
    [isInitialized, currentUser, handleProgress]
  )

  /**
   * Generate video with reference images for style guidance (Veo 3.1 only)
   * @param {string} prompt - Text description
   * @param {Array} referenceImages - Array of { base64: string, mimeType: string }
   * @param {Object} options - Generation options
   */
  const generateWithReferences = useCallback(
    async (prompt, referenceImages, options = {}) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      // Force Veo 3.1 for reference images
      const model = options.model?.includes('3.1')
        ? options.model
        : VIDEO_MODELS.VEO_3_1_FAST.id

      setLoading(true)
      setGenerating(true)
      setProgress(0)
      setError(null)
      setResult(null)
      generationRef.current.cancelled = false

      try {
        const author = {
          id: currentUser?.id,
          stageName: currentUser?.stageName || currentUser?.username || 'Unknown',
          profilePictureURL: currentUser?.profilePictureURL || null,
        }

        const startResult = await generateVideoWithReferences(prompt, referenceImages, {
          model,
          aspectRatio: options.aspectRatio || '9:16',
          duration: options.duration || 8,
          negativePrompt: options.negativePrompt,
        })

        if (!startResult.success) {
          setError(startResult.error)
          setLoading(false)
          setGenerating(false)
          return startResult
        }

        const pendingResult = await createPendingVideoClip({
          userId: currentUser?.id,
          author,
          prompt,
          generationMode: 'reference',
          model,
          duration: options.duration || 8,
          aspectRatio: options.aspectRatio || '9:16',
          operationName: startResult.operationName,
        })

        if (pendingResult.success) {
          setCurrentClipId(pendingResult.clipId)
        }

        const completionResult = await waitForVideoCompletion(
          startResult.operation,
          handleProgress
        )

        if (generationRef.current.cancelled) {
          return { success: false, error: 'Generation cancelled' }
        }

        if (completionResult.success && completionResult.status === 'completed') {
          // Download from Veo and upload to Firebase Storage
          console.log('[useVideoGeneration] Downloading reference-style video from Veo...')
          console.log('[useVideoGeneration] Video object:', completionResult.video ? 'present' : 'missing')
          console.log('[useVideoGeneration] Video URI:', completionResult.videoUri)

          // Pass the full video object (not just URI) for proper SDK download
          const uploadResult = await downloadAndUploadVeoVideo(
            completionResult.video || completionResult.videoUri,
            currentUser?.id
          )

          if (!uploadResult.success) {
            const errMsg = `Failed to save video: ${uploadResult.error}`
            setError(errMsg)

            if (pendingResult.success) {
              await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
            }

            return { success: false, error: errMsg }
          }

          // Generate thumbnail
          let thumbnailUrl = null
          if (uploadResult.localUri) {
            try {
              const thumbResult = await generateThumbnail(uploadResult.localUri)
              if (thumbResult?.uri) {
                const thumbTimestamp = Date.now()
                const thumbPath = `video_clips/${currentUser?.id}/thumb_${thumbTimestamp}.jpg`
                const thumbRef = storage().ref(thumbPath)
                await thumbRef.putString(thumbResult.base64, 'base64', {
                  contentType: 'image/jpeg',
                })
                thumbnailUrl = await thumbRef.getDownloadURL()
              }
            } catch (thumbError) {
              console.warn('[useVideoGeneration] Thumbnail generation failed:', thumbError)
            }
          }

          const generatedResult = {
            videoUri: uploadResult.videoUrl,
            prompt,
            mode: 'reference',
            thumbnailUrl,
          }
          setResult(generatedResult)

          if (pendingResult.success) {
            await completeVideoClipGeneration(pendingResult.clipId, currentUser?.id, {
              videoUrl: uploadResult.videoUrl,
              thumbnailUrl,
              fileSizeBytes: uploadResult.fileSizeBytes,
            })
          }

          return { success: true, result: generatedResult, clipId: pendingResult.clipId }
        } else {
          const errMsg = completionResult.error || 'Generation failed'
          setError(errMsg)

          if (pendingResult.success) {
            await failVideoClipGeneration(pendingResult.clipId, currentUser?.id, errMsg)
          }

          return { success: false, error: errMsg }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
        setGenerating(false)
        setCurrentClipId(null)
      }
    },
    [isInitialized, currentUser, handleProgress]
  )

  /**
   * Cancel current generation
   */
  const cancelGeneration = useCallback(() => {
    generationRef.current.cancelled = true
    setGenerating(false)
    setLoading(false)
    setProgress(0)

    // Mark as failed if we have a pending clip
    if (currentClipId && currentUser?.id) {
      failVideoClipGeneration(currentClipId, currentUser.id, 'Cancelled by user')
    }
  }, [currentClipId, currentUser])

  /**
   * Clear current result and error
   */
  const clear = useCallback(() => {
    setResult(null)
    setError(null)
    setProgress(0)
  }, [])

  return {
    // State
    loading,
    generating,
    progress,
    error,
    result,
    isInitialized,
    hasApiKey,
    currentClipId,

    // Methods
    generate,
    generateFromImage,
    generateInterpolation,
    generateWithReferences,
    cancelGeneration,
    getEstimatedCost,
    clear,

    // Constants
    models: VIDEO_MODELS,
    durations: VIDEO_DURATIONS,
    resolutions: VIDEO_RESOLUTIONS,
    aspectRatios: VIDEO_ASPECT_RATIOS,
    modes: VIDEO_GENERATION_MODES,
  }
}

export default useVideoGeneration
