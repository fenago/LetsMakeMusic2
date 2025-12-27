/**
 * Make all audio files in Firebase Storage publicly accessible
 * and update song documents with correct public URLs
 */

const admin = require('firebase-admin')
const functions = require('firebase-functions')

const db = admin.firestore()
const STORAGE_BUCKET = 'letsmakemusic-4e0fe.firebasestorage.app'

/**
 * Make all audio files public and update song URLs
 */
exports.makeAudioFilesPublicHTTP = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    try {
      const bucket = admin.storage().bucket(STORAGE_BUCKET)
      const results = {
        processed: 0,
        madePublic: 0,
        updatedSongs: 0,
        errors: [],
      }

      // List all files in the bucket
      const [files] = await bucket.getFiles()
      console.log(`Found ${files.length} files in bucket`)

      for (const file of files) {
        results.processed++
        const fileName = file.name

        // Only process audio files
        if (!fileName.endsWith('.mp3') && !fileName.endsWith('.m4a') && !fileName.endsWith('.wav')) {
          continue
        }

        console.log(`Processing: ${fileName}`)

        try {
          // Make file public
          await file.makePublic()
          results.madePublic++

          // Get the public URL
          const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${fileName}`

          // Find and update any song documents that reference this file
          // Check for both old-style URLs
          const oldUrl1 = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(fileName)}?alt=media`
          const oldUrl2 = `https://firebasestorage.googleapis.com/v0/b/letsmakemusic-4e0fe.firebasestorage.app/o/${encodeURIComponent(fileName)}?alt=media`

          // Query songs that might have this file
          const songsSnapshot = await db.collection('songs')
            .where('firebaseAudioUrl', 'in', [oldUrl1, oldUrl2, publicUrl])
            .get()

          for (const doc of songsSnapshot.docs) {
            const song = doc.data()
            if (song.firebaseAudioUrl !== publicUrl) {
              await doc.ref.update({
                firebaseAudioUrl: publicUrl,
              })
              results.updatedSongs++
              console.log(`Updated song ${doc.id} with new URL`)
            }
          }
        } catch (error) {
          results.errors.push({ file: fileName, error: error.message })
        }
      }

      // Also fix any songs with old-style firebaseAudioUrl format
      console.log('Checking for songs with old URL format...')
      const oldFormatSongs = await db.collection('songs')
        .where('firebaseAudioUrl', '>=', 'https://firebasestorage.googleapis.com')
        .where('firebaseAudioUrl', '<', 'https://firebasestorage.googleapis.comz')
        .get()

      for (const doc of oldFormatSongs.docs) {
        const song = doc.data()
        const oldUrl = song.firebaseAudioUrl

        // Extract filename from old URL
        // Format: https://firebasestorage.googleapis.com/v0/b/bucket/o/filename?alt=media
        const match = oldUrl.match(/\/o\/([^?]+)/)
        if (match) {
          const encodedFileName = match[1]
          const fileName = decodeURIComponent(encodedFileName)
          const newUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${fileName}`

          try {
            // Make sure file is public
            const file = bucket.file(fileName)
            const [exists] = await file.exists()
            if (exists) {
              await file.makePublic()
              await doc.ref.update({ firebaseAudioUrl: newUrl })
              results.updatedSongs++
              console.log(`Fixed song ${doc.id}: ${fileName}`)
            }
          } catch (error) {
            results.errors.push({ songId: doc.id, error: error.message })
          }
        }
      }

      res.json({
        success: true,
        results,
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
