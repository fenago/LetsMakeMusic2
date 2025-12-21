# UI Integration Plan: music-app-main → LetsMakeMusic

**Source:** `/Users/ernestolee/Downloads/music-app-main`
**Target:** LetsMakeMusic React Native App
**Date:** December 2024

---

## Overview

This document outlines the plan for integrating UI components and screens from the `music-app-main` Expo app into LetsMakeMusic. The goal is to adopt the modern, clean UI while preserving LetsMakeMusic's existing Firebase backend and video capabilities.

### Key Consideration: Video + Audio Playback
LetsMakeMusic needs to support **both video AND music playback**, unlike music-app-main which only handles audio. This affects the player architecture significantly.

---

## Tech Stack Comparison

| Feature | music-app-main | LetsMakeMusic |
|---------|---------------|---------------|
| Framework | Expo SDK 54 | Expo + React Native CLI |
| Navigation | expo-router | React Navigation |
| Styling | NativeWind (Tailwind) | StyleSheet + Dopebase |
| UI Library | gluestack-ui | Custom + Dopebase |
| Animations | react-native-reanimated | None currently |
| Audio | expo-av | expo-av |
| Video | N/A | expo-av Video |
| Backend | Static mock data | Firebase |
| Bottom Sheet | @gorhom/bottom-sheet | TBD |

### Dependencies to Add
```json
{
  "@gorhom/bottom-sheet": "^5.0.0-alpha.11",
  "react-native-reanimated": "~3.18.0",
  "nativewind": "^4.2.1"
}
```

---

## Screen-by-Screen Analysis

### Screen 1: Home → Feed

**music-app-main file:** `app/(protected)/home.tsx`
**LetsMakeMusic equivalent:** `src/components/screens/Feed/Feed.js`

#### Features in music-app-main
- Personalized greeting ("Good Morning John")
- Horizontal filter tabs (All, Music, Podcasts, Fitness, Dance)
- Today's Picks carousel
- Your Favorites song list (tappable → opens full player)
- Playlist For You horizontal scroll
- Artists horizontal scroll
- Radio For You horizontal scroll
- Mini player bar at bottom
- Full-screen player bottom sheet

#### Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `Tabs` | `components/shared/top-tabs` | Horizontal filter pills |
| `TodaysPicks` | `components/screens/home/todays-picks` | Featured content carousel |
| `SongDetailCard` | `components/shared/song-detail-card` | Song row item |
| `AlbumCard` | `components/shared/album-card` | Square album/playlist card |
| `ArtistCard` | `components/screens/home/artist-card` | Circular artist avatar |
| `CurrentSong` | `components/shared/current-song` | Mini player bar |
| `RenderSongBottomSheet` | `components/screens/home/render-song-bottomsheet` | Full player |

#### Music Player Architecture
Two states:
1. **Mini Player** (`CurrentSong`) - Bottom bar with current track + progress
2. **Full Player** (`RenderSongBottomSheet`) - Bottom sheet modal with:
   - Album art
   - Play/pause, skip, shuffle, repeat controls
   - Progress slider with timestamps
   - Like button
   - Lyrics section
   - Next in queue
   - About the artist

#### Integration Strategy
1. Keep existing Feed video scroll functionality
2. Add horizontal content sections (Playlists, Artists, etc.)
3. Create unified media player that handles both video and audio
4. Implement @gorhom/bottom-sheet for player UI

#### Proposed Unified Player Architecture
```
┌─────────────────────────────────────────────┐
│           useMediaPlayer hook               │
├─────────────────────────────────────────────┤
│  mediaType: 'audio' | 'video'               │
│  ├── For audio: expo-av Audio.Sound         │
│  ├── For video: expo-av Video component     │
│  └── Shared: play, pause, seek, position    │
└─────────────────────────────────────────────┘
```

---

### Screen 2: Search → Discover/FeedSearch

**music-app-main file:** `app/(protected)/search.tsx`
**LetsMakeMusic equivalent:** `src/screens/DiscoverScreen/DiscoverScreen.js`, `src/screens/FeedSearchScreen/FeedSearchScreen.js`

#### Features in music-app-main
- Search input field with icon
- "Your recent Search" section - vertical song list
- "Discover something new" section - horizontal album scroll
- Staggered FadeIn animations

#### Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `Input` | `@/components/ui/input` | Styled search input |
| `SubHeading` | `components/shared/sub-heading` | Section header |
| `SongDetailCard` | `components/shared/song-detail-card` | Song row |
| `AlbumCard` | `components/shared/album-card` | Album cards |

#### Current Limitations
music-app-main Search is **UI mockup only** - no actual search logic.

#### LetsMakeMusic Already Has
- `useDiscoverPosts` hook - fetches posts from non-followings
- `useHashtagPosts` hook - fetches posts by hashtag
- Grouping by hashtags
- Pull-to-refresh
- Pagination (`loadMorePosts`)

#### Integration Strategy
1. **Keep** existing hooks (`useDiscoverPosts`, `useHashtagPosts`)
2. **Replace** UI layer with music-app-main's styled components
3. **Add** recent searches feature (needs new state/persistence)
4. **Add** FadeIn animations from reanimated

---

### Screen 3: Library (NEW for LetsMakeMusic)

**music-app-main file:** `app/(protected)/library.tsx`
**LetsMakeMusic equivalent:** None currently (consider replacing Chat tab)

#### Features
- Header with "Library" title + search icon
- Horizontal filter tabs (All, Albums, Songs, Artists)
- Sort dropdown ("Recently played" with chevron)
- Grid/List view toggle
- 2-column playlist grid with album art
- Floating Action Button (FAB) for "New Playlist"

#### Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `Tabs` | `components/shared/top-tabs` | Filter pills |
| `PlayList` | `components/screens/library/play-list` | 2-column grid |
| `Fab` | `@/components/ui/fab` | Floating action button |
| `ListIcon` | `components/shared/icon` | Grid/list toggle |

#### PlayList Component Details
- Uses CSS Grid (2 columns)
- Square album art with aspect-ratio
- Song name + description below each
- FadeInDown animation staggered by index

#### Integration Strategy
**Proposed Navigation Change:**
- Move Chat from main tab bar → under Profile settings
- Replace Chat tab with Library tab

**Library will contain:**
- User's saved/liked songs
- User's created playlists
- User's AI-generated tracks (from Suno integration)
- Downloaded content for offline

---

### Screen 4: Profile

**music-app-main file:** `app/(protected)/profile.tsx`
**LetsMakeMusic equivalent:** `src/components/screens/Profile/Profile.js`

#### Features in music-app-main
- Header with "Profile" title
- Edit Profile button (secondary style)
- Avatar with initials fallback
- Username display
- Follower/Following counts
- "Your playlists" section - vertical song list
- Options menu (Downloads, History, Settings, Help & feedback)

#### Features in LetsMakeMusic (Current)
- Profile picture with story-style border
- @username display
- Following/Followers/Likes counts (tappable)
- Edit Profile / Follow button
- Video grid (3 columns) - user's posted content
- Pull-to-refresh
- Photo upload (Camera/Library)

#### Key Differences
| Feature | music-app-main | LetsMakeMusic |
|---------|---------------|---------------|
| Avatar | Simple with initials | StoryItem with border |
| Content Grid | Playlists (vertical list) | Videos (3-column grid) |
| Stats | Followers/Following only | + Likes count |
| Options | Downloads, History, Settings, Help | None in main view |
| Media | Playlists/songs | Videos |
| Interactions | Edit Profile only | Change photo, Follow/Unfollow |

#### Integration Strategy
1. **Keep** existing LetsMakeMusic profile features (video grid, followers, photo upload)
2. **Add** "Your playlists" section above or below video grid
3. **Add** Options menu section (Downloads, History, Settings, Help)
4. **Merge** Edit Profile styling from music-app-main
5. **Add** Chat option under Settings (moved from main tab)

---

## Shared Components to Port

### High Priority
1. `bottom-sheet/` - Full bottom sheet wrapper with custom styling
2. `current-song/` - Mini player bar
3. `song-detail-card/` - Reusable song row
4. `album-card/` - Square album/playlist card
5. `top-tabs/` - Horizontal filter pills

### Medium Priority
1. `sub-heading/` - Section headers with optional "See all" button
2. `artist-card/` - Circular artist avatar
3. `icon/` - Custom icon components

---

## Hooks to Create/Modify

### useMediaPlayer (New - Unified Player)
```typescript
interface UseMediaPlayerReturn {
  // State
  mediaType: 'audio' | 'video' | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  currentMedia: MediaItem | null;

  // Actions
  loadMedia: (item: MediaItem) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (position: number) => Promise<void>;

  // Queue
  queue: MediaItem[];
  addToQueue: (item: MediaItem) => void;
  playNext: () => void;
  playPrevious: () => void;
}
```

### Existing Hooks to Keep
- `useDiscoverPosts` - Firebase discover feed
- `useHashtagPosts` - Firebase hashtag search
- `useSocialGraphPosts` - Firebase social feed
- All authentication hooks

---

## Navigation Structure Changes

### Current LetsMakeMusic Tabs
1. Feed (video scroll)
2. Discover (video grid)
3. Camera (create)
4. Chat (messages)
5. Profile

### Proposed New Structure
1. **Home/Feed** - Video scroll + music sections (like music-app-main home)
2. **Discover** - Search + discovery
3. **Camera** - Create video/audio
4. **Library** - User's saved content (NEW - replaces Chat)
5. **Profile** - User profile + settings (Chat moved here)

---

## Screen 5: Add/Create (CRITICAL - Enhanced)

**music-app-main equivalent:** None (music-app-main has no create functionality)
**LetsMakeMusic current:** `src/screens/CameraScreen/CameraScreen.js` (video capture only)

### Current Video Creation Flow
1. User taps "+" tab
2. Camera opens for video recording
3. User records video
4. User adds caption, hashtags
5. Post uploaded to Firebase

### NEW: Song Creation Flow (Suno AI Integration)

**Path 1: Quick Song Generation**
1. User taps "+" tab
2. User selects "Create Song" (vs "Record Video")
3. User enters prompt (lyrics, style, mood)
4. Suno API generates song
5. Preview and edit
6. Save to Library / Post to Feed

**Path 2: Advanced Song + Video Creation**
1. User taps "+" tab → "Create Song"
2. User enters song prompt
3. Suno generates audio track
4. User prompted: "Add visuals?"
5. User uploads images/video clips from device
6. System creates music video (future: AI-generated video)
7. Save as video post with audio

### Key Components to Create
| Component | Purpose |
|-----------|---------|
| `CreateModeSelector` | Toggle between Video/Song creation |
| `SongPromptInput` | Text input for Suno prompt |
| `SongStylePicker` | Genre, mood, tempo selection |
| `SongPreview` | Audio preview with waveform |
| `MediaAssetPicker` | Select images/clips for video creation |
| `SongGenerationProgress` | Loading state during Suno generation |

### Suno API Integration (sunoapi.org)

```typescript
// Song generation request
interface SunoGenerateRequest {
  prompt: string;           // Lyrics or description
  style?: string;           // "pop", "rock", "hip-hop", etc.
  title?: string;
  make_instrumental?: boolean;
}

// Song generation response
interface SunoGenerateResponse {
  id: string;
  audio_url: string;
  image_url: string;        // Album art
  title: string;
  duration: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';
}
```

### Data Flow for Song Creation
```
User Input → Suno API → Firebase Storage → tracks collection → User's Library
                ↓
          composer_songs collection (existing - for Suno metadata)
```

### Firebase Collections for Song Creation

**`composer_songs` (existing - extend)**
```typescript
{
  id: string;
  userId: string;
  sunoTaskId: string;
  prompt: string;
  style?: string;
  title: string;
  audio_url: string;        // Firebase Storage URL (copied from Suno)
  image_url: string;        // Album art
  duration: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  createdAt: Timestamp;
  // NEW fields
  isPublic: boolean;
  playCount: number;
  likeCount: number;
  associatedVideoId?: string;  // If turned into video post
}
```

**`media_assets/{userId}/` subcollection (NEW)**
```typescript
// For uploaded images/clips for future video creation
{
  id: string;
  type: 'image' | 'video_clip';
  url: string;              // Firebase Storage URL
  thumbnailUrl: string;
  duration?: number;        // For video clips
  uploadedAt: Timestamp;
  usedInSongs: string[];    // Track IDs that used this asset
}
```

---

## IMPLEMENTATION PHASES (DETAILED)

> **CRITICAL PRINCIPLE:** All new functionality is ADDITIVE.
> We are MERGING capabilities, not REPLACING them.
> LetsMakeMusic = Video Platform + Music Platform (unified)

---

## Phase 1: Foundation

### Overview
Install core dependencies and set up the technical foundation for new UI components.

### Duration Estimate
1-2 days

### Prerequisites
- [x] Git branches created (main, V2, version-zero-baseline)
- [x] .gitignore configured
- [ ] Development environment working (iOS Simulator running)

### Implementation Steps

#### 1.1 Install Dependencies
```bash
cd ReactNativeTikTokApp

# Bottom sheet for full player
yarn add @gorhom/bottom-sheet@^5

# Animations (may already be installed)
yarn add react-native-reanimated@~3.18.0

# Gesture handler (dependency)
yarn add react-native-gesture-handler

# iOS pod install
cd ios && pod install && cd ..
```

#### 1.2 Configure Reanimated
Add to `babel.config.js`:
```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // MUST BE LAST
  ],
};
```

#### 1.3 Wrap App with GestureHandlerRootView
In `App.js` or root component:
```javascript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Wrap entire app
<GestureHandlerRootView style={{ flex: 1 }}>
  {/* existing app content */}
</GestureHandlerRootView>
```

#### 1.4 Create Base UI Components Directory
```
src/components/ui/
├── BottomSheet/
│   ├── index.js
│   └── styles.js
├── MiniPlayer/
│   ├── index.js
│   └── styles.js
├── Tabs/
│   ├── index.js
│   └── styles.js
├── SongCard/
│   ├── index.js
│   └── styles.js
└── AlbumCard/
    ├── index.js
    └── styles.js
```

### Testing Checklist

#### Functional Testing
- [ ] App launches without crash after dependency install
- [ ] Existing video feed still scrolls and plays videos
- [ ] Navigation between all existing tabs works
- [ ] Login/logout still functions
- [ ] Camera screen opens and records video

#### Technical Testing
- [ ] No console errors related to reanimated
- [ ] No console errors related to gesture-handler
- [ ] Metro bundler compiles without warnings
- [ ] iOS build succeeds
- [ ] Android build succeeds (if testing Android)

#### User Testing
- [ ] Manually navigate through entire existing app
- [ ] Record a test video and post it
- [ ] View profiles of other users
- [ ] Confirm all existing functionality unchanged

### Data Validation
**Firebase Console Location:** `https://console.firebase.google.com/project/development-69cdc/firestore`

- No data changes in this phase
- Existing collections should be unchanged:
  - `users` - verify your user exists
  - `posts` - verify existing posts exist
  - `social_feeds` - verify feed structure intact

### Success Criteria
- [ ] App runs with all new dependencies
- [ ] Zero regression in existing functionality
- [ ] Ready for Phase 2

---

## Phase 2: Player Infrastructure

### Overview
Create the unified media player system that handles BOTH audio AND video. This is the core architecture that all screens will use.

### Duration Estimate
3-5 days

### Prerequisites
- [ ] Phase 1 complete
- [ ] All dependencies installed and working

### Implementation Steps

#### 2.1 Create MediaPlayerContext
**File:** `src/contexts/MediaPlayerContext.js`

```javascript
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Audio, Video } from 'expo-av';

const MediaPlayerContext = createContext(null);

export const MediaPlayerProvider = ({ children }) => {
  const [mediaType, setMediaType] = useState(null); // 'audio' | 'video' | null
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]);

  const audioRef = useRef(null);
  const videoRef = useRef(null);

  // CRITICAL: When playing audio, pause video. When playing video, pause audio.
  const loadMedia = useCallback(async (item) => {
    // Implementation...
  }, []);

  const play = useCallback(async () => {
    // Implementation...
  }, [mediaType]);

  const pause = useCallback(async () => {
    // Implementation...
  }, [mediaType]);

  const seek = useCallback(async (positionMs) => {
    // Implementation...
  }, [mediaType]);

  const value = {
    // State
    mediaType,
    isPlaying,
    currentMedia,
    position,
    duration,
    queue,
    // Refs
    audioRef,
    videoRef,
    // Actions
    loadMedia,
    play,
    pause,
    seek,
    // Queue management
    addToQueue: (item) => setQueue(prev => [...prev, item]),
    clearQueue: () => setQueue([]),
    playNext: () => { /* Implementation */ },
    playPrevious: () => { /* Implementation */ },
  };

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
    </MediaPlayerContext.Provider>
  );
};

export const useMediaPlayer = () => {
  const context = useContext(MediaPlayerContext);
  if (!context) {
    throw new Error('useMediaPlayer must be used within MediaPlayerProvider');
  }
  return context;
};
```

#### 2.2 Create useMediaPlayer Hook
**File:** `src/hooks/useMediaPlayer.js`
(Re-exports from context for cleaner imports)

#### 2.3 Create MiniPlayer Component
**File:** `src/components/ui/MiniPlayer/index.js`

Features:
- Sticky bar at bottom of screen (above tab bar)
- Shows current track thumbnail, title, artist
- Play/pause button
- Progress bar (thin line)
- Tap to expand to full player
- Only visible when audio is playing (NOT for video)

#### 2.4 Create FullPlayerBottomSheet Component
**File:** `src/components/ui/FullPlayer/index.js`

Features:
- Full-height bottom sheet (using @gorhom/bottom-sheet)
- Large album art
- Track title, artist name
- Progress slider with timestamps
- Play/pause, skip forward, skip back
- Shuffle, repeat buttons
- Like button
- "Next in queue" section
- "About the artist" section
- Swipe down to minimize to MiniPlayer

#### 2.5 Wrap App with MediaPlayerProvider
**File:** `App.js` or root navigator

```javascript
<MediaPlayerProvider>
  <GestureHandlerRootView style={{ flex: 1 }}>
    {/* Navigation */}
  </GestureHandlerRootView>
  <MiniPlayer /> {/* Renders above tab bar when audio playing */}
</MediaPlayerProvider>
```

#### 2.6 Test with Mock Audio
Create test function to load a sample audio URL and verify:
- Audio plays
- MiniPlayer appears
- FullPlayer opens on tap
- Play/pause works
- Seek works

### Testing Checklist

#### Functional Testing
- [ ] Can load an audio track (use test MP3 URL)
- [ ] MiniPlayer appears when audio loaded
- [ ] Tap MiniPlayer opens FullPlayer sheet
- [ ] Play/pause toggles correctly
- [ ] Progress bar updates during playback
- [ ] Seek by dragging progress slider works
- [ ] Swipe down FullPlayer returns to MiniPlayer
- [ ] **CRITICAL:** Video feed still works independently
- [ ] **CRITICAL:** Playing audio pauses any playing video
- [ ] **CRITICAL:** Playing video pauses any playing audio

#### Technical Testing
- [ ] No memory leaks (check for proper cleanup)
- [ ] Audio continues when app backgrounded
- [ ] Audio stops when component unmounts
- [ ] No console errors during playback
- [ ] Smooth animations on player open/close

#### User Testing
- [ ] Player feels responsive (no lag on controls)
- [ ] Animations are smooth (60fps)
- [ ] Player UI is intuitive
- [ ] MiniPlayer doesn't obstruct navigation

### Data Validation
**Firebase Console:** No data writes in this phase (player is client-side only)

Test audio playback with public URL:
```
https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
```

### Success Criteria
- [ ] Unified player architecture working
- [ ] Audio playback functional
- [ ] MiniPlayer + FullPlayer UI complete
- [ ] Video playback unaffected
- [ ] Ready for Phase 3 (Feed integration)

---

## Phase 3: Feed/Home Screen

### Overview
Enhance the existing Feed screen by ADDING music sections while PRESERVING the TikTok-style video scroll.

### Duration Estimate
4-6 days

### Prerequisites
- [ ] Phase 2 complete (Player infrastructure working)
- [ ] Test users created with sample content

### What We're KEEPING (from existing Feed)
- Vertical video scroll (FlatList)
- Video playback (expo-av Video)
- Like/comment/share interactions
- Pull-to-refresh
- Infinite scroll pagination

### What We're ADDING (from music-app-main)
- Personalized greeting header ("Good Morning, @ernestolee")
- Horizontal filter tabs (All, Music, Videos, Podcasts)
- "Today's Picks" carousel section
- "Your Favorites" song list
- "Playlists For You" horizontal scroll
- "Artists You Follow" horizontal scroll

### Implementation Steps

#### 3.1 Create Feed Sections Components

**File:** `src/components/screens/Feed/sections/`
```
sections/
├── FeedHeader.js          # Greeting + filter tabs
├── TodaysPicks.js         # Featured content carousel
├── YourFavorites.js       # Liked songs horizontal
├── PlaylistsForYou.js     # Recommended playlists
├── ArtistsYouFollow.js    # Artists horizontal scroll
└── VideoFeed.js           # EXISTING video scroll (refactored)
```

#### 3.2 Update Feed.js Structure

```javascript
// NEW Feed structure - ADDITIVE
<SafeAreaView>
  <ScrollView>
    {/* NEW: Header with greeting */}
    <FeedHeader user={currentUser} />

    {/* NEW: Horizontal tabs filter */}
    <Tabs
      tabs={['All', 'Music', 'Videos', 'Podcasts']}
      onSelect={setActiveFilter}
    />

    {/* NEW: Today's Picks (if filter includes music) */}
    {showMusicSections && <TodaysPicks />}

    {/* NEW: Your Favorites songs */}
    {showMusicSections && <YourFavorites userId={currentUser.id} />}

    {/* EXISTING: Video Feed - now inside scroll */}
    {showVideoSections && (
      <VideoFeed
        posts={feedPosts}
        onVideoPress={handleVideoPress}
      />
    )}

    {/* NEW: Playlists For You */}
    {showMusicSections && <PlaylistsForYou />}

    {/* NEW: Artists */}
    {showMusicSections && <ArtistsYouFollow userId={currentUser.id} />}
  </ScrollView>

  {/* MiniPlayer rendered at app level, but visible here */}
</SafeAreaView>
```

#### 3.3 Create Firebase Hooks for New Sections

**File:** `src/hooks/useFeaturedContent.js`
```javascript
// Fetch from featured_content collection
export const useFeaturedContent = (type) => {
  // Query: where type == 'todays_picks', ordered by position
};
```

**File:** `src/hooks/useUserFavorites.js`
```javascript
// Fetch from users/{userId}/liked_tracks, join with tracks
export const useUserFavorites = (userId, limit = 10) => {
  // Query: orderBy likedAt desc, limit
};
```

**File:** `src/hooks/useRecommendedPlaylists.js`
```javascript
// Fetch playlists based on user's listening history
export const useRecommendedPlaylists = (userId) => {
  // Query: isPublic == true, order by followerCount
};
```

#### 3.4 Wire Up Player Integration

When user taps a song from any section:
1. Call `loadMedia(songItem)` from MediaPlayerContext
2. MiniPlayer appears
3. Tap MiniPlayer to see FullPlayer

When user taps a video:
1. Existing video playback (no change)
2. Any playing audio is paused

#### 3.5 Seed Initial Data

Create Firebase data for testing:
- 5 featured content items (Today's Picks)
- 3 sample playlists
- 10 sample tracks
- 3 test artists

### Testing Checklist

#### Functional Testing
- [ ] Feed loads without error
- [ ] Greeting shows correct user name
- [ ] Filter tabs work (All/Music/Videos)
- [ ] Today's Picks carousel scrolls horizontally
- [ ] Tapping a song in any section plays it
- [ ] MiniPlayer appears when song plays
- [ ] **CRITICAL:** Video scroll still works in "Videos" filter
- [ ] **CRITICAL:** Tapping video plays video (not audio player)
- [ ] Pull-to-refresh works
- [ ] Infinite scroll for videos works
- [ ] Switching filters shows/hides appropriate sections

#### Technical Testing
- [ ] Feed renders in < 500ms
- [ ] No unnecessary re-renders
- [ ] Firebase queries are efficient (check Firestore usage)
- [ ] Images lazy-load correctly
- [ ] No memory leaks on navigation away

#### User Testing
- [ ] Feed layout feels natural
- [ ] Music sections don't disrupt video browsing
- [ ] Transition between music and video is seamless
- [ ] Player controls are discoverable

### Data Validation

**Firebase Console Checks:**

1. **`featured_content` collection**
   - Path: Firestore > featured_content
   - Verify: Documents exist with `type: 'todays_picks'`
   - Fields: title, imageUrl, targetType, targetId, position

2. **`tracks` collection**
   - Path: Firestore > tracks
   - Verify: Sample tracks exist
   - Fields: title, artistName, audioUrl, thumbnailUrl, duration

3. **`playlists` collection**
   - Path: Firestore > playlists
   - Verify: Sample playlists exist
   - Fields: name, coverImageUrl, trackCount, isPublic

4. **`users/{userId}/liked_tracks` subcollection**
   - Path: Firestore > users > [your user ID] > liked_tracks
   - Verify: Liked track references exist

### Success Criteria
- [ ] Feed shows both music and video content
- [ ] Player integration works seamlessly
- [ ] Zero regression in video functionality
- [ ] Ready for Phase 4 (Discover)

---

## Phase 4: Discover/Search Screen

### Overview
Enhance the Discover screen by ADDING music search capabilities while PRESERVING video discovery.

### Duration Estimate
3-4 days

### Prerequisites
- [ ] Phase 3 complete
- [ ] Sample data in tracks, playlists, artists collections

### What We're KEEPING
- Video grid discovery
- Hashtag search
- `useDiscoverPosts` hook
- `useHashtagPosts` hook
- Pull-to-refresh

### What We're ADDING
- Unified search input (searches videos, songs, artists, playlists)
- Recent searches history
- "Discover Something New" album carousel
- Search results tabs (All, Videos, Songs, Artists, Playlists)

### Implementation Steps

#### 4.1 Create Unified Search

**File:** `src/hooks/useUnifiedSearch.js`
```javascript
// Searches across multiple collections
export const useUnifiedSearch = (query) => {
  // Search posts (videos) - existing
  // Search tracks (songs) - new
  // Search artists - new
  // Search playlists - new
  // Return combined, categorized results
};
```

#### 4.2 Add Search History

**File:** `src/hooks/useSearchHistory.js`
```javascript
// Read/write to users/{userId}/search_history
export const useSearchHistory = (userId) => {
  // getRecentSearches()
  // addSearchQuery(query, resultType, selectedResultId)
  // clearHistory()
};
```

#### 4.3 Update Discover Screen

```javascript
// NEW Discover structure
<SafeAreaView>
  {/* Search Input */}
  <SearchInput
    value={searchQuery}
    onChangeText={setSearchQuery}
    onSubmit={handleSearch}
  />

  {/* When not searching - Discovery content */}
  {!searchQuery && (
    <>
      {/* Recent Searches */}
      <RecentSearches
        searches={searchHistory}
        onSelectSearch={setSearchQuery}
      />

      {/* EXISTING: Video Discovery Grid */}
      <VideoDiscoveryGrid posts={discoverPosts} />

      {/* NEW: Discover Music Section */}
      <DiscoverMusicSection />
    </>
  )}

  {/* When searching - Results */}
  {searchQuery && (
    <>
      {/* Result type tabs */}
      <Tabs tabs={['All', 'Videos', 'Songs', 'Artists', 'Playlists']} />

      {/* Results based on active tab */}
      <SearchResults
        results={searchResults}
        filter={activeTab}
      />
    </>
  )}
</SafeAreaView>
```

### Testing Checklist

#### Functional Testing
- [ ] Search input appears and is functional
- [ ] Typing in search shows results
- [ ] Search results are categorized correctly
- [ ] Tapping song result plays the song
- [ ] Tapping video result opens video player
- [ ] Tapping artist navigates to artist profile
- [ ] Recent searches are saved
- [ ] Recent searches can be tapped to re-search
- [ ] **CRITICAL:** Video discovery grid still works
- [ ] **CRITICAL:** Hashtag search still works

#### Technical Testing
- [ ] Search queries are debounced (not firing on every keystroke)
- [ ] Search results load in < 1 second
- [ ] No duplicate results
- [ ] Firestore queries are indexed (no warnings)

#### User Testing
- [ ] Search feels fast and responsive
- [ ] Results are relevant to query
- [ ] Easy to distinguish videos from songs in results

### Data Validation

**Firebase Console Checks:**

1. **`users/{userId}/search_history` subcollection**
   - After searching, verify documents are created
   - Fields: query, searchedAt, resultType, selectedResultId

2. **Firestore Indexes**
   - Check if composite indexes needed for search queries
   - Path: Firestore > Indexes

### Success Criteria
- [ ] Unified search working across all content types
- [ ] Search history persisting
- [ ] Video discovery unchanged
- [ ] Ready for Phase 5 (Library)

---

## Phase 5: Library Screen

### Overview
Create NEW Library screen (replacing Chat in tab bar). This is where users access their saved content.

### Duration Estimate
4-5 days

### Prerequisites
- [ ] Phase 4 complete
- [ ] User has liked some tracks (for testing)

### What We're CREATING (entirely new)
- Library tab (replaces Chat in nav)
- Filter tabs (All, Songs, Albums, Playlists, Downloads)
- User's playlists grid
- Liked songs list
- AI-generated songs (from Suno)
- Downloaded content
- FAB for "New Playlist"

### Implementation Steps

#### 5.1 Create Library Screen

**File:** `src/screens/LibraryScreen/LibraryScreen.js`

```javascript
<SafeAreaView>
  {/* Header */}
  <LibraryHeader
    title="Library"
    onSearchPress={openLibrarySearch}
  />

  {/* Filter Tabs */}
  <Tabs
    tabs={['All', 'Playlists', 'Songs', 'AI Created', 'Downloads']}
    activeTab={activeFilter}
    onSelect={setActiveFilter}
  />

  {/* Sort/View Toggle */}
  <SortViewControls
    sortBy={sortBy}
    onSortChange={setSortBy}
    viewMode={viewMode}
    onViewModeChange={setViewMode}
  />

  {/* Content based on filter */}
  {activeFilter === 'All' && <AllLibraryContent />}
  {activeFilter === 'Playlists' && <PlaylistsGrid playlists={userPlaylists} />}
  {activeFilter === 'Songs' && <LikedSongsList songs={likedSongs} />}
  {activeFilter === 'AI Created' && <AiSongsList songs={aiSongs} />}
  {activeFilter === 'Downloads' && <DownloadsList downloads={downloads} />}

  {/* FAB - New Playlist */}
  <Fab
    icon="plus"
    onPress={openCreatePlaylistModal}
  />
</SafeAreaView>
```

#### 5.2 Create Hooks for Library Data

**File:** `src/hooks/useUserPlaylists.js`
```javascript
// Fetch from playlists where ownerId == userId
// AND from users/{userId}/saved_playlists
```

**File:** `src/hooks/useLikedSongs.js`
```javascript
// Fetch from users/{userId}/liked_tracks
// Join with tracks collection
```

**File:** `src/hooks/useAiGeneratedSongs.js`
```javascript
// Fetch from composer_songs where userId == currentUser
```

**File:** `src/hooks/useDownloads.js`
```javascript
// Fetch from users/{userId}/downloads
// Check local storage for actual files
```

#### 5.3 Create Playlist Modal

**File:** `src/components/modals/CreatePlaylistModal.js`
- Name input
- Description input (optional)
- Cover image picker
- Privacy toggle (public/private)
- Save button

#### 5.4 Update Navigation

**File:** `src/navigation/MainNavigator.js`
- Replace Chat tab with Library tab
- Update tab icon
- Move Chat to Profile > Settings > Messages

### Testing Checklist

#### Functional Testing
- [ ] Library tab appears in bottom nav
- [ ] Library screen loads without error
- [ ] Filter tabs switch content correctly
- [ ] Playlists grid shows user's playlists
- [ ] Liked songs list shows liked tracks
- [ ] Tapping a song plays it
- [ ] FAB opens create playlist modal
- [ ] Can create a new playlist
- [ ] New playlist appears in grid
- [ ] AI Created shows Suno-generated songs
- [ ] **CRITICAL:** Chat is accessible from Profile

#### Technical Testing
- [ ] Library data loads in < 500ms
- [ ] Playlists grid renders efficiently
- [ ] No duplicate items in lists
- [ ] Playlist creation writes to Firestore correctly

#### User Testing
- [ ] Library feels organized
- [ ] Easy to find saved content
- [ ] Playlist creation is intuitive
- [ ] Not confused by Chat being moved

### Data Validation

**Firebase Console Checks:**

1. **`playlists` collection**
   - After creating playlist, verify document exists
   - Fields: name, ownerId, coverImageUrl, isPublic, createdAt

2. **`playlists/{playlistId}/tracks` subcollection**
   - After adding songs, verify track references exist

3. **`users/{userId}/liked_tracks` subcollection**
   - Verify liked tracks appear in Library

4. **`composer_songs` collection**
   - Verify AI-generated songs appear

### Success Criteria
- [ ] Library screen fully functional
- [ ] Playlist CRUD operations working
- [ ] All library data displays correctly
- [ ] Chat accessible from Profile
- [ ] Ready for Phase 6 (Profile)

---

## Phase 6: Profile Screen

### Overview
Enhance the existing Profile screen by ADDING music-related sections while PRESERVING all existing features.

### Duration Estimate
2-3 days

### Prerequisites
- [ ] Phase 5 complete
- [ ] User has playlists and liked tracks

### What We're KEEPING
- Profile picture with story border
- @username display
- Following/Followers/Likes counts
- Edit Profile / Follow button
- Video grid (3 columns)
- Pull-to-refresh
- Photo upload

### What We're ADDING
- "Your Playlists" section (horizontal scroll)
- Stats enhancement (add "Songs" count)
- Options menu (Downloads, History, Settings, Help)
- Chat access point (moved from tab bar)

### Implementation Steps

#### 6.1 Add Profile Sections

**File:** `src/components/screens/Profile/sections/`
```
sections/
├── ProfileHeader.js       # EXISTING - enhanced
├── ProfileStats.js        # EXISTING - add songs count
├── ProfilePlaylists.js    # NEW - horizontal playlist scroll
├── ProfileVideos.js       # EXISTING - video grid
└── ProfileOptions.js      # NEW - options menu
```

#### 6.2 Update Profile.js

```javascript
// Profile structure - ADDITIVE
<SafeAreaView>
  <FlatList
    ListHeaderComponent={
      <>
        {/* EXISTING: Profile Header */}
        <ProfileHeader user={user} />

        {/* ENHANCED: Stats with Songs count */}
        <ProfileStats
          following={followingCount}
          followers={followersCount}
          likes={reactionsCount}
          songs={songsCount}  // NEW
        />

        {/* EXISTING: Edit/Follow Button */}
        <ProfileActions ... />

        {/* NEW: Your Playlists (if own profile) */}
        {!isOtherUser && (
          <ProfilePlaylists
            playlists={userPlaylists}
            onPlaylistPress={navigateToPlaylist}
          />
        )}

        {/* NEW: Options Menu (if own profile) */}
        {!isOtherUser && (
          <ProfileOptions
            onDownloadsPress={...}
            onHistoryPress={...}
            onMessagesPress={...}  // Chat moved here
            onSettingsPress={...}
            onHelpPress={...}
          />
        )}
      </>
    }
    // EXISTING: Video grid
    data={profilePosts}
    numColumns={3}
    renderItem={renderVideoItem}
  />
</SafeAreaView>
```

### Testing Checklist

#### Functional Testing
- [ ] Profile loads without error
- [ ] All existing stats display correctly
- [ ] Songs count appears in stats
- [ ] Your Playlists section shows user's playlists
- [ ] Tapping playlist navigates to playlist detail
- [ ] Options menu items all navigate correctly
- [ ] **CRITICAL:** Video grid still displays and plays videos
- [ ] **CRITICAL:** Can still change profile photo
- [ ] **CRITICAL:** Following/Followers counts tap navigation works
- [ ] Chat is accessible from Profile options

#### Technical Testing
- [ ] Profile loads in < 500ms
- [ ] No performance regression
- [ ] Playlist data fetches efficiently

#### User Testing
- [ ] Profile feels complete, not cluttered
- [ ] Easy to find Chat (new location)
- [ ] Playlist section is useful

### Data Validation

**Firebase Console Checks:**

1. **User document**
   - Path: Firestore > users > [userId]
   - Verify all counts are correct

2. **User's playlists**
   - Path: Firestore > playlists
   - Query: where ownerId == [userId]
   - Verify playlists appear on profile

### Success Criteria
- [ ] Profile shows music and video content
- [ ] All existing features preserved
- [ ] Chat accessible from options
- [ ] Ready for Phase 7 (Create)

---

## Phase 7: Add/Create Screen

### Overview
Enhance the Create screen to support BOTH video recording (existing) AND song creation (new via Suno AI).

### Duration Estimate
5-7 days

### Prerequisites
- [ ] Phase 6 complete
- [ ] Suno API access configured
- [ ] Firebase Storage configured for audio

### What We're KEEPING
- Video camera recording
- Video preview and editing
- Caption and hashtag input
- Post to feed functionality

### What We're ADDING
- Create mode selector (Video / Song)
- Song prompt input
- Song style/genre picker
- Suno API integration
- Song preview player
- Media asset upload (images/clips for future video)
- Progress indicator for generation

### Implementation Steps

#### 7.1 Create Mode Selector

**File:** `src/screens/CreateScreen/CreateModeSelector.js`
```javascript
<View>
  <TouchableOpacity onPress={() => setMode('video')}>
    <Icon name="video-camera" />
    <Text>Record Video</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => setMode('song')}>
    <Icon name="music" />
    <Text>Create Song</Text>
  </TouchableOpacity>
</View>
```

#### 7.2 Song Creation Flow

**File:** `src/screens/CreateScreen/CreateSongScreen.js`

```javascript
// Step 1: Prompt Input
<SongPromptInput
  value={prompt}
  onChangeText={setPrompt}
  placeholder="Describe your song... (lyrics, mood, style)"
/>

// Step 2: Style Selection
<SongStylePicker
  genres={['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical']}
  moods={['Happy', 'Sad', 'Energetic', 'Calm', 'Romantic']}
  selectedGenre={genre}
  selectedMood={mood}
  onGenreSelect={setGenre}
  onMoodSelect={setMood}
/>

// Step 3: Generate Button
<Button
  title="Generate Song"
  onPress={handleGenerateSong}
  loading={isGenerating}
/>

// Step 4: Preview (after generation)
{generatedSong && (
  <SongPreview
    song={generatedSong}
    onPlay={playPreview}
    onSave={saveToLibrary}
    onPost={postToFeed}
    onAddVisuals={openMediaPicker}
  />
)}
```

#### 7.3 Suno API Service

**File:** `src/services/sunoService.js`

```javascript
const SUNO_API_BASE = 'https://api.sunoapi.org'; // or actual endpoint

export const generateSong = async (prompt, style, options = {}) => {
  // Call Suno API
  // Handle async generation (polling for completion)
  // Return audio URL and metadata
};

export const checkGenerationStatus = async (taskId) => {
  // Poll for completion
};
```

#### 7.4 Firebase Integration

**File:** `src/services/firebase/composerSongs.js`

```javascript
export const saveSunoSong = async (userId, songData) => {
  // Save to composer_songs collection
  // Copy audio to Firebase Storage
  // Create track entry
  // Add to user's library
};
```

#### 7.5 Media Asset Picker (for future video creation)

**File:** `src/components/MediaAssetPicker.js`
- Select images from gallery
- Select video clips from gallery
- Upload to Firebase Storage
- Save references to media_assets subcollection

### Testing Checklist

#### Functional Testing
- [ ] Create screen shows mode selector
- [ ] Can switch between Video and Song modes
- [ ] **CRITICAL:** Video recording still works (existing flow)
- [ ] Song prompt input works
- [ ] Style/genre picker works
- [ ] "Generate Song" calls Suno API
- [ ] Generation progress indicator shows
- [ ] Generated song plays in preview
- [ ] Can save song to Library
- [ ] Can post song to feed (as audio post)
- [ ] Media asset picker opens gallery
- [ ] Can upload images/clips
- [ ] Error handling for API failures

#### Technical Testing
- [ ] Suno API calls succeed
- [ ] Audio file uploads to Firebase Storage
- [ ] composer_songs document created correctly
- [ ] tracks document created correctly
- [ ] No timeout during generation (handle async properly)

#### User Testing
- [ ] Song creation flow is intuitive
- [ ] Progress feedback is clear
- [ ] Preview is satisfying
- [ ] Saving/posting is seamless
- [ ] Video creation unchanged and discoverable

### Data Validation

**Firebase Console Checks:**

1. **`composer_songs` collection**
   - After generating song, verify document exists
   - Fields: userId, prompt, style, audio_url, title, status

2. **`tracks` collection**
   - Verify track created with source: 'suno_ai'
   - Fields: title, audioUrl, thumbnailUrl, duration

3. **Firebase Storage**
   - Path: Storage > songs/[userId]/
   - Verify audio file uploaded

4. **`media_assets/{userId}` subcollection**
   - After uploading images/clips, verify documents exist

### Success Criteria
- [ ] Video creation unchanged
- [ ] Song creation via Suno working
- [ ] Songs save to Library
- [ ] Songs can post to feed
- [ ] Media assets can be uploaded
- [ ] All phases complete!

---

## Post-Implementation: Ongoing Testing

### Daily Smoke Tests
1. Launch app - no crash
2. Login with test account
3. Scroll video feed - videos play
4. Play a song - MiniPlayer appears
5. Open FullPlayer - controls work
6. Navigate to Library - content loads
7. Navigate to Profile - stats correct
8. Create content (video OR song) - posts successfully

### Weekly Regression Tests
Run through ALL test cases from ALL phases.

### Data Integrity Checks
- Verify follower/following counts match actual relationships
- Verify playlist track counts match subcollection documents
- Verify no orphaned documents

---

## Data Models

### MediaItem (Unified)
```typescript
interface MediaItem {
  id: string;
  type: 'audio' | 'video';
  title: string;
  artist?: string;
  description?: string;
  thumbnailUrl: string;
  mediaUrl: string;
  duration?: number;
  // For Firebase integration
  authorId?: string;
  createdAt?: Timestamp;
}
```

### Playlist
```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImageUrl: string;
  ownerId: string;
  items: MediaItem[];
  isPublic: boolean;
  createdAt: Timestamp;
}
```

---

## Notes

- The music-app-main uses static mock data; all data will come from Firebase in LetsMakeMusic
- Consider caching strategies for offline playback
- Suno AI integration will generate audio that needs to be playable in the new player
- Video posts from TikTok-style feed should also be playable in the unified player
- **CRITICAL:** The unified player must support BOTH video AND audio - this is ADDITIVE to existing video capabilities

---

## Firebase Schema Analysis

### Existing Collections (LetsMakeMusic)

#### `users` collection
```typescript
// Current schema from userClient.js
{
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureURL?: string;
  isOnline: boolean;
  createdAt: Timestamp;
}
```

#### `posts` collection
```typescript
// Current schema - video posts
{
  id: string;
  authorID: string;
  postMedia: [{
    url: string;           // video URL
    thumbnailURL: string;
    type: 'video';
  }];
  postText?: string;
  hashtags?: string[];
  reactions?: { [key: string]: number };
  commentCount: number;
  createdAt: Timestamp;
}
```

#### `social_feeds/{userId}/main_feed` subcollection
```typescript
// Denormalized feed items
{
  id: string;           // postId
  authorID: string;
  createdAt: Timestamp;
}
```

#### `hashtags` collection
```typescript
{
  hashtag: string;
  count: number;
}
```

#### `composer_songs` collection
```typescript
// From songs.js - used for Suno AI generated tracks
{
  id: string;
  userId: string;
  title: string;
  audio_url?: string;
  image_url?: string;
  // ... other Suno fields
}
```

---

### NEW Collections Required

#### `tracks` collection
**Purpose:** Store individual audio tracks (songs)
```typescript
interface Track {
  id: string;
  title: string;
  artistId: string;               // ref to users or artists
  artistName: string;             // denormalized
  albumId?: string;               // ref to albums
  albumName?: string;             // denormalized
  duration: number;               // in seconds
  audioUrl: string;               // Firebase Storage URL
  thumbnailUrl: string;           // album art
  waveformData?: number[];        // for visualizations
  genre?: string;
  releaseDate?: Timestamp;
  playCount: number;
  likeCount: number;
  isExplicit: boolean;
  source: 'upload' | 'suno_ai' | 'external';
  sunoSongId?: string;            // if generated via Suno
  createdAt: Timestamp;
}
```

#### `playlists` collection
**Purpose:** User-created and system playlists
```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImageUrl: string;
  ownerId: string;
  ownerName: string;              // denormalized
  trackCount: number;
  totalDuration: number;          // in seconds
  isPublic: boolean;
  isSystemPlaylist: boolean;      // for "Liked Songs", etc.
  followerCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
// Subcollection: playlists/{playlistId}/tracks
interface PlaylistTrack {
  trackId: string;
  addedAt: Timestamp;
  addedBy: string;
  position: number;               // for ordering
}
```

#### `artists` collection
**Purpose:** Artist profiles (separate from regular users)
```typescript
interface Artist {
  id: string;
  name: string;
  bio?: string;
  imageUrl: string;
  headerImageUrl?: string;
  followerCount: number;
  monthlyListeners: number;
  isVerified: boolean;
  genres: string[];
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  userId?: string;                // if artist has a user account
  createdAt: Timestamp;
}
```

#### `albums` collection
**Purpose:** Music albums
```typescript
interface Album {
  id: string;
  name: string;
  artistId: string;
  artistName: string;             // denormalized
  coverImageUrl: string;
  releaseDate: Timestamp;
  trackCount: number;
  totalDuration: number;
  genre?: string;
  type: 'album' | 'single' | 'ep';
  createdAt: Timestamp;
}
```

#### `featured_content` collection
**Purpose:** Editorial/curated content for Home screen sections
```typescript
interface FeaturedContent {
  id: string;
  type: 'todays_picks' | 'playlist_for_you' | 'radio' | 'trending';
  title: string;
  description?: string;
  imageUrl: string;
  targetType: 'track' | 'playlist' | 'album' | 'artist';
  targetId: string;
  position: number;               // ordering
  isActive: boolean;
  startDate?: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
}
```

#### `stations` collection (Radio)
**Purpose:** Radio-style continuous play stations
```typescript
interface Station {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  genre?: string;
  basedOn: 'genre' | 'artist' | 'mood' | 'activity';
  seedArtistIds?: string[];
  seedTrackIds?: string[];
  listenerCount: number;
  createdAt: Timestamp;
}
```

---

### NEW Subcollections (under `users/{userId}`)

#### `users/{userId}/liked_tracks`
```typescript
{
  trackId: string;
  likedAt: Timestamp;
}
```

#### `users/{userId}/listening_history`
```typescript
{
  trackId: string;
  playedAt: Timestamp;
  duration: number;               // how long they listened
  completedPlay: boolean;
}
```

#### `users/{userId}/search_history`
```typescript
{
  query: string;
  searchedAt: Timestamp;
  resultType?: 'track' | 'artist' | 'playlist';
  selectedResultId?: string;
}
```

#### `users/{userId}/followed_artists`
```typescript
{
  artistId: string;
  followedAt: Timestamp;
}
```

#### `users/{userId}/saved_playlists`
```typescript
{
  playlistId: string;
  savedAt: Timestamp;
}
```

#### `users/{userId}/downloads`
```typescript
{
  trackId: string;
  downloadedAt: Timestamp;
  localPath: string;
  fileSize: number;
  expiresAt?: Timestamp;          // for offline licensing
}
```

---

### User Schema Extensions

Add these fields to the existing `users` collection:
```typescript
// Additional fields for music features
{
  // Existing fields...

  // NEW fields
  followerCount: number;          // cached count
  followingCount: number;         // cached count
  playlistCount: number;          // user's playlists
  totalLikes: number;             // likes received on content
  likedTracksCount: number;       // tracks user has liked

  // Preferences
  musicPreferences?: {
    favoriteGenres: string[];
    enableExplicitContent: boolean;
    audioQuality: 'low' | 'normal' | 'high';
  };

  // Playback state (for cross-device sync)
  lastPlayedTrack?: {
    trackId: string;
    position: number;
    timestamp: Timestamp;
  };
}
```

---

### Data Requirements by Screen

#### Home/Feed Screen
| Data | Source Collection | Query |
|------|-------------------|-------|
| User greeting | `users` | Current user doc |
| Today's Picks | `featured_content` | `where type == 'todays_picks'` |
| Your Favorites | `users/{uid}/liked_tracks` | Recent 10, join with `tracks` |
| Playlists For You | `playlists` | Algorithmic (based on listening history) |
| Artists | `artists` | Based on followed + recommendations |
| Radio | `stations` | Featured stations |
| Video Feed | `posts` | Existing query from social_feeds |
| Current Playing | Local state + `tracks` | Active track |

#### Search/Discover Screen
| Data | Source Collection | Query |
|------|-------------------|-------|
| Recent Searches | `users/{uid}/search_history` | Last 10 |
| Search Results | `tracks`, `artists`, `playlists` | Algolia or Firestore text search |
| Discover New | `posts` | Existing `useDiscoverPosts` |
| Trending Hashtags | `hashtags` | Top by count |

#### Library Screen
| Data | Source Collection | Query |
|------|-------------------|-------|
| User Playlists | `playlists` | `where ownerId == uid` |
| Saved Playlists | `users/{uid}/saved_playlists` | Join with `playlists` |
| Liked Songs | `users/{uid}/liked_tracks` | Join with `tracks` |
| Downloaded | `users/{uid}/downloads` | Join with `tracks` |
| AI Generated | `composer_songs` | `where userId == uid` |

#### Profile Screen
| Data | Source Collection | Query |
|------|-------------------|-------|
| User Info | `users` | User doc |
| Followers Count | `users.followerCount` | Cached in user doc |
| Following Count | `users.followingCount` | Cached in user doc |
| User Videos | `posts` | `where authorID == uid` |
| User Playlists | `playlists` | `where ownerId == uid AND isPublic` |
| Liked Songs | `users/{uid}/liked_tracks` | Count |

---

### Firestore Security Rules (Proposed)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users - read public, write own
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;

      // User subcollections - private to owner
      match /liked_tracks/{trackId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /listening_history/{historyId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /search_history/{searchId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /downloads/{downloadId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /followed_artists/{artistId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /saved_playlists/{playlistId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Tracks - read all, write authenticated
    match /tracks/{trackId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        get(/databases/$(database)/documents/tracks/$(trackId)).data.artistId == request.auth.uid;
    }

    // Playlists - read public or owner, write owner
    match /playlists/{playlistId} {
      allow read: if resource.data.isPublic == true ||
        (request.auth != null && resource.data.ownerId == request.auth.uid);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        resource.data.ownerId == request.auth.uid;

      match /tracks/{trackRef} {
        allow read: if get(/databases/$(database)/documents/playlists/$(playlistId)).data.isPublic == true ||
          (request.auth != null && get(/databases/$(database)/documents/playlists/$(playlistId)).data.ownerId == request.auth.uid);
        allow write: if request.auth != null &&
          get(/databases/$(database)/documents/playlists/$(playlistId)).data.ownerId == request.auth.uid;
      }
    }

    // Artists - read all, write admins only
    match /artists/{artistId} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Featured content - read all, write admins
    match /featured_content/{contentId} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Stations - read all, write admins
    match /stations/{stationId} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

---

## Unified Media Player Architecture (Video + Audio)

**CRITICAL:** LetsMakeMusic must support BOTH video AND audio playback. The music player from music-app-main is ADDITIVE - not replacing the existing video player.

### Player States

```
┌──────────────────────────────────────────────────────────────────┐
│                    Media Player State Machine                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐                    ┌─────────────┐             │
│   │    IDLE     │ ──loadMedia()───▶ │   LOADING   │             │
│   └─────────────┘                    └──────┬──────┘             │
│         ▲                                   │                     │
│         │                                   ▼                     │
│      stop()                          ┌─────────────┐             │
│         │                            │   READY     │             │
│         │                            └──────┬──────┘             │
│         │                                   │                     │
│         │          play()                   ▼                     │
│   ┌─────┴─────┐ ◀──────────────── ┌─────────────┐               │
│   │  STOPPED  │                    │   PLAYING   │ ◀───┐        │
│   └───────────┘ ──────────────────▶└──────┬──────┘     │         │
│                      play()               │            │         │
│                                     pause()        play()        │
│                                           ▼            │         │
│                                    ┌─────────────┐     │         │
│                                    │   PAUSED    │ ────┘         │
│                                    └─────────────┘               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MediaPlayerProvider                           │
│  (Context wrapping the app - manages global playback state)          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────┐     ┌────────────────────┐                  │
│  │   VideoPlayer      │     │   AudioPlayer      │                  │
│  │   (expo-av Video)  │     │   (expo-av Sound)  │                  │
│  └─────────┬──────────┘     └──────────┬─────────┘                  │
│            │                           │                             │
│            └───────────┬───────────────┘                             │
│                        ▼                                             │
│            ┌─────────────────────┐                                   │
│            │  useMediaPlayer()   │                                   │
│            │  - mediaType        │                                   │
│            │  - isPlaying        │                                   │
│            │  - position         │                                   │
│            │  - duration         │                                   │
│            │  - play/pause/seek  │                                   │
│            └──────────┬──────────┘                                   │
│                       │                                              │
│         ┌─────────────┼─────────────┐                               │
│         ▼             ▼             ▼                               │
│   ┌──────────┐  ┌──────────┐  ┌───────────────┐                    │
│   │ MiniBar  │  │FullSheet │  │ VideoFeedItem │                    │
│   │ (Audio)  │  │ (Audio)  │  │   (Video)     │                    │
│   └──────────┘  └──────────┘  └───────────────┘                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Video vs Audio Display

| Context | Media Type | Player Component | Location |
|---------|-----------|------------------|----------|
| Feed scroll | Video | VideoFeedItem (fullscreen) | Inline in FlatList |
| Profile grid tap | Video | VideoFeedItem (modal/fullscreen) | Modal overlay |
| Song from playlist | Audio | MiniPlayer + BottomSheet | Bottom bar + sheet |
| Song from search | Audio | MiniPlayer + BottomSheet | Bottom bar + sheet |
| AI generated track | Audio | MiniPlayer + BottomSheet | Bottom bar + sheet |

### Key Implementation Points

1. **Video and Audio are mutually exclusive** - When playing audio, pause any video. When playing video, pause audio.

2. **Mini Player only for Audio** - Videos play inline or fullscreen, not in mini player.

3. **Bottom Sheet only for Audio** - Full player sheet is for audio tracks with album art, lyrics, queue.

4. **Preserve TikTok-style video experience** - The vertical video scroll is core to the app identity.

5. **Add Music sections to Home** - Horizontal scrolls for playlists/artists are BELOW the video feed, not replacing it.


---

## Implementation Phases Checklist

> **CRITICAL:** All new functionality is ADDITIVE - not replacing existing features

### Phase 1: Foundation
- [x] Install `@gorhom/bottom-sheet@^5`
- [x] Install `react-native-reanimated@~3.18.0`
- [x] Install `react-native-gesture-handler`
- [x] Configure `babel.config.js` with reanimated plugin
- [x] Wrap App with `GestureHandlerRootView`
- [x] Create base UI components directory structure
- [x] Verify app builds and runs without regression

### Phase 2: Player Infrastructure
- [x] Create `MediaPlayerContext` (unified audio/video state)
- [x] Create `useMediaPlayer` hook
- [x] Create `MiniPlayer` component (bottom bar for audio)
- [x] Create `FullPlayerBottomSheet` component
- [x] Wrap app with `MediaPlayerProvider`
- [x] Test with mock audio URL (Profile screen has "Test Audio Player" button)
- [ ] Verify video playback unaffected

### Phase 3: Feed/Home Screen
- [ ] Create `FeedHeader` with greeting
- [ ] Create horizontal filter tabs (All, Music, Videos)
- [ ] Create `TodaysPicks` carousel
- [ ] Create `YourFavorites` song list
- [ ] Create `PlaylistsForYou` horizontal scroll
- [ ] Integrate player with song taps
- [ ] Verify video feed still works

### Phase 4: Discover/Search
- [ ] Create unified search (videos, songs, artists, playlists)
- [ ] Add search history persistence
- [ ] Create search results tabs
- [ ] Add "Discover Something New" section
- [ ] Verify hashtag search still works

### Phase 5: Library Screen (MOSTLY COMPLETE)
- [x] Create Library screen (replaces Chat tab)
- [x] Create filter tabs (All, Playlists, Songs, AI Created, Videos)
- [x] Create song list component with real Firebase songs
- [x] Create playlist grid component (2-column grid with FadeInDown animation)
- [x] Create "New Playlist" FAB
- [ ] Move Chat to Profile settings

### Phase 6: Profile Screen
- [ ] Add "Your Playlists" section
- [ ] Add "Songs" count to stats
- [ ] Add options menu (Downloads, History, Settings, Help)
- [ ] Add Chat access from Profile
- [ ] Verify video grid still works

### Phase 7: Add/Create Screen + Suno AI (MOSTLY COMPLETE)
- [x] Create mode selector (Video/Song)
- [x] Create song prompt input (Simple + Custom modes)
- [x] Create style/genre picker
- [x] Integrate Suno API (with model version selector V3.5-V5)
- [x] Create song preview player (uses MediaPlayer context)
- [x] Timestamped lyrics API integration for karaoke sync
- [x] Save songs to Firebase with lyrics (`songsService.js`)
- [ ] Verify video recording still works

