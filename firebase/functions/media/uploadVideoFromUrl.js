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
 * Upload a video from a remote URL to Firebase Storage
 * Used to backup Suno-generated music videos which expire after 15 days
 */
exports.uploadVideoFromUrl = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes for large videos
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
    const { videoUrl, songId, userId } = data

    // Validate inputs
    if (!videoUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Video URL is required')
    }
    if (!songId) {
      throw new functions.https.HttpsError('invalid-argument', 'Song ID is required')
    }
    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required')
    }

    console.log(`[uploadVideoFromUrl] Starting download for song ${songId}`)
    console.log(`[uploadVideoFromUrl] URL: ${videoUrl}`)

    try {
      // Generate unique filename
      const timestamp = Date.now()
      const videoFileName = `videos/${userId}/${songId}_${timestamp}.mp4`
      const tempFilePath = path.join(os.tmpdir(), `${songId}_${timestamp}.mp4`)

      // Download video to temp file
      await downloadFile(videoUrl, tempFilePath)
      console.log(`[uploadVideoFromUrl] Downloaded to ${tempFilePath}`)

      // Get file size
      const stats = fs.statSync(tempFilePath)
      console.log(`[uploadVideoFromUrl] File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket(STORAGE_BUCKET)
      await bucket.upload(tempFilePath, {
        destination: videoFileName,
        resumable: true,
        metadata: {
          contentType: 'video/mp4',
          metadata: {
            songId,
            userId,
            originalUrl: videoUrl,
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      // Make file publicly readable
      const file = bucket.file(videoFileName)
      await file.makePublic()

      // Construct the public URL
      const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${videoFileName}`
      console.log(`[uploadVideoFromUrl] Uploaded to ${publicUrl}`)

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      // Update song document with Firebase video URL
      await db.collection('songs').doc(songId).update({
        firebaseVideoUrl: publicUrl,
        videoBackupStatus: 'complete',
        videoBackupAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      console.log(`[uploadVideoFromUrl] Successfully backed up video for song ${songId}`)
      return {
        success: true,
        firebaseVideoUrl: publicUrl,
      }
    } catch (error) {
      console.error(`[uploadVideoFromUrl] Error:`, error)
      throw new functions.https.HttpsError('internal', `Failed to upload video: ${error.message}`)
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
