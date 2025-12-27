# Feed Architecture Analysis

## Current State (Problems)

### The Core Issue: Songs Are Second-Class Citizens

The Instamobile framework was built for **TikTok-style video sharing**, not music. The current architecture treats:
- **Videos** as social content (posts, following, discovery)
- **Songs** as data (just stored in a collection)

This is backwards for a music-focused social app.

---

## Current Data Collections

| Collection | Purpose | Used By |
|------------|---------|---------|
| `songs` | Store created songs | Today's Picks, Your Favorites |
| `posts` | Social posts (videos only currently) | Social feed |
| `social_feeds/{userId}/home_feed_live` | Posts from people you follow | Following tab |
| `social_feeds/{userId}/main_feed` | Your own posts for discovery | For You tab |
| `social_feeds/{userId}/profile_feed_live` | Posts on your profile | Profile page |
| `social_graph/{userId}/inbound` | Your followers | Fanout |
| `social_graph/{userId}/outbound` | Who you follow | Following list |
| `hashtags/{tag}/feed_live` | Posts by hashtag | Hashtag search |

---

## Current Flow Problems

### Song Creation Flow (Current)
```
User creates song → Song saved to `songs` collection → Appears in Today's Picks
                                                      (No social features!)
```

### Video Post Flow (Current)
```
User posts video → Post saved to `posts` + `social_feeds` → Appears in Following/For You
                   + Fanout to followers                    (Full social features!)
```

### The Fix: Songs Should Follow Same Flow as Videos
```
User creates song → Song saved to `songs` collection
                 → Post auto-created in `posts` + `social_feeds`
                 → Fanout to followers
                 → Appears in Following/For You + Today's Picks
```

---

## Proposed Architecture

### Principle: Songs and Videos Are Equal

Both songs and videos are **social content** that should:
1. Appear in followers' feeds
2. Be likeable, commentable, shareable
3. Appear in For You discovery
4. Support hashtags

### Collection Changes

| Collection | Current | Proposed |
|------------|---------|----------|
| `songs` | Only data store | Data store + auto-creates post |
| `posts` | Video posts only | Video posts + Song posts |
| `social_feeds` | Video posts only | All social content (songs + videos) |

---

## Page Structures

### Feed Page (Home)

The Feed page should have these sections (all collapsible, with View All):

| Section | Data Source | Logic |
|---------|-------------|-------|
| **Today's Picks** | `songs` collection | Latest songs, weighted by engagement |
| **Your Favorites** | `songs` where user liked/saved | Songs you've liked or saved |
| **Playlist for You** | `playlists` collection | Your playlists + recommended |
| **Artists** | `users` where role=artist | Artists you follow + trending |
| **Radio for You** | Future feature | AI-generated mixes |

**Menu Bar** (like Library): All, Music, Videos, Podcast, Radio, Events

### Discover Page

| Section | Data Source | Logic |
|---------|-------------|-------|
| **Recent Search** | Local storage / `user_activity` | Last 10 searches |
| **Discover Something New** | `posts` + algorithm | Trending + personalized discovery |

---

## Social Feed Logic

### Following Tab
- Shows posts (songs + videos) from people you follow
- Query: `social_feeds/{userId}/home_feed_live`

### For You Tab
- Shows all public posts (songs + videos)
- Personalized by engagement + genres you like
- Query: Cloud function `listDiscoverFeedPosts`

---

## What Needs to Change

### 1. Auto-Post Songs to Social Feed

When a song is created:
```javascript
// In songs creation flow (not just when shared)
await createSongPost({ songId, caption: `New song: ${title}` })
```

This means:
- Every song appears in social feed automatically
- User can still "share" to add custom caption/hashtags
- Remove the confusing "auto-share" setting

### 2. Remove "Videos" Tab Confusion

Rename to "Social" or merge into main feed. The distinction between "Music" and "Videos" tabs is confusing when both are social content.

### 3. Update Feed Filters

```javascript
// Current filter (broken for songs)
filterNonVideoFeed = posts => posts.filter(p => p.postMedia[0]?.type?.includes('video'))

// Fixed filter (songs + videos)
filterFeed = posts => posts.filter(p =>
  p.postType === 'song' || p.postMedia[0]?.type?.includes('video')
)
```

### 4. Seed Script Updates

Add sample songs for test users:

```javascript
const sampleSongs = [
  {
    userIndex: 0, // Maya
    title: 'Summer Vibes',
    style: 'pop electronic chill',
    // Suno API URLs
  },
  // More songs...
]
```

---

## Implementation Order

1. **Update seed script** - Add sample songs for test users
2. **Run seed script** - Create test data to see social features working
3. **Auto-post songs** - Modify song creation to auto-create posts
4. **Restructure Feed page** - Collapsible sections with View All
5. **Restructure Discover page** - Recent Search + Discover
6. **Add menu bars** - Like Library has

---

## Testing After Changes

With test users created and following each other:
1. Create a song as @ernestolee
2. Song should appear in:
   - Today's Picks (All/Music tabs) ✓
   - Social feed (Following tab for followers) ✓
   - For You (discovery for everyone) ✓
3. Test users' songs should appear in your Following feed
4. Comments, likes, shares should all work

---

## Questions to Clarify

1. Should songs auto-post, or should "share" still be manual?
   - Recommendation: Auto-post to feed, but with minimal caption
   - User can "re-share" later with custom caption

2. Should the auto-share setting be removed?
   - Recommendation: Yes, if songs auto-post anyway

3. Where do playlists fit?
   - Future: Playlists can also be "posts" when shared

