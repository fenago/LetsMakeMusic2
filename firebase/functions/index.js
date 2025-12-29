const admin = require('firebase-admin')
admin.initializeApp()

const triggers = require('./triggers')

const media = require('./media/upload')
exports.uploadMedia = media.uploadMedia

// video backup - download from URL and store in Firebase Storage
const videoUpload = require('./media/uploadVideoFromUrl')
exports.uploadVideoFromUrl = videoUpload.uploadVideoFromUrl

// audio backup - download from URL and store in Firebase Storage
const audioUpload = require('./media/uploadAudioFromUrl')
exports.uploadAudioFromUrl = audioUpload.uploadAudioFromUrl

// image backup - download from URL and store in Firebase Storage
const imageUpload = require('./media/uploadImageFromUrl')
exports.uploadImageFromUrl = imageUpload.uploadImageFromUrl

// audio processing
const audioConcatenate = require('./audio/concatenate')
exports.concatenateAudio = audioConcatenate.concatenateAudio
exports.concatenateAudioHTTP = audioConcatenate.concatenateAudioHTTP


// user reporting
const userReporting = require('./user-reporting/user-reporting')
const { onReportWrite } = require('./user-reporting/triggers')
exports.fetchBlockedUsers = userReporting.fetchBlockedUsers
exports.markAbuse = userReporting.markAbuse
exports.unblockUser = userReporting.unblockUser
exports.onReportWrite = onReportWrite

// chat
const chat = require('./chat/chat')
exports.fetchMessagesOfFormerParticipant = chat.fetchMessagesOfFormerParticipant
exports.listMessages = chat.listMessages
exports.insertMessage = chat.insertMessage

exports.deleteMessage = chat.deleteMessage
exports.createChannel = chat.createChannel
exports.markAsRead = chat.markAsRead
exports.markUserAsTypingInChannel = chat.markUserAsTypingInChannel
exports.addMessageReaction = chat.addMessageReaction

exports.listChannels = chat.listChannels

// social graph (friendships, followers, search)
const socialGraph = require('./social-graph/social-graph')
exports.searchUsers = socialGraph.searchUsers
exports.add = socialGraph.add
exports.unfriend = socialGraph.unfriend
exports.unfollow = socialGraph.unfollow
exports.fetchFriends = socialGraph.fetchFriends
exports.fetchFriendships = socialGraph.fetchFriendships
exports.fetchOtherUserFriendships = socialGraph.fetchOtherUserFriendships

// profile
const profile = require('./profile/profile')
exports.fetchProfile = profile.fetchProfile

// dating - disabled for LetsMake.Music (not needed for this app)
// const datingRecommendation = require('./dating/recommendationTriggers')
// const datingSwipes = require('./dating/dating')
// exports.onDatingUserDataWrite = datingRecommendation.onUserDataWrite
// exports.onDatingUserRecommendationsUpdate =
//   datingRecommendation.onUserRecommendationsUpdate
// exports.addUserSwipe = datingSwipes.addUserSwipe
// exports.fetchMatches = datingSwipes.fetchMatches




// Production triggers
exports.propagateUserProfileUpdates = triggers.propagateUserProfileUpdates



// const imageProcessing = require('./core/imageProcessing')
// exports.generateThumbnail = imageProcessing.generateThumbnail;


/* INSERT_FIREBASE_FUNCTION */

// feed - social feed operations (SONGS AND VIDEOS ARE EQUAL CITIZENS)
const feed = require('./feed/feed')
exports.listHomeFeedPosts = feed.listHomeFeedPosts
exports.listDiscoverFeedPosts = feed.listDiscoverFeedPosts
exports.addPost = feed.addPost
exports.deletePost = feed.deletePost
exports.addReaction = feed.addReaction
exports.addComment = feed.addComment
exports.deleteComment = feed.deleteComment
exports.listComments = feed.listComments
exports.listHashtagFeedPosts = feed.listHashtagFeedPosts
exports.listProfileFeedPosts = feed.listProfileFeedPosts
exports.editPost = feed.editPost
exports.editComment = feed.editComment

// stories - ephemeral 24-hour content
exports.addStory = feed.addStory
exports.listStories = feed.listStories
exports.addStoryReaction = feed.addStoryReaction

// songs - song sharing to social feed
const songs = require('./songs/createSongPost')
exports.createSongPost = songs.createSongPost

// songs - auto-post trigger (creates post when song is created)
const autoPostSong = require('./songs/autoPostSong')
exports.onSongCreated = autoPostSong.onSongCreated

// seed - LetsMakeMusic test users
const musicSeed = require('./seed/musicAppSeed')
exports.seedMusicTestUsers = musicSeed.seedMusicTestUsers
exports.seedMusicTestUsersHTTP = musicSeed.seedMusicTestUsersHTTP
exports.makeTestUsersFollowUser = musicSeed.makeTestUsersFollowUser
exports.makeTestUsersFollowUserHTTP = musicSeed.makeTestUsersFollowUserHTTP
exports.followTestUsersAndPopulateFeed = musicSeed.followTestUsersAndPopulateFeed

// song migration - migrate songs from wrong Firebase bucket to correct bucket
const songMigration = require('./seed/migrateSongsToCorrectBucket')
exports.migrateSongsToCorrectBucket = songMigration.migrateSongsToCorrectBucket
exports.migrateSongsToCorrectBucketHTTP = songMigration.migrateSongsToCorrectBucketHTTP

// backfill song authors - populate author data on existing songs from users collection
const backfillAuthors = require('./seed/backfillSongAuthors')
exports.backfillSongAuthors = backfillAuthors.backfillSongAuthors
exports.backfillSongAuthorsHTTP = backfillAuthors.backfillSongAuthorsHTTP

// backfill sunoId - extract sunoId from audio URLs for old songs missing this field
const backfillSunoId = require('./seed/backfillSunoId')
exports.backfillSunoId = backfillSunoId.backfillSunoId
exports.backfillSunoIdHTTP = backfillSunoId.backfillSunoIdHTTP
exports.checkSongSunoId = backfillSunoId.checkSongSunoId

// backfill profile_feed_live - ensure all users have their songs in their profile feed
const backfillProfileFeed = require('./seed/backfillProfileFeed')
exports.backfillProfileFeed = backfillProfileFeed.backfillProfileFeed
exports.backfillProfileFeedHTTP = backfillProfileFeed.backfillProfileFeedHTTP

// seed REAL test data - creates working video and song posts
const seedRealData = require('./seed/seedRealTestData')
exports.seedRealTestData = seedRealData.seedRealTestData
exports.seedRealTestDataHTTP = seedRealData.seedRealTestDataHTTP

// add song rights - migrate existing songs to include rights schema
const addSongRights = require('./seed/addSongRights')
exports.addSongRights = addSongRights.addSongRights

// utility - check for real Firebase URLs in database
const checkRealUrls = require('./utils/checkRealUrls')
exports.checkRealUrlsHTTP = checkRealUrls.checkRealUrlsHTTP

// utility - make audio files publicly accessible
const makePublic = require('./utils/makeAudioFilesPublic')
exports.makeAudioFilesPublicHTTP = makePublic.makeAudioFilesPublicHTTP

// Debug function to check likes for a song
const functions = require('firebase-functions')
exports.debugCheckLikes = functions.https.onRequest(async (req, res) => {
  const { songId, userId, action } = req.query
  const db = admin.firestore()

  // Find all likes across all songs
  if (action === 'findAllLikes') {
    const songsSnapshot = await db.collection('songs').limit(20).get()
    const allLikes = []
    for (const songDoc of songsSnapshot.docs) {
      const likesSnapshot = await db.collection('songs').doc(songDoc.id).collection('likes').get()
      likesSnapshot.docs.forEach(likeDoc => {
        allLikes.push({
          songId: songDoc.id,
          songTitle: songDoc.data().title,
          userId: likeDoc.id,
          likedAt: likeDoc.data().likedAt,
        })
      })
    }
    return res.json({ totalLikes: allLikes.length, likes: allLikes })
  }

  // Find all user likedSongs
  if (action === 'findUserLikedSongs' && userId) {
    const likedSnapshot = await db.collection('users').doc(userId).collection('likedSongs').get()
    const likedSongs = likedSnapshot.docs.map(doc => ({
      songId: doc.id,
      ...doc.data(),
    }))
    return res.json({ userId, totalLiked: likedSongs.length, likedSongs })
  }

  // If no songId, list first 10 songs
  if (!songId) {
    const songsSnapshot = await db.collection('songs').orderBy('createdAt', 'desc').limit(10).get()
    const songs = songsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      likeCount: doc.data().likeCount || 0,
    }))
    return res.json({ songs })
  }

  const result = {
    songId,
    userId,
    songExists: false,
    likesSubcollection: [],
    userLikedSong: null,
  }

  // Check if song exists
  const songDoc = await db.collection('songs').doc(songId).get()
  result.songExists = songDoc.exists
  if (songDoc.exists) {
    result.songData = { likeCount: songDoc.data().likeCount, title: songDoc.data().title }
  }

  // Get all likes for this song
  const likesSnapshot = await db.collection('songs').doc(songId).collection('likes').get()
  result.likesSubcollection = likesSnapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() }))

  // If userId provided, check user's likedSongs
  if (userId) {
    const userLikeDoc = await db.collection('users').doc(userId).collection('likedSongs').doc(songId).get()
    result.userLikedSong = userLikeDoc.exists ? userLikeDoc.data() : null

    // Also check if specific like exists
    const specificLike = await db.collection('songs').doc(songId).collection('likes').doc(userId).get()
    result.specificLikeExists = specificLike.exists
  }

  res.json(result)
})

// Debug function to check comments for a post
exports.debugCheckComments = functions.https.onRequest(async (req, res) => {
  const { postId, action } = req.query
  const db = admin.firestore()

  try {
    // Action: Find all posts with comments
    if (action === 'findAllComments') {
      const postsSnapshot = await db.collection('posts').limit(20).get()
      const allComments = []
      for (const postDoc of postsSnapshot.docs) {
        const commentsSnapshot = await db.collection('posts').doc(postDoc.id).collection('comments_live').get()
        commentsSnapshot.docs.forEach(commentDoc => {
          allComments.push({
            postId: postDoc.id,
            postTitle: postDoc.data().postText || postDoc.data().songData?.title || 'Unknown',
            commentId: commentDoc.id,
            text: commentDoc.data().text,
            authorId: commentDoc.data().authorID,
            createdAt: commentDoc.data().createdAt,
          })
        })
      }
      return res.json({ totalComments: allComments.length, comments: allComments })
    }

    // Action: List recent posts
    if (!postId || action === 'listPosts') {
      const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(10).get()
      const posts = []
      for (const doc of postsSnapshot.docs) {
        const data = doc.data()
        // Count comments
        const commentsSnapshot = await db.collection('posts').doc(doc.id).collection('comments_live').get()
        posts.push({
          id: doc.id,
          postText: data.postText,
          songTitle: data.songData?.title,
          authorId: data.authorID,
          commentCount: commentsSnapshot.size,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        })
      }
      return res.json({ posts })
    }

    // Get comments for specific post
    const result = {
      postId,
      postExists: false,
      comments: [],
    }

    // Check if post exists
    const postDoc = await db.collection('posts').doc(postId).get()
    result.postExists = postDoc.exists
    if (postDoc.exists) {
      const data = postDoc.data()
      result.postData = {
        postText: data.postText,
        songTitle: data.songData?.title,
        authorId: data.authorID,
        commentCount: data.commentCount,
        hasCommentCountField: 'commentCount' in data,
      }
    }

    // Get all comments for this post
    const commentsSnapshot = await db.collection('posts').doc(postId).collection('comments_live').orderBy('createdAt', 'desc').get()
    result.comments = commentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }))
    result.totalComments = result.comments.length

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})

// Test function to add a comment directly to database (bypasses client)
exports.testAddComment = functions.https.onRequest(async (req, res) => {
  const { postId, text, authorId } = req.query
  const db = admin.firestore()

  if (!postId) {
    // List posts if no postId provided
    const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(5).get()
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().songData?.title || doc.data().postText?.substring(0, 30) || 'Unknown',
    }))
    return res.json({ message: 'Provide postId to add a comment', posts })
  }

  try {
    // Fetch the actual user profile
    let authorData = {
      id: authorId || 'anonymous',
      username: 'Anonymous',
      firstName: '',
      lastName: '',
      profilePictureURL: '',
    }

    if (authorId) {
      const userDoc = await db.collection('users').doc(authorId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        authorData = {
          id: authorId,
          username: userData.username || userData.firstName || 'User',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          profilePictureURL: userData.profilePictureURL || '',
        }
      }
    }

    const commentRef = db.collection('posts').doc(postId).collection('comments_live').doc()
    const commentData = {
      id: commentRef.id,
      authorID: authorId || 'anonymous',
      author: authorData,
      text: text || 'Comment ' + new Date().toISOString(),
      parentCommentId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reactions: { like: 0 },
    }

    await commentRef.set(commentData)

    // Increment comment count on the post
    await db.collection('posts').doc(postId).update({
      commentCount: admin.firestore.FieldValue.increment(1),
    })

    res.json({
      success: true,
      message: 'Comment added successfully',
      commentId: commentRef.id,
      postId,
      commentData,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Backfill commentCount for all posts based on actual comment count
exports.backfillCommentCounts = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore()
  const { dryRun = 'true' } = req.query
  const isDryRun = dryRun !== 'false'

  try {
    const postsSnapshot = await db.collection('posts').get()
    const results = []

    for (const postDoc of postsSnapshot.docs) {
      const postId = postDoc.id
      const currentCount = postDoc.data().commentCount || 0

      // Count actual comments
      const commentsSnapshot = await db.collection('posts').doc(postId).collection('comments_live').get()
      const actualCount = commentsSnapshot.size

      if (actualCount !== currentCount) {
        if (!isDryRun) {
          await db.collection('posts').doc(postId).update({
            commentCount: actualCount,
          })
        }
        results.push({
          postId,
          title: postDoc.data().songData?.title || postDoc.data().postText?.substring(0, 30) || 'Unknown',
          oldCount: currentCount,
          newCount: actualCount,
          updated: !isDryRun,
        })
      }
    }

    res.json({
      success: true,
      dryRun: isDryRun,
      message: isDryRun ? 'Dry run - no changes made. Set dryRun=false to apply.' : 'Comment counts updated!',
      postsChecked: postsSnapshot.size,
      postsNeedingUpdate: results.length,
      updates: results,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Migrate existing users: sync stageName with username
// Stage Name = Username (they should always be the same)
exports.syncStageNamesHTTP = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore()
  const { dryRun = 'true' } = req.query
  const isDryRun = dryRun !== 'false'

  try {
    const usersSnapshot = await db.collection('users').get()
    const results = {
      updated: [],
      skipped: [],
      alreadySynced: [],
    }

    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data()
      const userId = userDoc.id
      const username = data.username || ''
      const currentStageName = data.stageName

      // If stageName already matches username, skip
      if (currentStageName === username) {
        results.alreadySynced.push({
          userId,
          username,
          stageName: currentStageName,
        })
        continue
      }

      // If no username, skip (can't set stageName without username)
      if (!username) {
        results.skipped.push({
          userId,
          reason: 'No username set',
          firstName: data.firstName || '',
          email: data.email || '',
        })
        continue
      }

      // Update stageName to match username
      if (!isDryRun) {
        await db.collection('users').doc(userId).update({
          stageName: username,
        })
      }

      results.updated.push({
        userId,
        username,
        oldStageName: currentStageName || '(none)',
        newStageName: username,
      })
    }

    res.json({
      success: true,
      dryRun: isDryRun,
      message: isDryRun
        ? 'Dry run - no changes made. Set dryRun=false to apply.'
        : 'Stage names synced with usernames!',
      totalUsers: usersSnapshot.size,
      summary: {
        updated: results.updated.length,
        alreadySynced: results.alreadySynced.length,
        skipped: results.skipped.length,
      },
      details: results,
    })
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})

// Diagnostic function to check songs for video generation readiness
exports.diagnoseSongsForVideo = functions.https.onRequest(async (req, res) => {
  const { userId, limit = 20 } = req.query
  const db = admin.firestore()

  try {
    let query = db.collection('songs').orderBy('createdAt', 'desc').limit(parseInt(limit))
    if (userId) {
      query = db.collection('songs').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(parseInt(limit))
    }

    const snapshot = await query.get()
    const songs = []
    const issues = {
      missingSunoId: [],
      missingSunoTaskId: [],
      videoReady: [],
      hasVideo: [],
    }

    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const song = {
        id: doc.id,
        title: data.title,
        sunoId: data.sunoId || null,
        sunoTaskId: data.sunoTaskId || null,
        hasVideo: !!data.videoUrl,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
      songs.push(song)

      if (!data.sunoId) {
        issues.missingSunoId.push({ id: doc.id, title: data.title })
      }
      if (!data.sunoTaskId) {
        issues.missingSunoTaskId.push({ id: doc.id, title: data.title })
      }
      if (data.sunoId) {
        issues.videoReady.push({ id: doc.id, title: data.title })
      }
      if (data.videoUrl) {
        issues.hasVideo.push({ id: doc.id, title: data.title })
      }
    })

    res.json({
      totalSongs: songs.length,
      summary: {
        missingSunoId: issues.missingSunoId.length,
        missingSunoTaskId: issues.missingSunoTaskId.length,
        videoReady: issues.videoReady.length,
        hasVideo: issues.hasVideo.length,
      },
      issues,
      songs,
      note: 'Songs need sunoId to generate videos. sunoTaskId is optional (auto-generated if missing).',
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})