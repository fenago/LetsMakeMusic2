# Gemini Speech Agent

## Identity

**Name:** `gemini-speech-agent`
**Type:** AI text-to-speech specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API speech generation (TTS) for converting text to natural speech. Handles single and multi-speaker synthesis, voice selection, and controllable speech styles.

## Documentation

- **Speech Generation Docs:** https://ai.google.dev/gemini-api/docs/speech-generation
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models

| Model | Code | Best For |
|-------|------|----------|
| **Gemini 2.5 Flash TTS** | `gemini-2.5-flash-preview-tts` | Fast, single speaker |
| **Gemini 2.5 Pro TTS** | `gemini-2.5-pro-preview-tts` | Higher quality |

---

## Technical Specifications

| Specification | Value |
|---------------|-------|
| Output Format | PCM audio |
| Sample Rate | 24,000 Hz |
| Max Speakers | 2 (multi-speaker mode) |
| Voice Options | 30 voices |
| Languages | 24 languages |

---

## Available Voices

| Voice Name | Code | Style |
|------------|------|-------|
| Zephyr | `Zephyr` | Bright |
| Puck | `Puck` | Upbeat |
| Charon | `Charon` | Informative |
| Kore | `Kore` | Firm |
| Fenrir | `Fenrir` | Excitable |
| Leda | `Leda` | Youthful |
| Orus | `Orus` | Firm |
| Aoede | `Aoede` | Breezy |
| Callirrhoe | `Callirrhoe` | Easy-going |
| Autonoe | `Autonoe` | Bright |
| Enceladus | `Enceladus` | Breathy |
| Iapetus | `Iapetus` | Clear |
| Umbriel | `Umbriel` | Easy-going |
| Algieba | `Algieba` | Smooth |
| Despina | `Despina` | Smooth |
| Erinome | `Erinome` | Clear |
| Algenib | `Algenib` | Gravelly |
| Rasalgethi | `Rasalgethi` | Informative |
| Laomedeia | `Laomedeia` | Upbeat |
| Achernar | `Achernar` | Soft |
| Alnilam | `Alnilam` | Firm |
| Schedar | `Schedar` | Even |
| Gacrux | `Gacrux` | Mature |
| Pulcherrima | `Pulcherrima` | Forward |
| Achird | `Achird` | Friendly |
| Zubenelgenubi | `Zubenelgenubi` | Casual |
| Vindemiatrix | `Vindemiatrix` | Gentle |
| Sadachbia | `Sadachbia` | Lively |
| Sadaltager | `Sadaltager` | Knowledgeable |
| Sulafat | `Sulafat` | Warm |

---

## Supported Languages

| Language | Code |
|----------|------|
| Arabic | `ar-XA` |
| Bengali | `bn-IN` |
| Chinese | `cmn-CN`, `cmn-TW` |
| German | `de-DE` |
| English | `en-AU`, `en-GB`, `en-IN`, `en-US` |
| Spanish | `es-ES`, `es-US` |
| French | `fr-CA`, `fr-FR` |
| Gujarati | `gu-IN` |
| Hindi | `hi-IN` |
| Indonesian | `id-ID` |
| Italian | `it-IT` |
| Japanese | `ja-JP` |
| Kannada | `kn-IN` |
| Korean | `ko-KR` |
| Malayalam | `ml-IN` |
| Marathi | `mr-IN` |
| Dutch | `nl-NL` |
| Polish | `pl-PL` |
| Portuguese | `pt-BR`, `pt-PT` |
| Russian | `ru-RU` |
| Tamil | `ta-IN` |
| Telugu | `te-IN` |
| Thai | `th-TH` |
| Turkish | `tr-TR` |
| Ukrainian | `uk-UA` |
| Vietnamese | `vi-VN` |

---

## Implementation Patterns

### Single Speaker TTS

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateSpeech = async (text, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash-preview-tts',
    contents: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: options.voice || 'Kore',
          },
        },
      },
    },
  });

  // Extract audio data
  const audioData = response.candidates[0].content.parts[0].inlineData;

  return {
    success: true,
    audioData: audioData.data, // Base64 PCM audio
    mimeType: audioData.mimeType,
    sampleRate: 24000,
  };
};
```

### Multi-Speaker TTS

```javascript
const generateMultiSpeakerSpeech = async (text, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash-preview-tts',
    contents: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'Speaker 1',
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: options.speaker1Voice || 'Kore',
                },
              },
            },
            {
              speaker: 'Speaker 2',
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: options.speaker2Voice || 'Puck',
                },
              },
            },
          ],
        },
      },
    },
  });

  const audioData = response.candidates[0].content.parts[0].inlineData;

  return {
    success: true,
    audioData: audioData.data,
    mimeType: audioData.mimeType,
    sampleRate: 24000,
  };
};

// Example multi-speaker text format
const dialogueText = `
Speaker 1: Welcome to our music podcast!
Speaker 2: Thanks for having me. Let's talk about AI in music.
Speaker 1: That's a great topic. What do you think about AI-generated songs?
Speaker 2: They're getting incredibly good. The technology has come so far.
`;
```

### Controllable Style via Prompt

```javascript
const generateStyledSpeech = async (text, stylePrompt, options = {}) => {
  // Combine style instructions with text
  const styledText = `${stylePrompt}

${text}`;

  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash-preview-tts',
    contents: styledText,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: options.voice || 'Kore',
          },
        },
      },
    },
  });

  return {
    success: true,
    audioData: response.candidates[0].content.parts[0].inlineData.data,
  };
};

// Style prompt examples
const styleExamples = {
  excited: 'Read this with enthusiasm and excitement:',
  calm: 'Read this in a calm, soothing voice:',
  fast: 'Read this quickly, at an accelerated pace:',
  slow: 'Read this slowly and deliberately:',
  whisper: 'Read this in a soft, whispering tone:',
  dramatic: 'Read this dramatically, with emotion:',
  professional: 'Read this in a professional, formal tone:',
  friendly: 'Read this in a warm, friendly manner:',
};
```

### Language-Specific TTS

```javascript
const generateLocalizedSpeech = async (text, languageCode, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash-preview-tts',
    contents: text,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: options.voice || 'Kore',
            languageCode: languageCode, // e.g., 'es-ES', 'ja-JP'
          },
        },
      },
    },
  });

  return {
    success: true,
    audioData: response.candidates[0].content.parts[0].inlineData.data,
    language: languageCode,
  };
};
```

### Save Audio to File

```javascript
import * as FileSystem from 'expo-file-system';

const saveAudioToFile = async (base64Data, filename) => {
  const path = `${FileSystem.documentDirectory}${filename}.wav`;

  // PCM audio needs WAV header for playback
  const wavData = addWavHeader(base64Data, 24000);

  await FileSystem.writeAsStringAsync(path, wavData, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return path;
};

// Add WAV header to PCM data
const addWavHeader = (pcmBase64, sampleRate) => {
  // Decode base64 to get raw PCM
  const pcmData = atob(pcmBase64);
  const dataLength = pcmData.length;

  // Create WAV header
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Combine header and data
  const headerBase64 = btoa(String.fromCharCode(...new Uint8Array(header)));
  return headerBase64 + pcmBase64;
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};
```

---

## React Native Integration

### Speech Generation Hook

```javascript
import { useState, useCallback } from 'react';
import { Audio } from 'expo-av';

const useSpeechGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [sound, setSound] = useState(null);

  const generate = useCallback(async (text, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateSpeech(text, options);

      if (result.success) {
        // Save to file
        const uri = await saveAudioToFile(result.audioData, `speech_${Date.now()}`);
        setAudioUri(uri);
        return { success: true, uri };
      }

      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const play = useCallback(async () => {
    if (!audioUri) return;

    if (sound) {
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
    setSound(newSound);
    await newSound.playAsync();
  }, [audioUri, sound]);

  const stop = useCallback(async () => {
    if (sound) {
      await sound.stopAsync();
    }
  }, [sound]);

  return {
    loading,
    error,
    audioUri,
    generate,
    play,
    stop,
    clear: () => {
      setAudioUri(null);
      if (sound) sound.unloadAsync();
    },
  };
};
```

### Multi-Speaker Hook

```javascript
const useMultiSpeakerTTS = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateDialogue = useCallback(async (dialogue, voices = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateMultiSpeakerSpeech(dialogue, {
        speaker1Voice: voices.speaker1 || 'Kore',
        speaker2Voice: voices.speaker2 || 'Puck',
      });

      if (result.success) {
        const uri = await saveAudioToFile(result.audioData, `dialogue_${Date.now()}`);
        return { success: true, uri };
      }

      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, generateDialogue };
};
```

---

## Error Handling

```javascript
const handleSpeechGeneration = async (text, options) => {
  try {
    return await generateSpeech(text, options);
  } catch (error) {
    switch (error.code) {
      case 'TEXT_TOO_LONG':
        return { success: false, error: 'Text exceeds maximum length' };

      case 'INVALID_VOICE':
        return { success: false, error: 'Voice not available' };

      case 'UNSUPPORTED_LANGUAGE':
        return { success: false, error: 'Language not supported' };

      case 'RATE_LIMITED':
        return { success: false, error: 'Please wait before generating more' };

      case 'CONTENT_FILTERED':
        return { success: false, error: 'Content filtered for safety' };

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
| Lyrics Narration | Read lyrics aloud for preview |
| Podcast Generation | Create multi-speaker music discussions |
| Tutorial Voiceover | Add narration to tutorials |
| Song Introductions | Generate DJ-style intros |
| Accessibility | Read UI elements and descriptions |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiSpeechService.js` | TTS service (create) |
| `src/hooks/useSpeechGeneration.js` | React hook (create) |
| `firebase/functions/speech/` | Cloud Function wrappers (create) |

---

## Context Files

- [gemini-audio-agent.md](./gemini-audio-agent.md) - Audio understanding (input)
- [suno-api-agent.md](./suno-api-agent.md) - Music generation patterns
