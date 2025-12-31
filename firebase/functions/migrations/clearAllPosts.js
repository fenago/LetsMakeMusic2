const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * clearAllPosts - Delete ALL posts for the authenticated user
 *
 * This clears:
 * - posts collection
 * - social_feeds/{userId}/profile_feed_live
 * - social_feeds/{userId}/main_feed
 * - social_feeds/{userId}/home_feed_live
 * - hashtag feeds
 * - followers' home_feed_live
 * - Resets song linkedPostId references
 */
exports.clearAllPosts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }

  const userId = context.auth.uid
  console.log(`[clearAllPosts] Starting cleanup for user ${userId}`)

  try {
    // 1. Get all posts by this user
    const postsSnapshot = await db.collection('posts')
      .where('authorID', '==', userId)
      .get()

    console.log(`[clearAllPosts] Found ${postsSnapshot.size} posts to delete`)

    if (postsSnapshot.empty) {
      return { deleted: 0, message: 'No posts to delete' }
    }

    // 2. Get followers for fanout cleanup
    const followersSnapshot = await db.collection('social_graph')
      .doc(userId)
      .collection('inbound_users')
      .get()

    const followerIds = followersSnapshot.docs.map(doc => doc.id)
    console.log(`[clearAllPosts] Will clean up ${followerIds.length} followers' feeds`)

    // 3. Delete each post and its fanout
    let deletedCount = 0
    for (const postDoc of postsSnapshot.docs) {
      const postId = postDoc.id
      const postData = postDoc.data()
      const hashtags = postData.hashtags || []

      console.log(`[clearAllPosts] Deleting post ${postId}`)

      // Delete from main posts collection
      await db.collection('posts').doc(postId).delete()

      // Delete from author's feeds
      await db.collection('social_feeds').doc(userId).collection('profile_feed_live').doc(postId).delete()
      await db.collection('social_feeds').doc(userId).collection('main_feed').doc(postId).delete()
      await db.collection('social_feeds').doc(userId).collection('home_feed_live').doc(postId).delete()

      // Delete from followers' home feeds
      for (const followerId of followerIds) {
        await db.collection('social_feeds').doc(followerId).collection('home_feed_live').doc(postId).delete()
      }

      // Delete from hashtag feeds
      for (const tag of hashtags) {
        await db.collection('hashtags').doc(tag.toLowerCase()).collection('feed_live').doc(postId).delete()
      }

      // If linked to a song, clear the reference
      if (postData.linkedSongId) {
        await db.collection('songs').doc(postData.linkedSongId).update({
          linkedPostId: admin.firestore.FieldValue.delete(),
          sharedToFeed: false,
          sharedAt: admin.firestore.FieldValue.delete(),
          autoSharedAt: admin.firestore.FieldValue.delete(),
        })
      }

      deletedCount++
    }

    console.log(`[clearAllPosts] Deleted ${deletedCount} posts for user ${userId}`)

    return {
      deleted: deletedCount,
      message: `Successfully deleted ${deletedCount} posts`
    }
  } catch (error) {
    console.error('[clearAllPosts] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
