/**
 * Auto-post song trigger
 *
 * Firestore trigger that automatically creates a social feed post
 * when a new song is created in the songs collection.
 *
 * This ensures all songs appear in the Stage feed without manual sharing.
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()

/**
 * Auto-generate hashtags from song style
 * "electronic chill pop" -> ['electronic', 'chill', 'pop']
 */
const autoGenerateHashtags = (style) => {
  if (!style) return []

  return style
    .split(/[\s,]+/) // Split on spaces/commas
    .map((s) => s.toLowerCase()) // Lowercase
    .map((s) => s.replace(/[^a-z0-9]/g, '')) // Remove special chars
    .filter((s) => s.length > 2) // Min 3 chars
    .slice(0, 5) // Max 5 hashtags
}

/**
 * Firestore trigger: onCreate for songs collection
 *
 * When a new song is created, automatically create a post in the feed.
 * This makes songs discoverable in the Stage feed immediately.
 */
exports.onSongCreated = functions.firestore
  .document('songs/{songId}')
  .onCreate(async (snapshot, context) => {
    const songId = context.params.songId
    const song = snapshot.data()

    // Skip if song is already shared or marked as private
    if (song.sharedToFeed || song.isPrivate) {
      console.log(`[autoPostSong] Skipping song ${songId} - already shared or private`)
      return null
    }

    const userId = song.userId
    if (!userId) {
      console.error(`[autoPostSong] Song ${songId} has no userId`)
      return null
    }

    try {
      // Get user data for author info
      const userDoc = await db.collection('users').doc(userId).get()
      if (!userDoc.exists) {
        console.error(`[autoPostSong] User ${userId} not found`)
        return null
      }
      const user = userDoc.data()

      // Generate hashtags from style
      const hashtags = autoGenerateHashtags(song.style)

      // Create post ID
      const postID = uuidv4()
      const timestamp = Math.floor(Date.now() / 1000)

      // Build media object for feed display
      const postMedia = []

      // Add video if available
      if (song.firebaseVideoUrl || song.videoUrl) {
        postMedia.push({
          url: song.firebaseVideoUrl || song.videoUrl,
          thumbnailURL: song.thumbnailUrl || song.imageUrl || song.coverUrl,
          type: 'video/mp4',
        })
      }
      // Add audio as fallback
      if (postMedia.length === 0 && (song.firebaseAudioUrl || song.audioUrl)) {
        postMedia.push({
          url: song.firebaseAudioUrl || song.audioUrl,
          thumbnailURL: song.thumbnailUrl || song.imageUrl || song.coverUrl,
          type: 'audio/mpeg',
        })
      }

      const post = {
        id: postID,
        authorID: userId,
        author: {
          id: userId,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          username: user.username || '',
          profilePictureURL: user.profilePictureURL || '',
          email: user.email || '',
          stageName: user.stageName || song.author?.stageName,
        },
        postMedia,
        description: `🎵 ${song.title}`,
        hashtags,
        reactionsCount: 0,
        commentsCount: 0,
        createdAt: timestamp,

        // Song-specific fields
        postType: 'song',
        linkedSongId: songId,
        songData: {
          id: songId,
          title: song.title,
          imageUrl: song.thumbnailUrl || song.imageUrl || song.coverUrl,
          audioUrl: song.firebaseAudioUrl || song.audioUrl,
          videoUrl: song.firebaseVideoUrl || song.videoUrl,
          style: song.style,
          duration: song.duration,
          artist: song.author?.stageName || user.stageName || user.username,
          lyrics: song.rawLyrics || song.lyrics || '',
          prompt: song.prompt || '',
        },

        // Auto-post metadata
        autoPosted: true,
      }

      // Save to main posts collection
      await db.collection('posts').doc(postID).set(post)

      // Add to author's profile feed
      await db
        .collection('social_feeds')
        .doc(userId)
        .collection('profile_feed_live')
        .doc(postID)
        .set(post)

      // Add to main_feed for discovery
      await db
        .collection('social_feeds')
        .doc(userId)
        .collection('main_feed')
        .doc(postID)
        .set(post)

      // Add to hashtag feeds
      for (const tag of hashtags) {
        await db
          .collection('hashtags')
          .doc(tag)
          .collection('feed_live')
          .doc(postID)
          .set(post)
      }

      // Fanout to followers' home feeds
      const followersSnapshot = await db
        .collection('social_graph')
        .doc(userId)
        .collection('inbound_users')
        .get()

      if (followersSnapshot.docs.length > 0) {
        const batch = db.batch()
        followersSnapshot.docs.forEach((followerDoc) => {
          const followerId = followerDoc.id
          const feedRef = db
            .collection('social_feeds')
            .doc(followerId)
            .collection('home_feed_live')
            .doc(postID)
          batch.set(feedRef, post)
        })
        await batch.commit()
        console.log(`[autoPostSong] Fanned out to ${followersSnapshot.docs.length} followers`)
      }

      // Update song with post reference
      await db.collection('songs').doc(songId).update({
        linkedPostId: postID,
        sharedToFeed: true,
        autoSharedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      console.log(`[autoPostSong] Auto-posted song ${songId} as post ${postID}`)
      return { postId: postID }
    } catch (error) {
      console.error(`[autoPostSong] Error auto-posting song ${songId}:`, error)
      return null
    }
  })
