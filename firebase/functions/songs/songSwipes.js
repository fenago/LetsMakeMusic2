const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * Swipe on a song (like or pass)
 * Records the user's decision and updates counters
 */
exports.swipeSong = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { songId, action, songData } = data

  if (!songId) {
    throw new functions.https.HttpsError('invalid-argument', 'Song ID is required')
  }

  const validActions = ['like', 'pass']
  if (!validActions.includes(action)) {
    throw new functions.https.HttpsError('invalid-argument', 'Action must be "like" or "pass"')
  }

  try {
    const swipeRef = db.collection('song_swipes').doc(userId).collection('swipes').doc(songId)
    const existingSwipe = await swipeRef.get()

    // Check if already swiped
    if (existingSwipe.exists) {
      const oldAction = existingSwipe.data().action
      if (oldAction === action) {
        // Same action - no change needed
        return { success: true, action, message: 'Already swiped' }
      }

      // Changing swipe (e.g., pass -> like)
      await swipeRef.update({
        action,
        swipedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Update song stats
      const songRef = db.collection('songs').doc(songId)
      const incrementField = action === 'like' ? 'likeCount' : 'passCount'
      const decrementField = action === 'like' ? 'passCount' : 'likeCount'

      await songRef.set({
        swipeStats: {
          [incrementField]: admin.firestore.FieldValue.increment(1),
          [decrementField]: admin.firestore.FieldValue.increment(-1),
        }
      }, { merge: true })

      // Update user stats
      await db.collection('song_swipes').doc(userId).set({
        [`total${action === 'like' ? 'Likes' : 'Passes'}`]: admin.firestore.FieldValue.increment(1),
        [`total${action === 'like' ? 'Passes' : 'Likes'}`]: admin.firestore.FieldValue.increment(-1),
        lastSwipedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })

      console.log(`[swipeSong] User ${userId} changed swipe on song ${songId} from ${oldAction} to ${action}`)
      return { success: true, action, changed: true }
    }

    // New swipe
    const swipeData = {
      action,
      swipedAt: admin.firestore.FieldValue.serverTimestamp(),
      songId,
    }

    // Denormalize song data for fast retrieval of liked songs
    if (songData) {
      swipeData.songData = {
        title: songData.title || '',
        artist: songData.artist || songData.authorName || '',
        coverUrl: songData.coverUrl || songData.thumbnailURL || songData.coverImageURL || '',
        audioUrl: songData.audioUrl || songData.audioURL || '',
        authorID: songData.authorID || '',
      }
    }

    await swipeRef.set(swipeData)

    // Update song stats
    const songRef = db.collection('songs').doc(songId)
    const incrementField = action === 'like' ? 'likeCount' : 'passCount'
    await songRef.set({
      swipeStats: {
        [incrementField]: admin.firestore.FieldValue.increment(1),
      }
    }, { merge: true })

    // Update user stats
    await db.collection('song_swipes').doc(userId).set({
      [`total${action === 'like' ? 'Likes' : 'Passes'}`]: admin.firestore.FieldValue.increment(1),
      lastSwipedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    console.log(`[swipeSong] User ${userId} swiped ${action} on song ${songId}`)
    return { success: true, action }
  } catch (error) {
    console.error('[swipeSong] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Fetch user's liked songs with pagination
 * Returns songs the user has liked, sorted by most recent
 */
exports.fetchLikedSongs = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { limit = 50, lastSongId } = data

  try {
    let query = db
      .collection('song_swipes')
      .doc(userId)
      .collection('swipes')
      .where('action', '==', 'like')
      .orderBy('swipedAt', 'desc')
      .limit(limit)

    if (lastSongId) {
      const lastDoc = await db
        .collection('song_swipes')
        .doc(userId)
        .collection('swipes')
        .doc(lastSongId)
        .get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    const snapshot = await query.get()
    const likedSongs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`[fetchLikedSongs] Returning ${likedSongs.length} liked songs for user ${userId}`)
    return { songs: likedSongs, success: true }
  } catch (error) {
    console.error('[fetchLikedSongs] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Fetch IDs of songs the user has already swiped on
 * Used to exclude these songs from discovery feed
 */
exports.fetchSwipedSongIds = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { limit = 1000 } = data

  try {
    const snapshot = await db
      .collection('song_swipes')
      .doc(userId)
      .collection('swipes')
      .orderBy('swipedAt', 'desc')
      .limit(limit)
      .get()

    const swipedIds = snapshot.docs.map(doc => doc.id)

    console.log(`[fetchSwipedSongIds] Returning ${swipedIds.length} swiped song IDs for user ${userId}`)
    return { songIds: swipedIds, success: true }
  } catch (error) {
    console.error('[fetchSwipedSongIds] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Undo/remove a swipe on a song
 */
exports.undoSwipe = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { songId } = data

  if (!songId) {
    throw new functions.https.HttpsError('invalid-argument', 'Song ID is required')
  }

  try {
    const swipeRef = db.collection('song_swipes').doc(userId).collection('swipes').doc(songId)
    const swipeDoc = await swipeRef.get()

    if (!swipeDoc.exists) {
      return { success: true, message: 'No swipe to undo' }
    }

    const oldAction = swipeDoc.data().action

    // Delete the swipe
    await swipeRef.delete()

    // Update song stats
    const songRef = db.collection('songs').doc(songId)
    const decrementField = oldAction === 'like' ? 'likeCount' : 'passCount'
    await songRef.set({
      swipeStats: {
        [decrementField]: admin.firestore.FieldValue.increment(-1),
      }
    }, { merge: true })

    // Update user stats
    await db.collection('song_swipes').doc(userId).set({
      [`total${oldAction === 'like' ? 'Likes' : 'Passes'}`]: admin.firestore.FieldValue.increment(-1),
    }, { merge: true })

    console.log(`[undoSwipe] User ${userId} removed ${oldAction} swipe on song ${songId}`)
    return { success: true, removedAction: oldAction }
  } catch (error) {
    console.error('[undoSwipe] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Check if user has swiped on a specific song
 * Returns the swipe action if exists, null otherwise
 */
exports.checkSwipe = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { songId } = data

  if (!songId) {
    throw new functions.https.HttpsError('invalid-argument', 'Song ID is required')
  }

  try {
    const swipeRef = db.collection('song_swipes').doc(userId).collection('swipes').doc(songId)
    const swipeDoc = await swipeRef.get()

    if (!swipeDoc.exists) {
      return { hasSwipe: false, action: null, success: true }
    }

    const swipeData = swipeDoc.data()
    return { hasSwipe: true, action: swipeData.action, success: true }
  } catch (error) {
    console.error('[checkSwipe] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Get swipe stats for a user
 */
exports.getSwipeStats = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    const statsDoc = await db.collection('song_swipes').doc(userId).get()

    if (!statsDoc.exists) {
      return {
        stats: { totalLikes: 0, totalPasses: 0, lastSwipedAt: null },
        success: true
      }
    }

    return { stats: statsDoc.data(), success: true }
  } catch (error) {
    console.error('[getSwipeStats] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
