/**
 * LetsMakeMusic - Add Song Rights Migration Script
 *
 * Migrates all existing songs to include the new rights schema.
 * Sets default rights for all songs that don't have them.
 *
 * Usage:
 *   1. Deploy this function: firebase deploy --only functions:addSongRights
 *   2. Call via HTTP: https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/addSongRights
 *
 * Or run locally:
 *   cd firebase/functions && node -e "require('./seed/addSongRights').runMigration()"
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

// ============================================
// DEFAULT SONG RIGHTS SCHEMA
// Must match ReactNativeTikTokApp/src/constants/songRights.js
// ============================================

const VISIBILITY = {
  PRIVATE: 'private',
  SHARED: 'shared',
  PUBLIC: 'public',
}

const DEFAULT_SONG_RIGHTS = {
  // === VISIBILITY ===
  visibility: VISIBILITY.PUBLIC,
  sharedWith: [],

  // === MONETIZATION ===
  monetized: false,
  price: 0,
  allowTipping: true,

  // === DERIVATIVE WORK RIGHTS ===
  allowExtend: true,
  allowStemExtraction: false,
  allowWavExport: false,
  allowLyricsUse: true,
  allowReinterpret: false,
  allowSampling: false,
  allowPersonaCreation: false,
  allowVideoCreation: true,

  // === ATTRIBUTION & CREDIT ===
  requireAttribution: true,
  attributionText: '',

  // === COMMERCIAL USE ===
  allowCommercialUse: false,
  commercialLicenseFee: 0,
}

// ============================================
// MIGRATION FUNCTION
// ============================================

/**
 * Add default rights to all songs that don't have them
 */
async function migrateAllSongs() {
  console.log('Starting song rights migration...')

  const songsRef = db.collection('songs')
  const snapshot = await songsRef.get()

  if (snapshot.empty) {
    console.log('No songs found in database')
    return { success: true, migratedCount: 0, skippedCount: 0 }
  }

  console.log(`Found ${snapshot.size} songs to process`)

  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0
  const errors = []

  // Process in batches of 500 (Firestore limit)
  const batchSize = 500
  let batch = db.batch()
  let batchCount = 0

  for (const doc of snapshot.docs) {
    const songData = doc.data()

    // Skip if song already has rights
    if (songData.rights && Object.keys(songData.rights).length > 0) {
      console.log(`Skipping song ${doc.id} - already has rights`)
      skippedCount++
      continue
    }

    try {
      // Determine visibility from legacy isPublic field
      let visibility = VISIBILITY.PUBLIC // Default for existing songs
      if (songData.isPublic === false) {
        visibility = VISIBILITY.PRIVATE
      } else if (songData.isPublic === true) {
        visibility = VISIBILITY.PUBLIC
      }

      // Create rights object with defaults, respecting existing visibility
      const rights = {
        ...DEFAULT_SONG_RIGHTS,
        visibility: visibility,
      }

      // Add to batch
      batch.update(doc.ref, {
        rights: rights,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      batchCount++
      migratedCount++

      console.log(`Queued song ${doc.id} (${songData.title || 'Untitled'}) for migration`)

      // Commit batch when it reaches the limit
      if (batchCount >= batchSize) {
        console.log(`Committing batch of ${batchCount} songs...`)
        await batch.commit()
        batch = db.batch()
        batchCount = 0
      }
    } catch (error) {
      console.error(`Error processing song ${doc.id}:`, error.message)
      errorCount++
      errors.push({ songId: doc.id, error: error.message })
    }
  }

  // Commit any remaining songs in the batch
  if (batchCount > 0) {
    console.log(`Committing final batch of ${batchCount} songs...`)
    await batch.commit()
  }

  console.log('Migration complete!')
  console.log(`  Migrated: ${migratedCount}`)
  console.log(`  Skipped (already had rights): ${skippedCount}`)
  console.log(`  Errors: ${errorCount}`)

  return {
    success: true,
    migratedCount,
    skippedCount,
    errorCount,
    errors: errors.slice(0, 10), // Return first 10 errors
  }
}

// ============================================
// CLOUD FUNCTION
// ============================================

const addSongRights = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540, // 9 minutes (max for HTTP functions)
    memory: '1GB',
  })
  .https.onRequest(async (req, res) => {
    // Only allow POST or GET for simplicity
    if (req.method !== 'POST' && req.method !== 'GET') {
      res.status(405).send('Method Not Allowed')
      return
    }

    try {
      console.log('Song rights migration triggered via HTTP')
      const result = await migrateAllSongs()

      res.status(200).json({
        message: 'Song rights migration completed',
        ...result,
      })
    } catch (error) {
      console.error('Migration failed:', error)
      res.status(500).json({
        error: 'Migration failed',
        message: error.message,
      })
    }
  })

// ============================================
// LOCAL EXECUTION HELPER
// ============================================

/**
 * Run migration locally (for testing)
 * Usage: cd firebase/functions && node -e "require('./seed/addSongRights').runMigration()"
 */
async function runMigration() {
  try {
    const result = await migrateAllSongs()
    console.log('Migration result:', JSON.stringify(result, null, 2))
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

module.exports = {
  addSongRights,
  migrateAllSongs,
  runMigration,
  DEFAULT_SONG_RIGHTS,
  VISIBILITY,
}
