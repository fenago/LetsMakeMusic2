# Visual Media Studio Plan

## Overview

Add AI-powered image and video creation capabilities to My Catalog, allowing users to create cover art, profile pictures, band images, and promotional videos using Gemini and Pexels APIs.

---

## Brand Naming Decision

Following the app's **music venue metaphor** and existing terminology patterns:

| Existing Pattern | New Feature |
|------------------|-------------|
| Your Songs | **Your Artwork** |
| Studio (Create) | **Artwork Studio** (for creation flow) |

**Recommended Section Name:** **"Your Artwork"**
**Icon:** `Palette` from lucide-react-native
**Icon Color:** `#ec4899` (Pink - matches creative/visual theme)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        My Catalog Screen                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Menu Bar (NEW)                            │ │
│  │  [Catalog] [Artwork Studio] [Coming Soon...]                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Collapsible Sections:                                           │
│  ├── Your Songs                                                  │
│  ├── Your Bands                                                  │
│  ├── Your Artwork (NEW) ◄─────────────────────────────────────  │
│  │   ├── Generated Images (Gemini)                              │
│  │   ├── Stock Images (Pexels)                                  │
│  │   └── Generated Videos (Gemini) [Coming Soon]                │
│  ├── Liked Songs                                                │
│  ├── Your Playlists                                             │
│  ├── Recently Played                                            │
│  └── Recommended For You                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Updates

### Current Collections (Reference)

```
Firestore Structure:
├── users/
│   └── {userId}/
│       ├── songs/          (subcollection - user's created songs)
│       ├── likedSongs/     (subcollection - songs user liked)
│       ├── recentlyPlayed/ (subcollection - playback history)
│       └── playlists/      (subcollection - user's playlists)
├── songs/                  (global songs collection)
├── videos/                 (global videos collection - Suno music videos)
├── channels/               (bands/groups)
│   └── {channelId}/
│       ├── band_songs/     (subcollection)
│       └── band_playlists/ (subcollection)
└── social_feeds/           (feed posts)
```

### New Collections to Add

#### 1. `artwork` Collection (Global)

Stores all user-generated and saved artwork for discoverability and sharing.

```javascript
// Collection: artwork
{
  id: string,                    // Auto-generated document ID

  // Ownership
  userId: string,                // Creator's user ID
  author: {                      // Denormalized author info
    id: string,
    stageName: string,
    profilePictureURL: string,
  },

  // Source & Type
  type: 'image' | 'video',       // Media type
  source: 'gemini' | 'pexels' | 'upload',  // Where it came from

  // Content URLs
  imageUrl: string,              // Firebase Storage URL (full size)
  thumbnailUrl: string,          // Firebase Storage URL (smaller)
  originalUrl: string | null,    // Original source URL (Pexels, etc.)

  // Generation Metadata (for AI-generated)
  prompt: string | null,         // Text prompt used for generation
  model: string | null,          // 'gemini-2.5-flash-image', etc.
  aspectRatio: string,           // '1:1', '16:9', '9:16', '4:3', etc.
  style: string | null,          // Style preset used

  // Pexels Metadata (for stock images)
  pexelsId: number | null,       // Pexels photo/video ID
  photographer: string | null,   // Pexels photographer name
  photographerUrl: string | null,// Pexels photographer profile
  pexelsUrl: string | null,      // Link to original on Pexels
  avgColor: string | null,       // Pexels average color (for placeholders)

  // Usage Tracking
  usedAs: {                      // Where this artwork is applied
    songCovers: [string],        // Array of song IDs using this as cover
    profilePicture: boolean,     // Is current profile picture
    bandImages: [string],        // Array of band/channel IDs
    feedPosts: [string],         // Array of feed post IDs
  },

  // Visibility & Stats
  isPublic: boolean,             // Visible to others
  viewCount: number,
  downloadCount: number,

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // Tags for search
  tags: [string],                // User-added tags
  generatedTags: [string],       // AI-suggested tags
}
```

#### 2. User Subcollection: `users/{userId}/artwork`

Quick access to user's artwork (mirrors global collection for faster queries).

```javascript
// Subcollection: users/{userId}/artwork
{
  id: string,                    // Same as global artwork doc ID

  // Minimal data for list display
  type: 'image' | 'video',
  source: 'gemini' | 'pexels' | 'upload',
  thumbnailUrl: string,
  aspectRatio: string,
  prompt: string | null,         // For AI-generated

  // Usage
  usedAs: {
    songCovers: [string],
    profilePicture: boolean,
    bandImages: [string],
  },

  createdAt: Timestamp,
}
```

#### 3. User Document Update: `users/{userId}`

Add integrations field for API keys.

```javascript
// Updated user document fields
{
  // ... existing fields ...

  // NEW: API Integrations
  integrations: {
    gemini: {
      apiKey: string | null,     // Encrypted/hashed API key
      keyAddedAt: Timestamp,
      keyVerified: boolean,
      lastUsedAt: Timestamp,
    },
    // Future: other integrations
  },

  // NEW: Artwork preferences
  artworkPreferences: {
    defaultAspectRatio: string,  // '1:1', '16:9', etc.
    favoriteStyles: [string],    // Saved style presets
    showAttributions: boolean,   // Show Pexels attributions
  },
}
```

#### 4. Song Document Update: `songs/{songId}`

Track artwork relationship.

```javascript
// Updated song document fields
{
  // ... existing fields ...

  // NEW: Cover art source tracking
  coverArtwork: {
    artworkId: string | null,    // Reference to artwork document
    source: 'gemini' | 'pexels' | 'upload' | 'suno', // 'suno' for original AI cover
    appliedAt: Timestamp,
  },
}
```

#### 5. Band/Channel Document Update: `channels/{channelId}`

Track band artwork.

```javascript
// Updated channel document fields
{
  // ... existing fields ...

  // NEW: Band artwork source tracking
  bandArtwork: {
    artworkId: string | null,
    source: 'gemini' | 'pexels' | 'upload',
    appliedAt: Timestamp,
  },
}
```

### Storage Structure

```
Firebase Storage:
├── artwork/
│   └── {userId}/
│       ├── generated/           # AI-generated images
│       │   └── {artworkId}.png
│       ├── pexels/              # Saved Pexels images
│       │   └── {artworkId}.jpg
│       ├── uploads/             # User uploads
│       │   └── {artworkId}.jpg
│       └── thumbnails/          # All thumbnails
│           └── {artworkId}_thumb.jpg
```

### Firestore Security Rules Updates

```javascript
// Add to existing rules
match /artwork/{artworkId} {
  // Anyone can read public artwork
  allow read: if resource.data.isPublic == true ||
              request.auth.uid == resource.data.userId;

  // Only owner can write
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

match /users/{userId}/artwork/{artworkId} {
  allow read, write: if request.auth.uid == userId;
}
```

---

## Phase 1: User Configuration (Backstage Settings)

### 1.1 Add Gemini API Key Setting

**Files to modify:**
- `src/core/profile/ui/components/IMProfileSettings/IMProfileSettings.js`

**Add new settings section:**
```
INTEGRATIONS
├── Gemini API Key (for AI image generation)
└── [Link: Get free API key]
```

### 1.2 Create API Key Management Screen

**New file:** `src/screens/APIKeySettingsScreen/APIKeySettingsScreen.js`

**Features:**
- Secure text input for Gemini API key (masked)
- "How to get your free key" instructions with link to Google AI Studio
- Test connection button
- Key stored in user's Firestore document under `integrations.gemini`

**Instructions to display:**
```
Get Your Free Gemini API Key

1. Visit Google AI Studio: https://aistudio.google.com
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Create a new API key (it's free!)
5. Copy and paste your key here

Your key is stored securely and only used for
generating images on your device.

Note: Gemini offers generous free usage limits.
```

### 1.3 Firestore User Document Update

**Modify:** `src/core/users/api/firebase/userClient.js`

Add function to update integrations:

```javascript
export const updateUserIntegrations = async (userId, integrations) => {
  try {
    await usersRef.doc(userId).set({
      integrations: integrations,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

---

## Phase 2: Services Layer

### 2.1 Gemini Image Service

**New file:** `src/services/geminiImageService.js`

Based on `gemini-image-agent.md`:

```javascript
import { GoogleGenAI } from '@google/genai';

// Initialize with user's API key
let ai = null;

export const initializeGemini = (apiKey) => {
  ai = new GoogleGenAI({ apiKey });
};

export const generateImage = async (prompt, options = {}) => {
  if (!ai) throw new Error('Gemini not initialized. Add your API key in settings.');

  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        numberOfImages: options.numberOfImages || 1,
        aspectRatio: options.aspectRatio || '1:1',
        outputImageMimeType: 'image/png',
      },
    },
  });

  // Extract image from response
  const parts = response.candidates[0].content.parts;
  const imagePart = parts.find(part => part.inlineData);

  return {
    success: !!imagePart,
    imageData: imagePart?.inlineData.data,
    mimeType: imagePart?.inlineData.mimeType,
    text: parts.find(p => p.text)?.text,
  };
};

export const testApiKey = async (apiKey) => {
  try {
    const testAi = new GoogleGenAI({ apiKey });
    // Simple test request
    await testAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say hello',
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### 2.2 Pexels Service

**New file:** `src/services/pexelsService.js`

Based on `pexels-agent.md`:

```javascript
// App-level API key (not per-user)
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PHOTOS_BASE = 'https://api.pexels.com/v1';

const headers = { Authorization: PEXELS_API_KEY };

export const searchPhotos = async (query, options = {}) => {
  const params = new URLSearchParams({
    query,
    per_page: options.perPage || 20,
    page: options.page || 1,
    ...(options.orientation && { orientation: options.orientation }),
    ...(options.color && { color: options.color }),
  });

  const response = await fetch(`${PHOTOS_BASE}/search?${params}`, { headers });
  return response.json();
};

export const getCuratedPhotos = async (options = {}) => {
  const params = new URLSearchParams({
    per_page: options.perPage || 20,
    page: options.page || 1,
  });

  const response = await fetch(`${PHOTOS_BASE}/curated?${params}`, { headers });
  return response.json();
};
```

### 2.3 Artwork Storage Service

**New file:** `src/services/artworkService.js`

```javascript
import { db } from '../core/firebase/config';
import storage from '@react-native-firebase/storage';
import ffirestore from '@react-native-firebase/firestore';

export const artworkRef = db.collection('artwork');
export const userArtworkRef = (userId) =>
  db.collection('users').doc(userId).collection('artwork');

/**
 * Save artwork to Firebase (Storage + Firestore)
 */
export const saveArtwork = async (artworkData) => {
  const now = ffirestore.FieldValue.serverTimestamp();

  // 1. Upload image to Storage
  const storagePath = `artwork/${artworkData.userId}/${artworkData.source}/${Date.now()}.png`;
  const ref = storage().ref(storagePath);
  await ref.putString(artworkData.imageBase64, 'base64', {
    contentType: 'image/png'
  });
  const imageUrl = await ref.getDownloadURL();

  // 2. Create thumbnail (could use Cloud Function)
  const thumbnailUrl = imageUrl; // For now, same URL

  // 3. Save to global artwork collection
  const docData = {
    userId: artworkData.userId,
    author: artworkData.author,
    type: 'image',
    source: artworkData.source,
    imageUrl,
    thumbnailUrl,
    originalUrl: artworkData.originalUrl || null,
    prompt: artworkData.prompt || null,
    model: artworkData.model || null,
    aspectRatio: artworkData.aspectRatio || '1:1',
    style: artworkData.style || null,
    pexelsId: artworkData.pexelsId || null,
    photographer: artworkData.photographer || null,
    photographerUrl: artworkData.photographerUrl || null,
    pexelsUrl: artworkData.pexelsUrl || null,
    avgColor: artworkData.avgColor || null,
    usedAs: {
      songCovers: [],
      profilePicture: false,
      bandImages: [],
      feedPosts: [],
    },
    isPublic: false,
    viewCount: 0,
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
    tags: artworkData.tags || [],
    generatedTags: [],
  };

  const docRef = await artworkRef.add(docData);

  // 4. Save to user's artwork subcollection
  await userArtworkRef(artworkData.userId).doc(docRef.id).set({
    id: docRef.id,
    type: 'image',
    source: artworkData.source,
    thumbnailUrl,
    aspectRatio: artworkData.aspectRatio || '1:1',
    prompt: artworkData.prompt || null,
    usedAs: docData.usedAs,
    createdAt: now,
  });

  return { success: true, artworkId: docRef.id, imageUrl };
};

/**
 * Subscribe to user's artwork
 */
export const subscribeToUserArtwork = (userId, onUpdate) => {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  return userArtworkRef(userId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      snapshot => {
        const artwork = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        onUpdate(artwork);
      },
      error => {
        console.error('[artworkService] Subscription error:', error);
        onUpdate([]);
      }
    );
};

/**
 * Apply artwork to a song as cover
 */
export const applyArtworkToSong = async (artworkId, songId, userId) => {
  const now = ffirestore.FieldValue.serverTimestamp();

  // Get artwork data
  const artworkDoc = await artworkRef.doc(artworkId).get();
  if (!artworkDoc.exists) throw new Error('Artwork not found');

  const artworkData = artworkDoc.data();

  // Update song with new cover
  await db.collection('songs').doc(songId).update({
    imageUrl: artworkData.imageUrl,
    coverArtwork: {
      artworkId,
      source: artworkData.source,
      appliedAt: now,
    },
    updatedAt: now,
  });

  // Update artwork usedAs
  await artworkRef.doc(artworkId).update({
    'usedAs.songCovers': ffirestore.FieldValue.arrayUnion(songId),
    updatedAt: now,
  });

  // Update user's artwork subcollection
  await userArtworkRef(userId).doc(artworkId).update({
    'usedAs.songCovers': ffirestore.FieldValue.arrayUnion(songId),
  });

  return { success: true };
};

/**
 * Delete artwork
 */
export const deleteArtwork = async (artworkId, userId) => {
  const doc = await artworkRef.doc(artworkId).get();
  if (!doc.exists) return { success: false, error: 'Not found' };
  if (doc.data().userId !== userId) return { success: false, error: 'Not authorized' };

  // Delete from storage
  const imageUrl = doc.data().imageUrl;
  if (imageUrl?.includes('firebasestorage.googleapis.com')) {
    try {
      await storage().refFromURL(imageUrl).delete();
    } catch (e) {
      console.warn('[artworkService] Could not delete from storage:', e.message);
    }
  }

  // Delete from Firestore
  await artworkRef.doc(artworkId).delete();
  await userArtworkRef(userId).doc(artworkId).delete();

  return { success: true };
};
```

---

## Phase 3: UI Components

### 3.1 My Catalog Menu Bar

**Modify:** `src/screens/LibraryScreen/LibraryScreen.js`

Add horizontal menu bar below header:

```javascript
const CATALOG_TABS = [
  { id: 'catalog', label: 'Catalog', icon: Library },
  { id: 'artwork', label: 'Artwork Studio', icon: Palette },
]
```

When "Artwork Studio" is selected, navigate to dedicated screen.

### 3.2 Your Artwork Section (Collapsible)

**Add to LibraryScreen.js:**

New collapsible section with:
- Horizontal scroll of user's artwork
- "Create New" button
- View all link

```javascript
const [isYourArtworkExpanded, setIsYourArtworkExpanded] = useState(true);
const toggleYourArtwork = useCallback(() => {
  setIsYourArtworkExpanded(prev => !prev);
}, []);

const renderYourArtworkSection = () => (
  <View style={styles.section}>
    <CollapsibleSectionHeader
      title="Your Artwork"
      icon={Palette}
      iconColor="#ec4899"
      isExpanded={isYourArtworkExpanded}
      onToggle={toggleYourArtwork}
      count={artworkCount}
      showAddButton
      onAdd={() => navigation.navigate('ArtworkStudio')}
    />
    {isYourArtworkExpanded && (
      <FlatList
        data={artwork}
        renderItem={renderArtworkItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    )}
  </View>
);
```

### 3.3 Artwork Studio Screen

**New screen:** `src/screens/ArtworkStudioScreen/ArtworkStudioScreen.js`

**Tabs:**
1. **Create** - AI generation with Gemini
2. **Search** - Pexels stock search
3. **My Artwork** - User's saved artwork

**Create Tab Features:**
- Text prompt input
- Aspect ratio selector (1:1, 16:9, 9:16, 4:3)
- Style presets (Album Cover, Profile Photo, Band Promo, etc.)
- Generate button
- Preview generated images
- Save to library

**Search Tab Features:**
- Search input
- Category filters (Music, Concert, Abstract, Nature, etc.)
- Grid of results with Pexels attribution
- Tap to preview/save

### 3.4 Artwork Detail Screen

**New screen:** `src/screens/ArtworkDetailScreen/ArtworkDetailScreen.js`

**Features:**
- Full-size image view
- "Apply to" action sheet:
  - Song Cover (select song)
  - Profile Picture
  - Band Image (select band)
  - Share to Feed
- Download to device
- Delete

### 3.5 Apply Artwork Modal

**New component:** `src/components/ui/ApplyArtworkModal.js`

Shows when user wants to apply artwork:
- List of songs to choose from
- List of bands to choose from
- Profile picture option
- Preview of how it will look

---

## Phase 4: Hooks

### 4.1 useArtwork Hook

**New file:** `src/hooks/useArtwork.js`

```javascript
import { useState, useEffect } from 'react';
import { subscribeToUserArtwork } from '../services/artworkService';

export const useArtwork = (userId) => {
  const [artwork, setArtwork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserArtwork(userId, (artworkList) => {
      setArtwork(artworkList);
      setLoading(false);
    });

    return () => unsubscribe && unsubscribe();
  }, [userId]);

  return {
    artwork,
    artworkLoading: loading,
    artworkError: error,
    artworkCount: artwork.length,
  };
};
```

### 4.2 useGeminiImage Hook

**New file:** `src/hooks/useGeminiImage.js`

```javascript
import { useState, useCallback, useEffect } from 'react';
import {
  initializeGemini,
  generateImage as geminiGenerate,
  testApiKey
} from '../services/geminiImageService';
import { useCurrentUser } from '../core/onboarding';

export const useGeminiImage = () => {
  const currentUser = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Gemini with user's API key
  useEffect(() => {
    const apiKey = currentUser?.integrations?.gemini?.apiKey;
    if (apiKey) {
      initializeGemini(apiKey);
      setIsInitialized(true);
    } else {
      setIsInitialized(false);
    }
  }, [currentUser?.integrations?.gemini?.apiKey]);

  const generate = useCallback(async (prompt, options = {}) => {
    if (!isInitialized) {
      setError('Please add your Gemini API key in Settings first.');
      return { success: false, error: 'Not initialized' };
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await geminiGenerate(prompt, options);
      if (response.success) {
        setResult({
          uri: `data:${response.mimeType};base64,${response.imageData}`,
          base64: response.imageData,
          mimeType: response.mimeType,
        });
      } else {
        setError('Failed to generate image');
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  return {
    generate,
    loading,
    error,
    result,
    isInitialized,
    clear: () => setResult(null),
  };
};
```

### 4.3 usePexelsSearch Hook

**New file:** `src/hooks/usePexelsSearch.js`

```javascript
import { useState, useCallback } from 'react';
import { searchPhotos, getCuratedPhotos } from '../services/pexelsService';

export const usePexelsSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const search = useCallback(async (query, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await searchPhotos(query, { ...options, page: 1 });
      setResults(response.photos || []);
      setPage(1);
      setHasMore((response.photos?.length || 0) >= (options.perPage || 20));
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async (query, options = {}) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await searchPhotos(query, { ...options, page: nextPage });
      setResults(prev => [...prev, ...(response.photos || [])]);
      setPage(nextPage);
      setHasMore((response.photos?.length || 0) >= (options.perPage || 20));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  const getCurated = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getCuratedPhotos(options);
      setResults(response.photos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    loading,
    error,
    hasMore,
    search,
    loadMore,
    getCurated,
    clear: () => setResults([]),
  };
};
```

---

## Phase 5: Navigation

### 5.1 New Screens to Register

**Modify:** `src/navigators/MainStackNavigator.js`

```javascript
import ArtworkStudioScreen from '../screens/ArtworkStudioScreen/ArtworkStudioScreen';
import ArtworkDetailScreen from '../screens/ArtworkDetailScreen/ArtworkDetailScreen';
import APIKeySettingsScreen from '../screens/APIKeySettingsScreen/APIKeySettingsScreen';

// Add in Stack.Navigator
<Stack.Screen name="ArtworkStudio" component={ArtworkStudioScreen} />
<Stack.Screen name="ArtworkDetail" component={ArtworkDetailScreen} />
<Stack.Screen name="APIKeySettings" component={APIKeySettingsScreen} />
```

---

## Phase 6: Integration Points

### 6.1 Song Cover Art

**Modify:** `src/components/ui/EditSongModal.js`

Add "Change Cover Art" option that:
- Opens artwork picker
- Can select from existing artwork or create new
- Updates song's `imageUrl` in Firestore

### 6.2 Profile Picture

**Modify:** `src/screens/ProfileScreen/ProfileScreen.js`

Add option to select from artwork library when changing profile picture.

### 6.3 Band Images

**Modify:** Band detail/edit screens

Add option to select from artwork library for band image.

---

## Phase 7: Future - Video Generation

**Deferred to later phase:**
- Gemini video generation (see `gemini-video-agent.md`)
- Custom music video creation
- Video editing with clips from Pexels
- Sync with song audio

---

## File Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/screens/ArtworkStudioScreen/ArtworkStudioScreen.js` | Main artwork creation screen |
| `src/screens/ArtworkDetailScreen/ArtworkDetailScreen.js` | View/apply artwork |
| `src/screens/APIKeySettingsScreen/APIKeySettingsScreen.js` | Manage Gemini API key |
| `src/services/geminiImageService.js` | Gemini API wrapper |
| `src/services/pexelsService.js` | Pexels API wrapper |
| `src/services/artworkService.js` | Artwork CRUD operations |
| `src/hooks/useArtwork.js` | Artwork subscription hook |
| `src/hooks/useGeminiImage.js` | Gemini generation hook |
| `src/hooks/usePexelsSearch.js` | Pexels search hook |
| `src/components/ui/ApplyArtworkModal.js` | Apply artwork to song/profile/band |
| `src/components/ui/ArtworkCard.js` | Artwork thumbnail card |
| `src/constants/artworkPresets.js` | Style presets and keywords |

### Files to Modify

| File | Changes |
|------|---------|
| `src/screens/LibraryScreen/LibraryScreen.js` | Add menu bar, Your Artwork section |
| `src/core/profile/ui/components/IMProfileSettings/IMProfileSettings.js` | Add Integrations section |
| `src/core/users/api/firebase/userClient.js` | Add updateUserIntegrations function |
| `src/navigators/MainStackNavigator.js` | Register new screens |
| `src/components/ui/EditSongModal.js` | Add cover art selector |

---

## Implementation Order

1. **Phase 1**: User Configuration
   - API Key settings screen
   - Firestore user document update
   - Settings menu integration

2. **Phase 2**: Services Layer
   - Artwork storage service (DB schema)
   - Gemini service (basic generation)
   - Pexels service (search)

3. **Phase 3**: Core UI
   - Your Artwork section in My Catalog
   - Artwork Studio screen (Create & Search tabs)
   - ArtworkCard component

4. **Phase 4**: Hooks
   - useArtwork
   - useGeminiImage
   - usePexelsSearch

5. **Phase 5**: Integration
   - Apply artwork to songs
   - Apply artwork to profile
   - Apply artwork to bands

6. **Phase 6**: Polish
   - Menu bar navigation
   - Error handling
   - Loading states
   - Empty states

---

## Security Considerations

1. **API Key Storage**: Store user's Gemini key in Firestore (not in code or logs)
2. **Key Validation**: Test key before saving
3. **Rate Limiting**: Implement client-side rate limiting for API calls
4. **Content Safety**: Gemini has built-in content filters
5. **Attribution**: Always display Pexels attribution for stock images
6. **Firestore Rules**: Users can only access their own artwork and integrations

---

## Success Criteria

- [ ] Users can add their Gemini API key in Backstage settings
- [ ] Instructions clearly explain how to get free key from Google AI Studio
- [ ] Users can generate images from text prompts using their key
- [ ] Users can search and save Pexels stock images
- [ ] Artwork appears in My Catalog "Your Artwork" section
- [ ] Artwork is stored in Firebase (Storage + Firestore)
- [ ] Users can apply artwork as song covers
- [ ] Users can apply artwork as profile pictures
- [ ] Users can apply artwork as band images
- [ ] Menu bar allows navigation between Catalog and Artwork Studio
- [ ] All artwork properly attributed and stored

---

*Plan created: December 2024*
*Based on: gemini-image-agent.md, gemini-video-agent.md, pexels-agent.md, terminology.md*
