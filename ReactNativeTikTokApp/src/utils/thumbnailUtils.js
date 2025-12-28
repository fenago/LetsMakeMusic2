/**
 * Thumbnail Utilities
 *
 * Creates optimized thumbnails for artwork using expo-image-manipulator.
 * Thumbnails are smaller versions (200x200) for list/grid displays.
 */

import * as ImageManipulator from 'expo-image-manipulator'

// Thumbnail dimensions
const THUMBNAIL_SIZE = 200
const THUMBNAIL_QUALITY = 0.7

/**
 * Create a thumbnail from a base64 image
 * @param {string} base64Data - Base64 encoded image (without data URI prefix)
 * @param {string} mimeType - Image MIME type (default: image/png)
 * @returns {Promise<{base64: string, width: number, height: number} | null>}
 */
export const createThumbnailFromBase64 = async (base64Data, mimeType = 'image/png') => {
  try {
    // Create a data URI for the manipulator
    const dataUri = `data:${mimeType};base64,${base64Data}`

    // Resize to thumbnail size while maintaining aspect ratio
    const result = await ImageManipulator.manipulateAsync(
      dataUri,
      [
        {
          resize: {
            width: THUMBNAIL_SIZE,
            height: THUMBNAIL_SIZE,
          },
        },
      ],
      {
        compress: THUMBNAIL_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    )

    return {
      base64: result.base64,
      width: result.width,
      height: result.height,
      uri: result.uri,
    }
  } catch (error) {
    console.warn('[thumbnailUtils] Failed to create thumbnail:', error.message)
    return null
  }
}

/**
 * Create a thumbnail from an image URI
 * @param {string} imageUri - Local or remote image URI
 * @returns {Promise<{base64: string, width: number, height: number, uri: string} | null>}
 */
export const createThumbnailFromUri = async (imageUri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: THUMBNAIL_SIZE,
            height: THUMBNAIL_SIZE,
          },
        },
      ],
      {
        compress: THUMBNAIL_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    )

    return {
      base64: result.base64,
      width: result.width,
      height: result.height,
      uri: result.uri,
    }
  } catch (error) {
    console.warn('[thumbnailUtils] Failed to create thumbnail from URI:', error.message)
    return null
  }
}

/**
 * Create a thumbnail with custom dimensions
 * @param {string} imageUri - Local or remote image URI
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<{base64: string, width: number, height: number, uri: string} | null>}
 */
export const createCustomThumbnail = async (imageUri, width = 200, height = 200, quality = 0.7) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width, height } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    )

    return {
      base64: result.base64,
      width: result.width,
      height: result.height,
      uri: result.uri,
    }
  } catch (error) {
    console.warn('[thumbnailUtils] Failed to create custom thumbnail:', error.message)
    return null
  }
}

export default {
  createThumbnailFromBase64,
  createThumbnailFromUri,
  createCustomThumbnail,
  THUMBNAIL_SIZE,
  THUMBNAIL_QUALITY,
}
