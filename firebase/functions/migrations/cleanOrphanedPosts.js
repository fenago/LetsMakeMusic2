const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * cleanOrphanedPosts - Remove posts from user's feeds where authorID doesn't match
 * This fixes the case where posts from other users got into someone's profile_feed_live
 */
exports.cleanOrphanedPosts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }

  const userId = context.auth.uid
  console.log(`[cleanOrphanedPosts] Cleaning orphaned posts for user ${userId}`)

  try {
    // Check profile_feed_live for orphaned posts
    const profileFeed = await db
      .collection('social_feeds')
      .doc(userId)
      .collection('profile_feed_live')
      .get()

    console.log(`[cleanOrphanedPosts] Found ${profileFeed.size} posts in profile_feed_live`)

    let orphanedCount = 0
    for (const doc of profileFeed.docs) {
      const post = doc.data()
      if (post.authorID !== userId) {
        console.log(`[cleanOrphanedPosts] Orphaned post: ${doc.id} (authorID: ${post.authorID})`)
        orphanedCount++

        // Delete from all feed locations
        await db.collection('social_feeds').doc(userId).collection('profile_feed_live').doc(doc.id).delete()
        await db.collection('social_feeds').doc(userId).collection('main_feed').doc(doc.id).delete()
        await db.collection('social_feeds').doc(userId).collection('home_feed_live').doc(doc.id).delete()
        console.log(`[cleanOrphanedPosts] Deleted orphaned post: ${doc.id}`)
      }
    }

    console.log(`[cleanOrphanedPosts] Cleaned ${orphanedCount} orphaned posts`)

    return {
      cleaned: orphanedCount,
      message: orphanedCount > 0
        ? `Cleaned ${orphanedCount} orphaned posts`
        : 'No orphaned posts found'
    }
  } catch (error) {
    console.error('[cleanOrphanedPosts] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
