const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

/**
 * List posts from the user's home feed (Following feed)
 * Returns posts from users they follow
 */
exports.listHomeFeedPosts = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { limit = 50, lastPostId } = data

  try {
    let query = db
      .collection('social_feeds')
      .doc(userId)
      .collection('home_feed_live')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    if (lastPostId) {
      const lastDoc = await db
        .collection('social_feeds')
        .doc(userId)
        .collection('home_feed_live')
        .doc(lastPostId)
        .get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    const snapshot = await query.get()
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`[listHomeFeedPosts] Returning ${posts.length} posts for user ${userId}`)
    return { posts, success: true }
  } catch (error) {
    console.error('[listHomeFeedPosts] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * List posts for the Discover/For You feed
 * Returns posts from all users' main_feed collections
 */
exports.listDiscoverFeedPosts = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  const { limit = 50, lastPostId } = data

  try {
    // Query the global posts collection for discover feed
    let query = db
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    if (lastPostId) {
      const lastDoc = await db.collection('posts').doc(lastPostId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    const snapshot = await query.get()
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`[listDiscoverFeedPosts] Returning ${posts.length} posts`)
    return { posts, success: true }
  } catch (error) {
    console.error('[listDiscoverFeedPosts] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Add a new post to the feed system
 * Creates post in main collection and fans out to followers
 */
exports.addPost = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { postMedia, description, hashtags = [], location, postType = 'video' } = data

  if (!postMedia || postMedia.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Post must have at least one media item')
  }

  try {
    // Get author info
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    const postData = {
      authorID: userId,
      author: {
        id: userId,
        username: userData.username || userData.firstName || 'Anonymous',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        profilePictureURL: userData.profilePictureURL || '',
      },
      postMedia,
      description: description || '',
      hashtags,
      location: location || {},
      postType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: { like: 0, love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 },
      commentCount: 0,
    }

    // Create main post
    const postRef = await db.collection('posts').add(postData)
    const postId = postRef.id
    postData.id = postId

    // Fan out to author's profile feed
    await db
      .collection('social_feeds')
      .doc(userId)
      .collection('profile_feed_live')
      .doc(postId)
      .set(postData)

    // Fan out to author's main_feed (for discovery)
    await db
      .collection('social_feeds')
      .doc(userId)
      .collection('main_feed')
      .doc(postId)
      .set(postData)

    // Fan out to followers' home feeds
    const followersSnapshot = await db
      .collection('social_graph')
      .doc(userId)
      .collection('inbound_users')
      .get()

    const batch = db.batch()
    followersSnapshot.docs.forEach(followerDoc => {
      const followerId = followerDoc.id
      const feedRef = db
        .collection('social_feeds')
        .doc(followerId)
        .collection('home_feed_live')
        .doc(postId)
      batch.set(feedRef, postData)
    })
    await batch.commit()

    // Fan out to hashtag feeds
    for (const tag of hashtags) {
      await db
        .collection('hashtags')
        .doc(tag.toLowerCase())
        .collection('feed_live')
        .doc(postId)
        .set(postData)
    }

    console.log(`[addPost] Created post ${postId} for user ${userId}, fanned to ${followersSnapshot.size} followers`)
    return { postId, success: true }
  } catch (error) {
    console.error('[addPost] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Delete a post from the feed system
 */
exports.deletePost = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { postId } = data
  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'Post ID is required')
  }

  try {
    // Get the post to verify ownership and get hashtags
    const postDoc = await db.collection('posts').doc(postId).get()
    if (!postDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Post not found')
    }

    const postData = postDoc.data()
    if (postData.authorID !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'You can only delete your own posts')
    }

    // Delete from main posts collection
    await db.collection('posts').doc(postId).delete()

    // Delete from author's feeds
    await db.collection('social_feeds').doc(userId).collection('profile_feed_live').doc(postId).delete()
    await db.collection('social_feeds').doc(userId).collection('main_feed').doc(postId).delete()

    // Delete from followers' home feeds
    const followersSnapshot = await db
      .collection('social_graph')
      .doc(userId)
      .collection('inbound_users')
      .get()

    const batch = db.batch()
    followersSnapshot.docs.forEach(followerDoc => {
      const feedRef = db.collection('social_feeds').doc(followerDoc.id).collection('home_feed_live').doc(postId)
      batch.delete(feedRef)
    })
    await batch.commit()

    // Delete from hashtag feeds
    const hashtags = postData.hashtags || []
    for (const tag of hashtags) {
      await db.collection('hashtags').doc(tag.toLowerCase()).collection('feed_live').doc(postId).delete()
    }

    console.log(`[deletePost] Deleted post ${postId}`)
    return { success: true }
  } catch (error) {
    console.error('[deletePost] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Add a reaction (like, love, etc.) to a post
 */
exports.addReaction = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { postId, reaction = 'like' } = data
  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'Post ID is required')
  }

  const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
  if (!validReactions.includes(reaction)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid reaction type')
  }

  try {
    const postRef = db.collection('posts').doc(postId)
    const postDoc = await postRef.get()

    if (!postDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Post not found')
    }

    // Check if user already reacted
    const reactionRef = postRef.collection('reactions').doc(userId)
    const existingReaction = await reactionRef.get()

    if (existingReaction.exists) {
      const oldReaction = existingReaction.data().reaction
      if (oldReaction === reaction) {
        // Remove reaction (toggle off)
        await reactionRef.delete()
        await postRef.update({
          [`reactions.${reaction}`]: admin.firestore.FieldValue.increment(-1),
        })
        console.log(`[addReaction] Removed ${reaction} from post ${postId} by user ${userId}`)
        return { action: 'removed', reaction, success: true }
      } else {
        // Change reaction
        await reactionRef.set({ reaction, reactedAt: admin.firestore.FieldValue.serverTimestamp() })
        await postRef.update({
          [`reactions.${oldReaction}`]: admin.firestore.FieldValue.increment(-1),
          [`reactions.${reaction}`]: admin.firestore.FieldValue.increment(1),
        })
        console.log(`[addReaction] Changed reaction from ${oldReaction} to ${reaction} on post ${postId}`)
        return { action: 'changed', oldReaction, reaction, success: true }
      }
    } else {
      // Add new reaction
      await reactionRef.set({ reaction, reactedAt: admin.firestore.FieldValue.serverTimestamp() })
      await postRef.update({
        [`reactions.${reaction}`]: admin.firestore.FieldValue.increment(1),
      })
      console.log(`[addReaction] Added ${reaction} to post ${postId} by user ${userId}`)
      return { action: 'added', reaction, success: true }
    }
  } catch (error) {
    console.error('[addReaction] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Add a comment to a post
 */
exports.addComment = functions.https.onCall(async (data, context) => {
  // DEBUG: Log incoming data
  console.log('[addComment] ========== INCOMING REQUEST ==========')
  console.log('[addComment] context.auth:', context.auth)
  console.log('[addComment] context.auth?.uid:', context.auth?.uid)
  console.log('[addComment] data:', JSON.stringify(data))
  console.log('[addComment] data.userId:', data?.userId)
  console.log('[addComment] data.postId:', data?.postId)
  console.log('[addComment] data.text:', data?.text)

  const userId = context.auth?.uid || data?.userId
  console.log('[addComment] Resolved userId:', userId)

  if (!userId) {
    console.log('[addComment] ❌ UNAUTHENTICATED - no userId found')
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { postId, text, parentCommentId } = data
  if (!postId || !text) {
    throw new functions.https.HttpsError('invalid-argument', 'Post ID and comment text are required')
  }

  try {
    // Get author info
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    // Generate ID first so we can include it in the document
    const commentRef = db
      .collection('posts')
      .doc(postId)
      .collection('comments_live')
      .doc() // Auto-generate ID

    const commentData = {
      id: commentRef.id, // Include ID in document for client-side rendering
      authorID: userId,
      author: {
        id: userId,
        username: userData.username || userData.firstName || 'Anonymous',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        profilePictureURL: userData.profilePictureURL || '',
      },
      text,
      parentCommentId: parentCommentId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: { like: 0 },
    }

    await commentRef.set(commentData)

    // Update comment count on post
    await db.collection('posts').doc(postId).update({
      commentCount: admin.firestore.FieldValue.increment(1),
    })

    console.log(`[addComment] Added comment ${commentRef.id} to post ${postId}`)
    return { commentId: commentRef.id, success: true }
  } catch (error) {
    console.error('[addComment] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Delete a comment from a post
 */
exports.deleteComment = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { postId, commentId } = data
  if (!postId || !commentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Post ID and Comment ID are required')
  }

  try {
    const commentRef = db.collection('posts').doc(postId).collection('comments_live').doc(commentId)
    const commentDoc = await commentRef.get()

    if (!commentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Comment not found')
    }

    if (commentDoc.data().authorID !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'You can only delete your own comments')
    }

    await commentRef.delete()

    // Update comment count on post
    await db.collection('posts').doc(postId).update({
      commentCount: admin.firestore.FieldValue.increment(-1),
    })

    console.log(`[deleteComment] Deleted comment ${commentId} from post ${postId}`)
    return { success: true }
  } catch (error) {
    console.error('[deleteComment] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * List comments on a post
 */
exports.listComments = functions.https.onCall(async (data, context) => {
  const { postId, limit = 50, lastCommentId } = data

  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'Post ID is required')
  }

  try {
    let query = db
      .collection('posts')
      .doc(postId)
      .collection('comments_live')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    if (lastCommentId) {
      const lastDoc = await db
        .collection('posts')
        .doc(postId)
        .collection('comments_live')
        .doc(lastCommentId)
        .get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    const snapshot = await query.get()
    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`[listComments] Returning ${comments.length} comments for post ${postId}`)
    return { comments, success: true }
  } catch (error) {
    console.error('[listComments] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * List posts by hashtag
 */
exports.listHashtagFeedPosts = functions.https.onCall(async (data, context) => {
  const { hashtag, limit = 50, lastPostId } = data

  if (!hashtag) {
    throw new functions.https.HttpsError('invalid-argument', 'Hashtag is required')
  }

  try {
    let query = db
      .collection('hashtags')
      .doc(hashtag.toLowerCase())
      .collection('feed_live')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    if (lastPostId) {
      const lastDoc = await db
        .collection('hashtags')
        .doc(hashtag.toLowerCase())
        .collection('feed_live')
        .doc(lastPostId)
        .get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    const snapshot = await query.get()
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`[listHashtagFeedPosts] Returning ${posts.length} posts for hashtag #${hashtag}`)
    return { posts, success: true }
  } catch (error) {
    console.error('[listHashtagFeedPosts] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
