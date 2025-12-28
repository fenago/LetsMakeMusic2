# Gemini Live Agent

## Identity

**Name:** `gemini-live-agent`
**Type:** Real-time AI interaction specialist
**Priority:** P1 - Core functionality

## Purpose

Expert in Gemini Live API for low-latency, real-time voice and video interactions. Handles WebSocket connections, bidirectional audio streaming, voice activity detection, session management, and ephemeral token security.

## Documentation

- **Live API Docs:** https://ai.google.dev/gemini-api/docs/live
- **Live Guide:** https://ai.google.dev/gemini-api/docs/live-guide
- **Live Tools:** https://ai.google.dev/gemini-api/docs/live-tools
- **Session Management:** https://ai.google.dev/gemini-api/docs/live-session
- **Ephemeral Tokens:** https://ai.google.dev/gemini-api/docs/ephemeral-tokens

---

## Models

| Model | Code | Purpose |
|-------|------|---------|
| **Native Audio** | `gemini-2.5-flash-native-audio-preview-12-2025` | Real-time voice interactions |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Text-based live interactions |

---

## Technical Specifications

### Audio Format

| Specification | Input | Output |
|---------------|-------|--------|
| Format | 16-bit PCM | 16-bit PCM |
| Sample Rate | 16 kHz (auto-resamples) | 24 kHz |
| Channels | Mono | Mono |
| Encoding | Little-endian | Little-endian |
| Chunk Size | 1024 bytes (configurable) | Variable |
| MIME Type | `audio/pcm;rate=16000` | `audio/pcm;rate=24000` |

### Session Limits

| Configuration | Maximum Duration |
|---------------|------------------|
| Audio-only | 15 minutes |
| Audio + Video | 2 minutes |
| Connection timeout | ~10 minutes |
| Context window (native) | 128k tokens |
| Context window (other) | 32k tokens |

---

## Architecture Patterns

### Server-to-Server
Backend connects to Live API via WebSockets. Client sends streams to your server first.
- More secure (API key never exposed)
- Higher latency
- Full server-side control

### Client-to-Server (Recommended)
Frontend connects directly to Live API using ephemeral tokens.
- Lower latency
- Better streaming performance
- Requires ephemeral tokens for security

---

## Implementation Patterns

### Basic WebSocket Connection (JavaScript)

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const startLiveSession = async (config = {}) => {
  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: config.modality || ['AUDIO'], // 'TEXT' or 'AUDIO' (not both)
      systemInstruction: config.systemInstruction,
      speechConfig: config.speechConfig,
    },
  });

  return session;
};
```

### Audio Streaming Session

```javascript
const createAudioSession = async (options = {}) => {
  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: options.voice || 'Kore',
          },
        },
      },
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: options.startSensitivity || 'MEDIUM',
          endOfSpeechSensitivity: options.endSensitivity || 'MEDIUM',
          prefixPaddingMs: options.prefixPadding || 300,
          silenceDurationMs: options.silenceDuration || 1000,
        },
      },
    },
  });

  return session;
};
```

### Send Audio Data

```javascript
const sendAudioChunk = async (session, audioData) => {
  // audioData should be base64-encoded PCM audio
  await session.send({
    realtimeInput: {
      mediaChunks: [{
        mimeType: 'audio/pcm;rate=16000',
        data: audioData, // Base64 encoded
      }],
    },
  });
};

// Send text instead
const sendText = async (session, text) => {
  await session.send({
    clientContent: {
      turns: [{
        role: 'user',
        parts: [{ text }],
      }],
      turnComplete: true,
    },
  });
};
```

### Receive Responses

```javascript
const listenForResponses = async (session, handlers) => {
  for await (const message of session) {
    // Audio response
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData) {
          // Base64 audio data
          handlers.onAudio?.(part.inlineData.data, part.inlineData.mimeType);
        }
        if (part.text) {
          handlers.onText?.(part.text);
        }
      }
    }

    // Generation complete
    if (message.serverContent?.generationComplete) {
      handlers.onComplete?.();
    }

    // Interruption
    if (message.serverContent?.interrupted) {
      handlers.onInterrupt?.();
    }

    // Tool call
    if (message.toolCall) {
      handlers.onToolCall?.(message.toolCall);
    }

    // Transcription
    if (message.serverContent?.outputTranscription) {
      handlers.onTranscription?.(message.serverContent.outputTranscription);
    }
  }
};
```

### Voice Activity Detection (VAD)

```javascript
// Automatic VAD (default)
const autoVadConfig = {
  realtimeInputConfig: {
    automaticActivityDetection: {
      disabled: false,
      startOfSpeechSensitivity: 'HIGH',   // LOW, MEDIUM, HIGH
      endOfSpeechSensitivity: 'MEDIUM',
      prefixPaddingMs: 300,               // Audio to keep before speech start
      silenceDurationMs: 1000,            // Silence to trigger end
    },
  },
};

// Manual VAD
const manualVadConfig = {
  realtimeInputConfig: {
    automaticActivityDetection: {
      disabled: true,
    },
  },
};

// Signal activity manually
const signalActivityStart = async (session) => {
  await session.send({ activityStart: {} });
};

const signalActivityEnd = async (session) => {
  await session.send({ activityEnd: {} });
};
```

### Enable Transcription

```javascript
const sessionWithTranscription = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['AUDIO'],
    outputAudioTranscription: {}, // Transcribe model speech
    inputAudioTranscription: {},  // Transcribe user audio
  },
});
```

### Native Audio Features

```javascript
// Affective Dialog - adapts tone to input expression
const affectiveSession = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['AUDIO'],
    // Requires v1alpha API version
  },
  apiVersion: 'v1alpha',
});

// Proactive Audio - model decides if response is needed
const proactiveConfig = {
  realtimeInputConfig: {
    proactiveAudio: true,
  },
};

// With Thinking
const thinkingConfig = {
  thinkingConfig: {
    thinkingBudget: 2000,
    includeThoughts: true,
  },
};
```

---

## Session Management

### Session Resumption

```javascript
let resumptionHandle = null;

const createResumableSession = async () => {
  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: ['AUDIO'],
      sessionResumption: {}, // Enable resumption
    },
  });

  // Listen for resumption updates
  for await (const message of session) {
    if (message.sessionResumptionUpdate?.handle) {
      resumptionHandle = message.sessionResumptionUpdate.handle;
      console.log('Got resumption handle:', resumptionHandle);
    }
  }

  return session;
};

// Resume session (within 2 hours)
const resumeSession = async (handle) => {
  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: ['AUDIO'],
      sessionResumption: {
        handle: handle, // Previous handle
      },
    },
  });

  return session;
};
```

### Context Window Compression

```javascript
// Enable for extended sessions
const extendedSession = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['AUDIO'],
    contextWindowCompression: {
      enabled: true,
      triggerTokenThreshold: 100000, // When to compress
      slidingWindowSize: 50000,      // Tokens to keep
    },
  },
});
```

### Handle Disconnection

```javascript
const handleGoAway = (message, onDisconnectSoon) => {
  if (message.goAway) {
    const timeLeft = message.goAway.timeLeft;
    console.log(`Disconnecting in ${timeLeft}`);
    onDisconnectSoon(timeLeft);
  }
};
```

---

## Tool Integration

### Function Calling with Live API

```javascript
const liveWithTools = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['AUDIO'],
    tools: [{
      functionDeclarations: [
        {
          name: 'searchSongs',
          description: 'Search for songs',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              genre: { type: 'string' },
            },
            required: ['query'],
          },
        },
        {
          name: 'playSong',
          description: 'Play a song',
          parameters: {
            type: 'object',
            properties: {
              songId: { type: 'string' },
            },
            required: ['songId'],
          },
        },
      ],
    }],
  },
});

// Handle tool calls
const handleToolCall = async (session, toolCall) => {
  const { functionCalls } = toolCall;

  for (const call of functionCalls) {
    let result;

    switch (call.name) {
      case 'searchSongs':
        result = await searchSongsAPI(call.args);
        break;
      case 'playSong':
        result = await playSongAPI(call.args);
        break;
    }

    // Send response back
    await session.send({
      toolResponse: {
        functionResponses: [{
          id: call.id,
          name: call.name,
          response: result,
        }],
      },
    });
  }
};
```

### Non-Blocking Functions

```javascript
// Allow conversation to continue while function executes
const nonBlockingTools = [{
  functionDeclarations: [{
    name: 'generateSong',
    description: 'Generate a new song (takes time)',
    behavior: 'NON_BLOCKING', // Don't block conversation
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
      },
    },
  }],
}];

// Function response scheduling
await session.send({
  toolResponse: {
    functionResponses: [{
      id: call.id,
      name: call.name,
      response: result,
      scheduling: 'WHEN_IDLE', // INTERRUPT, WHEN_IDLE, or SILENT
    }],
  },
});
```

### Google Search Grounding

```javascript
const sessionWithSearch = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['AUDIO'],
    tools: [{ googleSearch: {} }],
  },
});
```

---

## Ephemeral Tokens

### Token Generation (Server-Side)

```javascript
// Backend endpoint to generate ephemeral token
const generateEphemeralToken = async (userId) => {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/ephemeralTokens',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Optional: Lock to specific configuration
        config: {
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          responseModalities: ['AUDIO'],
        },
        // Token settings
        newSessionExpireTime: '60s',  // 1 minute to start session
        expireTime: '1800s',          // 30 minutes total
        uses: 1,                       // Single use (optional)
      }),
    }
  );

  return response.json();
};
```

### Client-Side Usage

```javascript
// Client requests token from your backend
const getToken = async () => {
  const response = await fetch('/api/gemini/token');
  return response.json();
};

// Use token for Live API connection
const connectWithToken = async () => {
  const { token } = await getToken();

  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: ['AUDIO'],
    },
    apiKey: token, // Use ephemeral token instead of API key
  });

  return session;
};
```

### Token Expiration Handling

```javascript
const manageTokenLifecycle = async (onTokenExpiring) => {
  const token = await getToken();
  const expiresAt = new Date(token.expireTime);

  // Refresh before expiration
  const refreshBuffer = 60000; // 1 minute before
  const refreshIn = expiresAt - Date.now() - refreshBuffer;

  setTimeout(async () => {
    const newToken = await getToken();
    onTokenExpiring(newToken);
  }, refreshIn);

  return token;
};
```

---

## React Native Integration

### Live Session Hook

```javascript
import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

const useLiveSession = () => {
  const [connected, setConnected] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);
  const recordingRef = useRef(null);

  const connect = useCallback(async (config = {}) => {
    try {
      // Get ephemeral token from backend
      const { token } = await fetch('/api/gemini/token').then(r => r.json());

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: ['AUDIO'],
          ...config,
        },
        apiKey: token,
      });

      sessionRef.current = session;
      setConnected(true);

      // Start listening for responses
      listenForResponses(session, {
        onAudio: handleAudioResponse,
        onInterrupt: () => setSpeaking(false),
        onComplete: () => setSpeaking(false),
      });

      return session;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!sessionRef.current) return;

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      setError('Microphone permission denied');
      return;
    }

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: '.pcm',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM,
        sampleRate: 16000,
        numberOfChannels: 1,
      },
      ios: {
        extension: '.pcm',
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    });

    recording.setOnRecordingStatusUpdate(async (status) => {
      if (status.metering) {
        // Stream audio chunks to session
        // Implementation depends on audio capture method
      }
    });

    await recording.startAsync();
    recordingRef.current = recording;
    setListening(true);
  }, []);

  const stopListening = useCallback(async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setListening(false);
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!sessionRef.current) return;
    await sendText(sessionRef.current, text);
  }, []);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.close();
      sessionRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    speaking,
    listening,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
  };
};
```

### Voice Assistant Component

```javascript
const VoiceAssistant = () => {
  const {
    connected,
    speaking,
    listening,
    connect,
    disconnect,
    startListening,
    stopListening,
  } = useLiveSession();

  const handlePress = async () => {
    if (!connected) {
      await connect({
        systemInstruction: 'You are a helpful music assistant.',
      });
    } else if (listening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.button,
          connected && styles.connected,
          listening && styles.listening,
          speaking && styles.speaking,
        ]}
      >
        <Mic size={48} color={listening ? '#ff0000' : '#ffffff'} />
      </TouchableOpacity>

      <Text style={styles.status}>
        {!connected ? 'Tap to connect' :
         listening ? 'Listening...' :
         speaking ? 'Speaking...' : 'Tap to speak'}
      </Text>
    </View>
  );
};
```

---

## Error Handling

```javascript
const handleLiveError = async (error, session) => {
  switch (error.code) {
    case 'CONNECTION_CLOSED':
      // Attempt to resume session
      if (resumptionHandle) {
        return resumeSession(resumptionHandle);
      }
      break;

    case 'TOKEN_EXPIRED':
      // Get new ephemeral token
      const newToken = await getToken();
      return connect({ apiKey: newToken });

    case 'SESSION_LIMIT_EXCEEDED':
      // Session too long, need to start fresh
      return connect();

    case 'RATE_LIMITED':
      // Wait and retry
      await new Promise(r => setTimeout(r, 5000));
      return connect();

    case 'AUDIO_FORMAT_ERROR':
      // Check audio format
      console.error('Invalid audio format');
      break;

    default:
      console.error('Live API error:', error);
  }
};
```

---

## LetsMakeMusic Use Cases

| Feature | Implementation |
|---------|----------------|
| Voice Commands | Real-time song search and playback |
| Music Discussion | Voice chat about songs and artists |
| Composition Help | Talk through song ideas |
| Lyrics Dictation | Voice-to-lyrics capture |
| Karaoke Mode | Real-time singing analysis |
| DJ Assistant | Voice-controlled mixing |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiLiveService.js` | Live session service (create) |
| `src/hooks/useLiveSession.js` | React hook (create) |
| `src/components/VoiceAssistant/` | Voice UI components (create) |
| `firebase/functions/gemini/ephemeralToken.js` | Token endpoint (create) |

---

## Context Files

- [gemini-audio-agent.md](./gemini-audio-agent.md) - Audio understanding
- [gemini-speech-agent.md](./gemini-speech-agent.md) - TTS patterns
- [gemini-function-calling-agent.md](./gemini-function-calling-agent.md) - Tool integration
