# Suno API Agent

## Identity

**Name:** `suno-api-agent`
**Type:** API integration specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Suno API (sunoapi.org) for all AI music generation, audio processing, lyrics, and video features.

## Documentation

- **API Docs:** https://docs.sunoapi.org/
- **Base URL:** `https://api.sunoapi.org`
- **Auth:** `Authorization: Bearer YOUR_API_KEY`

## API Capabilities

### Music Generation
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/v1/suno/generate` | Generate new songs | Implemented |
| `POST /api/v1/suno/extend` | Extend existing songs | Implemented |
| `POST /api/v1/suno/cover` | Cover/reinterpret songs | Planned |

### Vocals & Instruments
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/v1/suno/add-vocals` | Add vocals to instrumental | Planned |
| `POST /api/v1/suno/add-instrumental` | Add instruments to vocals | Planned |
| `POST /api/v1/suno/upload-and-cover` | Upload audio + cover | Planned |

### Audio Processing
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/v1/suno/separate-vocals` | Stem separation | Planned |
| `POST /api/v1/suno/convert-wav` | Convert to WAV | Planned |
| `POST /api/v1/suno/boost-style` | Enhance style | Planned |

### Lyrics
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/v1/suno/generate-lyrics` | AI lyrics generation | Partial |
| `GET /api/v1/suno/get-timestamped-lyrics/{id}` | Synced lyrics | Implemented |

### Video
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/v1/suno/create-music-video` | Generate music video | Planned |
| `GET /api/v1/suno/get-music-video-details/{id}` | Video status | Planned |

### Utility
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /api/v1/suno/get-details/{id}` | Task status | Implemented |
| `GET /api/v1/suno/credits` | Check balance | Implemented |

## Model Versions

| Model | Features | Max Duration |
|-------|----------|--------------|
| `V5` | Latest, cutting-edge | TBD |
| `V4_5PLUS` | Richer tones | 8 min |
| `V4_5ALL` | Better structure | 8 min |
| `V4_5` | Smart prompts, faster | 8 min |
| `V4` | Improved vocals | 4 min |

## Implementation Patterns

### Generate Song
```javascript
const generateSong = async (prompt, options = {}) => {
  const response = await fetch(`${BASE_URL}/api/v1/suno/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model: options.model || 'V4_5',
      make_instrumental: options.instrumental || false,
      // Advanced options
      negative_tags: options.negativeTags,
      vocal_gender: options.vocalGender, // 'male' | 'female'
      style_weight: options.styleWeight, // 0-100
    }),
  });
  return response.json();
};
```

### Poll for Completion
```javascript
const pollForCompletion = async (taskId, maxAttempts = 60) => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fetch(
      `${BASE_URL}/api/v1/suno/get-details/${taskId}`,
      { headers: { 'Authorization': `Bearer ${API_KEY}` } }
    );
    const data = await result.json();

    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error(data.error);

    await new Promise(r => setTimeout(r, 5000)); // 5s delay
  }
  throw new Error('Timeout waiting for completion');
};
```

### Stem Separation
```javascript
const separateStems = async (audioUrl) => {
  const response = await fetch(`${BASE_URL}/api/v1/suno/separate-vocals`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audio_url: audioUrl }),
  });
  return response.json();
};
```

## Files to Modify

| File | Purpose |
|------|---------|
| `src/services/sunoApi.js` | Main API service (~800 lines) |
| `src/screens/SongFeatures/*.js` | Feature screen implementations |
| `firebase/functions/songs/` | Cloud Function wrappers |

## Callback/Webhook Support

All major endpoints support webhooks:
```javascript
{
  callback_url: 'https://your-server.com/webhook/suno',
  // Suno will POST result to this URL when complete
}
```

## Error Handling

```javascript
try {
  const result = await generateSong(prompt);
} catch (error) {
  if (error.code === 'INSUFFICIENT_CREDITS') {
    // Show credit purchase prompt
  } else if (error.code === 'RATE_LIMITED') {
    // Implement exponential backoff
  } else if (error.code === 'CONTENT_VIOLATION') {
    // Show content policy warning
  }
}
```

## Credit Management

```javascript
const checkCredits = async () => {
  const response = await fetch(`${BASE_URL}/api/v1/suno/credits`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  const { credits, plan } = await response.json();

  if (credits < 50) {
    // Warn user about low credits
  }
  return { credits, plan };
};
```

## Context Files

- [sunoApi.js](../../ReactNativeTikTokApp/src/services/sunoApi.js) - Current implementation
- [Suno API Complete Docs](../Research/Suno%20API%20-%20Complete%20Features%20Documentation.md)
- [Song Features screens](../../ReactNativeTikTokApp/src/screens/SongFeatures/)
