# Gemini Video Agent

## Identity

**Name:** `gemini-video-agent`
**Type:** AI video understanding specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API video understanding for analyzing, describing, and extracting information from video content. Handles video uploads, YouTube URLs, timestamps, and multi-modal video analysis.

## Documentation

- **Video Understanding Docs:** https://ai.google.dev/gemini-api/docs/video-understanding
- **Files API:** https://ai.google.dev/api/files
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models

| Model | Code | Best For |
|-------|------|----------|
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Fast video analysis |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Complex reasoning |
| **Gemini 3 Flash** | `gemini-3-flash-preview` | Latest features |
| **Gemini 3 Pro** | `gemini-3-pro-preview` | Advanced analysis |

---

## Video Input Methods

### Method 1: Inline Data (< 20MB)
For small videos under 20MB and less than 1 minute.

### Method 2: Files API Upload (> 20MB)
For larger videos requiring server-side processing.

### Method 3: YouTube URL
Direct analysis of YouTube videos via URL.

---

## Supported Formats

| Format | MIME Type |
|--------|-----------|
| MP4 | `video/mp4` |
| MPEG | `video/mpeg` |
| MOV | `video/mov` |
| AVI | `video/avi` |
| FLV | `video/x-flv` |
| MPG | `video/mpg` |
| WebM | `video/webm` |
| WMV | `video/wmv` |
| 3GPP | `video/3gpp` |

---

## Technical Specifications

| Specification | Value |
|---------------|-------|
| Token Rate | ~300 tokens/second at default resolution |
| Default Sampling | 1 frame per second (FPS) |
| Custom FPS | Configurable via videoMetadata |
| Timestamp Format | `MM:SS` |

---

## Implementation Patterns

### Upload Video via Files API

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const uploadVideo = async (videoPath, mimeType) => {
  // Upload to Files API
  const uploadResult = await ai.files.upload({
    file: videoPath,
    config: {
      mimeType: mimeType,
    },
  });

  // Wait for processing to complete
  let file = uploadResult;
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 5000));
    file = await ai.files.get({ name: file.name });
  }

  if (file.state === 'FAILED') {
    throw new Error('Video processing failed');
  }

  return file;
};
```

### Analyze Video with Files API

```javascript
const analyzeVideo = async (fileUri, prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: options.mimeType || 'video/mp4',
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
    usageMetadata: response.usageMetadata,
  };
};
```

### Inline Video Analysis (Small Videos)

```javascript
const analyzeInlineVideo = async (videoBase64, mimeType, prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: videoBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
  };
};
```

### YouTube Video Analysis

```javascript
const analyzeYouTubeVideo = async (youtubeUrl, prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: youtubeUrl,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
  };
};

// Usage limits:
// - Free tier: 8 hours/day
// - Paid tier: Unlimited
```

### Video Clipping with Timestamps

```javascript
const analyzeVideoClip = async (fileUri, prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: options.mimeType || 'video/mp4',
              videoMetadata: {
                startOffset: options.startOffset, // e.g., '00:30' or { seconds: 30 }
                endOffset: options.endOffset,     // e.g., '02:00' or { seconds: 120 }
              },
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
  };
};
```

### Custom Frame Rate (FPS)

```javascript
const analyzeWithCustomFPS = async (fileUri, prompt, fps = 1) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: 'video/mp4',
              videoMetadata: {
                fps: fps, // Frames per second to sample
              },
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
  };
};
```

### Timestamp-Based Analysis

```javascript
const analyzeWithTimestamps = async (fileUri, prompt) => {
  const enhancedPrompt = `${prompt}

Please include timestamps in MM:SS format when referencing specific moments in the video.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: 'video/mp4',
            },
          },
          { text: enhancedPrompt },
        ],
      },
    ],
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
    // Parse timestamps from response if needed
    timestamps: extractTimestamps(response.candidates[0].content.parts[0].text),
  };
};

const extractTimestamps = (text) => {
  const regex = /(\d{1,2}:\d{2})/g;
  return text.match(regex) || [];
};
```

---

## Common Analysis Tasks

### Video Description

```javascript
const describeVideo = async (fileUri) => {
  return analyzeVideo(fileUri, 'Provide a detailed description of this video, including the main subjects, actions, and any notable elements.');
};
```

### Content Extraction

```javascript
const extractVideoContent = async (fileUri) => {
  return analyzeVideo(fileUri, `Analyze this video and extract:
1. Main topic or theme
2. Key scenes with timestamps
3. Any text visible in the video
4. Audio/speech content summary
5. Important objects or people`);
};
```

### Scene Detection

```javascript
const detectScenes = async (fileUri) => {
  return analyzeVideo(fileUri, `Identify distinct scenes in this video. For each scene provide:
- Timestamp range (MM:SS - MM:SS)
- Brief description
- Key visual elements`);
};
```

### Transcript Generation

```javascript
const generateTranscript = async (fileUri) => {
  return analyzeVideo(fileUri, 'Transcribe all spoken words in this video, including timestamps for each segment of speech.');
};
```

### Music Video Analysis

```javascript
const analyzeMusicVideo = async (fileUri) => {
  return analyzeVideo(fileUri, `Analyze this music video and provide:
1. Visual themes and aesthetics
2. Scene breakdown with timestamps
3. Color palette and mood
4. Any lyrics visible on screen
5. Performance elements
6. Storytelling aspects`);
};
```

---

## React Native Integration

### Video Analysis Hook

```javascript
import { useState, useCallback } from 'react';

const useVideoAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const analyzeFromUri = useCallback(async (videoUri, prompt, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress('Uploading video...');

    try {
      // Upload video
      const file = await uploadVideo(videoUri, options.mimeType || 'video/mp4');
      setProgress('Analyzing video...');

      // Analyze
      const analysisResult = await analyzeVideo(file.uri, prompt, options);
      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  const analyzeYouTube = useCallback(async (url, prompt, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const analysisResult = await analyzeYouTubeVideo(url, prompt, options);
      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    progress,
    error,
    result,
    analyzeFromUri,
    analyzeYouTube,
    clear: () => setResult(null),
  };
};
```

---

## Error Handling

```javascript
const handleVideoAnalysis = async (fileUri, prompt) => {
  try {
    return await analyzeVideo(fileUri, prompt);
  } catch (error) {
    switch (error.code) {
      case 'VIDEO_TOO_LARGE':
        return { success: false, error: 'Video exceeds size limit' };

      case 'UNSUPPORTED_FORMAT':
        return { success: false, error: 'Video format not supported' };

      case 'PROCESSING_FAILED':
        return { success: false, error: 'Video processing failed' };

      case 'YOUTUBE_LIMIT_EXCEEDED':
        return { success: false, error: 'YouTube analysis limit reached' };

      case 'RATE_LIMITED':
        return { success: false, error: 'Please wait before analyzing more' };

      default:
        return { success: false, error: error.message };
    }
  }
};
```

---

## LetsMakeMusic Use Cases

| Feature | Implementation |
|---------|----------------|
| Music Video Analysis | Extract scenes, moods, visual themes |
| Performance Review | Analyze recorded performances |
| Tutorial Processing | Extract steps from music tutorials |
| Content Moderation | Screen uploaded video content |
| Clip Suggestions | Identify highlight moments |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiVideoService.js` | Video analysis service (create) |
| `src/hooks/useVideoAnalysis.js` | React hook (create) |
| `firebase/functions/videos/` | Cloud Function wrappers (create) |

---

## Context Files

- [gemini-image-agent.md](./gemini-image-agent.md) - Similar Gemini patterns
- [gemini-audio-agent.md](./gemini-audio-agent.md) - Audio analysis patterns
