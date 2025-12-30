# Cloud Functions Reference

## Summary
- **Total Active Functions:** 62
- **Disabled Functions:** 5 (Dating features + thumbnail generation)
- **Project ID:** `letsmakemusic-4e0fe`
- **Region:** `us-central1`

## Functions by Category

| Category | Function Name | Type | Status |
|----------|--------------|------|--------|
| **Media Upload** | | | |
| | `uploadMedia` | Callable | ✅ Implemented |
| | `uploadVideoFromUrl` | Callable | ✅ Implemented |
| | `uploadAudioFromUrl` | Callable | ✅ Implemented |
| | `uploadImageFromUrl` | Callable | ✅ Implemented |
| **Audio Processing** | | | |
| | `concatenateAudio` | Callable | ✅ Implemented |
| | `concatenateAudioHTTP` | HTTP | ✅ Implemented |
| **User Reporting** | | | |
| | `fetchBlockedUsers` | Callable | ✅ Implemented |
| | `markAbuse` | Callable | ✅ Implemented |
| | `unblockUser` | Callable | ✅ Implemented |
| | `onReportWrite` | Trigger | ✅ Implemented |
| **Chat** | | | |
| | `fetchMessagesOfFormerParticipant` | Callable | ✅ Implemented |
| | `listMessages` | Callable | ✅ Implemented |
| | `insertMessage` | Callable | ✅ Implemented |
| | `deleteMessage` | Callable | ✅ Implemented |
| | `createChannel` | Callable | ✅ Implemented |
| | `markAsRead` | Callable | ✅ Implemented |
| | `markUserAsTypingInChannel` | Callable | ✅ Implemented |
| | `addMessageReaction` | Callable | ✅ Implemented |
| | `listChannels` | Callable | ✅ Implemented |
| **Social Graph** | | | |
| | `searchUsers` | Callable | ✅ Implemented |
| | `add` | Callable | ✅ Implemented |
| | `unfriend` | Callable | ✅ Implemented |
| | `unfollow` | Callable | ✅ Implemented |
| | `fetchFriends` | Callable | ✅ Implemented |
| | `fetchFriendships` | Callable | ✅ Implemented |
| | `fetchOtherUserFriendships` | Callable | ✅ Implemented |
| **Profile** | | | |
| | `fetchProfile` | Callable | ✅ Implemented |
| **Triggers** | | | |
| | `propagateUserProfileUpdates` | Trigger | ✅ Implemented |
| **Feed** | | | |
| | `listHomeFeedPosts` | Callable | ✅ Implemented |
| | `listDiscoverFeedPosts` | Callable | ✅ Implemented |
| | `listProfileFeedPosts` | Callable | ✅ Implemented |
| | `listHashtagFeedPosts` | Callable | ✅ Implemented |
| | `addPost` | Callable | ✅ Implemented |
| | `deletePost` | Callable | ✅ Implemented |
| | `editPost` | Callable | ✅ Implemented |
| | `addReaction` | Callable | ✅ Implemented |
| | `addComment` | Callable | ✅ Implemented |
| | `deleteComment` | Callable | ✅ Implemented |
| | `editComment` | Callable | ✅ Implemented |
| | `listComments` | Callable | ✅ Implemented |
| **Stories** | | | |
| | `addStory` | Callable | ✅ Implemented |
| | `listStories` | Callable | ✅ Implemented |
| | `addStoryReaction` | Callable | ✅ Implemented |
| **Songs** | | | |
| | `createSongPost` | Callable | ✅ Implemented |
| | `onSongCreated` | Trigger | ✅ Implemented |
| **Seed/Migration** | | | |
| | `seedMusicTestUsers` | Callable | ✅ Implemented |
| | `seedMusicTestUsersHTTP` | HTTP | ✅ Implemented |
| | `makeTestUsersFollowUser` | Callable | ✅ Implemented |
| | `makeTestUsersFollowUserHTTP` | HTTP | ✅ Implemented |
| | `followTestUsersAndPopulateFeed` | Callable | ✅ Implemented |
| | `migrateSongsToCorrectBucket` | Callable | ✅ Implemented |
| | `migrateSongsToCorrectBucketHTTP` | HTTP | ✅ Implemented |
| | `backfillSongAuthors` | Callable | ✅ Implemented |
| | `backfillSongAuthorsHTTP` | HTTP | ✅ Implemented |
| | `backfillSunoId` | Callable | ✅ Implemented |
| | `backfillSunoIdHTTP` | HTTP | ✅ Implemented |
| | `checkSongSunoId` | Callable | ✅ Implemented |
| | `backfillProfileFeed` | Callable | ✅ Implemented |
| | `backfillProfileFeedHTTP` | HTTP | ✅ Implemented |
| | `seedRealTestData` | Callable | ✅ Implemented |
| | `seedRealTestDataHTTP` | HTTP | ✅ Implemented |
| | `addSongRights` | Callable | ✅ Implemented |
| **Utilities** | | | |
| | `checkRealUrlsHTTP` | HTTP | ✅ Implemented |
| | `makeAudioFilesPublicHTTP` | HTTP | ✅ Implemented |
| **Debug** | | | |
| | `debugCheckLikes` | HTTP | ✅ Implemented |
| | `debugCheckComments` | HTTP | ✅ Implemented |
| | `testAddComment` | HTTP | ✅ Implemented |
| | `backfillCommentCounts` | HTTP | ✅ Implemented |
| | `syncStageNamesHTTP` | HTTP | ✅ Implemented |
| | `diagnoseSongsForVideo` | HTTP | ✅ Implemented |
| **Disabled** | | | |
| | `onDatingUserDataWrite` | Trigger | ❌ Disabled |
| | `onDatingUserRecommendationsUpdate` | Trigger | ❌ Disabled |
| | `addUserSwipe` | Callable | ❌ Disabled |
| | `fetchMatches` | Callable | ❌ Disabled |
| | `generateThumbnail` | Trigger | ❌ Disabled |

## Function Types

- **Callable**: Invoked from client SDK via `httpsCallable()`
- **HTTP**: Direct HTTP endpoint accessible via URL
- **Trigger**: Automatically invoked by Firestore/Storage events

## Source Files

| File Path | Functions |
|-----------|-----------|
| `functions/index.js` | Main exports, debug functions |
| `functions/media/upload.js` | `uploadMedia` |
| `functions/media/uploadVideoFromUrl.js` | `uploadVideoFromUrl` |
| `functions/media/uploadAudioFromUrl.js` | `uploadAudioFromUrl` |
| `functions/media/uploadImageFromUrl.js` | `uploadImageFromUrl` |
| `functions/audio/concatenate.js` | `concatenateAudio`, `concatenateAudioHTTP` |
| `functions/user-reporting/user-reporting.js` | User reporting functions |
| `functions/user-reporting/triggers.js` | `onReportWrite` |
| `functions/chat/chat.js` | All chat functions |
| `functions/social-graph/social-graph.js` | Social graph functions |
| `functions/profile/profile.js` | `fetchProfile` |
| `functions/triggers.js` | `propagateUserProfileUpdates` |
| `functions/feed/feed.js` | Feed and story functions |
| `functions/songs/createSongPost.js` | `createSongPost` |
| `functions/songs/autoPostSong.js` | `onSongCreated` |
| `functions/seed/musicAppSeed.js` | Test user seeding |
| `functions/seed/migrateSongsToCorrectBucket.js` | Song migration |
| `functions/seed/backfillSongAuthors.js` | Author backfill |
| `functions/seed/backfillSunoId.js` | Suno ID backfill |
| `functions/seed/backfillProfileFeed.js` | Profile feed backfill |
| `functions/seed/seedRealTestData.js` | Real test data seeding |
| `functions/seed/addSongRights.js` | Song rights migration |
| `functions/utils/checkRealUrls.js` | URL checking utility |
| `functions/utils/makeAudioFilesPublic.js` | Audio file permissions |

## HTTP Endpoint URLs

Base URL: `https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/`

| Function | URL |
|----------|-----|
| `concatenateAudioHTTP` | `.../concatenateAudioHTTP` |
| `seedMusicTestUsersHTTP` | `.../seedMusicTestUsersHTTP` |
| `makeTestUsersFollowUserHTTP` | `.../makeTestUsersFollowUserHTTP` |
| `migrateSongsToCorrectBucketHTTP` | `.../migrateSongsToCorrectBucketHTTP` |
| `backfillSongAuthorsHTTP` | `.../backfillSongAuthorsHTTP` |
| `backfillSunoIdHTTP` | `.../backfillSunoIdHTTP` |
| `backfillProfileFeedHTTP` | `.../backfillProfileFeedHTTP` |
| `seedRealTestDataHTTP` | `.../seedRealTestDataHTTP` |
| `checkRealUrlsHTTP` | `.../checkRealUrlsHTTP` |
| `makeAudioFilesPublicHTTP` | `.../makeAudioFilesPublicHTTP` |
| `debugCheckLikes` | `.../debugCheckLikes` |
| `debugCheckComments` | `.../debugCheckComments` |
| `testAddComment` | `.../testAddComment` |
| `backfillCommentCounts` | `.../backfillCommentCounts` |
| `syncStageNamesHTTP` | `.../syncStageNamesHTTP` |
| `diagnoseSongsForVideo` | `.../diagnoseSongsForVideo` |

---
*Last updated: 2025-12-30*
