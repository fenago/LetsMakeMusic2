/**
 * Backfill profile_feed_live for all users
 *
 * This script ensures all users have their songs/posts in profile_feed_live
 * by checking:
 * 1. Songs collection - creates posts if missing
 * 2. Posts collection - adds to profile_feed_live if missing
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()

/**
 * Create a post from a song (same logic as autoPostSong)
 */
const createPostFromSong = async (song, songId, user) => {
  const postID = uuidv4()
  const timestamp = song.createdAt?.seconds || Math.floor(Date.now() / 1000)

  // Build media object (ensure no undefined values)
  const thumbnailURL = song.thumbnailUrl || song.imageUrl || song.coverUrl || ''
  const postMedia = []
  if (song.firebaseVideoUrl || song.videoUrl) {
    postMedia.push({
      url: song.firebaseVideoUrl || song.videoUrl,
      thumbnailURL,
      type: 'video/mp4',
    })
  }
  if (postMedia.length === 0 && (song.firebaseAudioUrl || song.audioUrl)) {
    postMedia.push({
      url: song.firebaseAudioUrl || song.audioUrl,
      thumbnailURL,
      type: 'audio/mpeg',
    })
  }

  // Skip if no media
  if (postMedia.length === 0) {
    return null
  }

  const post = {
    id: postID,
    authorID: song.userId,
    author: {
      id: song.userId,
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
      profilePictureURL: user?.profilePictureURL || '',
      stageName: user?.stageName || song.author?.stageName || '',
    },
    postMedia,
    description: `🎵 ${song.title}`,
    hashtags: song.style ? song.style.split(/[\s,]+/).filter(s => s.length > 2).slice(0, 5) : [],
    reactionsCount: 0,
    commentsCount: 0,
    createdAt: timestamp,
    postType: 'song',
    linkedSongId: songId,
    songData: {
      id: songId,
      title: song.title || '',
      imageUrl: song.thumbnailUrl || song.imageUrl || song.coverUrl || '',
      audioUrl: song.firebaseAudioUrl || song.audioUrl || '',
      ...(song.firebaseVideoUrl || song.videoUrl ? { videoUrl: song.firebaseVideoUrl || song.videoUrl } : {}),
      style: song.style || '',
      duration: song.duration || 0,
      artist: song.author?.stageName || user?.stageName || user?.username || '',
      lyrics: song.rawLyrics || song.lyrics || '',
    },
    autoPosted: true,
    backfilled: true,
  }

  return { postID, post }
}

/**
 * Run the backfill process
 */
const runBackfill = async (dryRun = true, specificUserId = null) => {
  const results = {
    usersProcessed: 0,
    songsChecked: 0,
    postsCreated: 0,
    profileFeedUpdated: 0,
    errors: [],
    details: [],
  }

  try {
    // Get all users (or specific user)
    let usersQuery = db.collection('users')
    if (specificUserId) {
      usersQuery = usersQuery.where(admin.firestore.FieldPath.documentId(), '==', specificUserId)
    }
    const usersSnapshot = await usersQuery.get()

    console.log(`[backfillProfileFeed] Processing ${usersSnapshot.size} users`)

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      const userData = userDoc.data()
      results.usersProcessed++

      // Get all songs for this user (simple query without isDeleted filter to avoid index issues)
      const songsSnapshot = await db.collection('songs')
        .where('userId', '==', userId)
        .get()

      // Filter out deleted songs in code (some old songs may not have isDeleted field)
      const validSongs = songsSnapshot.docs.filter(doc => {
        const data = doc.data()
        return data.isDeleted !== true
      })

      if (validSongs.length === 0) {
        continue
      }

      console.log(`[backfillProfileFeed] User ${userId} has ${validSongs.length} songs (${songsSnapshot.size} total, ${songsSnapshot.size - validSongs.length} deleted)`)

      for (const songDoc of validSongs) {
        const songId = songDoc.id
        const song = songDoc.data()
        results.songsChecked++

        // Check if a post already exists for this song
        const existingPostSnapshot = await db.collection('posts')
          .where('linkedSongId', '==', songId)
          .limit(1)
          .get()

        let postId, postData

        if (existingPostSnapshot.empty) {
          // No post exists - create one
          const created = await createPostFromSong(song, songId, userData)
          if (!created) {
            results.errors.push({ songId, error: 'No media available' })
            continue
          }

          postId = created.postID
          postData = created.post

          if (!dryRun) {
            await db.collection('posts').doc(postId).set(postData)
          }
          results.postsCreated++
          results.details.push({
            userId,
            songId,
            postId,
            action: 'created_post',
            songTitle: song.title,
          })
        } else {
          // Post exists - use it
          const existingPost = existingPostSnapshot.docs[0]
          postId = existingPost.id
          postData = existingPost.data()
        }

        // Check if post is in profile_feed_live
        const profileFeedDoc = await db.collection('social_feeds')
          .doc(userId)
          .collection('profile_feed_live')
          .doc(postId)
          .get()

        if (!profileFeedDoc.exists) {
          // Add to profile_feed_live
          if (!dryRun) {
            await db.collection('social_feeds')
              .doc(userId)
              .collection('profile_feed_live')
              .doc(postId)
              .set(postData)
          }
          results.profileFeedUpdated++
          results.details.push({
            userId,
            songId,
            postId,
            action: 'added_to_profile_feed',
            songTitle: song.title,
          })
        }
      }
    }

    console.log(`[backfillProfileFeed] Complete:`, results)
    return results
  } catch (error) {
    console.error('[backfillProfileFeed] Error:', error)
    results.errors.push({ error: error.message })
    return results
  }
}

/**
 * HTTP endpoint for backfill
 *
 * Usage:
 * - Dry run: /backfillProfileFeedHTTP?dryRun=true
 * - Execute: /backfillProfileFeedHTTP?dryRun=false
 * - Specific user: /backfillProfileFeedHTTP?dryRun=false&userId=abc123
 */
exports.backfillProfileFeedHTTP = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB',
  })
  .https.onRequest(async (req, res) => {
    const dryRun = req.query.dryRun !== 'false'
    const userId = req.query.userId || null

    console.log(`[backfillProfileFeedHTTP] Starting - dryRun: ${dryRun}, userId: ${userId || 'all'}`)

    try {
      const results = await runBackfill(dryRun, userId)

      res.json({
        success: true,
        dryRun,
        userId: userId || 'all',
        message: dryRun
          ? `DRY RUN: Would create ${results.postsCreated} posts, update ${results.profileFeedUpdated} profile feeds`
          : `Backfill complete: ${results.postsCreated} posts created, ${results.profileFeedUpdated} profile feeds updated`,
        summary: {
          usersProcessed: results.usersProcessed,
          songsChecked: results.songsChecked,
          postsCreated: results.postsCreated,
          profileFeedUpdated: results.profileFeedUpdated,
          errors: results.errors.length,
        },
        details: results.details,
        errors: results.errors,
      })
    } catch (error) {
      console.error('[backfillProfileFeedHTTP] Error:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  })

/**
 * Callable function for backfill (can be called from admin UI)
 */
exports.backfillProfileFeed = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
    const { dryRun = true, userId = null } = data

    const results = await runBackfill(dryRun, userId)
    return results
  })
