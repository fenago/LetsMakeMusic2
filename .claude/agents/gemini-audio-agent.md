# Gemini Audio Agent

## Identity

**Name:** `gemini-audio-agent`
**Type:** AI audio understanding specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API audio understanding for transcription, analysis, and extraction from audio content. Handles speech-to-text, speaker diarization, emotion detection, and multi-modal audio processing.

## Documentation

- **Audio Understanding Docs:** https://ai.google.dev/gemini-api/docs/audio
- **Files API:** https://ai.google.dev/api/files
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models

| Model | Code | Best For |
|-------|------|----------|
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Fast audio analysis |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Complex reasoning |
| **Gemini 3 Flash** | `gemini-3-flash-preview` | Latest features |
| **Gemini 3 Pro** | `gemini-3-pro-preview` | Advanced analysis |

---

## Technical Specifications

| Specification | Value |
|---------------|-------|
| Token Rate | ~32 tokens/second |
| Max Duration | 9.5 hours |
| Timestamp Format | `MM:SS` |
| Input Methods | Inline data, Files API |

---

## Supported Formats

| Format | MIME Type |
|--------|-----------|
| WAV | `audio/wav` |
| MP3 | `audio/mp3`, `audio/mpeg` |
| AIFF | `audio/aiff` |
| AAC | `audio/aac` |
| OGG | `audio/ogg` |
| FLAC | `audio/flac` |

---

## Core Capabilities

### Speech-to-Text Transcription
Convert spoken audio to text.

### Speaker Diarization
Identify and label different speakers.

### Emotion Detection
Detect emotional tone in speech.

### Timestamp References
Get precise timing for audio segments.

### Multi-Modal Analysis
Combine audio with images/text for context.

---

## Implementation Patterns

### Upload Audio via Files API

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const uploadAudio = async (audioPath, mimeType) => {
  const uploadResult = await ai.files.upload({
    file: audioPath,
    config: {
      mimeType: mimeType,
    },
  });

  // Wait for processing
  let file = uploadResult;
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    file = await ai.files.get({ name: file.name });
  }

  if (file.state === 'FAILED') {
    throw new Error('Audio processing failed');
  }

  return file;
};
```

### Analyze Audio with Files API

```javascript
const analyzeAudio = async (fileUri, prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: options.mimeType || 'audio/mp3',
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

### Inline Audio Analysis (Small Files)

```javascript
const analyzeInlineAudio = async (audioBase64, mimeType, prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
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

### Transcription with Timestamps

```javascript
const transcribeWithTimestamps = async (fileUri) => {
  const prompt = `Transcribe this audio with timestamps in MM:SS format.
Format each segment as:
[MM:SS] Speaker text here

Include all spoken words and note any significant pauses or sounds.`;

  const response = await analyzeAudio(fileUri, prompt);

  // Parse timestamps from transcription
  const segments = parseTimestampedTranscript(response.text);

  return {
    success: true,
    fullTranscript: response.text,
    segments,
  };
};

const parseTimestampedTranscript = (text) => {
  const regex = /\[(\d{1,2}:\d{2})\]\s*(.+?)(?=\[|$)/gs;
  const segments = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    segments.push({
      timestamp: match[1],
      text: match[2].trim(),
    });
  }

  return segments;
};
```

### Speaker Diarization

```javascript
const diarizeSpeakers = async (fileUri) => {
  const prompt = `Analyze this audio and identify all speakers.
For each speaker:
1. Assign a label (Speaker 1, Speaker 2, etc.)
2. Describe their voice characteristics (gender, tone, accent if notable)
3. List their speaking segments with timestamps

Format as:
Speaker 1 (description):
- [MM:SS - MM:SS]: "What they said"

Speaker 2 (description):
- [MM:SS - MM:SS]: "What they said"`;

  return analyzeAudio(fileUri, prompt);
};
```

### Emotion Detection

```javascript
const detectEmotions = async (fileUri) => {
  const prompt = `Analyze the emotional content of this audio.

For the overall audio:
1. Primary emotion detected
2. Emotional arc (how emotions change over time)
3. Confidence level

For each distinct segment:
- Timestamp range
- Emotion detected (happy, sad, angry, neutral, excited, anxious, etc.)
- Intensity (low, medium, high)
- Notable vocal cues`;

  return analyzeAudio(fileUri, prompt);
};
```

### Music Analysis

```javascript
const analyzeMusicContent = async (fileUri) => {
  const prompt = `Analyze this music audio and provide:

1. **Genre & Style**
   - Primary genre
   - Sub-genres or influences
   - Style characteristics

2. **Musical Elements**
   - Tempo (BPM estimate)
   - Key signature (if detectable)
   - Time signature
   - Instrumentation heard

3. **Structure**
   - Song sections with timestamps (intro, verse, chorus, bridge, outro)
   - Notable transitions

4. **Mood & Energy**
   - Overall mood
   - Energy level progression
   - Emotional impact

5. **Vocals** (if present)
   - Gender/type of voice
   - Vocal style
   - Notable techniques

6. **Production Quality**
   - Recording quality assessment
   - Notable production elements`;

  return analyzeAudio(fileUri, prompt);
};
```

### Lyrics Extraction

```javascript
const extractLyrics = async (fileUri) => {
  const prompt = `Extract all lyrics/sung words from this audio.

Format:
- Include section markers [Verse], [Chorus], [Bridge], etc.
- Include timestamps for each section
- Mark any unintelligible words with [?]
- Note any backing vocals in parentheses`;

  return analyzeAudio(fileUri, prompt);
};
```

### Audio Quality Assessment

```javascript
const assessAudioQuality = async (fileUri) => {
  const prompt = `Assess the technical quality of this audio:

1. **Clarity** (1-10): How clear is the audio?
2. **Background Noise** (1-10): Level of unwanted noise
3. **Volume Consistency** (1-10): How consistent is the volume?
4. **Distortion** (1-10): Presence of clipping or distortion
5. **Issues Detected**: List any specific problems
6. **Recommendations**: Suggestions for improvement`;

  return analyzeAudio(fileUri, prompt);
};
```

---

## React Native Integration

### Audio Analysis Hook

```javascript
import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';

const useAudioAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const pickAndAnalyze = useCallback(async (prompt, options = {}) => {
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (docResult.canceled) {
        return { success: false, error: 'User cancelled' };
      }

      const file = docResult.assets[0];
      return analyzeFromUri(file.uri, prompt, {
        ...options,
        mimeType: file.mimeType,
      });
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const analyzeFromUri = useCallback(async (audioUri, prompt, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress('Uploading audio...');

    try {
      const file = await uploadAudio(audioUri, options.mimeType || 'audio/mp3');
      setProgress('Analyzing audio...');

      const analysisResult = await analyzeAudio(file.uri, prompt, options);
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

  const transcribe = useCallback(async (audioUri, options = {}) => {
    return analyzeFromUri(audioUri, 'Transcribe this audio completely and accurately.', options);
  }, [analyzeFromUri]);

  return {
    loading,
    progress,
    error,
    result,
    pickAndAnalyze,
    analyzeFromUri,
    transcribe,
    clear: () => setResult(null),
  };
};
```

### Music Analysis Hook

```javascript
const useMusicAnalysis = () => {
  const { analyzeFromUri, loading, error, result, clear } = useAudioAnalysis();

  const analyzeMusic = useCallback(async (audioUri, options = {}) => {
    return analyzeFromUri(audioUri, `Analyze this music:
1. Genre and style
2. Tempo and key
3. Structure with timestamps
4. Mood and energy
5. Instrumentation`, options);
  }, [analyzeFromUri]);

  const extractLyrics = useCallback(async (audioUri, options = {}) => {
    return analyzeFromUri(audioUri, 'Extract all lyrics from this song with section markers.', options);
  }, [analyzeFromUri]);

  const detectMood = useCallback(async (audioUri, options = {}) => {
    return analyzeFromUri(audioUri, 'Analyze the mood and emotional journey of this music.', options);
  }, [analyzeFromUri]);

  return {
    loading,
    error,
    result,
    analyzeMusic,
    extractLyrics,
    detectMood,
    clear,
  };
};
```

---

## Error Handling

```javascript
const handleAudioAnalysis = async (fileUri, prompt) => {
  try {
    return await analyzeAudio(fileUri, prompt);
  } catch (error) {
    switch (error.code) {
      case 'AUDIO_TOO_LONG':
        return { success: false, error: 'Audio exceeds 9.5 hour limit' };

      case 'UNSUPPORTED_FORMAT':
        return { success: false, error: 'Audio format not supported' };

      case 'PROCESSING_FAILED':
        return { success: false, error: 'Audio processing failed' };

      case 'FILE_TOO_LARGE':
        return { success: false, error: 'File size too large' };

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
| Song Transcription | Extract lyrics from user recordings |
| Genre Detection | Auto-tag songs by genre |
| Mood Classification | Categorize songs by mood |
| Quality Check | Assess recording quality before upload |
| Vocal Analysis | Analyze vocal characteristics |
| Music Discovery | Find similar songs by audio analysis |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiAudioService.js` | Audio analysis service (create) |
| `src/hooks/useAudioAnalysis.js` | React hook (create) |
| `firebase/functions/audio/` | Cloud Function wrappers (create) |

---

## Context Files

- [gemini-speech-agent.md](./gemini-speech-agent.md) - TTS (output)
- [suno-api-agent.md](./suno-api-agent.md) - Music generation
- [sunoApi.js](../../ReactNativeTikTokApp/src/services/sunoApi.js) - Similar service patterns
