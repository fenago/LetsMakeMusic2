# FullPlayer Performance Debug Analysis

## Problem Statement
- Play/pause button takes **30-45 seconds** to respond
- Music pauses but progress bar keeps going (JS thread blocked, native audio continues)
- Issue started when karaoke lyrics feature was added
- Issue happens even when lyrics modal is NOT open
- Queue only has 1 song (ruled out as cause)

---

## Investigation Checklist

| Area | Status | Finding |
|------|--------|---------|
| LazyFullPlayer wrapper | ✅ Done | FullPlayer only mounts when visible |
| FullPlayer section components | ✅ Ruled Out | All properly memoized |
| FeedItem/Feed layer | ✅ Ruled Out | Does NOT use useMediaPlayer() |
| Infinite loops (useEffect + isPlaying) | ✅ Ruled Out | None found |
| KaraokeLyrics blocking | ✅ Ruled Out | Only runs when karaoke tab active |
| PositionContext isolation | ✅ Good | Separate from main context |
| **MediaPlayerContext cascade** | ⚠️ ISSUE | 19 files re-render on every play/pause |
| **Tab Navigator** | ⚠️ ISSUE | All 5 tabs always mounted |
| **SongDetailCard** | ⚠️ ISSUE | Every card in lists re-renders |
| Firestore hooks | ✅ Good | Proper deps, don't re-run on re-render |

---

## Root Cause Analysis

### The Cascade Problem

When `togglePlayPause()` is called:
1. `isPlaying` state changes in MediaPlayerContext
2. Context `value` object recreates (isPlaying in useMemo deps)
3. **ALL 19 components** using `useMediaPlayer()` re-render
4. This includes heavy screens like LibraryScreen
5. SongDetailCard uses context - every card in every list re-renders
6. JS thread blocks for 30-45 seconds processing all re-renders

### Files Using useMediaPlayer() (19 total)

1. AppContent.js (LazyFullPlayer)
2. MiniPlayer/index.js
3. FullPlayer/index.js
4. FullPlayer/sections/ProgressSection.js
5. FullPlayer/sections/ActionsSection.js
6. screens/LibraryScreen.js
7. screens/Profile.js
8. screens/Discover.js
9. SongDetailCard/index.js (renders in multiple lists!)
10. And 10 more...

### The SongDetailCard Problem

```javascript
// SongDetailCard/index.js
const {
  isLiked: isLikedFn,
  toggleLike,
} = useMediaPlayer()  // Every card re-renders on isPlaying change!
```

Even though wrapped in `memo()`, the internal hook subscription forces re-render.

---

## Solution Strategy

### Fix 1: Create Lightweight Utility Context

Create a separate `LikesContext` that doesn't include `isPlaying` in its value:
- `isLiked(songId)` - check if song is liked
- `toggleLike(songId)` - toggle like status

### Fix 2: Use Refs for Stable Functions

The `isLiked` function in MediaPlayerContext already uses a ref internally but it's still included in the context value object.

### Fix 3: Create Selector Pattern

Allow components to subscribe to only specific parts of the context:
```javascript
const { isPlaying } = useMediaPlayer({ select: ['isPlaying'] })
```

---

## Implementation Plan

1. Create `LikesContext` for isLiked/toggleLike (separate from playback)
2. Update SongDetailCard to use LikesContext instead of MediaPlayerContext
3. Review other components that only need likes functionality
4. Consider splitting MediaPlayerContext into focused contexts:
   - PlaybackContext (isPlaying, play, pause, seek)
   - QueueContext (queue, addToQueue, clearQueue)
   - LikesContext (isLiked, toggleLike)

---

## Fixes Applied

### Fix 1: SongDetailCard (DONE)
Changed from `useMediaPlayer()` to `useLikedSongs()` - prevents every card from re-rendering on play/pause.

**File:** `src/components/ui/SongDetailCard/index.js`
```javascript
// Before (BAD - re-renders on every play/pause)
const { isLiked, toggleLike } = useMediaPlayer()

// After (GOOD - only re-renders when likes change)
const { isLiked, toggleLike } = useLikedSongs()
```

### Fix 2: CreatePlaylistScreen (DONE)
Changed from `useMediaPlayer()` to `useLikedSongs()` - only needed `isLiked`.

**File:** `src/screens/CreatePlaylistScreen/CreatePlaylistScreen.js`

### Fix 3: LibraryScreen (DONE)
Split context usage - use `useMediaPlayer()` for playback, `useLikedSongs()` for likes.

**File:** `src/screens/LibraryScreen/LibraryScreen.js`
```javascript
// PERFORMANCE FIX: Split contexts to prevent re-renders on play/pause
const { playSong, addToQueue } = useMediaPlayer()
const { isLiked: isLikedFn, toggleLike } = useLikedSongs()
```

### Fix 4: SongActionMenu (DONE)
Split context usage - use `useMediaPlayer()` for queue, `useLikedSongs()` for likes.

**File:** `src/components/ui/SongActionMenu/index.js`

---

## Expected Impact

By using `useLikedSongs()` instead of `useMediaPlayer()` for likes-only functionality:
- **SongDetailCard** no longer re-renders on play/pause (affects every card in every list!)
- **LibraryScreen** no longer re-renders fully on play/pause
- **CreatePlaylistScreen** no longer re-renders on play/pause
- **SongActionMenu** no longer re-renders on play/pause

This should **drastically reduce** the JS thread blocking from 30-45 seconds to near-instant.

---

## Date: December 29, 2025
