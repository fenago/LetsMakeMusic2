# Pexels Agent

## Identity

**Name:** `pexels-agent`
**Type:** Stock media integration specialist
**Priority:** P3 - Enhancement feature

## Purpose

Expert in Pexels API for ALL royalty-free stock photos and video functionality. Powers the Music Video Creator feature by sourcing visuals that match song mood, genre, and lyrics.

## Documentation

- **API Docs:** https://www.pexels.com/api/documentation/
- **Base URL (Photos):** `https://api.pexels.com/v1/`
- **Base URL (Videos):** `https://api.pexels.com/videos/`
- **Auth:** `Authorization: YOUR_API_KEY` header

---

## Complete API Reference

### Photo Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/search` | GET | Search photos by keyword | ✅ Implemented |
| `/v1/curated` | GET | Get trending curated photos | ✅ Implemented |
| `/v1/photos/:id` | GET | Get a specific photo by ID | 🔄 Planned |

### Video Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/videos/search` | GET | Search videos by keyword | ✅ Implemented |
| `/videos/popular` | GET | Get popular trending videos | ✅ Implemented |
| `/videos/videos/:id` | GET | Get a specific video by ID | 🔄 Planned |

### Collection Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/v1/collections/featured` | GET | Get featured collections | 🔄 Planned |
| `/v1/collections` | GET | Get your personal collections | 🔄 Planned |
| `/v1/collections/:id` | GET | Get media within a collection | 🔄 Planned |

---

## Rate Limits & Headers

| Limit | Value |
|-------|-------|
| Requests/Hour | 200 |
| Requests/Month | 20,000 |
| Max per_page | 80 |

**Response Headers:**
```
X-Ratelimit-Limit: 20000      // Monthly quota
X-Ratelimit-Remaining: 19684  // Remaining requests
X-Ratelimit-Reset: 1590529646 // UNIX timestamp for quota reset
```

---

## Search Parameters

### Photo Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | **Required.** Search term (e.g., "nature", "city lights") |
| `orientation` | string | `landscape`, `portrait`, or `square` |
| `size` | string | `large` (24MP), `medium` (12MP), or `small` (4MP) |
| `color` | string | Color filter: `red`, `orange`, `yellow`, `green`, `turquoise`, `blue`, `violet`, `pink`, `brown`, `black`, `gray`, `white`, or hex code (e.g., `#ffffff`) |
| `locale` | string | Search locale (e.g., `en-US`, `es-ES`, `ja-JP`) |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Results per page (default: 15, max: 80) |

### Video Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | **Required.** Search term |
| `orientation` | string | `landscape`, `portrait`, or `square` |
| `size` | string | `large` (4K), `medium` (Full HD), or `small` (HD) |
| `locale` | string | Search locale |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Results per page (default: 15, max: 80) |

### Popular Videos Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `min_width` | integer | Minimum width in pixels |
| `min_height` | integer | Minimum height in pixels |
| `min_duration` | integer | Minimum duration in seconds |
| `max_duration` | integer | Maximum duration in seconds |
| `page` | integer | Page number |
| `per_page` | integer | Results per page |

### Collection Media Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by `photos` or `videos` |
| `sort` | string | Order: `asc` or `desc` (default: asc) |
| `page` | integer | Page number |
| `per_page` | integer | Results per page |

---

## Resource Schemas

### Photo Resource

```javascript
{
  id: 2014422,
  width: 3024,
  height: 3024,
  url: "https://www.pexels.com/photo/brown-rocks-2014422/",
  photographer: "Joey Farina",
  photographer_url: "https://www.pexels.com/@joey",
  photographer_id: 680589,
  avg_color: "#978E82", // Useful for placeholders
  src: {
    original: "https://images.pexels.com/.../original.jpeg",
    large2x: "...", // W 940px X H 650px DPR 2
    large: "...",   // W 940px X H 650px DPR 1
    medium: "...",  // Height 350px
    small: "...",   // Height 130px
    portrait: "...", // W 800px X H 1200px
    landscape: "...", // W 1200px X H 627px
    tiny: "...",    // W 280px X H 200px
  },
  liked: false,
  alt: "Brown Rocks During Golden Hour"
}
```

### Video Resource

```javascript
{
  id: 2499611,
  width: 1080,
  height: 1920,
  url: "https://www.pexels.com/video/2499611/",
  image: "https://images.pexels.com/videos/.../preview.jpg", // Thumbnail
  duration: 22, // seconds
  user: {
    id: 680589,
    name: "Joey Farina",
    url: "https://www.pexels.com/@joey"
  },
  video_files: [
    {
      id: 125004,
      quality: "hd", // 'hd', 'sd', or 'hls'
      file_type: "video/mp4",
      width: 1080,
      height: 1920,
      fps: 23.976,
      link: "https://player.vimeo.com/..."
    }
  ],
  video_pictures: [
    {
      id: 308178,
      picture: "https://static-videos.pexels.com/.../preview-0.jpg",
      nr: 0 // Frame number
    }
  ]
}
```

### Collection Resource

```javascript
{
  id: "8xntbhr",
  title: "Hello Spring",
  description: "Baby chicks, rabbits & pretty flowers",
  private: false,
  media_count: 130,
  photos_count: 121,
  videos_count: 9
}
```

---

## Implementation Patterns

### Complete Pexels Service

```javascript
// src/services/pexelsService.js
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PHOTOS_BASE = 'https://api.pexels.com/v1';
const VIDEOS_BASE = 'https://api.pexels.com/videos';

const headers = { Authorization: PEXELS_API_KEY };

// === PHOTO ENDPOINTS ===

export const searchPhotos = async (query, options = {}) => {
  const params = new URLSearchParams({
    query,
    per_page: options.perPage || 15,
    page: options.page || 1,
    ...(options.orientation && { orientation: options.orientation }),
    ...(options.size && { size: options.size }),
    ...(options.color && { color: options.color }),
    ...(options.locale && { locale: options.locale }),
  });

  const response = await fetch(`${PHOTOS_BASE}/search?${params}`, { headers });
  return response.json();
};

export const getCuratedPhotos = async (options = {}) => {
  const params = new URLSearchParams({
    per_page: options.perPage || 15,
    page: options.page || 1,
  });

  const response = await fetch(`${PHOTOS_BASE}/curated?${params}`, { headers });
  return response.json();
};

export const getPhoto = async (photoId) => {
  const response = await fetch(`${PHOTOS_BASE}/photos/${photoId}`, { headers });
  return response.json();
};

// === VIDEO ENDPOINTS ===

export const searchVideos = async (query, options = {}) => {
  const params = new URLSearchParams({
    query,
    per_page: options.perPage || 15,
    page: options.page || 1,
    ...(options.orientation && { orientation: options.orientation }),
    ...(options.size && { size: options.size }),
    ...(options.locale && { locale: options.locale }),
  });

  const response = await fetch(`${VIDEOS_BASE}/search?${params}`, { headers });
  return response.json();
};

export const getPopularVideos = async (options = {}) => {
  const params = new URLSearchParams({
    per_page: options.perPage || 15,
    page: options.page || 1,
    ...(options.minWidth && { min_width: options.minWidth }),
    ...(options.minHeight && { min_height: options.minHeight }),
    ...(options.minDuration && { min_duration: options.minDuration }),
    ...(options.maxDuration && { max_duration: options.maxDuration }),
  });

  const response = await fetch(`${VIDEOS_BASE}/popular?${params}`, { headers });
  return response.json();
};

export const getVideo = async (videoId) => {
  const response = await fetch(`${VIDEOS_BASE}/videos/${videoId}`, { headers });
  return response.json();
};

// === COLLECTION ENDPOINTS ===

export const getFeaturedCollections = async (options = {}) => {
  const params = new URLSearchParams({
    per_page: options.perPage || 15,
    page: options.page || 1,
  });

  const response = await fetch(
    `${PHOTOS_BASE}/collections/featured?${params}`,
    { headers }
  );
  return response.json();
};

export const getMyCollections = async (options = {}) => {
  const params = new URLSearchParams({
    per_page: options.perPage || 15,
    page: options.page || 1,
  });

  const response = await fetch(
    `${PHOTOS_BASE}/collections?${params}`,
    { headers }
  );
  return response.json();
};

export const getCollectionMedia = async (collectionId, options = {}) => {
  const params = new URLSearchParams({
    per_page: options.perPage || 15,
    page: options.page || 1,
    ...(options.type && { type: options.type }), // 'photos' or 'videos'
    ...(options.sort && { sort: options.sort }), // 'asc' or 'desc'
  });

  const response = await fetch(
    `${PHOTOS_BASE}/collections/${collectionId}?${params}`,
    { headers }
  );
  return response.json();
};
```

### Rate Limiter

```javascript
// src/services/pexelsRateLimiter.js
class PexelsRateLimiter {
  constructor() {
    this.requests = [];
    this.maxPerHour = 200;
    this.remaining = null;
    this.resetTime = null;
  }

  canMakeRequest() {
    // Check header-based limit first
    if (this.remaining !== null && this.remaining <= 0) {
      return false;
    }

    // Fallback to local tracking
    const oneHourAgo = Date.now() - 3600000;
    this.requests = this.requests.filter(t => t > oneHourAgo);
    return this.requests.length < this.maxPerHour;
  }

  recordRequest() {
    this.requests.push(Date.now());
  }

  updateFromHeaders(response) {
    const limit = response.headers.get('X-Ratelimit-Limit');
    const remaining = response.headers.get('X-Ratelimit-Remaining');
    const reset = response.headers.get('X-Ratelimit-Reset');

    if (limit) this.maxPerHour = parseInt(limit, 10);
    if (remaining) this.remaining = parseInt(remaining, 10);
    if (reset) this.resetTime = parseInt(reset, 10) * 1000;
  }

  getStatus() {
    return {
      remaining: this.remaining,
      resetTime: this.resetTime ? new Date(this.resetTime) : null,
      localRequests: this.requests.length,
    };
  }
}

export const rateLimiter = new PexelsRateLimiter();
```

### Music Video Media Hook

```javascript
// src/hooks/useMusicVideoMedia.js
import { useState, useCallback } from 'react';
import { searchPhotos, searchVideos } from '../services/pexelsService';
import { GENRE_KEYWORDS, MOOD_KEYWORDS } from '../constants/mediaKeywords';

export const useMusicVideoMedia = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchForSong = useCallback(async (song, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const keywords = extractKeywords(song);
      const orientation = options.orientation || 'portrait'; // TikTok-style

      const [photoResult, videoResult] = await Promise.all([
        searchPhotos(keywords.primary, {
          orientation,
          perPage: options.photoCount || 20,
          color: keywords.color,
        }),
        searchVideos(keywords.mood, {
          orientation,
          perPage: options.videoCount || 10,
          maxDuration: 30, // Keep clips short
        }),
      ]);

      const combined = [
        ...photoResult.photos.map(p => ({ type: 'photo', ...p })),
        ...videoResult.videos.map(v => ({ type: 'video', ...v })),
      ];

      // Sort by relevance (photos first for faster loading)
      setMedia(combined);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByColor = useCallback(async (hexColor, type = 'photos') => {
    setLoading(true);
    try {
      if (type === 'photos') {
        const result = await searchPhotos('abstract background', {
          color: hexColor,
          perPage: 30,
        });
        setMedia(result.photos.map(p => ({ type: 'photo', ...p })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { media, loading, error, searchForSong, searchByColor };
};

const extractKeywords = (song) => ({
  primary: song.tags?.[0] || song.genre || 'music',
  mood: song.mood || 'cinematic',
  style: song.style || 'abstract',
  color: song.dominantColor, // If available from song art
});
```

---

## Genre & Mood Keyword Mappings

```javascript
// src/constants/mediaKeywords.js
export const GENRE_KEYWORDS = {
  pop: ['colorful', 'party', 'city lights', 'dancing', 'confetti'],
  rock: ['concert', 'guitar', 'stadium', 'crowd', 'stage'],
  hiphop: ['urban', 'street', 'graffiti', 'night city', 'neon'],
  electronic: ['neon', 'abstract', 'futuristic', 'lights', 'laser'],
  jazz: ['piano', 'saxophone', 'smoky bar', 'vintage', 'candles'],
  country: ['nature', 'sunset', 'road', 'mountains', 'countryside'],
  classical: ['orchestra', 'elegant', 'chandelier', 'theater', 'grand'],
  ambient: ['nature', 'peaceful', 'water', 'sky', 'clouds'],
  rnb: ['mood lighting', 'silhouette', 'candles', 'intimate', 'night'],
  folk: ['acoustic', 'campfire', 'forest', 'rustic', 'handmade'],
  metal: ['dark', 'fire', 'smoke', 'industrial', 'intense'],
  reggae: ['beach', 'tropical', 'sunset', 'palm trees', 'ocean'],
};

export const MOOD_KEYWORDS = {
  happy: ['sunshine', 'celebration', 'colorful', 'smiling', 'bright'],
  sad: ['rain', 'alone', 'dark', 'moody', 'melancholy'],
  energetic: ['action', 'sports', 'fast', 'dynamic', 'movement'],
  romantic: ['couple', 'sunset', 'flowers', 'candles', 'soft'],
  dark: ['shadows', 'mysterious', 'night', 'fog', 'gothic'],
  peaceful: ['nature', 'calm', 'meditation', 'water', 'serene'],
  nostalgic: ['vintage', 'retro', 'old photos', 'film grain', 'memories'],
  epic: ['mountains', 'sky', 'dramatic', 'cinematic', 'vast'],
  playful: ['fun', 'colorful', 'toys', 'balloons', 'silly'],
  intense: ['fire', 'storm', 'powerful', 'dramatic', 'electric'],
};

export const COLOR_MOODS = {
  '#FF0000': 'passion', // red
  '#FFA500': 'energy',  // orange
  '#FFFF00': 'joy',     // yellow
  '#00FF00': 'nature',  // green
  '#00FFFF': 'calm',    // turquoise
  '#0000FF': 'trust',   // blue
  '#8B00FF': 'mystery', // violet
  '#FFC0CB': 'romance', // pink
  '#000000': 'power',   // black
  '#FFFFFF': 'purity',  // white
};
```

---

## Video Quality Selection

```javascript
// Helper to get best video file for device
const getBestVideoFile = (videoFiles, targetQuality = 'hd') => {
  // Sort by quality preference
  const qualityOrder = { hd: 1, sd: 2, hls: 3 };

  const sorted = [...videoFiles]
    .filter(f => f.file_type === 'video/mp4')
    .sort((a, b) => {
      const qualityDiff = (qualityOrder[a.quality] || 99) - (qualityOrder[b.quality] || 99);
      if (qualityDiff !== 0) return qualityDiff;
      return b.width - a.width; // Prefer higher resolution
    });

  // Return best match or first available
  return sorted.find(f => f.quality === targetQuality) || sorted[0];
};

// Get mobile-optimized video (smaller file size)
const getMobileVideo = (videoFiles) => {
  return videoFiles.find(f =>
    f.quality === 'sd' &&
    f.width <= 720 &&
    f.file_type === 'video/mp4'
  ) || videoFiles[0];
};
```

---

## Attribution Requirements

Pexels requires attribution for media use:

```javascript
const getAttribution = (item) => {
  if (item.type === 'photo') {
    return {
      text: `Photo by ${item.photographer} on Pexels`,
      photographerUrl: item.photographer_url,
      photoUrl: item.url,
    };
  } else {
    return {
      text: `Video by ${item.user.name} on Pexels`,
      creatorUrl: item.user.url,
      videoUrl: item.url,
    };
  }
};

// React component for attribution
const Attribution = ({ item }) => (
  <Text style={styles.attribution}>
    {item.type === 'photo' ? 'Photo' : 'Video'} by{' '}
    <Text
      style={styles.link}
      onPress={() => Linking.openURL(
        item.type === 'photo' ? item.photographer_url : item.user.url
      )}
    >
      {item.type === 'photo' ? item.photographer : item.user.name}
    </Text>{' '}
    on{' '}
    <Text style={styles.link} onPress={() => Linking.openURL('https://pexels.com')}>
      Pexels
    </Text>
  </Text>
);
```

---

## Supported Locales

```javascript
const SUPPORTED_LOCALES = [
  'en-US', 'pt-BR', 'es-ES', 'ca-ES', 'de-DE', 'it-IT', 'fr-FR',
  'sv-SE', 'id-ID', 'pl-PL', 'ja-JP', 'zh-TW', 'zh-CN', 'ko-KR',
  'th-TH', 'nl-NL', 'hu-HU', 'vi-VN', 'cs-CZ', 'da-DK', 'fi-FI',
  'uk-UA', 'el-GR', 'ro-RO', 'nb-NO', 'sk-SK', 'tr-TR', 'ru-RU',
];
```

---

## Error Handling

```javascript
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited - wait and retry
        const resetTime = response.headers.get('X-Ratelimit-Reset');
        const waitMs = resetTime
          ? (parseInt(resetTime, 10) * 1000) - Date.now()
          : 60000 * (i + 1); // Exponential backoff

        console.warn(`Pexels rate limited. Waiting ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, Math.min(waitMs, 300000)));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/pexelsService.js` | Complete API wrapper (create) |
| `src/services/pexelsRateLimiter.js` | Rate limit management (create) |
| `src/hooks/useMusicVideoMedia.js` | Media search hook (create) |
| `src/constants/mediaKeywords.js` | Genre/mood mappings (create) |
| `src/screens/MusicVideoCreator/` | Creator UI screens (create) |
| `src/components/MediaGrid/` | Media selection component (create) |
| `src/components/Attribution/` | Required attribution display (create) |

---

## Context Files

- [phases2.md](../../Research/phases2.md) - Phase 6: Pexels Integration
- [SongFeatures/](../../ReactNativeTikTokApp/src/screens/SongFeatures/) - Music video feature screens
