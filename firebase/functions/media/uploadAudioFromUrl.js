const admin = require('firebase-admin')
const functions = require('firebase-functions')
const https = require('https')
const http = require('http')
const path = require('path')
const os = require('os')
const fs = require('fs')

const db = admin.firestore()
const STORAGE_BUCKET = 'letsmakemusic-4e0fe.firebasestorage.app'

/**
 * Upload audio from a remote URL to Firebase Storage
 * Used to backup Suno-generated audio files to ensure permanent storage
 */
exports.uploadAudioFromUrl = functions
  .runWith({
    timeoutSeconds: 120, // 2 minutes for audio files
    memory: '512MB',
  })
  .https.onCall(async (data, context) => {
    const { audioUrl, songId, sunoId, userId } = data

    // Validate inputs
    if (!audioUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Audio URL is required')
    }
    if (!songId) {
      throw new functions.https.HttpsError('invalid-argument', 'Song ID is required')
    }
    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required')
    }

    console.log(`[uploadAudioFromUrl] Starting download for song ${songId}`)
    console.log(`[uploadAudioFromUrl] URL: ${audioUrl}`)

    try {
      // Generate unique filename using sunoId if available, otherwise songId
      const fileId = sunoId || songId
      const timestamp = Date.now()
      const audioFileName = `audio/${userId}/${fileId}_${timestamp}.mp3`
      const tempFilePath = path.join(os.tmpdir(), `${fileId}_${timestamp}.mp3`)

      // Download audio to temp file
      await downloadFile(audioUrl, tempFilePath)
      console.log(`[uploadAudioFromUrl] Downloaded to ${tempFilePath}`)

      // Get file size
      const stats = fs.statSync(tempFilePath)
      console.log(`[uploadAudioFromUrl] File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket(STORAGE_BUCKET)
      await bucket.upload(tempFilePath, {
        destination: audioFileName,
        resumable: true,
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            songId,
            sunoId: sunoId || null,
            userId,
            originalUrl: audioUrl,
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      // Make file publicly readable
      const file = bucket.file(audioFileName)
      await file.makePublic()

      // Construct the public URL
      const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${audioFileName}`
      console.log(`[uploadAudioFromUrl] Uploaded to ${publicUrl}`)

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      // Update song document with Firebase audio URL
      await db.collection('songs').doc(songId).update({
        firebaseAudioUrl: publicUrl,
        audioBackupStatus: 'complete',
        audioBackupAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      console.log(`[uploadAudioFromUrl] Successfully backed up audio for song ${songId}`)
      return {
        success: true,
        firebaseAudioUrl: publicUrl,
      }
    } catch (error) {
      console.error(`[uploadAudioFromUrl] Error:`, error)

      // Update song document with failed status
      try {
        await db.collection('songs').doc(songId).update({
          audioBackupStatus: 'failed',
          audioBackupError: error.message,
        })
      } catch (updateError) {
        console.error(`[uploadAudioFromUrl] Could not update failure status:`, updateError)
      }

      throw new functions.https.HttpsError('internal', `Failed to upload audio: ${error.message}`)
    }
  })

/**
 * Download a file from a URL to a local path
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        console.log(`[downloadFile] Redirecting to ${redirectUrl}`)
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`))
        return
      }

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve()
      })
    })

    request.on('error', (err) => {
      fs.unlink(destPath, () => {}) // Delete partial file
      reject(err)
    })

    file.on('error', (err) => {
      fs.unlink(destPath, () => {}) // Delete partial file
      reject(err)
    })
  })
}
