# Gemini Files & Batch Agent

## Identity

**Name:** `gemini-files-batch-agent`
**Type:** AI file management and batch processing specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Gemini Files API for uploading large media files and Batch API for cost-effective bulk processing. Handles file uploads, file management, batch job creation, and asynchronous processing workflows.

## Documentation

- **Files API Docs:** https://ai.google.dev/gemini-api/docs/files
- **Batch API Docs:** https://ai.google.dev/gemini-api/docs/batch-api
- **Gemini API Reference:** https://ai.google.dev/api/rest

---

## Files API Overview

### Specifications

| Property | Value |
|----------|-------|
| Max File Size | 2 GB |
| Project Storage Limit | 20 GB |
| File Retention | 48 hours |
| Cost | Free |
| Operations | Upload only (no download) |

### Supported File Types

| Category | MIME Types |
|----------|------------|
| Images | `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/heic`, `image/heif` |
| Audio | `audio/wav`, `audio/mp3`, `audio/aiff`, `audio/aac`, `audio/ogg`, `audio/flac` |
| Video | `video/mp4`, `video/mpeg`, `video/mov`, `video/avi`, `video/webm`, `video/mkv`, `video/3gpp` |
| Documents | `application/pdf`, `text/plain`, `text/csv`, `text/html` |

---

## Files API Implementation

### Basic File Upload

```javascript
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const uploadFile = async (filePath, options = {}) => {
  const mimeType = options.mimeType || getMimeType(filePath);
  const displayName = options.displayName || path.basename(filePath);

  const uploadResult = await ai.files.upload({
    file: filePath,
    config: {
      mimeType,
      displayName,
    },
  });

  // Wait for file processing if needed
  let file = uploadResult;
  while (file.state === 'PROCESSING') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await ai.files.get({ name: file.name });
  }

  if (file.state === 'FAILED') {
    throw new Error(`File processing failed: ${file.name}`);
  }

  return {
    success: true,
    file: {
      name: file.name,
      uri: file.uri,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      state: file.state,
      displayName: file.displayName,
      expirationTime: file.expirationTime,
    },
  };
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};
```

### Upload from Base64

```javascript
const uploadFromBase64 = async (base64Data, mimeType, displayName) => {
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');

  // Create a Blob-like object
  const blob = new Blob([buffer], { type: mimeType });

  const uploadResult = await ai.files.upload({
    file: blob,
    config: {
      mimeType,
      displayName,
    },
  });

  return waitForProcessing(uploadResult);
};

const waitForProcessing = async (file) => {
  while (file.state === 'PROCESSING') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await ai.files.get({ name: file.name });
  }

  if (file.state === 'FAILED') {
    throw new Error(`File processing failed: ${file.name}`);
  }

  return file;
};
```

### Upload from URL

```javascript
const uploadFromUrl = async (url, mimeType, displayName) => {
  // Fetch the file from URL
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: mimeType });

  const uploadResult = await ai.files.upload({
    file: blob,
    config: {
      mimeType,
      displayName,
    },
  });

  return waitForProcessing(uploadResult);
};
```

### List Files

```javascript
const listFiles = async (options = {}) => {
  const files = [];
  let pageToken;

  do {
    const response = await ai.files.list({
      pageSize: options.pageSize || 100,
      pageToken,
    });

    files.push(...(response.files || []));
    pageToken = response.nextPageToken;

    // Limit total files if specified
    if (options.limit && files.length >= options.limit) {
      return files.slice(0, options.limit);
    }
  } while (pageToken);

  return files;
};
```

### Get File Metadata

```javascript
const getFileMetadata = async (fileName) => {
  const file = await ai.files.get({ name: fileName });

  return {
    name: file.name,
    displayName: file.displayName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    state: file.state,
    uri: file.uri,
    createTime: file.createTime,
    updateTime: file.updateTime,
    expirationTime: file.expirationTime,
    sha256Hash: file.sha256Hash,
  };
};
```

### Delete File

```javascript
const deleteFile = async (fileName) => {
  try {
    await ai.files.delete({ name: fileName });
    return { success: true, deleted: fileName };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Bulk delete
const deleteFiles = async (fileNames) => {
  const results = await Promise.allSettled(
    fileNames.map((name) => ai.files.delete({ name }))
  );

  return {
    deleted: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
    details: results.map((r, i) => ({
      name: fileNames[i],
      success: r.status === 'fulfilled',
      error: r.status === 'rejected' ? r.reason?.message : null,
    })),
  };
};
```

### Use Uploaded File with Gemini

```javascript
const analyzeUploadedFile = async (fileUri, mimeType, prompt) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        parts: [
          {
            fileData: {
              fileUri,
              mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
  });

  return response.candidates[0].content.parts[0].text;
};

// Usage
const file = await uploadFile('/path/to/audio.mp3');
const analysis = await analyzeUploadedFile(
  file.uri,
  file.mimeType,
  'Analyze this audio and describe its content'
);
```

---

## File Manager Class

```javascript
class GeminiFileManager {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
    this.files = new Map(); // Local cache
  }

  async upload(filePath, options = {}) {
    const result = await uploadFile(filePath, options);
    this.files.set(result.file.name, result.file);
    return result.file;
  }

  async uploadBase64(base64Data, mimeType, displayName) {
    const file = await uploadFromBase64(base64Data, mimeType, displayName);
    this.files.set(file.name, file);
    return file;
  }

  async get(fileName) {
    // Check cache first
    if (this.files.has(fileName)) {
      const cached = this.files.get(fileName);
      // Refresh if might be expired
      const expiry = new Date(cached.expirationTime);
      if (expiry > new Date()) {
        return cached;
      }
    }

    const file = await getFileMetadata(fileName);
    this.files.set(fileName, file);
    return file;
  }

  async list(options = {}) {
    const files = await listFiles(options);
    files.forEach((f) => this.files.set(f.name, f));
    return files;
  }

  async delete(fileName) {
    const result = await deleteFile(fileName);
    if (result.success) {
      this.files.delete(fileName);
    }
    return result;
  }

  async deleteExpired() {
    const files = await this.list();
    const now = new Date();
    const expiringFiles = files.filter((f) => {
      const expiry = new Date(f.expirationTime);
      const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);
      return hoursUntilExpiry < 1; // Delete if expiring in < 1 hour
    });

    return this.deleteFiles(expiringFiles.map((f) => f.name));
  }

  clearCache() {
    this.files.clear();
  }
}
```

---

## Batch API Overview

### Specifications

| Property | Value |
|----------|-------|
| Cost Reduction | 50% discount |
| Processing Time | 24-hour SLO |
| Max Input File | 2 GB |
| Input Format | JSONL (JSON Lines) |
| Job Limit | Multiple concurrent jobs |

### Job States

| State | Description |
|-------|-------------|
| `JOB_STATE_PENDING` | Job queued for processing |
| `JOB_STATE_RUNNING` | Job actively processing |
| `JOB_STATE_SUCCEEDED` | Job completed successfully |
| `JOB_STATE_FAILED` | Job failed with errors |
| `JOB_STATE_CANCELLED` | Job was cancelled |

---

## Batch API Implementation

### Create Inline Batch Job

```javascript
const createInlineBatchJob = async (requests, model = 'gemini-2.5-flash') => {
  const batchJob = await ai.batches.create({
    model,
    requests: requests.map((request, index) => ({
      customId: request.customId || `request-${index}`,
      request: {
        contents: [
          {
            parts: [{ text: request.prompt }],
          },
        ],
        ...(request.config && { config: request.config }),
      },
    })),
  });

  return {
    jobName: batchJob.name,
    state: batchJob.state,
    createTime: batchJob.createTime,
  };
};

// Usage
const job = await createInlineBatchJob([
  { customId: 'song-1', prompt: 'Analyze this song lyrics: ...' },
  { customId: 'song-2', prompt: 'Analyze this song lyrics: ...' },
  { customId: 'song-3', prompt: 'Analyze this song lyrics: ...' },
]);
```

### Create Batch Job from File

```javascript
const createFileBatchJob = async (inputFileUri, model = 'gemini-2.5-flash') => {
  const batchJob = await ai.batches.create({
    model,
    src: inputFileUri, // URI from Files API
  });

  return {
    jobName: batchJob.name,
    state: batchJob.state,
    createTime: batchJob.createTime,
  };
};
```

### JSONL Format for Batch Input

```javascript
// Each line is a separate JSON object
const createBatchInputFile = (requests) => {
  const lines = requests.map((request) =>
    JSON.stringify({
      custom_id: request.customId,
      request: {
        contents: [
          {
            parts: [{ text: request.prompt }],
            role: 'user',
          },
        ],
        // Optional configurations
        generationConfig: request.generationConfig,
        systemInstruction: request.systemInstruction,
      },
    })
  );

  return lines.join('\n');
};

// Upload JSONL file
const uploadBatchInputFile = async (requests) => {
  const jsonlContent = createBatchInputFile(requests);
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });

  const file = await ai.files.upload({
    file: blob,
    config: {
      mimeType: 'application/jsonl',
      displayName: `batch-input-${Date.now()}.jsonl`,
    },
  });

  return waitForProcessing(file);
};
```

### Check Batch Job Status

```javascript
const getBatchJobStatus = async (jobName) => {
  const job = await ai.batches.get({ name: jobName });

  return {
    name: job.name,
    state: job.state,
    createTime: job.createTime,
    updateTime: job.updateTime,
    completedRequests: job.completedRequestCount || 0,
    failedRequests: job.failedRequestCount || 0,
    totalRequests: job.totalRequestCount || 0,
    outputFileUri: job.dest, // Available when completed
  };
};
```

### Poll for Batch Completion

```javascript
const waitForBatchCompletion = async (jobName, options = {}) => {
  const pollInterval = options.pollInterval || 60000; // 1 minute
  const maxWait = options.maxWait || 24 * 60 * 60 * 1000; // 24 hours
  const onProgress = options.onProgress;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const status = await getBatchJobStatus(jobName);

    if (onProgress) {
      onProgress(status);
    }

    if (status.state === 'JOB_STATE_SUCCEEDED') {
      return { success: true, ...status };
    }

    if (status.state === 'JOB_STATE_FAILED') {
      return { success: false, error: 'Job failed', ...status };
    }

    if (status.state === 'JOB_STATE_CANCELLED') {
      return { success: false, error: 'Job cancelled', ...status };
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return { success: false, error: 'Timeout waiting for batch completion' };
};
```

### Get Batch Results

```javascript
const getBatchResults = async (outputFileUri) => {
  // Fetch the output file (JSONL format)
  const response = await fetch(outputFileUri);
  const text = await response.text();

  // Parse JSONL
  const lines = text.trim().split('\n');
  const results = lines.map((line) => JSON.parse(line));

  return results.map((result) => ({
    customId: result.custom_id,
    response: result.response,
    error: result.error,
    status: result.response ? 'success' : 'failed',
  }));
};
```

### List Batch Jobs

```javascript
const listBatchJobs = async (options = {}) => {
  const jobs = [];
  let pageToken;

  do {
    const response = await ai.batches.list({
      pageSize: options.pageSize || 100,
      pageToken,
    });

    jobs.push(...(response.batchJobs || []));
    pageToken = response.nextPageToken;

    if (options.limit && jobs.length >= options.limit) {
      return jobs.slice(0, options.limit);
    }
  } while (pageToken);

  return jobs;
};
```

### Cancel Batch Job

```javascript
const cancelBatchJob = async (jobName) => {
  try {
    await ai.batches.cancel({ name: jobName });
    return { success: true, cancelled: jobName };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### Delete Batch Job

```javascript
const deleteBatchJob = async (jobName) => {
  try {
    await ai.batches.delete({ name: jobName });
    return { success: true, deleted: jobName };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

---

## Batch Processing Manager

```javascript
class BatchProcessingManager {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
    this.activeJobs = new Map();
  }

  async createInlineJob(requests, model = 'gemini-2.5-flash') {
    const job = await createInlineBatchJob(requests, model);
    this.activeJobs.set(job.jobName, {
      ...job,
      requestCount: requests.length,
      startTime: Date.now(),
    });
    return job;
  }

  async createFileJob(requests, model = 'gemini-2.5-flash') {
    // Upload requests as JSONL file
    const inputFile = await uploadBatchInputFile(requests);

    // Create batch job from file
    const job = await createFileBatchJob(inputFile.uri, model);
    this.activeJobs.set(job.jobName, {
      ...job,
      inputFileUri: inputFile.uri,
      requestCount: requests.length,
      startTime: Date.now(),
    });

    return job;
  }

  async getStatus(jobName) {
    const status = await getBatchJobStatus(jobName);

    // Update local cache
    if (this.activeJobs.has(jobName)) {
      const cached = this.activeJobs.get(jobName);
      this.activeJobs.set(jobName, { ...cached, ...status });
    }

    return status;
  }

  async waitForCompletion(jobName, onProgress) {
    return waitForBatchCompletion(jobName, { onProgress });
  }

  async getResults(jobName) {
    const status = await this.getStatus(jobName);

    if (status.state !== 'JOB_STATE_SUCCEEDED') {
      throw new Error(`Job not completed: ${status.state}`);
    }

    return getBatchResults(status.outputFileUri);
  }

  async cancel(jobName) {
    const result = await cancelBatchJob(jobName);
    if (result.success) {
      this.activeJobs.delete(jobName);
    }
    return result;
  }

  async cleanup() {
    // Delete completed/failed jobs older than 24 hours
    const jobs = await listBatchJobs();
    const now = Date.now();
    const cutoff = 24 * 60 * 60 * 1000;

    const toDelete = jobs.filter((job) => {
      const createTime = new Date(job.createTime).getTime();
      const isOld = now - createTime > cutoff;
      const isTerminal = ['JOB_STATE_SUCCEEDED', 'JOB_STATE_FAILED', 'JOB_STATE_CANCELLED'].includes(job.state);
      return isOld && isTerminal;
    });

    const results = await Promise.allSettled(
      toDelete.map((job) => deleteBatchJob(job.name))
    );

    return {
      deleted: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }
}
```

---

## React Native Integration

### File Upload Hook

```javascript
import { useState, useCallback } from 'react';

const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);

  const upload = useCallback(async (filePath, options = {}) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(10);
      const result = await uploadFile(filePath, options);
      setProgress(100);
      setFile(result.file);
      return { success: true, file: result.file };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadBase64 = useCallback(async (base64Data, mimeType, displayName) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(10);
      const result = await uploadFromBase64(base64Data, mimeType, displayName);
      setProgress(100);
      setFile(result);
      return { success: true, file: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploading,
    progress,
    error,
    file,
    upload,
    uploadBase64,
    clear: () => setFile(null),
  };
};
```

### Batch Processing Hook

```javascript
const useBatchProcessing = () => {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const process = useCallback(async (requests, options = {}) => {
    setProcessing(true);
    setStatus(null);
    setResults(null);
    setError(null);

    try {
      // Create batch job
      const job = await createInlineBatchJob(requests, options.model);
      setStatus({ state: 'CREATED', jobName: job.jobName });

      // Poll for completion
      const completion = await waitForBatchCompletion(job.jobName, {
        onProgress: (progress) => {
          setStatus({
            state: progress.state,
            jobName: job.jobName,
            completed: progress.completedRequests,
            total: progress.totalRequests,
          });
        },
      });

      if (!completion.success) {
        throw new Error(completion.error);
      }

      // Get results
      const batchResults = await getBatchResults(completion.outputFileUri);
      setResults(batchResults);
      setStatus({ state: 'COMPLETED', jobName: job.jobName });

      return { success: true, results: batchResults };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    status,
    results,
    error,
    process,
    clear: () => {
      setStatus(null);
      setResults(null);
      setError(null);
    },
  };
};
```

### File List Hook

```javascript
const useFileList = () => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const fileList = await listFiles(options);
      setFiles(fileList);
      return { success: true, files: fileList };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (fileName) => {
    const result = await deleteFile(fileName);
    if (result.success) {
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
    }
    return result;
  }, []);

  return {
    loading,
    files,
    error,
    refresh,
    remove,
  };
};
```

---

## Cloud Function Wrappers

### File Upload Function

```javascript
const functions = require('firebase-functions');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: functions.config().gemini.api_key });

exports.uploadFileToGemini = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { base64Data, mimeType, displayName } = data;

  if (!base64Data || !mimeType) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: mimeType });

    const file = await ai.files.upload({
      file: blob,
      config: { mimeType, displayName },
    });

    // Wait for processing
    let processed = file;
    while (processed.state === 'PROCESSING') {
      await new Promise((r) => setTimeout(r, 2000));
      processed = await ai.files.get({ name: file.name });
    }

    return {
      success: true,
      file: {
        name: processed.name,
        uri: processed.uri,
        mimeType: processed.mimeType,
        state: processed.state,
      },
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

### Batch Processing Function

```javascript
exports.createBatchJob = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { requests, model } = data;

  if (!requests || !Array.isArray(requests)) {
    throw new functions.https.HttpsError('invalid-argument', 'Requests must be an array');
  }

  try {
    const batchJob = await ai.batches.create({
      model: model || 'gemini-2.5-flash',
      requests: requests.map((r, i) => ({
        customId: r.customId || `request-${i}`,
        request: {
          contents: [{ parts: [{ text: r.prompt }] }],
        },
      })),
    });

    return {
      success: true,
      jobName: batchJob.name,
      state: batchJob.state,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.getBatchJobStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { jobName } = data;

  try {
    const job = await ai.batches.get({ name: jobName });

    return {
      success: true,
      state: job.state,
      completedRequests: job.completedRequestCount,
      failedRequests: job.failedRequestCount,
      totalRequests: job.totalRequestCount,
      outputFileUri: job.dest,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

---

## Error Handling

```javascript
const handleFileError = (error) => {
  const errorMap = {
    'FILE_TOO_LARGE': 'File exceeds 2GB limit',
    'STORAGE_QUOTA_EXCEEDED': 'Project storage limit (20GB) exceeded',
    'UNSUPPORTED_MIME_TYPE': 'File type not supported',
    'FILE_NOT_FOUND': 'File not found or expired',
    'PROCESSING_FAILED': 'File processing failed',
  };

  return errorMap[error.code] || error.message;
};

const handleBatchError = (error) => {
  const errorMap = {
    'INVALID_JSONL': 'Invalid JSONL format in input file',
    'JOB_NOT_FOUND': 'Batch job not found',
    'JOB_ALREADY_CANCELLED': 'Job was already cancelled',
    'QUOTA_EXCEEDED': 'Batch processing quota exceeded',
  };

  return errorMap[error.code] || error.message;
};

const safeFileOperation = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    return {
      success: false,
      error: handleFileError(error),
      code: error.code,
    };
  }
};

const safeBatchOperation = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    return {
      success: false,
      error: handleBatchError(error),
      code: error.code,
    };
  }
};
```

---

## LetsMakeMusic Use Cases

### Files API

| Feature | Use Case |
|---------|----------|
| Song Upload | Upload audio files for AI analysis |
| Cover Art | Upload images for processing |
| Video Content | Upload music videos |
| Lyrics Documents | Upload PDF/text lyrics |
| Batch Audio | Process multiple songs |

### Batch API

| Feature | Use Case |
|---------|----------|
| Lyrics Analysis | Bulk analyze song lyrics |
| Metadata Generation | Generate metadata for song library |
| Content Moderation | Batch moderate user content |
| Recommendations | Bulk generate recommendations |
| Transcription | Batch transcribe audio files |

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/services/geminiFilesService.js` | Files API service (create) |
| `src/services/geminiBatchService.js` | Batch API service (create) |
| `src/hooks/useFileUpload.js` | File upload hook (create) |
| `src/hooks/useBatchProcessing.js` | Batch processing hook (create) |
| `firebase/functions/files/` | Cloud Function wrappers (create) |
| `firebase/functions/batch/` | Batch processing functions (create) |

---

## Context Files

- [gemini-audio-agent.md](./gemini-audio-agent.md) - Audio file processing
- [gemini-video-agent.md](./gemini-video-agent.md) - Video file processing
- [gemini-document-agent.md](./gemini-document-agent.md) - Document file processing
- [gemini-image-agent.md](./gemini-image-agent.md) - Image file processing
