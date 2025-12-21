/**
 * Backfill Song Authors - Populate author data on existing songs
 *
 * This migration script:
 * 1. Gets all songs from the `songs` collection
 * 2. For each song with a `userId`, fetches the user profile from `users` collection
 * 3. Updates the song document with the `author` object containing:
 *    { id, stageName, bio, profilePictureURL, firstName, lastName }
 *
 * Usage:
 *   1. Deploy: firebase deploy --only functions:backfillSongAuthors,functions:backfillSongAuthorsHTTP
 *   2. Call via HTTP: https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/backfillSongAuthorsHTTP
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * Build author object from user document
 * This is the CANONICAL structure for author data on songs
 */
const buildAuthorFromUser = (userDoc) => {
  if (!userDoc || !userDoc.exists) {
    return null
  }

  const userData = userDoc.data()

  return {
    id: userDoc.id,
    stageName: userData.stageName || null,
    bio: userData.bio || null,
    profilePictureURL: userData.profilePictureURL || null,
    firstName: userData.firstName || null,
    lastName: userData.lastName || null,
  }
}

/**
 * Backfill author data on all songs
 * @param {boolean} forceRefresh - If true, update all songs even if they have author data
 */
const runBackfill = async (forceRefresh = false) => {
  console.log('=== STARTING SONG AUTHOR BACKFILL ===')
  console.log('Force refresh:', forceRefresh)

  const results = {
    totalSongs: 0,
    updated: 0,
    skipped: 0,
    noUserId: 0,
    userNotFound: 0,
    alreadyHasAuthor: 0,
    errors: [],
  }

  try {
    // Get all songs
    const songsSnapshot = await db.collection('songs').get()
    results.totalSongs = songsSnapshot.size
    console.log(`Found ${results.totalSongs} songs to process`)

    // Cache user lookups to avoid duplicate fetches
    const userCache = new Map()

    for (const songDoc of songsSnapshot.docs) {
      const song = songDoc.data()
      const songId = songDoc.id

      try {
        // Skip if no userId
        if (!song.userId) {
          console.log(`Song ${songId}: No userId, skipping`)
          results.noUserId++
          results.skipped++
          continue
        }

        // Skip if already has valid author data (unless force refresh)
        if (!forceRefresh && song.author && song.author.id && (song.author.stageName || song.author.firstName)) {
          console.log(`Song ${songId}: Already has author data, skipping`)
          results.alreadyHasAuthor++
          results.skipped++
          continue
        }

        // Get user from cache or fetch
        let userDoc = userCache.get(song.userId)
        if (!userDoc) {
          userDoc = await db.collection('users').doc(song.userId).get()
          userCache.set(song.userId, userDoc)
        }

        if (!userDoc.exists) {
          console.log(`Song ${songId}: User ${song.userId} not found`)
          results.userNotFound++
          results.skipped++
          continue
        }

        // Build author object
        const author = buildAuthorFromUser(userDoc)

        // Update song with author data
        await db.collection('songs').doc(songId).update({
          author: author,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        console.log(`Song ${songId}: Updated with author ${author.stageName || author.firstName}`)
        results.updated++

      } catch (error) {
        console.error(`Error processing song ${songId}:`, error)
        results.errors.push({
          songId,
          error: error.message,
        })
      }
    }

    console.log('=== BACKFILL COMPLETE ===')
    console.log('Results:', JSON.stringify(results, null, 2))

    return results

  } catch (error) {
    console.error('Fatal error during backfill:', error)
    throw error
  }
}

/**
 * Callable function version
 */
exports.backfillSongAuthors = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
    console.log('backfillSongAuthors called')

    try {
      const results = await runBackfill()

      return {
        success: true,
        message: `Backfill complete: ${results.updated} songs updated, ${results.skipped} skipped`,
        data: results,
      }
    } catch (error) {
      console.error('backfillSongAuthors error:', error)
      throw new functions.https.HttpsError('internal', error.message)
    }
  })

/**
 * HTTP endpoint version for easier testing
 * Add ?force=true to refresh all songs even if they have author data
 */
exports.backfillSongAuthorsHTTP = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: '1GB',
  })
  .https.onRequest(async (req, res) => {
    const forceRefresh = req.query.force === 'true'
    console.log('backfillSongAuthorsHTTP called, forceRefresh:', forceRefresh)

    try {
      const results = await runBackfill(forceRefresh)

      res.json({
        success: true,
        message: `Backfill complete: ${results.updated} songs updated, ${results.skipped} skipped`,
        data: results,
      })
    } catch (error) {
      console.error('backfillSongAuthorsHTTP error:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

/**
 * Utility function to get author data for a single user
 * Can be used by other parts of the app
 */
exports.getAuthorForUser = async (userId) => {
  if (!userId) return null

  const userDoc = await db.collection('users').doc(userId).get()
  return buildAuthorFromUser(userDoc)
}

/**
 * Export the author builder for use in other modules
 */
exports.buildAuthorFromUser = buildAuthorFromUser
