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
 * Upload image from a remote URL to Firebase Storage
 * Used to backup Suno-generated images to ensure permanent storage
 */
exports.uploadImageFromUrl = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https.onCall(async (data, context) => {
    const { imageUrl, songId, sunoId, userId } = data

    // Validate inputs
    if (!imageUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'Image URL is required')
    }
    if (!songId) {
      throw new functions.https.HttpsError('invalid-argument', 'Song ID is required')
    }
    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required')
    }

    console.log(`[uploadImageFromUrl] Starting download for song ${songId}`)
    console.log(`[uploadImageFromUrl] URL: ${imageUrl}`)

    try {
      // Determine file extension from URL
      const urlPath = new URL(imageUrl).pathname
      const ext = path.extname(urlPath) || '.jpg'

      // Generate unique filename
      const fileId = sunoId || songId
      const timestamp = Date.now()
      const imageFileName = `images/${userId}/${fileId}_${timestamp}${ext}`
      const tempFilePath = path.join(os.tmpdir(), `${fileId}_${timestamp}${ext}`)

      // Download image to temp file
      await downloadFile(imageUrl, tempFilePath)
      console.log(`[uploadImageFromUrl] Downloaded to ${tempFilePath}`)

      // Get file size
      const stats = fs.statSync(tempFilePath)
      console.log(`[uploadImageFromUrl] File size: ${(stats.size / 1024).toFixed(2)} KB`)

      // Determine content type
      const contentType = ext.includes('png') ? 'image/png' :
                         ext.includes('gif') ? 'image/gif' :
                         ext.includes('webp') ? 'image/webp' : 'image/jpeg'

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket(STORAGE_BUCKET)
      await bucket.upload(tempFilePath, {
        destination: imageFileName,
        resumable: false,
        metadata: {
          contentType,
          metadata: {
            songId,
            sunoId: sunoId || null,
            userId,
            originalUrl: imageUrl,
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      // Make file publicly readable
      const file = bucket.file(imageFileName)
      await file.makePublic()

      // Construct the public URL
      const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${imageFileName}`
      console.log(`[uploadImageFromUrl] Uploaded to ${publicUrl}`)

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      // Update song document with Firebase image URL
      await db.collection('songs').doc(songId).update({
        firebaseImageUrl: publicUrl,
        imageBackupStatus: 'complete',
        imageBackupAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      console.log(`[uploadImageFromUrl] Successfully backed up image for song ${songId}`)
      return {
        success: true,
        firebaseImageUrl: publicUrl,
      }
    } catch (error) {
      console.error(`[uploadImageFromUrl] Error:`, error)

      // Update song document with failed status
      try {
        await db.collection('songs').doc(songId).update({
          imageBackupStatus: 'failed',
          imageBackupError: error.message,
        })
      } catch (updateError) {
        console.error(`[uploadImageFromUrl] Could not update failure status:`, updateError)
      }

      throw new functions.https.HttpsError('internal', `Failed to upload image: ${error.message}`)
    }
  })

/**
 * HTTP version for easy testing
 */
exports.uploadImageFromUrlHTTP = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https.onRequest(async (req, res) => {
    const { imageUrl, songId, sunoId, userId } = req.query

    if (!imageUrl || !songId || !userId) {
      return res.status(400).json({
        error: 'Missing required parameters: imageUrl, songId, userId'
      })
    }

    try {
      const result = await backupImage({ imageUrl, songId, sunoId, userId })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

/**
 * Internal function to backup an image
 */
async function backupImage({ imageUrl, songId, sunoId, userId }) {
  console.log(`[backupImage] Starting download for song ${songId}`)

  // Determine file extension from URL
  let ext = '.jpg'
  try {
    const urlPath = new URL(imageUrl).pathname
    ext = path.extname(urlPath) || '.jpg'
  } catch (e) {
    // Keep default .jpg
  }

  const fileId = sunoId || songId
  const timestamp = Date.now()
  const imageFileName = `images/${userId}/${fileId}_${timestamp}${ext}`
  const tempFilePath = path.join(os.tmpdir(), `${fileId}_${timestamp}${ext}`)

  // Download image to temp file
  await downloadFile(imageUrl, tempFilePath)

  // Get file size
  const stats = fs.statSync(tempFilePath)
  console.log(`[backupImage] Downloaded ${(stats.size / 1024).toFixed(2)} KB`)

  // Determine content type
  const contentType = ext.includes('png') ? 'image/png' :
                     ext.includes('gif') ? 'image/gif' :
                     ext.includes('webp') ? 'image/webp' : 'image/jpeg'

  // Upload to Firebase Storage
  const bucket = admin.storage().bucket(STORAGE_BUCKET)
  await bucket.upload(tempFilePath, {
    destination: imageFileName,
    resumable: false,
    metadata: { contentType },
  })

  // Make file publicly readable
  const file = bucket.file(imageFileName)
  await file.makePublic()

  // Construct the public URL
  const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${imageFileName}`

  // Clean up temp file
  fs.unlinkSync(tempFilePath)

  // Update song document
  await db.collection('songs').doc(songId).update({
    firebaseImageUrl: publicUrl,
    imageBackupStatus: 'complete',
    imageBackupAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { success: true, firebaseImageUrl: publicUrl }
}

exports.backupImage = backupImage

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
