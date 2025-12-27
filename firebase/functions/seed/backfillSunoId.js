/**
 * Backfill Suno ID - Populate sunoId on existing songs
 *
 * This migration script:
 * 1. Gets all songs from the `songs` collection that are missing `sunoId`
 * 2. Attempts to find the sunoId from audio URLs (Suno URLs contain the ID)
 * 3. Updates the song document with the found `sunoId`
 *
 * Suno audio URLs typically look like:
 *   https://cdn1.suno.ai/{sunoId}.mp3
 *   https://cdn.suno.ai/{sunoId}.mp3
 *
 * Usage:
 *   1. Deploy: firebase deploy --only functions:backfillSunoId,functions:backfillSunoIdHTTP
 *   2. Call via HTTP: https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/backfillSunoIdHTTP
 *   3. Add ?dryRun=true to see what would be updated without making changes
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * Extract Suno ID from a Suno audio URL
 * @param {string} url - URL to extract ID from
 * @returns {string|null} - Suno ID or null
 */
const extractSunoIdFromUrl = (url) => {
  if (!url) return null

  // Pattern 1: https://cdn1.suno.ai/{id}.mp3
  // Pattern 2: https://cdn.suno.ai/{id}.mp3
  // Pattern 3: https://audiopipe.suno.ai/?item_id={id}
  const patterns = [
    /cdn\d*\.suno\.ai\/([a-f0-9-]{36})\.mp3/i,
    /cdn\.suno\.ai\/([a-f0-9-]{36})\.mp3/i,
    /audiopipe\.suno\.ai\/\?item_id=([a-f0-9-]{36})/i,
    /suno\.ai\/[^/]+\/([a-f0-9-]{36})/i,
    // Also check for UUID pattern anywhere in URL as fallback
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  // Fallback: Look for any UUID in the URL
  const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
  const uuidMatch = url.match(uuidPattern)
  if (uuidMatch) {
    return uuidMatch[1]
  }

  return null
}

/**
 * Check if a value looks like a valid Suno ID (UUID format)
 */
const isValidSunoId = (id) => {
  if (!id) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Run the backfill process
 * @param {boolean} dryRun - If true, don't make changes, just report
 */
const runBackfill = async (dryRun = false) => {
  console.log('=== STARTING SUNO ID BACKFILL ===')
  console.log('Dry run:', dryRun)

  const results = {
    totalSongs: 0,
    alreadyHasSunoId: 0,
    updated: 0,
    couldNotExtract: [],
    errors: [],
  }

  try {
    // Get all songs
    const songsSnapshot = await db.collection('songs').get()
    results.totalSongs = songsSnapshot.size
    console.log(`Found ${results.totalSongs} songs to check`)

    for (const songDoc of songsSnapshot.docs) {
      const song = songDoc.data()
      const songId = songDoc.id

      try {
        // Skip if already has valid sunoId
        if (song.sunoId && isValidSunoId(song.sunoId)) {
          results.alreadyHasSunoId++
          continue
        }

        // Try to extract sunoId from various URL fields
        const urlsToCheck = [
          song.audioUrl,
          song.streamUrl,
          song.sourceAudioUrl,
          song.sourceStreamUrl,
          song.firebaseAudioUrl,
        ].filter(Boolean)

        let extractedId = null
        for (const url of urlsToCheck) {
          extractedId = extractSunoIdFromUrl(url)
          if (extractedId) {
            console.log(`Song ${songId}: Found sunoId ${extractedId} in URL: ${url.substring(0, 50)}...`)
            break
          }
        }

        if (!extractedId) {
          console.log(`Song ${songId} (${song.title}): Could not extract sunoId from URLs`)
          results.couldNotExtract.push({
            songId,
            title: song.title,
            urls: urlsToCheck.map(u => u?.substring(0, 80)),
          })
          continue
        }

        // Update the song with the extracted sunoId
        if (!dryRun) {
          await db.collection('songs').doc(songId).update({
            sunoId: extractedId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          console.log(`Song ${songId}: Updated sunoId to ${extractedId}`)
        } else {
          console.log(`Song ${songId}: Would update sunoId to ${extractedId} (dry run)`)
        }

        results.updated++

      } catch (error) {
        console.error(`Error processing song ${songId}:`, error)
        results.errors.push({
          songId,
          title: song.title,
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
exports.backfillSunoId = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
    console.log('backfillSunoId called')

    try {
      const results = await runBackfill(data?.dryRun === true)

      return {
        success: true,
        message: `Backfill complete: ${results.updated} songs updated, ${results.alreadyHasSunoId} already had sunoId`,
        data: results,
      }
    } catch (error) {
      console.error('backfillSunoId error:', error)
      throw new functions.https.HttpsError('internal', error.message)
    }
  })

/**
 * HTTP endpoint version for easier testing
 * Add ?dryRun=true to preview changes without applying them
 */
exports.backfillSunoIdHTTP = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB',
  })
  .https.onRequest(async (req, res) => {
    const dryRun = req.query.dryRun === 'true'
    console.log('backfillSunoIdHTTP called, dryRun:', dryRun)

    try {
      const results = await runBackfill(dryRun)

      res.json({
        success: true,
        dryRun,
        message: dryRun
          ? `DRY RUN: Would update ${results.updated} songs`
          : `Backfill complete: ${results.updated} songs updated`,
        data: results,
      })
    } catch (error) {
      console.error('backfillSunoIdHTTP error:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

/**
 * Utility: Check a single song for sunoId and report status
 */
exports.checkSongSunoId = functions.https.onRequest(async (req, res) => {
  const { songId } = req.query

  if (!songId) {
    return res.status(400).json({ error: 'songId query param required' })
  }

  try {
    const songDoc = await db.collection('songs').doc(songId).get()
    if (!songDoc.exists) {
      return res.status(404).json({ error: 'Song not found' })
    }

    const song = songDoc.data()
    const urls = {
      audioUrl: song.audioUrl,
      streamUrl: song.streamUrl,
      sourceAudioUrl: song.sourceAudioUrl,
      firebaseAudioUrl: song.firebaseAudioUrl,
    }

    const result = {
      songId,
      title: song.title,
      currentSunoId: song.sunoId || null,
      isValidSunoId: isValidSunoId(song.sunoId),
      urls,
      extractedFromUrls: {},
    }

    // Try to extract from each URL
    for (const [key, url] of Object.entries(urls)) {
      if (url) {
        result.extractedFromUrls[key] = extractSunoIdFromUrl(url)
      }
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
