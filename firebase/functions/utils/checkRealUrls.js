/**
 * Check Real URLs - Find songs/posts with working Firebase Storage URLs
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * Check for songs with real Firebase Storage URLs
 */
exports.checkRealUrlsHTTP = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onRequest(async (req, res) => {
    try {
      const results = {
        songsWithFirebaseAudio: [],
        postsWithUrls: [],
      }

      // Check songs collection - get first 5 with Firebase URLs
      const songsSnapshot = await db.collection('songs')
        .where('firebaseAudioUrl', '!=', null)
        .limit(5)
        .get()

      songsSnapshot.forEach(doc => {
        const song = doc.data()
        results.songsWithFirebaseAudio.push({
          id: doc.id,
          title: song.title,
          // FULL URLs - no truncation
          firebaseAudioUrl: song.firebaseAudioUrl,
          audioUrl: song.audioUrl,
        })
      })

      // Check recent posts - get first 10 posts
      const postsSnapshot = await db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

      postsSnapshot.forEach(doc => {
        const post = doc.data()
        results.postsWithUrls.push({
          id: doc.id,
          postType: post.postType,
          // FULL URLs
          mediaUrl: post.postMedia?.[0]?.url,
          mediaType: post.postMedia?.[0]?.type,
          songDataAudioUrl: post.songData?.audioUrl,
          songDataFirebaseAudioUrl: post.songData?.firebaseAudioUrl,
        })
      })

      res.json(results)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
