# Cloud Functions Reference

## Active Functions

Located in `firebase/functions/index.js`:

| Category | Functions |
|----------|-----------|
| **Media** | `uploadMedia` |
| **User Reporting** | `fetchBlockedUsers`, `markAbuse`, `unblockUser`, `onReportWrite` |
| **Chat** | `fetchMessagesOfFormerParticipant`, `listMessages`, `insertMessage`, `deleteMessage`, `createChannel`, `markAsRead`, `markUserAsTypingInChannel`, `addMessageReaction`, `listChannels` |
| **Social Graph** | `searchUsers`, `add`, `unfriend`, `unfollow`, `fetchFriends`, `fetchFriendships`, `fetchOtherUserFriendships` |
| **Profile** | `fetchProfile` |
| **Triggers** | `propagateUserProfileUpdates` |
| **Seed Data** | `seedMusicTestUsers`, `seedMusicTestUsersHTTP`, `makeTestUsersFollowUser`, `makeTestUsersFollowUserHTTP` |
| **Song Migration** | `migrateSongsToCorrectBucket`, `migrateSongsToCorrectBucketHTTP` |

**Note:** Dating functions are disabled (not needed for this app).

---

## Seed Data HTTP Endpoints

```bash
# Create test users
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/seedMusicTestUsersHTTP"

# Make test users follow a specific user
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/makeTestUsersFollowUserHTTP?username=ernestolee"
```

---

## Song Migration

Songs use Suno AI for generation. **Suno URLs expire after ~2 weeks**, so all audio must be backed up to Firebase Storage.

### Storage Bucket
**CRITICAL:** Always use the correct bucket: `letsmakemusic-4e0fe.firebasestorage.app`

### HTTP Endpoints

```bash
# Dry run - see which songs need migration (doesn't change anything)
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/migrateSongsToCorrectBucketHTTP?dryRun=true"

# Migrate songs (downloads from Suno CDN, uploads to correct Firebase bucket)
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/migrateSongsToCorrectBucketHTTP?limit=100"

# Migrate all songs (no limit)
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/migrateSongsToCorrectBucketHTTP"
```

### Migration Script Details
- **Location:** `firebase/functions/seed/migrateSongsToCorrectBucket.js`
- Migrates songs with missing or wrong-bucket `firebaseAudioUrl`
- Downloads from Suno CDN (`audioUrl`, `streamUrl`, or `sunoId` fallback)
- Uploads to correct Firebase Storage bucket
- Updates Firestore document with new `firebaseAudioUrl`

---

## Audio URL Fallback Strategy

The app uses centralized audio URL resolution in `src/utils/audioUtils.js`:

```javascript
// Priority order for playable URL:
// 1. firebaseAudioUrl (most reliable, won't expire)
// 2. audioUrl (Suno CDN, expires in ~2 weeks)
// 3. streamUrl (alternate Suno URL)
// 4. Construct from sunoId: https://cdn1.suno.ai/{sunoId}.mp3
```

### Troubleshooting Song Playback

If a song fails to play:
1. Check if `firebaseAudioUrl` exists and points to correct bucket
2. If not, run the migration script above
3. Suno CDN URLs expire - always backup to Firebase Storage
