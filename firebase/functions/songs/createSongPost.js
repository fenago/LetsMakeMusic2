const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()

// Import mention utilities for @mention notifications
const { extractMentionIds, processMentionNotifications } = require('../mentions/mentions')

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
 * createSongPost - Create a social feed post from a song
 *
 * Called from ShareSongToFeedScreen when user shares a song
 *
 * @param {object} data - { songId, caption, hashtags }
 * @param {object} context - Firebase auth context
 * @returns {object} - { postId }
 */
exports.createSongPost = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in to share songs'
    )
  }

  const userId = context.auth.uid
  const { songId, caption, hashtags } = data

  if (!songId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'songId is required'
    )
  }

  try {
    // 2. Get song data
    const songDoc = await db.collection('songs').doc(songId).get()
    if (!songDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Song not found')
    }
    const song = songDoc.data()

    // 3. Get user data for author info
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found')
    }
    const user = userDoc.data()

    // 4. Build hashtags - combine user hashtags with auto-generated from style
    const userTags = (hashtags || []).map(t => t.replace(/^#/, '').toLowerCase())
    const autoTags = autoGenerateHashtags(song.style)
    const allTags = [...new Set([...userTags, ...autoTags])].slice(0, 10)

    // 5. Create post
    const postID = uuidv4()
    const now = new Date()
    const firestoreTimestamp = admin.firestore.Timestamp.fromDate(now)

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
      postText: caption || `Check out my song: ${song.title} 🎵`, // Caption with @mentions and #hashtags
      description: caption || `Check out my song: ${song.title} 🎵`, // Backwards compatibility
      hashtags: allTags,
      reactionsCount: 0,
      commentsCount: 0,
      createdAt: firestoreTimestamp,

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
        lyrics: song.rawLyrics || song.lyrics || '', // Include lyrics for "View Lyrics" feature
        prompt: song.prompt || '', // Original prompt used for song generation
      },
    }

    // 6. Save to main posts collection
    await db.collection('posts').doc(postID).set(post)

    // 7. Add to author's profile feed
    await db
      .collection('social_feeds')
      .doc(userId)
      .collection('profile_feed_live')
      .doc(postID)
      .set(post)

    // 7.5 Add to author's OWN home feed (so they see their own posts)
    await db
      .collection('social_feeds')
      .doc(userId)
      .collection('home_feed_live')
      .doc(postID)
      .set(post)

    // 8. Add to main_feed for discovery
    await db
      .collection('social_feeds')
      .doc(userId)
      .collection('main_feed')
      .doc(postID)
      .set(post)

    // 9. Add to hashtag feeds
    for (const tag of allTags) {
      await db
        .collection('hashtags')
        .doc(tag)
        .collection('feed_live')
        .doc(postID)
        .set(post)
    }

    // 10. Fanout to followers' home feeds
    const followersSnapshot = await db
      .collection('social_graph')
      .doc(userId)
      .collection('inbound_users')
      .get()

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

    // 11. Update song with post reference
    await db.collection('songs').doc(songId).update({
      linkedPostId: postID,
      isPublic: true,
      sharedToFeed: true,
      sharedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // 12. Process @mention notifications
    const mentionedUserIds = extractMentionIds(caption)
    if (mentionedUserIds.length > 0) {
      console.log(`[createSongPost] Processing mentions for ${mentionedUserIds.length} users`)
      await processMentionNotifications({
        mentionerID: userId,
        mentionerUser: user,
        mentionedUserIds,
        postId: postID,
        contentType: 'post',
        contentText: caption,
      })
    }

    console.log(`Created song post ${postID} for song ${songId} by user ${userId}`)

    return { postId: postID }
  } catch (error) {
    console.error('Error creating song post:', error)
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to create song post'
    )
  }
})
