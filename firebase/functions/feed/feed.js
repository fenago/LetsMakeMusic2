const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

// Reference to collections
const mainFeedRef = db.collection('posts')
const socialFeedsRef = db.collection('social_feeds')
const socialGraphRef = db.collection('social_graph')

// Helper function to fetch user data
const fetchUser = async (userId) => {
  const userDoc = await db.collection('users').doc(userId).get()
  return userDoc.exists ? userDoc.data() : {}
}

// Mention utilities
const {
  extractMentionIds,
  extractHashtags,
  processMentionNotifications,
} = require('../mentions/mentions')

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

    // Extract mentions and hashtags from description text
    const mentionedUserIds = extractMentionIds(description)
    const textHashtags = extractHashtags(description)
    const allHashtags = [...new Set([...hashtags, ...textHashtags])]

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
      hashtags: allHashtags,
      mentionedUserIds,
      notifiedMentions: [],
      isEdited: false,
      editedAt: null,
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
    for (const tag of allHashtags) {
      await db
        .collection('hashtags')
        .doc(tag.toLowerCase())
        .collection('feed_live')
        .doc(postId)
        .set(postData)
    }

    // Send mention notifications (push + DM)
    if (mentionedUserIds.length > 0) {
      const notifiedMentions = await processMentionNotifications({
        mentionerID: userId,
        mentionerUser: userData,
        mentionedUserIds,
        postId,
        commentId: null,
        contentType: 'post',
        contentText: description,
        alreadyNotified: [],
      })

      // Update post with notified mentions for edit tracking
      if (notifiedMentions.length > 0) {
        await db.collection('posts').doc(postId).update({
          notifiedMentions,
        })
      }
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

    // Extract mentions and hashtags from comment text
    const mentionedUserIds = extractMentionIds(text)
    const hashtags = extractHashtags(text)

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
      mentionedUserIds,
      hashtags,
      notifiedMentions: [],
      isEdited: false,
      editedAt: null,
      parentCommentId: parentCommentId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: { like: 0 },
    }

    await commentRef.set(commentData)

    // Update comment count on post (use set with merge to handle song posts that may not exist in posts collection)
    await db.collection('posts').doc(postId).set({
      commentCount: admin.firestore.FieldValue.increment(1),
    }, { merge: true })

    // Send mention notifications (push + DM)
    if (mentionedUserIds.length > 0) {
      const notifiedMentions = await processMentionNotifications({
        mentionerID: userId,
        mentionerUser: userData,
        mentionedUserIds,
        postId,
        commentId: commentRef.id,
        contentType: 'comment',
        contentText: text,
        alreadyNotified: [],
      })

      // Update comment with notified mentions for edit tracking
      if (notifiedMentions.length > 0) {
        await commentRef.update({
          notifiedMentions,
        })
      }
    }

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

    // Update comment count on post (use set with merge to handle song posts)
    await db.collection('posts').doc(postId).set({
      commentCount: admin.firestore.FieldValue.increment(-1),
    }, { merge: true })

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
 * List posts from a user's profile feed
 * Returns posts created by this user (their own content)
 */
exports.listProfileFeedPosts = functions.https.onCall(async (data, context) => {
  const { userID, limit = 50, lastPostId, page = 0, size = 25 } = data

  if (!userID) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required')
  }

  try {
    // First try to get from profile_feed_live (fan-out collection)
    let query = db
      .collection('social_feeds')
      .doc(userID)
      .collection('profile_feed_live')
      .orderBy('createdAt', 'desc')
      .limit(size || limit)

    if (lastPostId) {
      const lastDoc = await db
        .collection('social_feeds')
        .doc(userID)
        .collection('profile_feed_live')
        .doc(lastPostId)
        .get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    const snapshot = await query.get()
    let posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    // If no posts in profile_feed_live, try querying main posts collection by authorID
    if (posts.length === 0) {
      console.log(`[listProfileFeedPosts] No posts in profile_feed_live for ${userID}, trying posts collection`)
      const mainPostsQuery = db
        .collection('posts')
        .where('authorID', '==', userID)
        .orderBy('createdAt', 'desc')
        .limit(size || limit)

      const mainSnapshot = await mainPostsQuery.get()
      posts = mainSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      // If found posts in main collection, backfill to profile_feed_live for future queries
      if (posts.length > 0) {
        console.log(`[listProfileFeedPosts] Found ${posts.length} posts in main collection, backfilling to profile_feed_live`)
        const batch = db.batch()
        posts.forEach(post => {
          const profileFeedRef = db
            .collection('social_feeds')
            .doc(userID)
            .collection('profile_feed_live')
            .doc(post.id)
          batch.set(profileFeedRef, post, { merge: true })
        })
        await batch.commit()
      }
    }

    console.log(`[listProfileFeedPosts] Returning ${posts.length} posts for user ${userID}`)
    return { posts, success: true }
  } catch (error) {
    console.error('[listProfileFeedPosts] Error:', error)
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

/**
 * Edit an existing post
 * Updates description, mentions, hashtags, and notifies only NEW mentions
 */
exports.editPost = functions.https.onCall(async (data, context) => {
  const { postID, postAuthorID, description, hashtags: passedHashtags = [] } = data

  if (!postID || !postAuthorID) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'postID and postAuthorID are required'
    )
  }

  try {
    // Fetch the existing post
    const mainFeedPostRef = mainFeedRef.doc(postID)
    const postSnap = await mainFeedPostRef.get()

    if (!postSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Post not found')
    }

    const existingPost = postSnap.data()

    // Verify ownership
    if (existingPost.authorID !== postAuthorID) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only the author can edit this post'
      )
    }

    // Extract mentions and hashtags from new description
    const newMentionedUserIds = extractMentionIds(description)
    const extractedHashtags = extractHashtags(description)
    const allHashtags = [...new Set([...passedHashtags, ...extractedHashtags])]
      .map(tag => tag.toLowerCase())

    // Prepare update data
    const editedAt = Math.floor(Date.now() / 1000)
    const updateData = {
      description: description || '',
      postText: description || '', // Also update postText for backwards compatibility
      hashtags: allHashtags,
      mentionedUserIds: newMentionedUserIds,
      isEdited: true,
      editedAt,
    }

    // Update in main feed
    await mainFeedPostRef.update(updateData)

    // Update in author's profile feed
    const authorFeedRef = socialFeedsRef
      .doc(postAuthorID)
      .collection('profile_feed_live')
      .doc(postID)
    const authorFeedSnap = await authorFeedRef.get()
    if (authorFeedSnap.exists) {
      await authorFeedRef.update(updateData)
    }

    // Update in all followers' home feeds
    const followersSnap = await socialGraphRef
      .doc(postAuthorID)
      .collection('inbound_users')
      .get()

    const followerUpdatePromises = followersSnap.docs.map(async (followerDoc) => {
      const followerFeedRef = socialFeedsRef
        .doc(followerDoc.id)
        .collection('home_feed_live')
        .doc(postID)
      const followerPostSnap = await followerFeedRef.get()
      if (followerPostSnap.exists) {
        await followerFeedRef.update(updateData)
      }
    })
    await Promise.all(followerUpdatePromises)

    // Handle hashtag feeds - remove from old, add to new
    const oldHashtags = existingPost.hashtags || []

    // Remove from old hashtag feeds that are no longer present
    const removedHashtags = oldHashtags.filter(tag => !allHashtags.includes(tag))
    const removePromises = removedHashtags.map(async (tag) => {
      await db
        .collection('hashtags')
        .doc(tag)
        .collection('feed_live')
        .doc(postID)
        .delete()
    })
    await Promise.all(removePromises)

    // Add to new hashtag feeds
    const addedHashtags = allHashtags.filter(tag => !oldHashtags.includes(tag))
    const addPromises = addedHashtags.map(async (tag) => {
      const hashtagData = {
        ...existingPost,
        ...updateData,
        id: postID,
      }
      await db
        .collection('hashtags')
        .doc(tag)
        .collection('feed_live')
        .doc(postID)
        .set(hashtagData)
    })
    await Promise.all(addPromises)

    // Update existing hashtag feeds with new data (use set with merge in case doc doesn't exist)
    const existingHashtags = allHashtags.filter(tag => oldHashtags.includes(tag))
    const updateHashtagPromises = existingHashtags.map(async (tag) => {
      const hashtagFeedRef = db
        .collection('hashtags')
        .doc(tag)
        .collection('feed_live')
        .doc(postID)
      const hashtagSnap = await hashtagFeedRef.get()
      if (hashtagSnap.exists) {
        await hashtagFeedRef.update(updateData)
      } else {
        // Document doesn't exist, create it with full data
        const hashtagData = {
          ...existingPost,
          ...updateData,
          id: postID,
        }
        await hashtagFeedRef.set(hashtagData)
      }
    })
    await Promise.all(updateHashtagPromises)

    // Send notifications only to NEW mentions
    const oldNotified = existingPost.notifiedMentions || []
    const newMentionsToNotify = newMentionedUserIds.filter(
      id => !oldNotified.includes(id)
    )

    if (newMentionsToNotify.length > 0) {
      const author = await fetchUser(postAuthorID)

      const notifiedUserIds = await processMentionNotifications({
        mentionerID: postAuthorID,
        mentionerUser: author,
        mentionedUserIds: newMentionsToNotify,
        postId: postID,
        commentId: null,
        contentType: 'post',
        contentText: description,
        alreadyNotified: oldNotified,
      })

      // Update notifiedMentions array
      const allNotified = [...new Set([...oldNotified, ...notifiedUserIds])]
      await mainFeedPostRef.update({ notifiedMentions: allNotified })
      // Only update author feed if it exists
      const authorFeedExists = (await authorFeedRef.get()).exists
      if (authorFeedExists) {
        await authorFeedRef.update({ notifiedMentions: allNotified })
      }
    }

    console.log(`[editPost] Successfully edited post ${postID}`)
    return { success: true, postID }
  } catch (error) {
    console.error('[editPost] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Edit an existing comment
 * Updates text, mentions, hashtags, and notifies only NEW mentions
 */
exports.editComment = functions.https.onCall(async (data, context) => {
  // Support both naming conventions (client uses lowercase, legacy uses uppercase)
  const postID = data.postID || data.postId
  const commentID = data.commentID || data.commentId
  const authorID = data.authorID || data.userId
  const text = data.text || data.newText

  if (!postID || !commentID || !authorID || !text) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'postID/postId, commentID/commentId, authorID/userId, and text/newText are required'
    )
  }

  try {
    // Fetch the existing comment
    const commentRef = mainFeedRef
      .doc(postID)
      .collection('comments_live')
      .doc(commentID)
    const commentSnap = await commentRef.get()

    if (!commentSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Comment not found')
    }

    const existingComment = commentSnap.data()

    // Verify ownership
    if (existingComment.authorID !== authorID) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only the author can edit this comment'
      )
    }

    // Extract mentions and hashtags from new text
    const newMentionedUserIds = extractMentionIds(text)
    const newHashtags = extractHashtags(text)

    // Prepare update data
    const editedAt = Math.floor(Date.now() / 1000)
    const updateData = {
      text,
      mentionedUserIds: newMentionedUserIds,
      hashtags: newHashtags,
      isEdited: true,
      editedAt,
    }

    // Update the comment
    await commentRef.update(updateData)

    // Send notifications only to NEW mentions
    const oldNotified = existingComment.notifiedMentions || []
    const newMentionsToNotify = newMentionedUserIds.filter(
      id => !oldNotified.includes(id)
    )

    if (newMentionsToNotify.length > 0) {
      const author = await fetchUser(authorID)

      const notifiedUserIds = await processMentionNotifications({
        mentionerID: authorID,
        mentionerUser: author,
        mentionedUserIds: newMentionsToNotify,
        postId: postID,
        commentId: commentID,
        contentType: 'comment',
        contentText: text,
        alreadyNotified: oldNotified,
      })

      // Update notifiedMentions array
      const allNotified = [...new Set([...oldNotified, ...notifiedUserIds])]
      await commentRef.update({ notifiedMentions: allNotified })
    }

    console.log(`[editComment] Successfully edited comment ${commentID} on post ${postID}`)
    return { success: true, commentID }
  } catch (error) {
    console.error('[editComment] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

// ============================================
// STORIES FUNCTIONS
// ============================================

/**
 * Add a new story
 * Stories are ephemeral content that expire after 24 hours
 * Fans out to followers' stories_feed_live collections
 */
exports.addStory = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { storyMediaURL, storyType = 'image' } = data

  if (!storyMediaURL) {
    throw new functions.https.HttpsError('invalid-argument', 'Story must have a media URL')
  }

  const validTypes = ['image', 'video']
  if (!validTypes.includes(storyType)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid story type')
  }

  try {
    // Get author info
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    const storyData = {
      authorID: userId,
      author: {
        id: userId,
        username: userData.username || userData.firstName || 'Anonymous',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        profilePictureURL: userData.profilePictureURL || '',
      },
      storyMediaURL,
      storyType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      reactions: {},
      viewedBy: [],
    }

    // Create story in global stories collection
    const storyRef = await db.collection('stories').add(storyData)
    const storyId = storyRef.id
    storyData.id = storyId

    // Add to author's stories_feed_live (for their own story tray)
    await db
      .collection('social_feeds')
      .doc(userId)
      .collection('stories_feed_live')
      .doc(storyId)
      .set(storyData)

    // Fan out to followers' stories_feed_live
    const followersSnapshot = await db
      .collection('social_graph')
      .doc(userId)
      .collection('inbound_users')
      .get()

    if (followersSnapshot.size > 0) {
      const batch = db.batch()
      followersSnapshot.docs.forEach(followerDoc => {
        const followerId = followerDoc.id
        const feedRef = db
          .collection('social_feeds')
          .doc(followerId)
          .collection('stories_feed_live')
          .doc(storyId)
        batch.set(feedRef, storyData)
      })
      await batch.commit()
    }

    console.log(`[addStory] Created story ${storyId} for user ${userId}, fanned to ${followersSnapshot.size} followers`)
    return { storyId, success: true }
  } catch (error) {
    console.error('[addStory] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * List stories for the current user
 * Returns stories from users they follow, grouped by author
 * Filters out expired stories (older than 24 hours)
 */
exports.listStories = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { limit = 100 } = data

  try {
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Query user's stories_feed_live
    const snapshot = await db
      .collection('social_feeds')
      .doc(userId)
      .collection('stories_feed_live')
      .where('createdAt', '>', twentyFourHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    const stories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Group stories by author
    const groupedStories = {}
    stories.forEach(story => {
      const authorId = story.authorID
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = {
          author: story.author,
          stories: [],
        }
      }
      groupedStories[authorId].stories.push(story)
    })

    // Convert to array format
    const groupedArray = Object.entries(groupedStories).map(([authorId, data]) => ({
      authorId,
      author: data.author,
      stories: data.stories,
    }))

    console.log(`[listStories] Returning ${stories.length} stories in ${groupedArray.length} groups for user ${userId}`)
    return { stories: groupedArray, success: true }
  } catch (error) {
    console.error('[listStories] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Add a reaction (emoji) to a story
 */
exports.addStoryReaction = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid || data.userId
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { storyId, emoji } = data

  if (!storyId || !emoji) {
    throw new functions.https.HttpsError('invalid-argument', 'Story ID and emoji are required')
  }

  try {
    // Get the story to verify it exists
    const storyDoc = await db.collection('stories').doc(storyId).get()
    if (!storyDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Story not found')
    }

    const storyData = storyDoc.data()
    const storyAuthorId = storyData.authorID

    // Update reactions in the main stories collection
    // reactions is a map where key is emoji and value is array of userIds
    await db.collection('stories').doc(storyId).update({
      [`reactions.${emoji}`]: admin.firestore.FieldValue.arrayUnion(userId),
    })

    // Also update in author's stories_feed_live
    await db
      .collection('social_feeds')
      .doc(storyAuthorId)
      .collection('stories_feed_live')
      .doc(storyId)
      .update({
        [`reactions.${emoji}`]: admin.firestore.FieldValue.arrayUnion(userId),
      })

    console.log(`[addStoryReaction] User ${userId} reacted with ${emoji} to story ${storyId}`)
    return { success: true }
  } catch (error) {
    console.error('[addStoryReaction] Error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
