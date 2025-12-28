# Gemini Structured Output Agent

## Identity

**Name:** `gemini-structured-output-agent`
**Type:** AI structured data specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API structured output for generating type-safe JSON responses. Handles JSON schema definitions, Zod integration, and reliable structured data extraction.

## Documentation

- **Structured Output Docs:** https://ai.google.dev/gemini-api/docs/structured-output
- **JSON Schema:** https://json-schema.org/
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models

All Gemini models support structured output:
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-3-flash-preview`
- `gemini-3-pro-preview`

---

## Supported Schema Types

| Type | JSON Schema | Description |
|------|-------------|-------------|
| String | `"type": "string"` | Text values |
| Number | `"type": "number"` | Floating point numbers |
| Integer | `"type": "integer"` | Whole numbers |
| Boolean | `"type": "boolean"` | True/false values |
| Object | `"type": "object"` | Nested objects |
| Array | `"type": "array"` | Lists of items |
| Null | `"type": "null"` | Null value |
| Enum | `"enum": [...]` | Constrained values |

---

## Implementation Patterns

### Basic Structured Output

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateStructured = async (prompt, schema, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const jsonText = response.candidates[0].content.parts[0].text;
  return JSON.parse(jsonText);
};
```

### Recipe Schema Example

```javascript
const recipeSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Name of the recipe',
    },
    description: {
      type: 'string',
      description: 'Brief description of the dish',
    },
    prepTime: {
      type: 'integer',
      description: 'Preparation time in minutes',
    },
    cookTime: {
      type: 'integer',
      description: 'Cooking time in minutes',
    },
    servings: {
      type: 'integer',
      description: 'Number of servings',
    },
    difficulty: {
      type: 'string',
      enum: ['easy', 'medium', 'hard'],
      description: 'Difficulty level',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          unit: { type: 'string' },
        },
        required: ['name', 'amount'],
      },
    },
    instructions: {
      type: 'array',
      items: { type: 'string' },
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['name', 'ingredients', 'instructions'],
};

// Usage
const recipe = await generateStructured(
  'Create a recipe for chocolate chip cookies',
  recipeSchema
);
```

### Song Metadata Schema

```javascript
const songMetadataSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Song title',
    },
    artist: {
      type: 'string',
      description: 'Artist name',
    },
    genre: {
      type: 'string',
      enum: ['pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'country', 'jazz', 'classical', 'other'],
    },
    mood: {
      type: 'string',
      enum: ['happy', 'sad', 'energetic', 'calm', 'romantic', 'angry', 'melancholic', 'uplifting'],
    },
    tempo: {
      type: 'string',
      enum: ['slow', 'medium', 'fast'],
    },
    bpm: {
      type: 'integer',
      description: 'Beats per minute (60-200)',
    },
    key: {
      type: 'string',
      description: 'Musical key (e.g., C major, A minor)',
    },
    duration: {
      type: 'integer',
      description: 'Duration in seconds',
    },
    themes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lyrical themes',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'genre', 'mood'],
};

const analyzeSong = async (songDescription) => {
  return generateStructured(
    `Analyze this song and extract metadata: ${songDescription}`,
    songMetadataSchema
  );
};
```

### Using Zod (JavaScript)

```javascript
import { z } from 'zod';

// Define schema with Zod
const PlaylistSchema = z.object({
  name: z.string().describe('Playlist name'),
  description: z.string().describe('Playlist description'),
  songs: z.array(z.object({
    title: z.string(),
    artist: z.string(),
    duration: z.number().describe('Duration in seconds'),
  })),
  totalDuration: z.number().describe('Total duration in seconds'),
  mood: z.enum(['chill', 'workout', 'party', 'focus', 'sleep']),
  isPublic: z.boolean(),
});

// Convert Zod to JSON Schema
const zodToJsonSchema = (zodSchema) => {
  // Use a library like zod-to-json-schema or manual conversion
  // This is a simplified example
  return {
    type: 'object',
    properties: {
      // ... converted properties
    },
  };
};

const generatePlaylist = async (prompt) => {
  const jsonSchema = zodToJsonSchema(PlaylistSchema);
  const result = await generateStructured(prompt, jsonSchema);

  // Validate with Zod
  return PlaylistSchema.parse(result);
};
```

### Nested Object Schema

```javascript
const userProfileSchema = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    displayName: { type: 'string' },
    bio: { type: 'string' },
    preferences: {
      type: 'object',
      properties: {
        favoriteGenres: {
          type: 'array',
          items: { type: 'string' },
        },
        privacySettings: {
          type: 'object',
          properties: {
            profilePublic: { type: 'boolean' },
            showListeningActivity: { type: 'boolean' },
            allowMessages: { type: 'boolean' },
          },
        },
      },
    },
    stats: {
      type: 'object',
      properties: {
        followers: { type: 'integer' },
        following: { type: 'integer' },
        totalPlays: { type: 'integer' },
        songsCreated: { type: 'integer' },
      },
    },
  },
  required: ['username', 'displayName'],
};
```

### Array of Objects Schema

```javascript
const searchResultsSchema = {
  type: 'object',
  properties: {
    query: { type: 'string' },
    totalResults: { type: 'integer' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['song', 'artist', 'playlist', 'album'],
          },
          id: { type: 'string' },
          title: { type: 'string' },
          subtitle: { type: 'string' },
          relevanceScore: { type: 'number' },
        },
        required: ['type', 'id', 'title'],
      },
    },
  },
  required: ['query', 'results'],
};
```

### Streaming Structured Output

```javascript
const streamStructured = async (prompt, schema, onPartial) => {
  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  let fullJson = '';

  for await (const chunk of response) {
    const text = chunk.candidates[0].content.parts[0].text;
    fullJson += text;

    // Attempt to parse partial JSON for progress
    try {
      const partial = JSON.parse(fullJson);
      onPartial(partial);
    } catch {
      // JSON not yet complete, continue
    }
  }

  return JSON.parse(fullJson);
};
```

### With Enum Constraints

```javascript
const feedbackSchema = {
  type: 'object',
  properties: {
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Rating from 1 to 5',
    },
    sentiment: {
      type: 'string',
      enum: ['positive', 'neutral', 'negative'],
    },
    category: {
      type: 'string',
      enum: ['audio_quality', 'ui_ux', 'features', 'performance', 'other'],
    },
    feedback: {
      type: 'string',
      description: 'Detailed feedback text',
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['rating', 'sentiment', 'feedback'],
};
```

---

## React Native Integration

### Structured Output Hook

```javascript
import { useState, useCallback } from 'react';

const useStructuredOutput = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const generate = useCallback(async (prompt, schema, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateStructured(prompt, schema, options);
      setData(result);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    data,
    generate,
    clear: () => setData(null),
  };
};
```

### Pre-defined Schema Hook

```javascript
const useSongAnalysis = () => {
  const { generate, loading, error, data } = useStructuredOutput();

  const analyzeSong = useCallback(async (description) => {
    return generate(
      `Analyze this song and extract metadata: ${description}`,
      songMetadataSchema
    );
  }, [generate]);

  return { analyzeSong, loading, error, songData: data };
};

const usePlaylistGeneration = () => {
  const { generate, loading, error, data } = useStructuredOutput();

  const generatePlaylist = useCallback(async (prompt) => {
    return generate(prompt, playlistSchema);
  }, [generate]);

  return { generatePlaylist, loading, error, playlist: data };
};
```

---

## Schema Builders

```javascript
// Helper to build common schemas
const SchemaBuilder = {
  string: (description) => ({ type: 'string', description }),

  integer: (description, min, max) => ({
    type: 'integer',
    description,
    ...(min !== undefined && { minimum: min }),
    ...(max !== undefined && { maximum: max }),
  }),

  enum: (values, description) => ({
    type: 'string',
    enum: values,
    description,
  }),

  array: (itemSchema, description) => ({
    type: 'array',
    items: itemSchema,
    description,
  }),

  object: (properties, required = []) => ({
    type: 'object',
    properties,
    required,
  }),
};

// Usage
const quickSchema = SchemaBuilder.object(
  {
    title: SchemaBuilder.string('Song title'),
    genre: SchemaBuilder.enum(['pop', 'rock', 'jazz'], 'Music genre'),
    rating: SchemaBuilder.integer('User rating', 1, 5),
    tags: SchemaBuilder.array({ type: 'string' }, 'Song tags'),
  },
  ['title', 'genre']
);
```

---

## Error Handling

```javascript
const handleStructuredGeneration = async (prompt, schema) => {
  try {
    return await generateStructured(prompt, schema);
  } catch (error) {
    if (error.message.includes('JSON')) {
      // Schema validation or parsing error
      return { success: false, error: 'Failed to generate valid JSON' };
    }

    switch (error.code) {
      case 'INVALID_SCHEMA':
        return { success: false, error: 'Invalid JSON schema provided' };

      case 'SCHEMA_MISMATCH':
        return { success: false, error: 'Response did not match schema' };

      case 'RATE_LIMITED':
        return { success: false, error: 'Please wait before generating more' };

      default:
        return { success: false, error: error.message };
    }
  }
};

// Retry with simpler schema on failure
const generateWithFallback = async (prompt, schema, fallbackSchema) => {
  try {
    return await generateStructured(prompt, schema);
  } catch {
    console.warn('Primary schema failed, trying fallback');
    return generateStructured(prompt, fallbackSchema);
  }
};
```

---

## LetsMakeMusic Use Cases

| Feature | Schema Purpose |
|---------|----------------|
| Song Metadata | Extract structured song info |
| User Preferences | Store typed preference objects |
| Search Results | Consistent search response format |
| Playlist Data | Structured playlist generation |
| Analytics | Typed analytics events |
| API Responses | Consistent API contracts |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiStructuredService.js` | Structured output service (create) |
| `src/hooks/useStructuredOutput.js` | React hook (create) |
| `src/schemas/` | JSON schema definitions (create) |
| `firebase/functions/structured/` | Cloud Function wrappers (create) |

---

## Context Files

- [gemini-thinking-agent.md](./gemini-thinking-agent.md) - Combined with thinking
- [gemini-function-calling-agent.md](./gemini-function-calling-agent.md) - Tool responses
