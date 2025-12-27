# Manual Testing Guide

## Auto-Share to Feed Feature

### What This Tests
The auto-share feature allows users to automatically share newly created songs to their social feed. This is controlled via a user setting and works for both:
- **New songs** created via the Create screen
- **Extended songs** created via the Extend Song feature

### Implementation Details
- **Setting location**: Profile → Settings → User Settings → Song Creation → Auto-share to Feed
- **Setting key**: `auto_share_to_feed` (stored as "On" or "Off" string)
- **Code locations**:
  - [CreateScreen.js](../ReactNativeTikTokApp/src/screens/CreateScreen/CreateScreen.js) - handles auto-share for new songs
  - [GenerationTaskContext.js](../ReactNativeTikTokApp/src/contexts/GenerationTaskContext.js) - handles auto-share for extended songs
  - [config/index.js](../ReactNativeTikTokApp/src/config/index.js) - defines the setting UI
- **Cloud function**: `createSongPost` - creates a post in the social feed

---

## Testing Steps

### 1. Enable the Setting
1. Go to **Profile** → **Settings** (gear icon)
2. Scroll to **Song Creation** section
3. Tap **"Auto-share to Feed"** and select **On**
4. Tap **Save**

### 2. Create a New Song
1. Go to **Create** tab
2. Generate a new song with any prompt
3. Wait for generation to complete
4. Watch for **"Sharing to feed..."** status message

### 3. Verify in Feed
1. Go to **Feed** tab
2. Your new song should appear as a post with caption: *"Just created a new song: [title] 🎵"*

### 4. Test Extended Songs
1. Go to **Library** → select a song
2. Use **Extend Song** feature
3. After extension completes, check **Feed** for the auto-shared post

### 5. Test Manual Share Still Works
1. Toggle auto-share **OFF** in Settings
2. Create another song
3. Verify it does **NOT** auto-share
4. Open the song → tap **3-dot menu** → **Share to Feed**
5. Confirm manual sharing still works

---

## Console Verification

Watch Metro logs for these messages:

**New song auto-share:**
```
Song auto-shared to feed: [songId]
```

**Extended song auto-share:**
```
[GenerationTask] Song auto-shared to feed: [songId]
```

**Errors (non-blocking):**
```
Could not auto-share song to feed: [error]
[GenerationTask] Could not auto-share song: [error]
```

---

## Expected Behavior

| Scenario | Auto-share ON | Auto-share OFF |
|----------|---------------|----------------|
| Create new song | Song appears in Feed automatically | Song does NOT appear in Feed |
| Extend song | Extended song appears in Feed automatically | Extended song does NOT appear in Feed |
| Manual share via menu | Works | Works |

---

## Related Files

- `firebase/functions/songs/createSongPost.js` - Cloud function that creates the feed post
- `ReactNativeTikTokApp/src/screens/ShareSongToFeedScreen/` - Manual share screen
- `ReactNativeTikTokApp/src/components/ui/SongActionMenu/` - 3-dot menu with Share to Feed option

---

# Feed Architecture

## Understanding the Different Feeds

The app has **two separate data sources** that display music:

### 1. Songs Collection (Today's Picks / Your Favorites)
- **Source**: Firestore `songs` collection
- **Location**: HomeFeed component's "Today's Picks" and "Your Favorites" sections
- **What shows here**: ALL songs created by any user
- **NOT affected by auto-share**: Songs appear here automatically when saved to Firebase

### 2. Social Feed (TikTok-style video/audio posts)
- **Source**: Firestore `posts` collection + fanout to `social_feeds`
- **Location**: HomeScreen's Following/For You tabs
- **What shows here**: Posts created via `createSongPost` cloud function
- **Affected by auto-share**: Songs only appear here when shared (auto or manual)

## Firestore Collections Used by createSongPost

When a song is shared to feed, the cloud function writes to:

| Collection | Path | Purpose |
|------------|------|---------|
| `posts` | `/posts/{postId}` | Main posts collection |
| `profile_feed_live` | `/social_feeds/{userId}/profile_feed_live/{postId}` | User's profile feed |
| `main_feed` | `/social_feeds/{userId}/main_feed/{postId}` | User's discovery feed |
| `hashtags` | `/hashtags/{tag}/feed_live/{postId}` | Hashtag-based feeds |
| `home_feed_live` | `/social_feeds/{followerId}/home_feed_live/{postId}` | Followers' home feeds (fanout) |

## Feed Hooks (Data Sources)

| Hook | Firestore Query | Used In |
|------|-----------------|---------|
| `useHomeFeedPosts()` | `social_feeds/{userId}/home_feed_live` | HomeScreen "Following" tab |
| `useDiscoverPosts()` | Cloud Function `listDiscoverFeedPosts` | HomeScreen "For You" tab |
| `subscribeToAllSongs()` | `songs` collection | HomeFeed "Today's Picks" |

## Key Fix Applied

The HomeScreen's `filterNonVideoFeed` function was filtering out audio-only posts. Fixed to include posts with `postType: 'song'`:

```javascript
// Before: Only video posts shown
return feedPost?.postMedia[0].type?.includes('video')

// After: Video AND song posts shown
if (feedPost.postType === 'song') return true
return feedPost?.postMedia[0].type?.includes('video')
```

---

# Troubleshooting

## Song appears in Today's Picks but not in Feed
- **Expected if auto-share is OFF**: Songs always save to `songs` collection
- **Check**: Enable auto-share in Settings or manually share via 3-dot menu

## Auto-share enabled but song still not in Feed
1. Check Metro logs for errors:
   - `Could not auto-share song to feed: [error]`
2. Check Firebase Console → Functions → Logs for `createSongPost` calls
3. Verify user is authenticated

## Post created but not visible in Feed
- The social feed shows posts from users you follow
- For testing, check the "For You" tab which shows all public posts
- Posts with `postType: 'song'` should now appear (after filter fix)

---

# Feed & Discover Page Testing

## Feed Page Structure (December 2024 Update)

The Feed page now shows the social feed by default on the **All** tab.

### Tab Structure

| Tab | Content |
|-----|---------|
| All | Social Feed (Following/For You) - **DEFAULT** |
| Music | Today's Picks, Favorites, Playlists, Artists, Radio |
| Videos | Social Feed (Following/For You) |
| Podcast | Future content |
| Radio | Future content |
| Events | Future content |

### Testing the Feed Page

1. **Open the Feed tab** (bottom navigation)
2. **Verify default view**: Should see the social feed with Following/For You toggle
3. **Toggle Following/For You**:
   - Following shows posts from followed users
   - For You shows all public posts
4. **Switch to Music tab**: Should see collapsible sections:
   - Today's Picks (carousel)
   - Your Favorites (list)
   - Playlist for You (horizontal scroll)
   - Artists (horizontal scroll)
   - Radio for You (horizontal scroll)
5. **Tap section headers**: Sections should collapse/expand
6. **Tap "View All" buttons**: Should navigate to full listings

### Collapsible Sections Features

Each section has:
- **Icon** with colored background
- **Title** (e.g., "Today's Picks")
- **Count badge** showing item count
- **Chevron** (up when expanded, down when collapsed)
- **"View All" button** (where applicable)

---

## Discover Page Structure (December 2024 Update)

The Discover page now has a complete restructure with search, filters, and collapsible sections.

### Testing the Discover Page

1. **Open the Discover tab** (bottom navigation)
2. **Verify search bar**: Should see search input at top
3. **Verify filter tabs**: All, Songs, Videos, Trending
4. **Test search**:
   - Type a search query
   - Results should filter in real-time
   - Recent Searches and Discover Something New sections hide when searching
5. **Test filter tabs**:
   - "Songs" shows only audio-only items
   - "Videos" shows only items with video
   - "All" shows everything
   - "Trending" shows everything (future: sorted by engagement)

### Discover Page Sections

| Section | Icon | Color | Content |
|---------|------|-------|---------|
| Recent Searches | Clock | Blue | User's past searches (chips) |
| Discover Something New | Sparkles | Orange | Random selection of songs (horizontal scroll) |
| AI Generated Songs | Music | Purple | All songs, filtered by tab/search |

### Testing Collapsible Sections

1. Tap the section header → should collapse/expand
2. Collapsed state shows only header with chevron down
3. Expanded state shows full content with chevron up

---

## Test Data: Sample Users with Songs

The seed function creates these test users with sample songs:

| Email | Password | Songs | Following |
|-------|----------|-------|-----------|
| artist1@test.com | Test123! | 3 songs | ernestolee |
| artist2@test.com | Test123! | 3 songs | ernestolee |
| artist3@test.com | Test123! | 3 songs | ernestolee |

To run the seed:
```bash
npx firebase-tools functions:call seedUsersAndSongs --project letsmakemusic-4e0fe
```

After seeding:
1. Log in as ernestolee
2. Go to Feed → For You tab
3. Should see posts from test artists
4. Go to Discover
5. Should see songs in all sections

---

## Quick Test Checklist

### Feed Page
- [ ] All tab shows social feed by default
- [ ] Following/For You toggle works
- [ ] Music tab shows Today's Picks, Favorites, etc.
- [ ] All sections are collapsible
- [ ] View All buttons are present
- [ ] Pull to refresh works

### Discover Page
- [ ] Search bar is visible
- [ ] Filter tabs work (All, Songs, Videos, Trending)
- [ ] Recent Searches shows past searches
- [ ] Discover Something New shows random songs
- [ ] AI Generated Songs section shows all songs
- [ ] Collapsible sections work
- [ ] Song cards play audio when tapped
- [ ] Like button works on song cards
- [ ] Pull to refresh works
