const functions = require('firebase-functions')
const admin = require('firebase-admin')
const axios = require('axios')
const os = require('os')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

const BUCKET_NAME = 'letsmakemusic-4e0fe.firebasestorage.app'

/**
 * Concatenate two audio files with crossfade
 * Used for merging original song with extended continuation
 *
 * @param {string} originalUrl - URL of the original audio
 * @param {string} extensionUrl - URL of the extended audio
 * @param {number} trimAt - Time in seconds to trim original (0 = use full original)
 * @param {string} outputFileName - Name for the output file
 * @param {number} crossfadeDuration - Crossfade duration in seconds (default: 1.5)
 * @returns {string} Firebase Storage URL of concatenated audio
 */
exports.concatenateAudio = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '2GB', // Increased for audio processing
  })
  .https.onCall(async (data, context) => {
    const { originalUrl, extensionUrl, trimAt, outputFileName, userId, crossfadeDuration = 1.5 } = data

    if (!originalUrl || !extensionUrl) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Both originalUrl and extensionUrl are required'
      )
    }

    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'userId is required'
      )
    }

    const tempDir = os.tmpdir()
    const timestamp = Date.now()
    const originalPath = path.join(tempDir, `original_${timestamp}.mp3`)
    const extensionPath = path.join(tempDir, `extension_${timestamp}.mp3`)
    const trimmedPath = path.join(tempDir, `trimmed_${timestamp}.mp3`)
    const outputPath = path.join(tempDir, `merged_${timestamp}.mp3`)

    try {
      console.log('[concatenateAudio] Starting concatenation with crossfade...')
      console.log('[concatenateAudio] Original URL:', originalUrl)
      console.log('[concatenateAudio] Extension URL:', extensionUrl)
      console.log('[concatenateAudio] Trim at:', trimAt)
      console.log('[concatenateAudio] Crossfade duration:', crossfadeDuration)

      // Step 1: Download both audio files
      console.log('[concatenateAudio] Downloading original audio...')
      const originalResponse = await axios.get(originalUrl, { responseType: 'arraybuffer' })
      fs.writeFileSync(originalPath, Buffer.from(originalResponse.data))

      console.log('[concatenateAudio] Downloading extension audio...')
      const extensionResponse = await axios.get(extensionUrl, { responseType: 'arraybuffer' })
      fs.writeFileSync(extensionPath, Buffer.from(extensionResponse.data))

      // Step 2: Trim original if needed
      let fileToMerge = originalPath
      if (trimAt && trimAt > 0) {
        console.log(`[concatenateAudio] Trimming original to ${trimAt} seconds...`)
        // Use -acodec for audio re-encoding to ensure compatibility
        await execAsync(`ffmpeg -i "${originalPath}" -t ${trimAt} -acodec libmp3lame -q:a 2 "${trimmedPath}"`)
        fileToMerge = trimmedPath
      }

      // Step 3: Merge with crossfade using FFmpeg acrossfade filter
      // This creates a smooth transition between the two audio files
      console.log('[concatenateAudio] Merging audio with crossfade...')
      const crossfadeCmd = `ffmpeg -i "${fileToMerge}" -i "${extensionPath}" -filter_complex "[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri[out]" -map "[out]" -acodec libmp3lame -q:a 2 "${outputPath}"`
      console.log('[concatenateAudio] FFmpeg command:', crossfadeCmd)
      await execAsync(crossfadeCmd)

      // Step 5: Upload to Firebase Storage
      console.log('[concatenateAudio] Uploading merged audio to Firebase Storage...')
      const bucket = admin.storage().bucket(BUCKET_NAME)
      const finalFileName = outputFileName || `merged_${Date.now()}.mp3`
      const destination = `songs/${userId}/${finalFileName}`

      await bucket.upload(outputPath, {
        destination,
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            mergedAt: new Date().toISOString(),
            originalUrl,
            extensionUrl,
            trimAt: trimAt || 0,
          },
        },
      })

      // Get public URL
      const file = bucket.file(destination)
      await file.makePublic()
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`

      console.log('[concatenateAudio] Success! Public URL:', publicUrl)

      // Cleanup temp files
      const filesToClean = [originalPath, extensionPath, trimmedPath, outputPath]
      filesToClean.forEach(f => {
        if (fs.existsSync(f)) fs.unlinkSync(f)
      })

      return {
        success: true,
        url: publicUrl,
        destination,
      }

    } catch (error) {
      console.error('[concatenateAudio] Error:', error)

      // Cleanup on error
      const filesToClean = [originalPath, extensionPath, trimmedPath, outputPath]
      filesToClean.forEach(f => {
        try { if (fs.existsSync(f)) fs.unlinkSync(f) } catch (e) {}
      })

      throw new functions.https.HttpsError(
        'internal',
        `Failed to concatenate audio: ${error.message}`
      )
    }
  })

/**
 * HTTP version for testing
 */
exports.concatenateAudioHTTP = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '1GB',
  })
  .https.onRequest(async (req, res) => {
    const cors = require('cors')({ origin: true })

    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      try {
        const result = await exports.concatenateAudio.run(req.body, { auth: null })
        res.json(result)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })
  })
