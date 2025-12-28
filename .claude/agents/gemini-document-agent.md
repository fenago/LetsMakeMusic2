# Gemini Document Agent

## Identity

**Name:** `gemini-document-agent`
**Type:** AI document processing specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini API document processing for analyzing PDFs and documents. Handles native PDF vision understanding, text extraction, and multi-page document analysis.

## Documentation

- **Document Processing Docs:** https://ai.google.dev/gemini-api/docs/document-processing
- **Files API:** https://ai.google.dev/api/files
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Models

| Model | Code | Best For |
|-------|------|----------|
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Fast document analysis |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Complex reasoning |
| **Gemini 3 Flash** | `gemini-3-flash-preview` | Latest features, media_resolution |
| **Gemini 3 Pro** | `gemini-3-pro-preview` | Advanced analysis |

---

## Technical Specifications

| Specification | Value |
|---------------|-------|
| Max Pages | 1,000 pages per PDF |
| Max File Size | 50 MB |
| Token Rate | ~258 tokens per page |
| Native Vision | Full visual understanding (not just OCR) |
| Text Extraction | Native extraction (not billed as input tokens) |

---

## Input Methods

### Method 1: Inline Data (Small PDFs)
For PDFs that can be encoded as base64 inline.

### Method 2: Files API Upload (Large PDFs)
For larger documents requiring server-side processing.

---

## Implementation Patterns

### Upload PDF via Files API

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const uploadPDF = async (pdfPath) => {
  const uploadResult = await ai.files.upload({
    file: pdfPath,
    config: {
      mimeType: 'application/pdf',
    },
  });

  // Wait for processing
  let file = uploadResult;
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    file = await ai.files.get({ name: file.name });
  }

  if (file.state === 'FAILED') {
    throw new Error('PDF processing failed');
  }

  return file;
};
```

### Analyze PDF with Files API

```javascript
const analyzePDF = async (fileUri, prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: 'application/pdf',
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

### Inline PDF Analysis

```javascript
const analyzeInlinePDF = async (pdfBase64, prompt, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
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

### Gemini 3 Media Resolution

```javascript
// Gemini 3 allows controlling image resolution for PDFs
const analyzeWithResolution = async (fileUri, prompt, resolution = 'medium') => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: 'application/pdf',
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      mediaResolution: resolution, // 'low', 'medium', 'high'
    },
  });

  return {
    success: true,
    text: response.candidates[0].content.parts[0].text,
  };
};
```

### Native Text Extraction

```javascript
// Text extraction is free (not billed as input tokens)
const extractText = async (fileUri) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: 'application/pdf',
            },
          },
          { text: 'Extract all text from this document verbatim.' },
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

### Multi-Page Analysis

```javascript
const analyzeMultiPage = async (fileUri, options = {}) => {
  const response = await ai.models.generateContent({
    model: options.model || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: 'application/pdf',
            },
          },
          {
            text: `Analyze this document page by page. For each page provide:
- Page number
- Main content summary
- Key information extracted
- Any tables or figures described

${options.additionalPrompt || ''}`,
          },
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

### Specific Page Range

```javascript
const analyzePageRange = async (fileUri, startPage, endPage, prompt) => {
  const enhancedPrompt = `Focus on pages ${startPage} through ${endPage} of this document.

${prompt}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: 'application/pdf',
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
  };
};
```

---

## Common Analysis Tasks

### Document Summarization

```javascript
const summarizeDocument = async (fileUri) => {
  return analyzePDF(fileUri, `Provide a comprehensive summary of this document including:
1. Main topic and purpose
2. Key points and findings
3. Important conclusions
4. Any recommendations or action items`);
};
```

### Table Extraction

```javascript
const extractTables = async (fileUri) => {
  return analyzePDF(fileUri, `Extract all tables from this document. For each table:
1. Provide the table title/caption if present
2. List all column headers
3. Format the data in a structured way
4. Note which page the table appears on`);
};
```

### Form Data Extraction

```javascript
const extractFormData = async (fileUri) => {
  return analyzePDF(fileUri, `Extract all form fields and their values from this document. Return as structured key-value pairs.`);
};
```

### Contract Analysis

```javascript
const analyzeContract = async (fileUri) => {
  return analyzePDF(fileUri, `Analyze this contract and extract:
1. Parties involved
2. Key terms and conditions
3. Important dates and deadlines
4. Financial terms
5. Obligations of each party
6. Termination clauses
7. Any notable or unusual provisions`);
};
```

### Invoice Processing

```javascript
const processInvoice = async (fileUri) => {
  return analyzePDF(fileUri, `Extract the following from this invoice:
- Invoice number
- Date
- Vendor/Seller name and address
- Buyer name and address
- Line items (description, quantity, unit price, total)
- Subtotal
- Tax
- Total amount due
- Payment terms
- Due date`);
};
```

---

## React Native Integration

### Document Analysis Hook

```javascript
import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const useDocumentAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const pickAndAnalyze = useCallback(async (prompt, options = {}) => {
    try {
      // Pick document
      const docResult = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (docResult.canceled) {
        return { success: false, error: 'User cancelled' };
      }

      const file = docResult.assets[0];
      return analyzeFromUri(file.uri, prompt, options);
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const analyzeFromUri = useCallback(async (pdfUri, prompt, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress('Uploading document...');

    try {
      // Upload PDF
      const file = await uploadPDF(pdfUri);
      setProgress('Analyzing document...');

      // Analyze
      const analysisResult = await analyzePDF(file.uri, prompt, options);
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

  const analyzeFromBase64 = useCallback(async (base64Data, prompt, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const analysisResult = await analyzeInlinePDF(base64Data, prompt, options);
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
    pickAndAnalyze,
    analyzeFromUri,
    analyzeFromBase64,
    clear: () => setResult(null),
  };
};
```

---

## Error Handling

```javascript
const handleDocumentAnalysis = async (fileUri, prompt) => {
  try {
    return await analyzePDF(fileUri, prompt);
  } catch (error) {
    switch (error.code) {
      case 'PDF_TOO_LARGE':
        return { success: false, error: 'PDF exceeds 50MB limit' };

      case 'TOO_MANY_PAGES':
        return { success: false, error: 'PDF exceeds 1000 page limit' };

      case 'PROCESSING_FAILED':
        return { success: false, error: 'Document processing failed' };

      case 'UNSUPPORTED_FORMAT':
        return { success: false, error: 'Document format not supported' };

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
| Lyrics Sheet Analysis | Extract lyrics from PDF sheets |
| Music Score Processing | Analyze sheet music PDFs |
| Contract Review | Analyze artist/label contracts |
| Tutorial PDFs | Extract steps from PDF tutorials |
| Setlist Processing | Parse setlist documents |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiDocumentService.js` | Document processing service (create) |
| `src/hooks/useDocumentAnalysis.js` | React hook (create) |
| `firebase/functions/documents/` | Cloud Function wrappers (create) |

---

## Context Files

- [gemini-image-agent.md](./gemini-image-agent.md) - Similar Gemini patterns
- [gemini-video-agent.md](./gemini-video-agent.md) - Files API patterns
