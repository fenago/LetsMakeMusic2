const admin = require('firebase-admin')
admin.initializeApp()

const triggers = require('./triggers')

const media = require('./media/upload')
exports.uploadMedia = media.uploadMedia


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

// seed - LetsMakeMusic test users
const musicSeed = require('./seed/musicAppSeed')
exports.seedMusicTestUsers = musicSeed.seedMusicTestUsers
exports.seedMusicTestUsersHTTP = musicSeed.seedMusicTestUsersHTTP
exports.makeTestUsersFollowUser = musicSeed.makeTestUsersFollowUser
exports.makeTestUsersFollowUserHTTP = musicSeed.makeTestUsersFollowUserHTTP

// song migration - migrate songs from wrong Firebase bucket to correct bucket
const songMigration = require('./seed/migrateSongsToCorrectBucket')
exports.migrateSongsToCorrectBucket = songMigration.migrateSongsToCorrectBucket
exports.migrateSongsToCorrectBucketHTTP = songMigration.migrateSongsToCorrectBucketHTTP

// backfill song authors - populate author data on existing songs from users collection
const backfillAuthors = require('./seed/backfillSongAuthors')
exports.backfillSongAuthors = backfillAuthors.backfillSongAuthors
exports.backfillSongAuthorsHTTP = backfillAuthors.backfillSongAuthorsHTTP

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

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });