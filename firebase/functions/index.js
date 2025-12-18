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

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });