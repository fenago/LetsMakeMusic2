gu# Suno API Agent

## Identity

**Name:** `suno-api-agent`
**Type:** AI music generation specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Suno API (sunoapi.org) for ALL AI music generation, audio processing, lyrics, video, and stem separation features.

## Documentation

- **API Docs:** https://docs.sunoapi.org/
- **Base URL:** `https://api.sunoapi.org`
- **Auth:** `Authorization: Bearer YOUR_API_KEY`

---

## Complete API Reference

### Music Generation Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/generate` | POST | Generate new songs from text prompts | ✅ Implemented |
| `/api/v1/generate/extend` | POST | Continue/extend existing tracks | ✅ Implemented |
| `/api/v1/generate/upload-cover` | POST | Reinterpret audio in new styles | 🔄 Planned |
| `/api/v1/generate/upload-extend` | POST | Extend uploaded audio | 🔄 Planned |
| `/api/v1/generate/replace-section` | POST | Modify specific time segments | 🔄 Planned |
| `/api/v1/generate/generate-persona` | POST | Create unique musical identity (Artist Voice) | ✅ Implemented |
| `/api/v1/suno/cover/generate` | POST | Generate music covers | 🔄 Planned |

### Vocals & Instruments Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/generate/add-vocals` | POST | Add AI vocals to instrumental | 🔄 Planned |
| `/api/v1/generate/add-instrumental` | POST | Add accompaniment to vocals | 🔄 Planned |
| `/api/v1/vocal-removal/generate` | POST | Separate vocals from music (stem separation) | 🔄 Planned |

### Audio Processing Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/wav/generate` | POST | Convert to professional WAV | 🔄 Planned |
| `/api/v1/style/generate` | POST | Enhance/refine music style | 🔄 Planned |

### Lyrics Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/lyrics` | POST | Generate original lyrics | 🔄 Partial |
| `/api/v1/generate/get-timestamped-lyrics` | POST | Get synced lyrics with timing | ✅ Implemented |

### Video Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/mp4/generate` | POST | Create music video | 🔄 Planned |
| `/api/v1/mp4/record-info` | GET | Get video generation status | 🔄 Planned |

### Status/Retrieval Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/generate/record-info` | GET | Check music generation status | ✅ Implemented |
| `/api/v1/lyrics/record-info` | GET | Check lyrics generation status | 🔄 Planned |
| `/api/v1/vocal-removal/record-info` | GET | Check stem separation status | 🔄 Planned |
| `/api/v1/wav/record-info` | GET | Check WAV conversion status | 🔄 Planned |
| `/api/v1/suno/cover/record-info` | GET | Check cover generation status | 🔄 Planned |
| `/api/v1/generate/credit` | GET | Check remaining credits | ✅ Implemented |

### File Upload Endpoints

| Endpoint | Method | Purpose | Retention |
|----------|--------|---------|-----------|
| `/api/file-base64-upload` | POST | Upload via Base64 encoding | 3 days |
| `/api/file-stream-upload` | POST | Stream file uploads | 3 days |
| `/api/file-url-upload` | POST | Upload from external URL | 3 days |

---

## AI Model Versions

| Model | Code | Max Duration | Characteristics |
|-------|------|--------------|-----------------|
| **V5** | `V5` | TBD | Latest cutting-edge, best quality |
| **V4.5+** | `V4_5PLUS` | 8 min | Advanced tonal variation, creative |
| **V4.5 All** | `V4_5ALL` | 8 min | Optimized song structure, arrangement |
| **V4.5** | `V4_5` | 8 min | Smart prompts, faster generation |
| **V4** | `V4` | 4 min | Enhanced vocal clarity, refined audio |

**Recommendation:** Use `V4_5` for most cases, `V5` for best quality when available.

---

## Implementation Patterns

### Generate Song (Full Options)

```javascript
const generateSong = async (options) => {
  const response = await fetch(`${BASE_URL}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Required
      prompt: options.prompt,

      // Model selection
      model: options.model || 'V4_5', // V4, V4_5, V4_5PLUS, V4_5ALL, V5

      // Generation options
      make_instrumental: options.instrumental || false,
      negative_tags: options.negativeTags, // Tags to avoid

      // Vocal options
      vocal_gender: options.vocalGender, // 'male' | 'female'

      // Style control
      style_weight: options.styleWeight, // 0-100

      // Webhook callback
      callback_url: options.callbackUrl,
    }),
  });
  return response.json();
};
```

### Extend Song

```javascript
const extendSong = async (taskId, options = {}) => {
  const response = await fetch(`${BASE_URL}/api/v1/generate/extend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_id: taskId,
      continue_at: options.continueAt, // timestamp in seconds
      prompt: options.prompt, // optional continuation prompt
      model: options.model || 'V4_5',
      callback_url: options.callbackUrl,
    }),
  });
  return response.json();
};
```

### Stem Separation (Vocal Removal)

```javascript
const separateStems = async (audioUrl, options = {}) => {
  const response = await fetch(`${BASE_URL}/api/v1/vocal-removal/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      callback_url: options.callbackUrl,
    }),
  });
  return response.json();
  // Returns: { task_id, vocals_url, instrumental_url }
};
```

### Add Vocals to Instrumental

```javascript
const addVocals = async (instrumentalUrl, options = {}) => {
  const response = await fetch(`${BASE_URL}/api/v1/generate/add-vocals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: instrumentalUrl,
      lyrics: options.lyrics,
      vocal_gender: options.vocalGender,
      style: options.style,
      callback_url: options.callbackUrl,
    }),
  });
  return response.json();
};
```

### Add Instrumental to Vocals

```javascript
const addInstrumental = async (vocalsUrl, options = {}) => {
  const response = await fetch(`${BASE_URL}/api/v1/generate/add-instrumental`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: vocalsUrl,
      style: options.style,
      genre: options.genre,
      callback_url: options.callbackUrl,
    }),
  });
  return response.json();
};
```

### Generate Lyrics

```javascript
const generateLyrics = async (options) => {
  const response = await fetch(`${BASE_URL}/api/v1/lyrics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: options.prompt, // Theme or topic
      style: options.style,   // Musical style
      mood: options.mood,     // Emotional tone
      language: options.language || 'en',
    }),
  });
  return response.json();
};
```

### Get Timestamped Lyrics

```javascript
const getTimestampedLyrics = async (taskId) => {
  const response = await fetch(
    `${BASE_URL}/api/v1/generate/get-timestamped-lyrics`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task_id: taskId }),
    }
  );
  return response.json();
  // Returns: { lyrics: [{ text, start_time, end_time }] }
};
```

### Create Music Video

```javascript
const createMusicVideo = async (taskId, options = {}) => {
  const response = await fetch(`${BASE_URL}/api/v1/mp4/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task_id: taskId,
      style: options.visualStyle, // 'abstract', 'cinematic', etc.
      callback_url: options.callbackUrl,
    }),
  });
  return response.json();
};
```

### Cover Song (Reinterpret)

```javascript
const coverSong = async (audioUrl, options) => {
  const response = await fetch(`${BASE_URL}/api/v1/suno/cover/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      style: options.newStyle, // Target style for cover
      vocal_gender: options.vocalGender,
      callback_url: options.callbackUrl,
    }),
  });
  return response.json();
};
```

### Convert to WAV

```javascript
const convertToWav = async (taskId) => {
  const response = await fetch(`${BASE_URL}/api/v1/wav/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task_id: taskId }),
  });
  return response.json();
};
```

### Poll for Completion (Generic)

```javascript
const pollForCompletion = async (taskId, endpoint, maxAttempts = 60) => {
  const endpoints = {
    generate: '/api/v1/generate/record-info',
    lyrics: '/api/v1/lyrics/record-info',
    stems: '/api/v1/vocal-removal/record-info',
    wav: '/api/v1/wav/record-info',
    video: '/api/v1/mp4/record-info',
    cover: '/api/v1/suno/cover/record-info',
  };

  const url = `${BASE_URL}${endpoints[endpoint]}?task_id=${taskId}`;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    const data = await response.json();

    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error(data.error);

    await new Promise(r => setTimeout(r, 5000)); // 5s delay
  }
  throw new Error('Timeout waiting for completion');
};
```

### Upload File (Base64)

```javascript
const uploadFileBase64 = async (base64Data, filename) => {
  const response = await fetch(`${BASE_URL}/api/file-base64-upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_data: base64Data,
      filename: filename,
    }),
  });
  return response.json();
  // Returns: { file_url: '...' } - Valid for 3 days
};
```

### Check Credits

```javascript
const checkCredits = async () => {
  const response = await fetch(`${BASE_URL}/api/v1/generate/credit`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  const { credits, plan } = await response.json();

  if (credits < 50) {
    console.warn('Low credits warning:', credits);
  }
  return { credits, plan };
};
```

---

## Webhook/Callback Support

All major endpoints support webhooks for async completion:

```javascript
{
  callback_url: 'https://your-server.com/webhook/suno',
  // Suno will POST result to this URL when complete
}

// Webhook payload structure:
{
  task_id: 'xxx',
  status: 'completed' | 'failed',
  result: { /* endpoint-specific data */ },
  error: null | 'error message',
}
```

---

## Error Handling

```javascript
try {
  const result = await generateSong({ prompt });
} catch (error) {
  switch (error.code) {
    case 'INSUFFICIENT_CREDITS':
      // Show credit purchase prompt
      break;
    case 'RATE_LIMITED':
      // Implement exponential backoff
      break;
    case 'CONTENT_VIOLATION':
      // Show content policy warning
      break;
    case 'INVALID_AUDIO':
      // Audio format not supported
      break;
    case 'AUDIO_TOO_LONG':
      // Exceeds max duration for model
      break;
    default:
      // Generic error handling
  }
}
```

---

## Platform Features

- **99.9% Uptime** - Reliable API infrastructure
- **20-second streaming** - Fast initial output
- **Watermark-free** - Commercial-ready output
- **Multi-format** - MP3, WAV, MP4 outputs
- **High concurrency** - Handles simultaneous requests

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/services/sunoApi.js` | Main API service (~800 lines) |
| `src/screens/SongFeatures/*.js` | Feature screen implementations |
| `firebase/functions/songs/` | Cloud Function wrappers |

---

## Context Files

- [sunoApi.js](../../ReactNativeTikTokApp/src/services/sunoApi.js) - Current implementation
- [Suno API Complete Docs](../Research/Suno%20API%20-%20Complete%20Features%20Documentation.md)
- [Song Features screens](../../ReactNativeTikTokApp/src/screens/SongFeatures/)
