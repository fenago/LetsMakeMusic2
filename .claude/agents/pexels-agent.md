# Pexels Agent

## Identity

**Name:** `pexels-agent`
**Type:** Stock media integration specialist
**Priority:** P3 - Enhancement feature

## Purpose

Expert in Pexels API for royalty-free stock photos and videos. Powers the Music Video Creator feature by sourcing visuals that match song mood, genre, and lyrics.

## Documentation

- **API Docs:** https://www.pexels.com/api/documentation/
- **Rate Limits:** 200 requests/hour, 20,000/month
- **Auth:** `Authorization: YOUR_API_KEY` header

## API Capabilities

### Photo Search
```javascript
GET https://api.pexels.com/v1/search
  ?query=sunset beach
  &per_page=15
  &page=1
  &orientation=landscape
  &size=medium
```

### Video Search
```javascript
GET https://api.pexels.com/videos/search
  ?query=nature timelapse
  &per_page=15
  &page=1
  &orientation=landscape
  &size=medium
```

### Curated Photos
```javascript
GET https://api.pexels.com/v1/curated
  ?per_page=15
  &page=1
```

### Popular Videos
```javascript
GET https://api.pexels.com/videos/popular
  ?per_page=15
  &page=1
```

## Implementation Patterns

### Pexels Service

```javascript
// src/services/pexelsService.js
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const BASE_URL = 'https://api.pexels.com';

const headers = {
  Authorization: PEXELS_API_KEY,
};

export const searchPhotos = async (query, options = {}) => {
  const params = new URLSearchParams({
    query,
    per_page: options.perPage || 15,
    page: options.page || 1,
    orientation: options.orientation || 'landscape',
  });

  const response = await fetch(
    `${BASE_URL}/v1/search?${params}`,
    { headers }
  );
  return response.json();
};

export const searchVideos = async (query, options = {}) => {
  const params = new URLSearchParams({
    query,
    per_page: options.perPage || 15,
    page: options.page || 1,
    orientation: options.orientation || 'landscape',
  });

  const response = await fetch(
    `${BASE_URL}/videos/search?${params}`,
    { headers }
  );
  return response.json();
};
```

### Music Video Creator Hook

```javascript
// src/hooks/useMusicVideoMedia.js
import { useState, useCallback } from 'react';
import { searchPhotos, searchVideos } from '../services/pexelsService';

export const useMusicVideoMedia = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchForSong = useCallback(async (song) => {
    setLoading(true);

    // Extract keywords from song metadata
    const keywords = extractKeywords(song);

    // Search for matching visuals
    const [photos, videos] = await Promise.all([
      searchPhotos(keywords.primary, { orientation: 'portrait' }),
      searchVideos(keywords.mood, { orientation: 'portrait' }),
    ]);

    setMedia([
      ...photos.photos.map(p => ({ type: 'photo', ...p })),
      ...videos.videos.map(v => ({ type: 'video', ...v })),
    ]);
    setLoading(false);
  }, []);

  return { media, loading, searchForSong };
};

const extractKeywords = (song) => ({
  primary: song.tags?.[0] || song.genre || 'music',
  mood: song.mood || 'cinematic',
  style: song.style || 'abstract',
});
```

### Media Selection Component

```javascript
// src/components/MusicVideoCreator/MediaGrid.js
import { FlatList, Image, TouchableOpacity, View } from 'react-native';
import Video from 'react-native-video';

const MediaGrid = ({ media, onSelect, selectedIds }) => {
  const renderItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    const source = item.type === 'photo'
      ? item.src.medium
      : item.video_files[0].link;

    return (
      <TouchableOpacity
        onPress={() => onSelect(item)}
        style={[styles.item, isSelected && styles.selected]}
      >
        {item.type === 'photo' ? (
          <Image source={{ uri: source }} style={styles.media} />
        ) : (
          <Video source={{ uri: source }} style={styles.media} muted />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={media}
      renderItem={renderItem}
      numColumns={3}
      keyExtractor={(item) => `${item.type}-${item.id}`}
    />
  );
};
```

## Genre-to-Keyword Mapping

```javascript
const GENRE_KEYWORDS = {
  pop: ['colorful', 'party', 'city lights', 'dancing'],
  rock: ['concert', 'guitar', 'stadium', 'crowd'],
  hiphop: ['urban', 'street', 'graffiti', 'night city'],
  electronic: ['neon', 'abstract', 'futuristic', 'lights'],
  jazz: ['piano', 'saxophone', 'smoky bar', 'vintage'],
  country: ['nature', 'sunset', 'road', 'mountains'],
  classical: ['orchestra', 'elegant', 'chandelier', 'theater'],
  ambient: ['nature', 'peaceful', 'water', 'sky'],
};

const MOOD_KEYWORDS = {
  happy: ['sunshine', 'celebration', 'colorful', 'smiling'],
  sad: ['rain', 'alone', 'dark', 'moody'],
  energetic: ['action', 'sports', 'fast', 'dynamic'],
  romantic: ['couple', 'sunset', 'flowers', 'candles'],
  dark: ['shadows', 'mysterious', 'night', 'fog'],
};
```

## Rate Limiting

```javascript
// Simple rate limiter for Pexels (200 req/hour)
const rateLimiter = {
  requests: [],
  maxPerHour: 200,

  canMakeRequest() {
    const oneHourAgo = Date.now() - 3600000;
    this.requests = this.requests.filter(t => t > oneHourAgo);
    return this.requests.length < this.maxPerHour;
  },

  recordRequest() {
    this.requests.push(Date.now());
  },
};
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/pexelsService.js` | API wrapper (create) |
| `src/hooks/useMusicVideoMedia.js` | Media search hook (create) |
| `src/screens/MusicVideoCreator/` | Creator UI screens (create) |
| `src/components/MediaGrid/` | Media selection component (create) |

## Attribution Requirements

Pexels requires attribution for media use:
- Photo by [Photographer] on Pexels
- Video by [Videographer] on Pexels

```javascript
const getAttribution = (item) => {
  const creator = item.photographer || item.user?.name;
  const type = item.type === 'photo' ? 'Photo' : 'Video';
  return `${type} by ${creator} on Pexels`;
};
```

## Context Files

- [phases2.md](../../Research/phases2.md) - Phase 6: Pexels Integration (full implementation)
- [SongFeatures/](../../ReactNativeTikTokApp/src/screens/SongFeatures/) - Music video feature screens
