/**
 * Song Migration Script
 *
 * This script migrates songs that have:
 * 1. firebaseAudioUrl pointing to wrong bucket (development-69cdc)
 * 2. Missing firebaseAudioUrl but have a valid Suno audioUrl
 *
 * It downloads the audio from Suno CDN and re-uploads to the correct
 * Firebase Storage bucket (letsmakemusic-4e0fe).
 *
 * Usage:
 *   - As Cloud Function: Call migrateSongsToCorrectBucket endpoint
 *   - As HTTP endpoint: GET/POST to migrateSongsToCorrectBucketHTTP
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()
const storage = admin.storage()

// The CORRECT bucket - all songs should be here
const CORRECT_BUCKET = 'letsmakemusic-4e0fe.firebasestorage.app'
const WRONG_BUCKET_PATTERN = 'development-69cdc'

/**
 * Check if a firebaseAudioUrl points to the wrong bucket
 */
const isWrongBucket = (url) => {
  if (!url) return false
  return url.includes(WRONG_BUCKET_PATTERN)
}

/**
 * Get a playable URL from the song data
 * Priority: audioUrl (Suno CDN) -> streamUrl -> sunoId CDN fallback
 */
const getSourceUrl = (song) => {
  // First try Suno CDN URL directly
  if (song.audioUrl && song.audioUrl.includes('cdn')) {
    return song.audioUrl
  }

  // Try stream URL
  if (song.streamUrl && song.streamUrl.includes('cdn')) {
    return song.streamUrl
  }

  // Try to construct from sunoId
  if (song.sunoId) {
    return `https://cdn1.suno.ai/${song.sunoId}.mp3`
  }

  // Last resort - try audioUrl even if not CDN
  if (song.audioUrl) {
    return song.audioUrl
  }

  return null
}

/**
 * Download audio from URL and return buffer
 */
const downloadAudio = async (url) => {
  try {
    console.log(`Downloading audio from: ${url}`)
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 second timeout
      headers: {
        'User-Agent': 'LetsMakeMusic/1.0',
      },
    })
    console.log(`Downloaded ${response.data.length} bytes`)
    return Buffer.from(response.data)
  } catch (error) {
    console.error(`Failed to download audio: ${error.message}`)
    throw error
  }
}

/**
 * Upload audio buffer to Firebase Storage and return the download URL
 */
const uploadToFirebaseStorage = async (buffer, songId, userId) => {
  try {
    const bucket = storage.bucket()
    const fileName = `songs/${userId}/${songId}_${uuidv4()}.mp3`
    const file = bucket.file(fileName)

    console.log(`Uploading to Firebase Storage: ${fileName}`)

    await file.save(buffer, {
      metadata: {
        contentType: 'audio/mpeg',
        metadata: {
          firebaseStorageDownloadTokens: uuidv4(),
        },
      },
    })

    // Make the file publicly readable
    await file.makePublic()

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`
    console.log(`Uploaded successfully: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error(`Failed to upload to Firebase Storage: ${error.message}`)
    throw error
  }
}

/**
 * Update the song document with the new firebaseAudioUrl
 */
const updateSongFirebaseUrl = async (songId, newFirebaseUrl) => {
  try {
    await db.collection('songs').doc(songId).update({
      firebaseAudioUrl: newFirebaseUrl,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    console.log(`Updated song ${songId} with new firebaseAudioUrl`)
  } catch (error) {
    console.error(`Failed to update song ${songId}: ${error.message}`)
    throw error
  }
}

/**
 * Process a single song - download and re-upload if needed
 */
const processSong = async (song) => {
  const result = {
    songId: song.id,
    title: song.title,
    status: 'skipped',
    reason: '',
  }

  try {
    // Check if song needs migration
    const hasWrongBucket = isWrongBucket(song.firebaseAudioUrl)
    const hasMissingFirebaseUrl = !song.firebaseAudioUrl

    if (!hasWrongBucket && !hasMissingFirebaseUrl) {
      result.reason = 'Already has correct firebaseAudioUrl'
      return result
    }

    // Get source URL to download from
    const sourceUrl = getSourceUrl(song)
    if (!sourceUrl) {
      result.status = 'error'
      result.reason = 'No source URL available (no audioUrl, streamUrl, or sunoId)'
      return result
    }

    // Download the audio
    const audioBuffer = await downloadAudio(sourceUrl)

    // Upload to correct Firebase Storage bucket
    const userId = song.authorID || song.userId || 'unknown'
    const newFirebaseUrl = await uploadToFirebaseStorage(audioBuffer, song.id, userId)

    // Update Firestore document
    await updateSongFirebaseUrl(song.id, newFirebaseUrl)

    result.status = 'migrated'
    result.reason = hasWrongBucket ? 'Fixed wrong bucket' : 'Added missing firebaseAudioUrl'
    result.newUrl = newFirebaseUrl
    result.sourceUrl = sourceUrl

  } catch (error) {
    result.status = 'error'
    result.reason = error.message
  }

  return result
}

/**
 * Get all songs that need migration
 */
const getSongsNeedingMigration = async () => {
  const songsSnapshot = await db.collection('songs').get()
  const songs = []

  songsSnapshot.forEach(doc => {
    const song = { id: doc.id, ...doc.data() }

    // Check if needs migration
    const hasWrongBucket = isWrongBucket(song.firebaseAudioUrl)
    const hasMissingFirebaseUrl = !song.firebaseAudioUrl

    if (hasWrongBucket || hasMissingFirebaseUrl) {
      songs.push(song)
    }
  })

  return songs
}

/**
 * Main migration function - callable Cloud Function
 */
exports.migrateSongsToCorrectBucket = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
    console.log('Starting song migration...')

    const dryRun = data?.dryRun === true
    const limit = data?.limit || 100 // Process max 100 songs per call

    const results = {
      dryRun,
      totalSongs: 0,
      processed: 0,
      migrated: 0,
      errors: 0,
      skipped: 0,
      details: [],
    }

    try {
      // Get songs needing migration
      let songs = await getSongsNeedingMigration()
      results.totalSongs = songs.length

      console.log(`Found ${songs.length} songs needing migration`)

      // Apply limit
      if (songs.length > limit) {
        console.log(`Limiting to first ${limit} songs`)
        songs = songs.slice(0, limit)
      }

      // Process each song
      for (const song of songs) {
        console.log(`Processing song: ${song.id} - ${song.title}`)

        if (dryRun) {
          const sourceUrl = getSourceUrl(song)
          results.details.push({
            songId: song.id,
            title: song.title,
            status: 'would_migrate',
            sourceUrl,
            currentFirebaseUrl: song.firebaseAudioUrl || null,
          })
          results.processed++
          continue
        }

        const result = await processSong(song)
        results.details.push(result)
        results.processed++

        if (result.status === 'migrated') {
          results.migrated++
        } else if (result.status === 'error') {
          results.errors++
        } else {
          results.skipped++
        }

        // Small delay between songs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log(`Migration complete: ${results.migrated} migrated, ${results.errors} errors, ${results.skipped} skipped`)

    } catch (error) {
      console.error('Migration failed:', error)
      results.error = error.message
    }

    return results
  })

/**
 * HTTP endpoint version for easy testing
 */
exports.migrateSongsToCorrectBucketHTTP = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB',
  })
  .https.onRequest(async (req, res) => {
    console.log('Starting song migration (HTTP)...')

    const dryRun = req.query.dryRun === 'true' || req.query.dryRun === '1'
    const limit = parseInt(req.query.limit) || 100

    const results = {
      dryRun,
      totalSongs: 0,
      processed: 0,
      migrated: 0,
      errors: 0,
      skipped: 0,
      details: [],
    }

    try {
      // Get songs needing migration
      let songs = await getSongsNeedingMigration()
      results.totalSongs = songs.length

      console.log(`Found ${songs.length} songs needing migration`)

      // Apply limit
      if (songs.length > limit) {
        console.log(`Limiting to first ${limit} songs`)
        songs = songs.slice(0, limit)
      }

      // Process each song
      for (const song of songs) {
        console.log(`Processing song: ${song.id} - ${song.title}`)

        if (dryRun) {
          const sourceUrl = getSourceUrl(song)
          results.details.push({
            songId: song.id,
            title: song.title,
            status: 'would_migrate',
            sourceUrl,
            currentFirebaseUrl: song.firebaseAudioUrl || null,
          })
          results.processed++
          continue
        }

        const result = await processSong(song)
        results.details.push(result)
        results.processed++

        if (result.status === 'migrated') {
          results.migrated++
        } else if (result.status === 'error') {
          results.errors++
        } else {
          results.skipped++
        }

        // Small delay between songs
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log(`Migration complete: ${results.migrated} migrated, ${results.errors} errors, ${results.skipped} skipped`)

    } catch (error) {
      console.error('Migration failed:', error)
      results.error = error.message
    }

    res.json(results)
  })
