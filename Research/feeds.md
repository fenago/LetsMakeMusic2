# LetsMakeMusic - Comprehensive Feed Guide

## Overview

This document catalogs ALL feeds in the app: where they currently are, where they should be, how to access them, and the logic behind each.

---

## Feed Summary Table

| Feed Name | Current Location | Should Be On | How to Access | Data Source | Content Type |
|-----------|-----------------|--------------|---------------|-------------|--------------|
| **Following Feed** | Feed > All & Videos tabs | Feed (All tabs) | Bottom nav "Feed" tab | `social_feeds/{userId}/home_feed_live` | **SONGS + VIDEOS** from followed users |
| **For You Feed** | Feed > All & Videos tabs | Feed (All tabs) | Same as above, toggle "For You" | Algorithm-based discovery | **SONGS + VIDEOS** - All public posts |
| **Today's Picks** | Feed > All/Music tabs | Feed (All tabs) | Bottom nav "Feed" tab | `songs` collection (first 5) | Song carousel |
| **Your Favorites** | Feed > All/Music tabs | Feed (All tabs) | Bottom nav "Feed" tab | `songs` collection (first 10) | Liked songs list |
| **Discover Songs** | Discover page | Discover page | Bottom nav "Discover" tab | `songs` collection (all) | All AI-generated songs |
| **Hashtag Feed** | FeedSearch screen | Same | Tap hashtag in any post | `hashtags/{tag}/feed_live` | Posts with specific hashtag |
| **Profile Feed** | Profile page | Same | Bottom nav "Profile" tab | `social_feeds/{userId}/profile_feed_live` | User's own posts |
| **Library Songs** | Library page | Same | Bottom nav "Library" tab | `users/{userId}/songs` | User's created songs |
| **Liked Songs** | Library page | Same | Library > "Liked Songs" section | `users/{userId}/likedSongs` | Songs user has liked |
| **Comments Feed** | Comments modal | Same | Tap comment icon on any post | `posts/{postId}/comments_live` | Post comments |
| **Stories Feed** | (Not active) | Stories row | Top of Feed page | `social_feeds/{userId}/stories_feed_live` | Ephemeral content |

---

## Detailed Feed Breakdown

### 1. Social Feeds (Following & For You)

**IMPORTANT: SONGS AND VIDEOS ARE EQUAL CITIZENS.** Both appear in the social feed.

| Property | Value |
|----------|-------|
| **Screen** | HomeScreen.js |
| **Component** | MusicFeed > videoFeedComponent |
| **Trigger** | `activeTab === 0 OR activeTab === 2` (All & Videos tabs) |
| **Firebase Collection** | `social_feeds/{userId}/home_feed_live` |
| **Hook** | `useHomeFeedPosts()`, `useDiscoverPosts()` |
| **Includes** | **BOTH Song posts AND Video posts** (`postType === 'song'` + video posts) |

**Navigation Path:**
```
RootNavigator
└── MainStackNavigator
    └── NavStack (BottomTabNavigator)
        └── Feed (InnerFeedNavigator)
            └── HomeScreen
                └── HomeFeed
                    └── MusicFeed
                        └── videoFeedComponent (only when Videos tab)
```

**FIX NEEDED:** Show social feed on ALL tabs, not just Videos tab.

---

### 2. Today's Picks

| Property | Value |
|----------|-------|
| **Screen** | HomeScreen.js |
| **Component** | MusicFeed > TodaysPicks |
| **Firebase Collection** | `songs` (first 5 songs) |
| **Transform** | `songToPickFormat()` in HomeFeed |
| **Display** | Horizontal carousel with album art |

**Navigation Path:**
```
Feed tab → MusicFeed → TodaysPicks component
```

**Access:** Visible on All, Music tabs (currently working)

---

### 3. Your Favorites

| Property | Value |
|----------|-------|
| **Screen** | HomeScreen.js |
| **Component** | MusicFeed > SongDetailCard list |
| **Firebase Collection** | `songs` (first 10 songs) |
| **Transform** | `songToFavoriteFormat()` in HomeFeed |
| **Display** | Vertical list with song details |

**Note:** Currently shows first 10 songs from all songs, not actual user favorites. Should eventually use `users/{userId}/likedSongs`.

---

### 4. Discover Songs

| Property | Value |
|----------|-------|
| **Screen** | DiscoverScreen.js |
| **Component** | Discover.js |
| **Firebase Collection** | `songs` (all songs) |
| **Hook** | `subscribeToAllSongs()` from songsService |
| **Features** | Search, filter by hashtag |

**Navigation Path:**
```
Discover tab → DiscoverScreen → Discover component
```

---

### 5. Hashtag Feed

| Property | Value |
|----------|-------|
| **Screen** | FeedSearchScreen.js |
| **Firebase Collection** | `hashtags/{hashtag}/feed_live` |
| **Hook** | `useHashtagPosts(hashtag, userId)` |
| **Trigger** | Tap any #hashtag in a post description |

**Navigation Path:**
```
Any post → Tap hashtag → FeedSearch screen
```

---

### 6. Profile Feed

| Property | Value |
|----------|-------|
| **Screen** | ProfileScreen.js |
| **Firebase Collection** | `social_feeds/{userId}/profile_feed_live` |
| **Hook** | `useProfile()` |
| **Shows** | User's own posts (videos + songs) |

**Navigation Path:**
```
Profile tab → ProfileScreen
  OR
Tap any user avatar → ProfileScreen (with user param)
```

---

### 7. Library - My Songs

| Property | Value |
|----------|-------|
| **Screen** | LibraryScreen.js |
| **Firebase Collection** | `users/{userId}/songs` |
| **Hook** | `subscribeToUserSongs()` |
| **Shows** | Songs created by user |
| **Features** | Collapsible section, song count badge |

**Navigation Path:**
```
Library tab → LibraryScreen → "My Songs" section
```

---

### 8. Library - Liked Songs

| Property | Value |
|----------|-------|
| **Screen** | LibraryScreen.js |
| **Firebase Collection** | `users/{userId}/likedSongs` |
| **Hook** | `subscribeToUserLikedSongs()` |
| **Shows** | Songs user has liked |
| **Features** | Collapsible section, song count badge |

**Navigation Path:**
```
Library tab → LibraryScreen → "Liked Songs" section
```

---

### 9. Comments Feed

| Property | Value |
|----------|-------|
| **Screen** | CommentsScreen.js (modal) |
| **Firebase Collection** | `posts/{postId}/comments_live` |
| **Hook** | `useComments()` |
| **Trigger** | Tap comment icon on any post |

**Navigation Path:**
```
Any post → Tap comment icon → Comments modal overlay
```

---

## Menu Bar / Tab Structure

### Bottom Navigation (5 tabs)

| Tab | Screen | Primary Feeds |
|-----|--------|---------------|
| **Feed** | HomeScreen | Following, For You, Today's Picks, Favorites |
| **Discover** | DiscoverScreen | All Songs, Trending, Search |
| **Create** | CreateScreen | (Song generation) |
| **Library** | LibraryScreen | My Songs, Liked Songs |
| **Profile** | ProfileScreen | My Posts |

### Feed Page Menu Bar (Horizontal Tabs)

| Tab ID | Label | Current Content | Should Show |
|--------|-------|-----------------|-------------|
| 0 | All | Music sections only | Music + Social Feed |
| 1 | Music | Music sections only | Music sections |
| 2 | Videos | Social feed only | Social feed (videos/songs) |
| 3 | Podcast | Music sections only | Podcasts (future) |
| 4 | Radio | Music sections only | Radio stations (future) |
| 5 | Events | Music sections only | Events (future) |

---

## Three-Dot Menu Access

Posts have a three-dot menu with options:

| Menu Option | Screen | Action |
|-------------|--------|--------|
| View Artist Profile | Any feed post | Navigate to artist's ProfileScreen |
| Add to Playlist | Any song post | Add song to playlist (future) |
| Share | Any post | Native share sheet |
| Report | Any post | Report user/content |
| Delete | Own posts only | Delete post from feed |

Songs have a similar menu:

| Menu Option | Screen | Action |
|-------------|--------|--------|
| About the Artist | SongActionMenu | Show artist modal |
| Add to Playlist | SongActionMenu | Future feature |
| Share | SongActionMenu | Native share sheet |
| Edit Song | SongActionMenu (own songs) | Navigate to edit screen |

---

## Firebase Collection Structure

```
firestore/
├── songs/                          # All AI-generated songs
│   └── {songId}/
│       ├── likes/                  # Users who liked this song
│       └── (song data)
│
├── posts/                          # All social posts
│   └── {postId}/
│       ├── comments_live/          # Post comments
│       └── (post data)
│
├── social_feeds/                   # User-specific feeds
│   └── {userId}/
│       ├── home_feed_live/         # Following feed (posts from followed users)
│       ├── profile_feed_live/      # User's own posts
│       ├── main_feed/              # Copy of user's posts for discovery
│       └── stories_feed_live/      # User's stories
│
├── hashtags/                       # Posts grouped by hashtag
│   └── {hashtag}/
│       └── feed_live/              # Posts with this hashtag
│
├── users/                          # User profiles
│   └── {userId}/
│       ├── songs/                  # User's created songs
│       └── likedSongs/             # Songs user has liked
│
└── social_graph/                   # Follow relationships
    └── {userId}/
        ├── inbound_users/          # Users following this user
        └── outbound_users/         # Users this user follows
```

---

## Cloud Functions for Feeds

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `createSongPost` | Shares song to social feed | Called when song is shared |
| `listHomeFeedPosts` | Gets Following feed | HTTP callable |
| `listDiscoverFeedPosts` | Gets For You feed | HTTP callable |
| `listHashtagFeedPosts` | Gets posts by hashtag | HTTP callable |
| `addPost` | Creates new post | HTTP callable |
| `deletePost` | Removes post | HTTP callable |
| `addReaction` | Likes/reacts to post | HTTP callable |
| `addComment` | Adds comment | HTTP callable |
| `listComments` | Gets comments | HTTP callable |

---

## Key Files

| Purpose | Path |
|---------|------|
| Feed Screen | `src/screens/HomeScreen/HomeScreen.js` |
| Music Feed UI | `src/components/ui/MusicFeed/index.js` |
| HomeFeed Container | `src/components/ui/HomeFeed/index.js` |
| Discover Screen | `src/screens/DiscoverScreen/DiscoverScreen.js` |
| Discover UI | `src/components/screens/Discover/Discover.js` |
| Library Screen | `src/screens/LibraryScreen/LibraryScreen.js` |
| Profile Screen | `src/screens/ProfileScreen/ProfileScreen.js` |
| Song Service | `src/services/songsService.js` |
| Feed Hooks | `src/core/socialgraph/feed/api/firebase/` |
| Navigation | `src/navigators/MainStackNavigator.js` |
| Bottom Tabs | `src/navigators/BottomTabNavigator.js` |

---

## Action Items

1. **[HIGH PRIORITY]** Fix MusicFeed to show social feed on ALL tabs, not just Videos
2. **[MEDIUM]** Add "Social Feed" collapsible section to Feed page
3. **[MEDIUM]** Complete Discover page restructuring with Recent Search + Discover New
4. **[LOW]** Implement actual favorites (use likedSongs instead of first 10 songs)
5. **[LOW]** Add Stories feed row to top of Feed page
6. **[LOW]** Implement Playlist, Radio, Podcast, Events content
