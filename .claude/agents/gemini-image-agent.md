# Gemini Image Agent

## Identity

**Name:** `gemini-image-agent`
**Type:** AI image generation specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API image generation for creating and editing images. Handles text-to-image generation, image editing, multi-turn image conversations, and high-resolution output.

## Documentation

- **Image Generation Docs:** https://ai.google.dev/gemini-api/docs/image-generation
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models

| Model | Code | Capabilities | Max Images |
|-------|------|--------------|------------|
| **Gemini 2.5 Flash Image** | `gemini-2.5-flash-image` | Text-to-image, image editing | Up to 8 reference images |
| **Gemini 3 Pro Image** | `gemini-3-pro-image-preview` | Advanced generation, grounding, 4K | Up to 14 reference images |

---

## Core Capabilities

### Text-to-Image Generation
Generate images from text descriptions.

### Image Editing
Modify existing images based on text prompts.

### Multi-Turn Image Editing
Iteratively refine images through conversation.

### Advanced Features (Gemini 3)
- Up to 14 reference images
- Grounding with Google Search
- 4K resolution support
- Thinking process integration

---

## Configuration Options

### Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| `1:1` | Square, social media profile |
| `2:3` | Portrait, vertical posters |
| `3:2` | Landscape, photos |
| `3:4` | Portrait, vertical |
| `4:3` | Standard landscape |
| `4:5` | Portrait, social |
| `5:4` | Landscape, traditional |
| `9:16` | Vertical video, stories |
| `16:9` | Widescreen, thumbnails |
| `21:9` | Ultrawide, cinematic |

### Resolution Options

| Resolution | Dimensions | Use Case |
|------------|------------|----------|
| `1K` | ~1024px | Quick previews, drafts |
| `2K` | ~2048px | Standard quality |
| `4K` | ~4096px | High-quality, print (Gemini 3) |

---

## Implementation Patterns

### Text-to-Image Generation

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateImage = async (prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        numberOfImages: options.numberOfImages || 1,
        aspectRatio: options.aspectRatio || '1:1',
        outputImageMimeType: options.mimeType || 'image/png',
        outputImageCompression: options.compression || 75,
        // Gemini 3 only
        outputResolution: options.resolution, // '1K', '2K', '4K'
      },
    },
  });

  // Extract image from response
  const parts = response.candidates[0].content.parts;
  const imagePart = parts.find(part => part.inlineData);

  if (imagePart) {
    return {
      success: true,
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
      text: parts.find(p => p.text)?.text,
    };
  }

  return { success: false, error: 'No image generated' };
};
```

### Image Editing

```javascript
const editImage = async (imageBase64, mimeType, editPrompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash-image',
    contents: [
      {
        role: 'user',
        parts: [
          { text: editPrompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: options.aspectRatio || '1:1',
        outputImageMimeType: options.mimeType || 'image/png',
      },
    },
  });

  const parts = response.candidates[0].content.parts;
  const imagePart = parts.find(part => part.inlineData);

  return {
    success: !!imagePart,
    imageData: imagePart?.inlineData.data,
    mimeType: imagePart?.inlineData.mimeType,
    text: parts.find(p => p.text)?.text,
  };
};
```

### Multi-Turn Image Editing (Chat)

```javascript
const createImageChat = async () => {
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash-image',
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  return {
    // Initial generation
    generate: async (prompt) => {
      const response = await chat.sendMessage(prompt);
      return extractImage(response);
    },

    // Iterative refinement
    refine: async (refinementPrompt) => {
      const response = await chat.sendMessage(refinementPrompt);
      return extractImage(response);
    },

    // Add reference image for editing
    editWithReference: async (imageBase64, mimeType, prompt) => {
      const response = await chat.sendMessage([
        { text: prompt },
        { inlineData: { mimeType, data: imageBase64 } },
      ]);
      return extractImage(response);
    },
  };
};

const extractImage = (response) => {
  const parts = response.candidates[0].content.parts;
  const imagePart = parts.find(part => part.inlineData);
  return {
    success: !!imagePart,
    imageData: imagePart?.inlineData.data,
    mimeType: imagePart?.inlineData.mimeType,
    text: parts.find(p => p.text)?.text,
  };
};
```

### Gemini 3 Advanced Features

```javascript
// 4K High-Resolution Generation
const generate4KImage = async (prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        outputResolution: '4K',
        aspectRatio: '16:9',
        outputImageMimeType: 'image/png',
      },
    },
  });
  return extractImage(response);
};

// Multiple Reference Images (up to 14)
const generateWithReferences = async (prompt, referenceImages) => {
  const parts = [
    { text: prompt },
    ...referenceImages.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    })),
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });
  return extractImage(response);
};

// Generation with Thinking Process
const generateWithThinking = async (prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      thinkingConfig: {
        thinkingLevel: options.thinkingLevel || 'medium', // minimal, low, medium, high
        includeThoughts: true,
      },
      imageConfig: {
        aspectRatio: options.aspectRatio || '1:1',
      },
    },
  });

  const parts = response.candidates[0].content.parts;
  return {
    success: true,
    imageData: parts.find(p => p.inlineData)?.inlineData.data,
    thoughts: parts.find(p => p.thought)?.thought,
    text: parts.find(p => p.text)?.text,
  };
};

// Grounding with Google Search
const generateWithGrounding = async (prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      tools: [{ googleSearch: {} }],
    },
  });
  return extractImage(response);
};
```

### Save Generated Image

```javascript
import * as FileSystem from 'expo-file-system';

const saveGeneratedImage = async (base64Data, mimeType, filename) => {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const path = `${FileSystem.documentDirectory}${filename}.${extension}`;

  await FileSystem.writeAsStringAsync(path, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return path;
};
```

---

## React Native Integration

### Image Generation Hook

```javascript
import { useState, useCallback } from 'react';

const useImageGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);

  const generate = useCallback(async (prompt, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateImage(prompt, options);

      if (result.success) {
        setGeneratedImage({
          uri: `data:${result.mimeType};base64,${result.imageData}`,
          base64: result.imageData,
          mimeType: result.mimeType,
          description: result.text,
        });
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const edit = useCallback(async (imageBase64, mimeType, editPrompt, options) => {
    setLoading(true);
    setError(null);

    try {
      const result = await editImage(imageBase64, mimeType, editPrompt, options);

      if (result.success) {
        setGeneratedImage({
          uri: `data:${result.mimeType};base64,${result.imageData}`,
          base64: result.imageData,
          mimeType: result.mimeType,
        });
      }

      return result;
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
    generatedImage,
    generate,
    edit,
    clear: () => setGeneratedImage(null),
  };
};
```

---

## Safety and Watermarks

### SynthID Watermark
All generated images include an invisible SynthID watermark for identifying AI-generated content.

### Content Safety Filters
- Automatic filtering for harmful content
- Person generation may be restricted
- Brand logos and copyrighted content blocked

### Best Practices
- Include safety checks in production apps
- Provide clear attribution for AI-generated images
- Handle filtered responses gracefully

---

## Error Handling

```javascript
const handleImageGeneration = async (prompt, options) => {
  try {
    const result = await generateImage(prompt, options);
    return result;
  } catch (error) {
    switch (error.code) {
      case 'SAFETY_BLOCKED':
        // Content was blocked by safety filters
        return { success: false, error: 'Content filtered for safety' };

      case 'RATE_LIMITED':
        // Too many requests
        return { success: false, error: 'Please wait before generating more' };

      case 'INVALID_ASPECT_RATIO':
        // Unsupported aspect ratio
        return { success: false, error: 'Invalid aspect ratio' };

      case 'IMAGE_TOO_LARGE':
        // Input image exceeds size limits
        return { success: false, error: 'Image too large' };

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
| Album Art Generation | Text-to-image from song metadata |
| Cover Art Editing | Edit existing artwork with prompts |
| Profile Avatars | Generate unique user avatars |
| Visual Content | Create promotional images |
| Music Video Frames | Generate visual scenes for songs |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiImageService.js` | Image generation service (create) |
| `src/hooks/useImageGeneration.js` | React hook (create) |
| `src/screens/ImageGeneratorScreen/` | UI for image generation (create) |
| `firebase/functions/images/` | Cloud Function wrappers (create) |

---

## Context Files

- [sunoApi.js](../../ReactNativeTikTokApp/src/services/sunoApi.js) - Similar service pattern
- [pexels-agent.md](./pexels-agent.md) - Image handling patterns
