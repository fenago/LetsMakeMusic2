/**
 * Artwork Service - User Artwork Collection Management
 *
 * Handles CRUD operations for user-generated and saved artwork.
 * Supports AI-generated images and stock media from search.
 *
 * Collections:
 * - artwork (global collection for discoverability)
 * - users/{userId}/artwork (user's personal collection)
 */

import { db, firestore } from '../core/firebase/config'
import storage from '@react-native-firebase/storage'
import { createThumbnailFromBase64 } from '../utils/thumbnailUtils'

// Collection references
export const artworkRef = db.collection('artwork')
export const userArtworkRef = (userId) =>
  db.collection('users').doc(userId).collection('artwork')

/**
 * Save artwork to Firebase (Storage + Firestore)
 * @param {Object} artworkData - Artwork data to save
 * @param {string} artworkData.userId - Owner's user ID
 * @param {Object} artworkData.author - Denormalized author info
 * @param {string} artworkData.imageBase64 - Base64 encoded image data
 * @param {string} artworkData.source - 'generated' | 'stock' | 'upload'
 * @param {string} artworkData.prompt - Text prompt used (for AI-generated)
 * @param {string} artworkData.model - Model used (for AI-generated)
 * @param {string} artworkData.aspectRatio - Aspect ratio
 * @param {string} artworkData.style - Style preset used
 * @param {Object} artworkData.stockMetadata - Stock image metadata (photographer, etc.)
 * @returns {Promise<{success: boolean, artworkId?: string, imageUrl?: string, error?: string}>}
 */
export const saveArtwork = async (artworkData) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()
    const timestamp = Date.now()

    // Determine storage folder based on source
    const folder = artworkData.source === 'generated' ? 'generated' : 'saved'
    const storagePath = `artwork/${artworkData.userId}/${folder}/${timestamp}.png`

    // Get base64 image data (support both field names for flexibility)
    const base64Data = artworkData.imageBase64 || artworkData.imageData

    // For stock images that come with a URL instead of base64
    let imageUrl
    let thumbnailUrl
    if (artworkData.source === 'stock' && artworkData.imageUrl && !base64Data) {
      // Stock photos already have a URL, no need to upload to storage
      imageUrl = artworkData.imageUrl
      thumbnailUrl = imageUrl // Stock images serve their own thumbnails
    } else if (base64Data) {
      // 1. Upload full-size image to Storage
      const storageRef = storage().ref(storagePath)
      await storageRef.putString(base64Data, 'base64', {
        contentType: artworkData.mimeType || 'image/png',
      })
      imageUrl = await storageRef.getDownloadURL()

      // 2. Generate and upload thumbnail
      try {
        const thumbnailData = await createThumbnailFromBase64(
          base64Data,
          artworkData.mimeType || 'image/png'
        )

        if (thumbnailData?.base64) {
          const thumbnailPath = `artwork/${artworkData.userId}/${folder}/thumb_${timestamp}.jpg`
          const thumbnailRef = storage().ref(thumbnailPath)
          await thumbnailRef.putString(thumbnailData.base64, 'base64', {
            contentType: 'image/jpeg',
          })
          thumbnailUrl = await thumbnailRef.getDownloadURL()
          console.log('[artworkService] Thumbnail generated and uploaded')
        } else {
          // Fallback to full-size if thumbnail generation fails
          thumbnailUrl = imageUrl
          console.log('[artworkService] Thumbnail generation failed, using full-size')
        }
      } catch (thumbError) {
        console.warn('[artworkService] Thumbnail upload error:', thumbError.message)
        thumbnailUrl = imageUrl // Fallback to full-size
      }
    } else {
      throw new Error('No image data provided')
    }

    // 3. Prepare document data
    const docData = {
      // Ownership
      userId: artworkData.userId,
      author: artworkData.author || {
        id: artworkData.userId,
        stageName: 'Unknown',
        profilePictureURL: null,
      },

      // Source & Type
      type: 'image',
      source: artworkData.source || 'generated',

      // Content URLs
      imageUrl,
      thumbnailUrl,
      originalUrl: artworkData.originalUrl || null,

      // Generation Metadata (for AI-generated)
      prompt: artworkData.prompt || null,
      model: artworkData.model || null,
      aspectRatio: artworkData.aspectRatio || '1:1',
      style: artworkData.style || null,

      // Stock Metadata (for stock images)
      stockId: artworkData.stockMetadata?.id || null,
      photographer: artworkData.stockMetadata?.photographer || null,
      photographerUrl: artworkData.stockMetadata?.photographerUrl || null,
      sourceUrl: artworkData.stockMetadata?.sourceUrl || null,
      avgColor: artworkData.stockMetadata?.avgColor || null,

      // Usage Tracking
      usedAs: {
        songCovers: [],
        profilePicture: false,
        bandImages: [],
        feedPosts: [],
      },

      // Visibility & Stats
      isPublic: false,
      viewCount: 0,
      downloadCount: 0,

      // Timestamps
      createdAt: now,
      updatedAt: now,

      // Tags
      tags: artworkData.tags || [],
      generatedTags: [],
    }

    // 4. Save to global artwork collection
    const docRef = await artworkRef.add(docData)

    // 5. Save to user's artwork subcollection (minimal data for list display)
    await userArtworkRef(artworkData.userId).doc(docRef.id).set({
      id: docRef.id,
      type: 'image',
      source: artworkData.source || 'generated',
      imageUrl,
      thumbnailUrl,
      aspectRatio: artworkData.aspectRatio || '1:1',
      prompt: artworkData.prompt || null,
      photographer: artworkData.stockMetadata?.photographer || null,
      usedAs: docData.usedAs,
      createdAt: now,
    })

    console.log('[artworkService] Saved artwork:', docRef.id)

    return {
      success: true,
      artworkId: docRef.id,
      imageUrl,
      thumbnailUrl,
    }
  } catch (error) {
    console.error('[artworkService] Save error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get a single artwork by ID
 * @param {string} artworkId - Artwork document ID
 * @returns {Promise<{success: boolean, artwork?: Object, error?: string}>}
 */
export const getArtwork = async (artworkId) => {
  try {
    const doc = await artworkRef.doc(artworkId).get()

    if (!doc.exists) {
      return { success: false, error: 'Artwork not found' }
    }

    return {
      success: true,
      artwork: { id: doc.id, ...doc.data() },
    }
  } catch (error) {
    console.error('[artworkService] Get error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Subscribe to user's artwork collection
 * @param {string} userId - User ID
 * @param {function} onUpdate - Callback with artwork array
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserArtwork = (userId, onUpdate) => {
  if (!userId) {
    onUpdate([])
    return () => {}
  }

  return userArtworkRef(userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        const artwork = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        onUpdate(artwork)
      },
      (error) => {
        console.error('[artworkService] Subscription error:', error)
        onUpdate([])
      }
    )
}

/**
 * Get user's artwork (one-time fetch)
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results
 * @param {string} options.source - Filter by source
 * @returns {Promise<{success: boolean, artwork?: Array, error?: string}>}
 */
export const getUserArtwork = async (userId, options = {}) => {
  try {
    let query = userArtworkRef(userId).orderBy('createdAt', 'desc')

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const snapshot = await query.get()
    const artwork = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Filter by source if specified
    const filtered = options.source
      ? artwork.filter((a) => a.source === options.source)
      : artwork

    return { success: true, artwork: filtered }
  } catch (error) {
    console.error('[artworkService] Get user artwork error:', error)
    return { success: false, error: error.message, artwork: [] }
  }
}

/**
 * Apply artwork to a song as cover
 * @param {string} artworkId - Artwork document ID
 * @param {string} songId - Song document ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const applyArtworkToSong = async (artworkId, songId, userId) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()

    // Get artwork data
    const artworkDoc = await artworkRef.doc(artworkId).get()
    if (!artworkDoc.exists) {
      return { success: false, error: 'Artwork not found' }
    }

    const artworkData = artworkDoc.data()

    // Update song with new cover
    await db.collection('songs').doc(songId).update({
      imageUrl: artworkData.imageUrl,
      coverArtwork: {
        artworkId,
        source: artworkData.source,
        appliedAt: now,
      },
      updatedAt: now,
    })

    // Also update user's songs subcollection
    await db
      .collection('users')
      .doc(userId)
      .collection('songs')
      .doc(songId)
      .update({
        imageUrl: artworkData.imageUrl,
        updatedAt: now,
      })

    // Update artwork usedAs tracking
    await artworkRef.doc(artworkId).update({
      'usedAs.songCovers': firestore.FieldValue.arrayUnion(songId),
      updatedAt: now,
    })

    // Update user's artwork subcollection
    await userArtworkRef(userId).doc(artworkId).update({
      'usedAs.songCovers': firestore.FieldValue.arrayUnion(songId),
    })

    console.log('[artworkService] Applied artwork to song:', songId)
    return { success: true }
  } catch (error) {
    console.error('[artworkService] Apply to song error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Apply artwork as profile picture
 * @param {string} artworkId - Artwork document ID
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const applyArtworkAsProfilePicture = async (artworkId, userId) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()

    // Get artwork data
    const artworkDoc = await artworkRef.doc(artworkId).get()
    if (!artworkDoc.exists) {
      return { success: false, error: 'Artwork not found' }
    }

    const artworkData = artworkDoc.data()

    // Update user's profile picture
    await db.collection('users').doc(userId).update({
      profilePictureURL: artworkData.imageUrl,
      updatedAt: now,
    })

    // Reset previous profile picture artwork
    const previousArtwork = await artworkRef
      .where('userId', '==', userId)
      .where('usedAs.profilePicture', '==', true)
      .get()

    const batch = db.batch()
    previousArtwork.docs.forEach((doc) => {
      batch.update(artworkRef.doc(doc.id), {
        'usedAs.profilePicture': false,
      })
      batch.update(userArtworkRef(userId).doc(doc.id), {
        'usedAs.profilePicture': false,
      })
    })
    await batch.commit()

    // Set new artwork as profile picture
    await artworkRef.doc(artworkId).update({
      'usedAs.profilePicture': true,
      updatedAt: now,
    })

    await userArtworkRef(userId).doc(artworkId).update({
      'usedAs.profilePicture': true,
    })

    console.log('[artworkService] Applied artwork as profile picture')
    return { success: true }
  } catch (error) {
    console.error('[artworkService] Apply as profile picture error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Apply artwork to a band/channel
 * @param {string} artworkId - Artwork document ID
 * @param {string} bandId - Band/Channel document ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const applyArtworkToBand = async (artworkId, bandId, userId) => {
  try {
    const now = firestore.FieldValue.serverTimestamp()

    // Get artwork data
    const artworkDoc = await artworkRef.doc(artworkId).get()
    if (!artworkDoc.exists) {
      return { success: false, error: 'Artwork not found' }
    }

    const artworkData = artworkDoc.data()

    // Update band with new image
    await db.collection('channels').doc(bandId).update({
      imageUrl: artworkData.imageUrl,
      bandArtwork: {
        artworkId,
        source: artworkData.source,
        appliedAt: now,
      },
      updatedAt: now,
    })

    // Update artwork usedAs tracking
    await artworkRef.doc(artworkId).update({
      'usedAs.bandImages': firestore.FieldValue.arrayUnion(bandId),
      updatedAt: now,
    })

    await userArtworkRef(userId).doc(artworkId).update({
      'usedAs.bandImages': firestore.FieldValue.arrayUnion(bandId),
    })

    console.log('[artworkService] Applied artwork to band:', bandId)
    return { success: true }
  } catch (error) {
    console.error('[artworkService] Apply to band error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete artwork
 * @param {string} artworkId - Artwork document ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteArtwork = async (artworkId, userId) => {
  try {
    const doc = await artworkRef.doc(artworkId).get()

    if (!doc.exists) {
      return { success: false, error: 'Artwork not found' }
    }

    const artworkData = doc.data()

    // Authorization check
    if (artworkData.userId !== userId) {
      return { success: false, error: 'Not authorized to delete this artwork' }
    }

    // Check if artwork is in use
    const { usedAs } = artworkData
    if (
      usedAs?.songCovers?.length > 0 ||
      usedAs?.profilePicture ||
      usedAs?.bandImages?.length > 0
    ) {
      return {
        success: false,
        error: 'Cannot delete artwork that is currently in use',
      }
    }

    // Delete from Storage
    const imageUrl = artworkData.imageUrl
    if (imageUrl?.includes('firebasestorage.googleapis.com')) {
      try {
        await storage().refFromURL(imageUrl).delete()
      } catch (storageError) {
        console.warn(
          '[artworkService] Could not delete from storage:',
          storageError.message
        )
      }
    }

    // Delete from Firestore
    await artworkRef.doc(artworkId).delete()
    await userArtworkRef(userId).doc(artworkId).delete()

    console.log('[artworkService] Deleted artwork:', artworkId)
    return { success: true }
  } catch (error) {
    console.error('[artworkService] Delete error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update artwork metadata
 * @param {string} artworkId - Artwork document ID
 * @param {string} userId - User ID (for authorization)
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateArtwork = async (artworkId, userId, updates) => {
  try {
    const doc = await artworkRef.doc(artworkId).get()

    if (!doc.exists) {
      return { success: false, error: 'Artwork not found' }
    }

    if (doc.data().userId !== userId) {
      return { success: false, error: 'Not authorized' }
    }

    const now = firestore.FieldValue.serverTimestamp()

    // Only allow certain fields to be updated
    const allowedUpdates = {
      isPublic: updates.isPublic,
      tags: updates.tags,
    }

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(
      (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    )

    await artworkRef.doc(artworkId).update({
      ...allowedUpdates,
      updatedAt: now,
    })

    return { success: true }
  } catch (error) {
    console.error('[artworkService] Update error:', error)
    return { success: false, error: error.message }
  }
}

export default {
  saveArtwork,
  getArtwork,
  subscribeToUserArtwork,
  getUserArtwork,
  applyArtworkToSong,
  applyArtworkAsProfilePicture,
  applyArtworkToBand,
  deleteArtwork,
  updateArtwork,
}
