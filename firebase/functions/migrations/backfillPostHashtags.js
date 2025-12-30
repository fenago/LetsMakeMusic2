/**
 * Migration: Backfill hashtags for existing posts
 *
 * This migration adds hashtags to existing song posts that may not have them.
 * It extracts hashtags from:
 * 1. The song's style field (e.g., "electronic chill pop" -> ['electronic', 'chill', 'pop'])
 * 2. Any inline hashtags in the postText/description
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')

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
 * Extract inline hashtags from text
 * "#rock #pop Check this out!" -> ['rock', 'pop']
 */
const extractInlineHashtags = (text) => {
  if (!text) return []

  const matches = text.match(/#([a-zA-Z0-9_]+)/g)
  if (!matches) return []

  return matches
    .map((tag) => tag.replace('#', '').toLowerCase())
    .filter((tag) => tag.length > 2)
    .slice(0, 5)
}

/**
 * Backfill hashtags for existing posts
 *
 * Callable function to run the migration
 */
exports.backfillPostHashtags = functions.https.onCall(async (data, context) => {
  // Optional: require admin authentication
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  // }

  const { dryRun = false, limit = 100 } = data || {}

  console.log('[backfillPostHashtags] Starting migration...', { dryRun, limit })

  try {
    // Query posts that need updating:
    // 1. Song posts without hashtags
    // 2. All posts to check for missing postText
    const snapshot = await db
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    console.log(`[backfillPostHashtags] Found ${snapshot.docs.length} posts to process`)

    let updatedCount = 0
    let skippedCount = 0
    const updates = []

    for (const doc of snapshot.docs) {
      const post = doc.data()
      const postId = doc.id

      // Check if this post needs updating
      const needsHashtags = !post.hashtags || post.hashtags.length === 0
      const needsCaption = !post.postText && !post.description

      if (!needsHashtags && !needsCaption) {
        skippedCount++
        continue
      }

      // Build update object
      const updateData = {}

      // Add hashtags if missing
      if (needsHashtags) {
        let newHashtags = []

        // Extract from song style
        if (post.songData?.style) {
          newHashtags = autoGenerateHashtags(post.songData.style)
        }

        // Also check for inline hashtags in existing text
        const inlineHashtags = extractInlineHashtags(post.postText || post.description)
        newHashtags = [...new Set([...newHashtags, ...inlineHashtags])].slice(0, 10)

        if (newHashtags.length > 0) {
          updateData.hashtags = newHashtags
        }
      }

      // Add caption if missing
      if (needsCaption && post.songData?.title) {
        const caption = `Check out my song: ${post.songData.title} 🎵`
        updateData.postText = caption
        updateData.description = caption
      }

      if (Object.keys(updateData).length > 0) {
        updates.push({
          postId,
          currentHashtags: post.hashtags,
          currentPostText: post.postText?.substring(0, 50),
          updates: updateData,
        })

        if (!dryRun) {
          await db.collection('posts').doc(postId).update(updateData)

          // Also update in social_feeds if exists
          if (post.authorID) {
            const feedRefs = [
              db.collection('social_feeds').doc(post.authorID).collection('profile_feed_live').doc(postId),
              db.collection('social_feeds').doc(post.authorID).collection('main_feed').doc(postId),
            ]

            for (const ref of feedRefs) {
              const feedDoc = await ref.get()
              if (feedDoc.exists) {
                await ref.update(updateData)
              }
            }
          }
        }

        updatedCount++
      }
    }

    console.log(`[backfillPostHashtags] Migration complete`, {
      processed: snapshot.docs.length,
      updated: updatedCount,
      skipped: skippedCount,
      dryRun,
    })

    return {
      success: true,
      processed: snapshot.docs.length,
      updated: updatedCount,
      skipped: skippedCount,
      dryRun,
      updates: updates.slice(0, 10), // Return first 10 for preview
    }
  } catch (error) {
    console.error('[backfillPostHashtags] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
