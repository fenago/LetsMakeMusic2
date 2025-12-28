# Gemini Function Calling Agent

## Identity

**Name:** `gemini-function-calling-agent`
**Type:** AI tool integration specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API function calling for integrating external tools and APIs. Handles tool definitions, parallel and sequential function calling, MCP support, and automatic function execution.

## Documentation

- **Function Calling Docs:** https://ai.google.dev/gemini-api/docs/function-calling
- **Thought Signatures:** https://ai.google.dev/gemini-api/docs/thought-signatures
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models

| Model | Code | Features |
|-------|------|----------|
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Full function calling |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Full function calling |
| **Gemini 3 Flash** | `gemini-3-flash-preview` | + Thought signatures required |
| **Gemini 3 Pro** | `gemini-3-pro-preview` | + Multimodal function responses |

---

## Function Calling Modes

| Mode | Description |
|------|-------------|
| `AUTO` | Model decides when to call functions (default) |
| `ANY` | Model must call at least one function |
| `NONE` | Disable function calling |
| `VALIDATED` | Strict parameter validation |

---

## Core Concepts

### Tool Definition Structure

```javascript
const toolDefinition = {
  functionDeclarations: [
    {
      name: 'functionName',
      description: 'What this function does',
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Description of param1',
          },
          param2: {
            type: 'integer',
            description: 'Description of param2',
          },
        },
        required: ['param1'],
      },
    },
  ],
};
```

---

## Implementation Patterns

### Basic Function Calling

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Define tools
const tools = [
  {
    functionDeclarations: [
      {
        name: 'searchSongs',
        description: 'Search for songs by title, artist, or genre',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            genre: {
              type: 'string',
              description: 'Filter by genre',
            },
            limit: {
              type: 'integer',
              description: 'Maximum results to return',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'playSong',
        description: 'Play a song by its ID',
        parameters: {
          type: 'object',
          properties: {
            songId: {
              type: 'string',
              description: 'The song ID to play',
            },
          },
          required: ['songId'],
        },
      },
    ],
  },
];

const callWithFunctions = async (prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: tools,
    },
  });

  return response;
};
```

### Handle Function Calls

```javascript
const handleFunctionCall = async (functionCall) => {
  const { name, args } = functionCall;

  // Route to appropriate function
  switch (name) {
    case 'searchSongs':
      return await searchSongsAPI(args.query, args.genre, args.limit);

    case 'playSong':
      return await playSongAPI(args.songId);

    case 'createPlaylist':
      return await createPlaylistAPI(args.name, args.songs);

    default:
      throw new Error(`Unknown function: ${name}`);
  }
};

const processWithFunctions = async (prompt) => {
  // Initial request
  let response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { tools },
  });

  const parts = response.candidates[0].content.parts;

  // Check for function calls
  const functionCallPart = parts.find(p => p.functionCall);

  if (functionCallPart) {
    // Execute the function
    const result = await handleFunctionCall(functionCallPart.functionCall);

    // Send result back to model
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [functionCallPart] },
        {
          role: 'user',
          parts: [{
            functionResponse: {
              name: functionCallPart.functionCall.name,
              response: result,
            },
          }],
        },
      ],
      config: { tools },
    });
  }

  return response.candidates[0].content.parts.find(p => p.text)?.text;
};
```

### Parallel Function Calling

```javascript
const processParallelCalls = async (prompt) => {
  let response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { tools },
  });

  const parts = response.candidates[0].content.parts;
  const functionCalls = parts.filter(p => p.functionCall);

  if (functionCalls.length > 0) {
    // Execute all functions in parallel
    const results = await Promise.all(
      functionCalls.map(async (part) => {
        const result = await handleFunctionCall(part.functionCall);
        return {
          functionResponse: {
            name: part.functionCall.name,
            response: result,
          },
        };
      })
    );

    // Send all results back
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: functionCalls },
        { role: 'user', parts: results },
      ],
      config: { tools },
    });
  }

  return response.candidates[0].content.parts.find(p => p.text)?.text;
};
```

### Gemini 3 with Thought Signatures

```javascript
// Gemini 3 requires thought signatures for function calling
const processGemini3Functions = async (prompt) => {
  let response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools,
      thinkingConfig: {
        thinkingLevel: 'medium',
      },
    },
  });

  const parts = response.candidates[0].content.parts;
  const functionCallParts = parts.filter(p => p.functionCall);

  if (functionCallParts.length > 0) {
    // For parallel calls, signature is on the FIRST functionCall part
    const signaturePart = functionCallParts[0];

    // Execute functions
    const results = await Promise.all(
      functionCallParts.map(part => handleFunctionCall(part.functionCall))
    );

    // Return responses with signature
    const responseParts = functionCallParts.map((part, i) => ({
      functionResponse: {
        name: part.functionCall.name,
        response: results[i],
        // Include signature on the part that had it
        ...(part === signaturePart && part.thoughtSignature && {
          thoughtSignature: part.thoughtSignature,
        }),
      },
    }));

    response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: functionCallParts },
        { role: 'user', parts: responseParts },
      ],
      config: { tools },
    });
  }

  return response.candidates[0].content.parts.find(p => p.text)?.text;
};
```

### Compositional (Sequential) Function Calling

```javascript
const processSequentialCalls = async (prompt, maxIterations = 5) => {
  let contents = [{ role: 'user', parts: [{ text: prompt }] }];
  let iterations = 0;

  while (iterations < maxIterations) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { tools },
    });

    const parts = response.candidates[0].content.parts;
    const functionCalls = parts.filter(p => p.functionCall);

    // No more function calls, we have the final answer
    if (functionCalls.length === 0) {
      return parts.find(p => p.text)?.text;
    }

    // Add model response to history
    contents.push({ role: 'model', parts });

    // Execute functions and add responses
    const results = await Promise.all(
      functionCalls.map(async (part) => ({
        functionResponse: {
          name: part.functionCall.name,
          response: await handleFunctionCall(part.functionCall),
        },
      }))
    );

    contents.push({ role: 'user', parts: results });
    iterations++;
  }

  throw new Error('Max iterations exceeded');
};
```

### Function Calling Mode Control

```javascript
// Force at least one function call
const forceFunction = async (prompt) => {
  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools,
      toolConfig: {
        functionCallingConfig: {
          mode: 'ANY', // Must call at least one function
        },
      },
    },
  });
};

// Disable function calling
const noFunctions = async (prompt) => {
  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools,
      toolConfig: {
        functionCallingConfig: {
          mode: 'NONE', // Disable function calling
        },
      },
    },
  });
};

// Strict validation
const validatedFunctions = async (prompt) => {
  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools,
      toolConfig: {
        functionCallingConfig: {
          mode: 'VALIDATED', // Strict parameter validation
        },
      },
    },
  });
};
```

### MCP (Model Context Protocol) Support

```javascript
// Gemini supports MCP for standardized tool integration
import { McpToolset } from '@anthropic-ai/mcp';

const setupMcpTools = async () => {
  const mcpTools = await McpToolset.create({
    // MCP configuration
  });

  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: mcpTools.getTools(),
    },
  });
};
```

---

## Music App Tools

### Complete Tool Definitions

```javascript
const musicAppTools = [
  {
    functionDeclarations: [
      // Song operations
      {
        name: 'searchSongs',
        description: 'Search for songs in the library',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            genre: { type: 'string' },
            mood: { type: 'string' },
            artist: { type: 'string' },
            limit: { type: 'integer', default: 10 },
          },
          required: ['query'],
        },
      },
      {
        name: 'playSong',
        description: 'Play a specific song',
        parameters: {
          type: 'object',
          properties: {
            songId: { type: 'string', description: 'Song ID to play' },
          },
          required: ['songId'],
        },
      },
      {
        name: 'generateSong',
        description: 'Generate a new AI song',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Song generation prompt' },
            genre: { type: 'string' },
            instrumental: { type: 'boolean' },
          },
          required: ['prompt'],
        },
      },

      // Playlist operations
      {
        name: 'createPlaylist',
        description: 'Create a new playlist',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            songIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['name'],
        },
      },
      {
        name: 'addToPlaylist',
        description: 'Add songs to a playlist',
        parameters: {
          type: 'object',
          properties: {
            playlistId: { type: 'string' },
            songIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['playlistId', 'songIds'],
        },
      },

      // User operations
      {
        name: 'getUserProfile',
        description: 'Get user profile information',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
      },
      {
        name: 'followUser',
        description: 'Follow another user',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
      },

      // Analytics
      {
        name: 'getSongStats',
        description: 'Get statistics for a song',
        parameters: {
          type: 'object',
          properties: {
            songId: { type: 'string' },
          },
          required: ['songId'],
        },
      },
    ],
  },
];
```

---

## React Native Integration

### Function Calling Hook

```javascript
import { useState, useCallback, useRef } from 'react';

const useFunctionCalling = (tools, functionHandlers) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const conversationRef = useRef([]);

  const execute = useCallback(async (prompt) => {
    setLoading(true);
    setError(null);

    try {
      conversationRef.current.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      let response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: conversationRef.current,
        config: { tools },
      });

      // Process function calls
      while (true) {
        const parts = response.candidates[0].content.parts;
        const functionCalls = parts.filter(p => p.functionCall);

        if (functionCalls.length === 0) break;

        // Add model response
        conversationRef.current.push({ role: 'model', parts });

        // Execute functions
        const results = await Promise.all(
          functionCalls.map(async (part) => {
            const handler = functionHandlers[part.functionCall.name];
            if (!handler) throw new Error(`No handler for ${part.functionCall.name}`);

            const result = await handler(part.functionCall.args);
            return {
              functionResponse: {
                name: part.functionCall.name,
                response: result,
              },
            };
          })
        );

        // Add function responses
        conversationRef.current.push({ role: 'user', parts: results });

        // Get next response
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: conversationRef.current,
          config: { tools },
        });
      }

      const finalText = response.candidates[0].content.parts.find(p => p.text)?.text;
      conversationRef.current.push({
        role: 'model',
        parts: [{ text: finalText }],
      });

      setResult(finalText);
      return { success: true, result: finalText };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [tools, functionHandlers]);

  const reset = useCallback(() => {
    conversationRef.current = [];
    setResult(null);
  }, []);

  return { loading, error, result, execute, reset };
};
```

### Usage Example

```javascript
const MusicAssistant = () => {
  const functionHandlers = {
    searchSongs: async (args) => songsService.search(args),
    playSong: async (args) => playerService.play(args.songId),
    createPlaylist: async (args) => playlistService.create(args),
  };

  const { execute, loading, result } = useFunctionCalling(
    musicAppTools,
    functionHandlers
  );

  const handleCommand = async (command) => {
    await execute(command);
  };

  return (
    <View>
      <TextInput onSubmitEditing={(e) => handleCommand(e.nativeEvent.text)} />
      {loading && <ActivityIndicator />}
      {result && <Text>{result}</Text>}
    </View>
  );
};
```

---

## Error Handling

```javascript
const handleFunctionCalling = async (prompt) => {
  try {
    return await processWithFunctions(prompt);
  } catch (error) {
    switch (error.code) {
      case 'FUNCTION_NOT_FOUND':
        return { success: false, error: 'Unknown function requested' };

      case 'INVALID_ARGUMENTS':
        return { success: false, error: 'Invalid function arguments' };

      case 'FUNCTION_EXECUTION_ERROR':
        return { success: false, error: 'Function execution failed' };

      case 'THOUGHT_SIGNATURE_REQUIRED':
        return { success: false, error: 'Gemini 3 requires thought signatures' };

      case 'RATE_LIMITED':
        return { success: false, error: 'Please wait before making more requests' };

      default:
        return { success: false, error: error.message };
    }
  }
};
```

---

## LetsMakeMusic Use Cases

| Feature | Functions Used |
|---------|----------------|
| Voice Commands | searchSongs, playSong, generateSong |
| Smart Playlists | createPlaylist, addToPlaylist, searchSongs |
| Social Features | followUser, getUserProfile |
| Analytics | getSongStats |
| AI Assistant | All functions combined |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiFunctionService.js` | Function calling service (create) |
| `src/hooks/useFunctionCalling.js` | React hook (create) |
| `src/tools/musicAppTools.js` | Tool definitions (create) |
| `firebase/functions/assistant/` | Cloud Function wrappers (create) |

---

## Context Files

- [gemini-thinking-agent.md](./gemini-thinking-agent.md) - Required for Gemini 3
- [gemini-structured-output-agent.md](./gemini-structured-output-agent.md) - Function response schemas
