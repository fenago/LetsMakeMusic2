/**
 * GenerationTaskContext - Manages background song generation tasks
 *
 * This context allows generation tasks (create, extend) to continue running
 * even when the user navigates away from the screen that initiated them.
 *
 * Features:
 * - Track multiple concurrent generation tasks
 * - Update progress in real-time
 * - Save completed songs to Firebase automatically
 * - Show completion notifications/alerts
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react'
import { Alert } from 'react-native'
import functions from '@react-native-firebase/functions'
import { pollForCompletion, getTimestampedLyrics } from '../services/sunoApi'
import { saveSong } from '../services/songsService'
import { uploadAudioToFirebase } from '../services/audioStorageService'

// Helper to auto-share song to feed if user has setting enabled
const autoShareToFeed = async (songId, songTitle, userSettings) => {
  if (userSettings?.auto_share_to_feed !== 'On') return

  try {
    const createSongPost = functions().httpsCallable('createSongPost')
    await createSongPost({
      songId,
      caption: `Just created a new song: ${songTitle} 🎵`,
      hashtags: [],
    })
    console.log('[GenerationTask] Song auto-shared to feed:', songId)
  } catch (error) {
    console.warn('[GenerationTask] Could not auto-share song:', error)
  }
}

// Task types
export const TASK_TYPES = {
  CREATE: 'create',
  EXTEND: 'extend',
}

// Task statuses
export const TASK_STATUS = {
  PENDING: 'pending',
  GENERATING: 'generating',
  UPLOADING: 'uploading',
  SAVING: 'saving',
  COMPLETE: 'complete',
  FAILED: 'failed',
}

const GenerationTaskContext = createContext(null)

export const GenerationTaskProvider = ({ children }) => {
  // Active tasks map: taskId -> task object
  const [tasks, setTasks] = useState({})

  // Ref to track tasks without causing re-renders during async operations
  const tasksRef = useRef({})

  // Completion callbacks - screens can register to be notified
  const completionCallbacksRef = useRef({})

  /**
   * Update a task's state
   */
  const updateTask = useCallback((taskId, updates) => {
    setTasks(prev => {
      const updated = {
        ...prev,
        [taskId]: {
          ...prev[taskId],
          ...updates,
        },
      }
      tasksRef.current = updated
      return updated
    })
  }, [])

  /**
   * Remove a task from tracking
   */
  const removeTask = useCallback((taskId) => {
    setTasks(prev => {
      const { [taskId]: removed, ...rest } = prev
      tasksRef.current = rest
      return rest
    })
    delete completionCallbacksRef.current[taskId]
  }, [])

  /**
   * Register a completion callback for a task
   * Returns unsubscribe function
   */
  const onTaskComplete = useCallback((taskId, callback) => {
    completionCallbacksRef.current[taskId] = callback
    return () => {
      delete completionCallbacksRef.current[taskId]
    }
  }, [])

  /**
   * Start an extend song task
   *
   * This runs the full extend flow in the background:
   * 1. Poll for completion
   * 2. Merge with original audio (if enabled)
   * 3. Upload audio to Firebase
   * 4. Save song metadata
   * 5. Notify completion
   */
  const startExtendTask = useCallback(async ({
    taskId,
    originalSong,
    currentUser,
    extensionSettings,
    onProgress,
  }) => {
    const internalTaskId = taskId || `extend_${Date.now()}`

    // Initialize task
    const task = {
      id: internalTaskId,
      type: TASK_TYPES.EXTEND,
      status: TASK_STATUS.GENERATING,
      progress: 0.1, // Start at 10% since API call already made
      originalSong,
      extensionSettings,
      startTime: Date.now(),
      elapsedSeconds: 0,
      resultSong: null,
      error: null,
    }

    updateTask(internalTaskId, task)

    try {
      // Step 1: Poll for completion
      updateTask(internalTaskId, { status: TASK_STATUS.GENERATING })

      const completedResult = await pollForCompletion(
        taskId,
        60, // maxAttempts
        5000, // intervalMs
        (progress) => {
          // Scale progress: 10% to 70%
          const scaledProgress = 0.1 + (progress.progress || 0) * 0.6
          updateTask(internalTaskId, {
            progress: scaledProgress,
            elapsedSeconds: progress.elapsedSeconds,
          })
          onProgress?.(progress)
        }
      )

      if (completedResult.status !== 'complete' || !completedResult.songs?.length) {
        throw new Error('No songs returned from extension')
      }

      const extendedSongData = completedResult.songs[0]
      console.log('[GenerationTask] Extended song data:', extendedSongData)

      updateTask(internalTaskId, {
        status: TASK_STATUS.UPLOADING,
        progress: 0.7,
      })

      // Step 2: Fetch timestamped lyrics (non-blocking)
      let timestampedLyrics = null
      let rawLyrics = extendedSongData.lyric || ''
      if (!extensionSettings.instrumental && extendedSongData.id) {
        try {
          const lyricsResult = await getTimestampedLyrics(extendedSongData.id)
          timestampedLyrics = lyricsResult.lyrics || []
          rawLyrics = lyricsResult.rawLyrics || rawLyrics
        } catch (lyricsError) {
          console.warn('[GenerationTask] Could not fetch lyrics:', lyricsError)
        }
      }

      updateTask(internalTaskId, { progress: 0.75 })

      // Step 3: Merge with original if enabled
      let finalAudioUrl = extendedSongData.audio_url
      let mergedDuration = extendedSongData.duration || 0

      if (extensionSettings.mergeWithOriginal) {
        console.log('[GenerationTask] Merging with original audio...')
        try {
          const concatenateAudio = functions().httpsCallable('concatenateAudio')

          // Get the original audio URL (prefer Firebase backup, fallback to Suno URL)
          const originalAudioUrl = originalSong.firebaseAudioUrl || originalSong.audioUrl || originalSong.streamUrl

          const mergeResult = await concatenateAudio({
            originalUrl: originalAudioUrl,
            extensionUrl: extendedSongData.audio_url,
            trimAt: extensionSettings.continueAt || 0, // Trim original at continueAt point
            outputFileName: `${extendedSongData.id}_merged.mp3`,
            userId: currentUser.id,
          })

          if (mergeResult.data?.success && mergeResult.data?.url) {
            finalAudioUrl = mergeResult.data.url
            // Calculate merged duration: original (or trimmed) + extension
            const originalDuration = extensionSettings.continueAt || (originalSong.duration || 0)
            mergedDuration = originalDuration + (extendedSongData.duration || 0)
            console.log('[GenerationTask] Merge successful! URL:', finalAudioUrl)
            console.log('[GenerationTask] Merged duration:', mergedDuration)
          }
        } catch (mergeError) {
          console.warn('[GenerationTask] Merge failed, using extension only:', mergeError.message)
          // Continue with just the extension if merge fails
        }
      }

      updateTask(internalTaskId, { progress: 0.85 })

      // Step 4: Upload audio to Firebase Storage (if not already merged to Firebase)
      let firebaseAudioUrl = finalAudioUrl.includes('storage.googleapis.com') ? finalAudioUrl : null
      if (!firebaseAudioUrl) {
        try {
          firebaseAudioUrl = await uploadAudioToFirebase(finalAudioUrl, extendedSongData.id)
          console.log('[GenerationTask] Audio backed up to Firebase:', firebaseAudioUrl)
        } catch (uploadError) {
          console.warn('[GenerationTask] Could not backup audio:', uploadError)
        }
      }

      updateTask(internalTaskId, {
        status: TASK_STATUS.SAVING,
        progress: 0.9,
      })

      // Step 5: Save to Firebase
      const extendedTitle = extensionSettings.title ||
        `${originalSong.title} (Extended)` ||
        'Extended Song'

      const savedSong = await saveSong({
        userId: currentUser.id,
        author: {
          id: currentUser.id,
          stageName: currentUser.stageName || null,
          bio: currentUser.bio || null,
          profilePictureURL: currentUser.profilePictureURL || null,
          firstName: currentUser.firstName || null,
          lastName: currentUser.lastName || null,
        },
        sunoId: extendedSongData.id,
        audioUrl: finalAudioUrl,
        streamUrl: finalAudioUrl,
        firebaseAudioUrl: firebaseAudioUrl,
        imageUrl: extendedSongData.image_url || originalSong.imageUrl,
        videoUrl: extendedSongData.video_url || null,
        title: extendedTitle,
        style: extendedSongData.style || originalSong.style || '',
        rawLyrics: rawLyrics,
        timestampedLyrics: timestampedLyrics || [],
        duration: mergedDuration,
        model: extensionSettings.model,
        instrumental: extensionSettings.instrumental || false,
        prompt: extensionSettings.prompt || originalSong.prompt || '',
        extendedFrom: {
          songId: originalSong.id,
          sunoId: originalSong.sunoId,
          title: originalSong.title,
          merged: extensionSettings.mergeWithOriginal || false,
        },
        sunoModelName: extendedSongData.model_name,
        sunoStatus: extendedSongData.status || 'complete',
        sunoCreatedAt: extendedSongData.created_at || null,
      })

      console.log('[GenerationTask] Song saved to Firebase:', savedSong.id)

      // Auto-share to feed if user has setting enabled
      await autoShareToFeed(savedSong.id, extendedTitle, currentUser)

      // Step 5: Mark complete
      updateTask(internalTaskId, {
        status: TASK_STATUS.COMPLETE,
        progress: 1,
        resultSong: savedSong,
      })

      // Notify via callback if registered
      const callback = completionCallbacksRef.current[internalTaskId]
      if (callback) {
        callback(savedSong)
      }

      // Show completion alert
      Alert.alert(
        'Song Extended! 🎵',
        `"${extendedTitle}" has been saved to your Library.`,
        [
          { text: 'OK', style: 'default' },
        ]
      )

      // Clean up task after a delay
      setTimeout(() => {
        removeTask(internalTaskId)
      }, 5000)

      return savedSong
    } catch (error) {
      console.error('[GenerationTask] Error:', error)

      updateTask(internalTaskId, {
        status: TASK_STATUS.FAILED,
        error: error.message,
      })

      // Show error alert
      Alert.alert(
        'Extension Failed',
        error.message || 'An error occurred while extending your song. Please try again.'
      )

      // Clean up failed task after a delay
      setTimeout(() => {
        removeTask(internalTaskId)
      }, 10000)

      throw error
    }
  }, [updateTask, removeTask])

  /**
   * Get active tasks
   */
  const getActiveTasks = useCallback(() => {
    return Object.values(tasks).filter(
      task => task.status !== TASK_STATUS.COMPLETE && task.status !== TASK_STATUS.FAILED
    )
  }, [tasks])

  /**
   * Check if there are any active generation tasks
   */
  const hasActiveTasks = useCallback(() => {
    return getActiveTasks().length > 0
  }, [getActiveTasks])

  /**
   * Get a specific task by ID
   */
  const getTask = useCallback((taskId) => {
    return tasks[taskId]
  }, [tasks])

  const value = {
    tasks,
    startExtendTask,
    getTask,
    getActiveTasks,
    hasActiveTasks,
    onTaskComplete,
    removeTask,
    TASK_STATUS,
    TASK_TYPES,
  }

  return (
    <GenerationTaskContext.Provider value={value}>
      {children}
    </GenerationTaskContext.Provider>
  )
}

export const useGenerationTask = () => {
  const context = useContext(GenerationTaskContext)
  if (!context) {
    throw new Error('useGenerationTask must be used within GenerationTaskProvider')
  }
  return context
}

export default GenerationTaskContext
