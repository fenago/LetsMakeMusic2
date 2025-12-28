/**
 * useImageGeneration Hook - AI-powered image generation
 *
 * Provides interface for generating artwork using AI.
 * Requires user to have configured their API key in Backstage settings.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  initializeGemini,
  isGeminiInitialized,
  generateImage,
  generateWithStyle,
  generateAlbumCover,
  generateArtistPhoto,
  editImage,
  describeImage,
  STYLE_PRESETS,
  ASPECT_RATIOS,
} from '../services/geminiImageService'

/**
 * Hook for AI image generation
 *
 * @param {Object} currentUser - Current user object with integrations
 * @returns {Object} Generation state and methods
 */
export const useImageGeneration = (currentUser) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

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
   * Generate an image from a text prompt
   */
  const generate = useCallback(
    async (prompt, options = {}) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings to use AI image generation.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await generateImage(prompt, options)

        if (response.success) {
          const generatedResult = {
            uri: `data:${response.mimeType};base64,${response.imageData}`,
            base64: response.imageData,
            mimeType: response.mimeType,
            prompt,
            style: options.style || null,
            aspectRatio: options.aspectRatio || '1:1',
          }
          setResult(generatedResult)
          return { success: true, result: generatedResult }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [isInitialized]
  )

  /**
   * Generate with a specific style preset
   */
  const generateStyled = useCallback(
    async (prompt, styleKey) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await generateWithStyle(prompt, styleKey)

        if (response.success) {
          const preset = STYLE_PRESETS[styleKey]
          const generatedResult = {
            uri: `data:${response.mimeType};base64,${response.imageData}`,
            base64: response.imageData,
            mimeType: response.mimeType,
            prompt,
            style: styleKey,
            aspectRatio: preset?.aspectRatio || '1:1',
          }
          setResult(generatedResult)
          return { success: true, result: generatedResult }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [isInitialized]
  )

  /**
   * Generate album cover art for a song
   */
  const generateCoverArt = useCallback(
    async (songInfo, additionalPrompt = '') => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await generateAlbumCover(songInfo, additionalPrompt)

        if (response.success) {
          const generatedResult = {
            uri: `data:${response.mimeType};base64,${response.imageData}`,
            base64: response.imageData,
            mimeType: response.mimeType,
            prompt: `Album cover for "${songInfo.title || 'Untitled'}"`,
            style: 'ALBUM_COVER',
            aspectRatio: '1:1',
          }
          setResult(generatedResult)
          return { success: true, result: generatedResult }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [isInitialized]
  )

  /**
   * Generate artist profile photo
   */
  const generateProfilePhoto = useCallback(
    async (artistDescription) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await generateArtistPhoto(artistDescription)

        if (response.success) {
          const generatedResult = {
            uri: `data:${response.mimeType};base64,${response.imageData}`,
            base64: response.imageData,
            mimeType: response.mimeType,
            prompt: artistDescription,
            style: 'PROFILE_PHOTO',
            aspectRatio: '1:1',
          }
          setResult(generatedResult)
          return { success: true, result: generatedResult }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        const errorMsg = err.message || 'Generation failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [isInitialized]
  )

  /**
   * Edit an existing image with a prompt
   */
  const edit = useCallback(
    async (imageBase64, mimeType, editPrompt) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await editImage(imageBase64, mimeType, editPrompt)

        if (response.success) {
          const editedResult = {
            uri: `data:${response.mimeType};base64,${response.imageData}`,
            base64: response.imageData,
            mimeType: response.mimeType,
            prompt: editPrompt,
            isEdited: true,
          }
          setResult(editedResult)
          return { success: true, result: editedResult }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        const errorMsg = err.message || 'Edit failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [isInitialized]
  )

  /**
   * Describe an image (for getting inspiration or understanding content)
   */
  const describe = useCallback(
    async (imageBase64, mimeType) => {
      if (!isInitialized) {
        const errorMsg = 'Please add your API key in Backstage Settings.'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      setLoading(true)
      setError(null)

      try {
        const response = await describeImage(imageBase64, mimeType)

        if (response.success) {
          return { success: true, description: response.description }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        const errorMsg = err.message || 'Description failed'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      } finally {
        setLoading(false)
      }
    },
    [isInitialized]
  )

  /**
   * Clear current result and error
   */
  const clear = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    // State
    loading,
    error,
    result,
    isInitialized,
    hasApiKey,

    // Methods
    generate,
    generateStyled,
    generateCoverArt,
    generateProfilePhoto,
    edit,
    describe,
    clear,

    // Constants
    stylePresets: STYLE_PRESETS,
    aspectRatios: ASPECT_RATIOS,
  }
}

export default useImageGeneration
