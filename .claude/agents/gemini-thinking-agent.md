# Gemini Thinking Agent

## Identity

**Name:** `gemini-thinking-agent`
**Type:** AI reasoning specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API thinking capabilities for enhanced reasoning tasks. Handles thinking levels, thinking budgets, thought summaries, and complex multi-step reasoning.

## Documentation

- **Thinking Docs:** https://ai.google.dev/gemini-api/docs/thinking
- **Thought Signatures Docs:** https://ai.google.dev/gemini-api/docs/thought-signatures
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models with Thinking Support

| Model | Code | Thinking Control |
|-------|------|------------------|
| **Gemini 3 Flash** | `gemini-3-flash-preview` | Thinking Levels |
| **Gemini 3 Pro** | `gemini-3-pro-preview` | Thinking Levels |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Thinking Budget |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Thinking Budget |

---

## Thinking Levels (Gemini 3)

| Level | Use Case | Token Usage |
|-------|----------|-------------|
| `minimal` | Simple tasks, quick responses | Lowest |
| `low` | Straightforward reasoning | Low |
| `medium` | Moderate complexity (default) | Medium |
| `high` | Complex reasoning, analysis | Highest |

---

## Thinking Budget (Gemini 2.5)

| Model | Range | Default |
|-------|-------|---------|
| **Gemini 2.5 Flash** | 0 - 24,576 tokens | Auto |
| **Gemini 2.5 Pro** | 128 - 32,768 tokens | Auto |

---

## Implementation Patterns

### Gemini 3 Thinking Levels

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const thinkWithLevel = async (prompt, level = 'medium', options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: level, // 'minimal', 'low', 'medium', 'high'
        includeThoughts: options.includeThoughts || false,
      },
    },
  });

  const parts = response.candidates[0].content.parts;

  return {
    success: true,
    text: parts.find(p => p.text)?.text,
    thoughts: parts.find(p => p.thought)?.thought,
    thoughtsTokenCount: response.usageMetadata?.thoughtsTokenCount,
  };
};
```

### Gemini 2.5 Thinking Budget

```javascript
const thinkWithBudget = async (prompt, budget, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingBudget: budget, // 0-24576 for Flash, 128-32768 for Pro
        includeThoughts: options.includeThoughts || false,
      },
    },
  });

  const parts = response.candidates[0].content.parts;

  return {
    success: true,
    text: parts.find(p => p.text)?.text,
    thoughts: parts.find(p => p.thought)?.thought,
    thoughtsTokenCount: response.usageMetadata?.thoughtsTokenCount,
  };
};
```

### Include Thought Summaries

```javascript
const thinkWithSummary = async (prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: options.level || 'medium',
        includeThoughts: true, // Get thought summaries
      },
    },
  });

  const parts = response.candidates[0].content.parts;
  const thoughtPart = parts.find(p => p.thought);
  const textPart = parts.find(p => p.text);

  return {
    success: true,
    answer: textPart?.text,
    reasoning: thoughtPart?.thought,
    tokenUsage: {
      thoughts: response.usageMetadata?.thoughtsTokenCount,
      total: response.usageMetadata?.totalTokenCount,
    },
  };
};
```

### Disable Thinking

```javascript
// For simple tasks where thinking is unnecessary
const quickResponse = async (prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingBudget: 0, // Disable thinking
      },
    },
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
  };
};
```

### Adaptive Thinking

```javascript
const adaptiveThinking = async (prompt, complexity) => {
  // Map complexity to thinking level
  const levelMap = {
    simple: 'minimal',
    moderate: 'low',
    complex: 'medium',
    advanced: 'high',
  };

  const level = levelMap[complexity] || 'medium';

  return thinkWithLevel(prompt, level, { includeThoughts: true });
};

// Usage
const simpleAnswer = await adaptiveThinking('What is 2+2?', 'simple');
const complexAnalysis = await adaptiveThinking('Analyze the implications of...', 'advanced');
```

### Streaming with Thinking

```javascript
const streamWithThinking = async (prompt, onChunk, options = {}) => {
  const response = await ai.models.generateContentStream({
    model: options.model || 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: options.level || 'medium',
        includeThoughts: true,
      },
    },
  });

  let fullThoughts = '';
  let fullText = '';

  for await (const chunk of response) {
    const parts = chunk.candidates[0].content.parts;

    for (const part of parts) {
      if (part.thought) {
        fullThoughts += part.thought;
        onChunk({ type: 'thought', content: part.thought });
      }
      if (part.text) {
        fullText += part.text;
        onChunk({ type: 'text', content: part.text });
      }
    }
  }

  return { thoughts: fullThoughts, text: fullText };
};
```

---

## Task-Specific Configurations

### Code Analysis (High Reasoning)

```javascript
const analyzeCode = async (code, question) => {
  return thinkWithLevel(
    `Analyze this code and answer: ${question}\n\n\`\`\`\n${code}\n\`\`\``,
    'high',
    { includeThoughts: true }
  );
};
```

### Quick Factual Queries (Minimal Thinking)

```javascript
const quickFact = async (question) => {
  return thinkWithLevel(question, 'minimal');
};
```

### Creative Writing (Medium Thinking)

```javascript
const creativeWrite = async (prompt) => {
  return thinkWithLevel(prompt, 'medium', { includeThoughts: true });
};
```

### Problem Solving (High Thinking)

```javascript
const solveProblem = async (problem) => {
  return thinkWithLevel(
    `Solve this problem step by step: ${problem}`,
    'high',
    { includeThoughts: true }
  );
};
```

### Music Composition Analysis (High)

```javascript
const analyzeMusicTheory = async (query) => {
  return thinkWithLevel(
    `As a music theory expert, analyze: ${query}`,
    'high',
    { includeThoughts: true }
  );
};
```

---

## React Native Integration

### Thinking Hook

```javascript
import { useState, useCallback } from 'react';

const useThinking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const think = useCallback(async (prompt, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      let thinkResult;

      if (options.model?.includes('gemini-3')) {
        thinkResult = await thinkWithLevel(prompt, options.level || 'medium', {
          includeThoughts: options.showReasoning,
        });
      } else {
        thinkResult = await thinkWithBudget(prompt, options.budget, {
          includeThoughts: options.showReasoning,
        });
      }

      setResult(thinkResult);
      return thinkResult;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const thinkSimple = useCallback((prompt) => think(prompt, { level: 'minimal' }), [think]);
  const thinkDeep = useCallback((prompt) => think(prompt, { level: 'high', showReasoning: true }), [think]);

  return {
    loading,
    error,
    result,
    think,
    thinkSimple,
    thinkDeep,
    clear: () => setResult(null),
  };
};
```

### Streaming Thinking Hook

```javascript
const useStreamingThinking = () => {
  const [loading, setLoading] = useState(false);
  const [thoughts, setThoughts] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(null);

  const thinkStream = useCallback(async (prompt, level = 'medium') => {
    setLoading(true);
    setThoughts('');
    setAnswer('');
    setError(null);

    try {
      await streamWithThinking(
        prompt,
        (chunk) => {
          if (chunk.type === 'thought') {
            setThoughts(prev => prev + chunk.content);
          } else {
            setAnswer(prev => prev + chunk.content);
          }
        },
        { level }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, thoughts, answer, error, thinkStream };
};
```

---

## Token Management

```javascript
const estimateThinkingTokens = (level) => {
  const estimates = {
    minimal: 100,
    low: 500,
    medium: 2000,
    high: 8000,
  };
  return estimates[level] || estimates.medium;
};

const optimizeThinking = async (prompt, maxBudget) => {
  // Start with lowest appropriate level
  const levels = ['minimal', 'low', 'medium', 'high'];

  for (const level of levels) {
    const estimated = estimateThinkingTokens(level);
    if (estimated <= maxBudget) {
      const result = await thinkWithLevel(prompt, level, { includeThoughts: true });

      // Check if result is satisfactory
      if (result.success && result.text.length > 50) {
        return result;
      }
    }
  }

  // Fallback to medium if budget allows
  return thinkWithLevel(prompt, 'medium');
};
```

---

## Error Handling

```javascript
const handleThinking = async (prompt, options) => {
  try {
    return await thinkWithLevel(prompt, options.level, options);
  } catch (error) {
    switch (error.code) {
      case 'BUDGET_EXCEEDED':
        return { success: false, error: 'Thinking budget exceeded limit' };

      case 'INVALID_LEVEL':
        return { success: false, error: 'Invalid thinking level' };

      case 'THINKING_TIMEOUT':
        return { success: false, error: 'Thinking took too long' };

      case 'RATE_LIMITED':
        return { success: false, error: 'Please wait before thinking more' };

      default:
        return { success: false, error: error.message };
    }
  }
};
```

---

## LetsMakeMusic Use Cases

| Feature | Thinking Level | Purpose |
|---------|---------------|---------|
| Quick Search | minimal | Fast song lookups |
| Song Recommendations | low | Basic matching |
| Lyrics Analysis | medium | Content understanding |
| Music Theory Help | high | Complex explanations |
| Composition Assistance | high | Creative guidance |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiThinkingService.js` | Thinking service (create) |
| `src/hooks/useThinking.js` | React hook (create) |
| `firebase/functions/thinking/` | Cloud Function wrappers (create) |

---

## Context Files

- [gemini-function-calling-agent.md](./gemini-function-calling-agent.md) - Requires thinking for Gemini 3
- [gemini-structured-output-agent.md](./gemini-structured-output-agent.md) - Combined with thinking
