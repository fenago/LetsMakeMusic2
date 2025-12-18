# Suno API - Complete Features Documentation

**Source:** https://sunoapi.org & https://docs.sunoapi.org  
**Date:** November 10, 2025

---

## Overview

Suno API is a comprehensive AI music generation platform that provides professional, watermark-free music creation capabilities through a stable and affordable API. The platform is built for developers, content creators, and businesses who need high-quality music generation at scale.

---

## Core Platform Features

### Service Reliability
- **99.9% Uptime** - Reliable and stable API performance
- **Running Days**: 505 days (as of Nov 2025)
- **Response Time**: 24.8 seconds average
- **High-Concurrency Architecture** - Handles multiple simultaneous requests
- **Concurrency Limit**: 20 requests every 10 seconds

### Performance
- **20-Second Streaming Output** - Fast delivery with streaming response
- **Stream URL**: Available in 30-40 seconds
- **Downloadable Song URL**: Ready in 2-3 minutes
- **Each Request Returns**: Exactly 2 songs per generation request

### Commercial Use
- **Watermark-Free Music** - All generated music is commercial-ready
- **No Additional Fees** - Immediate commercial use rights
- **File Retention**: Generated files retained for 15 days

### Pricing & Support
- **Transparent Pricing** - Usage-based model with predictable costs
- **Affordable** - Cost-effective for creators and enterprises
- **24/7 Support** - Professional technical assistance
- **Comprehensive Documentation** - Developer-friendly guides

---

## AI Model Versions

### V5 (Latest Model)
- **Status**: Cutting-edge, newest offering
- **Features**: Superior musical expression, faster generation
- **Duration**: Up to 8 minutes
- **Best For**: Advanced music generation with latest capabilities

### V4_5PLUS (V4.5+)
- **Features**: Richer sound, new creative approaches, enhanced tonal variation
- **Duration**: Up to 8 minutes
- **Best For**: Highest quality and longest tracks

### V4_5ALL (V4.5 All)
- **Status**: Enhanced version with better song structure
- **Features**: Improved overall song composition, better structural coherence
- **Duration**: Up to 8 minutes
- **Prompt Limit**: 5000 characters
- **Style Limit**: 1000 characters
- **Best For**: Well-structured complete songs with clear verse/chorus/bridge patterns

### V4_5 (V4.5)
- **Features**: Excellent prompt understanding, faster generation speeds, superior genre blending
- **Duration**: Up to 8 minutes
- **Prompt Limit**: 5000 characters
- **Style Limit**: 1000 characters
- **Best For**: Complex music requests with smart prompts

### V4
- **Features**: Improved vocals, enhanced vocal quality, refined audio processing
- **Duration**: Up to 4 minutes
- **Prompt Limit**: 3000 characters
- **Style Limit**: 200 characters
- **Best For**: Vocal clarity and quality

### V3_5
- **Features**: Better song structure, improved organization with clear verse/chorus patterns
- **Duration**: Up to 4 minutes
- **Prompt Limit**: 3000 characters
- **Style Limit**: 200 characters
- **Best For**: Structured musical compositions

---

## Music Generation APIs

### 1. Generate Suno AI Music (Primary Endpoint)
**Endpoint**: `POST /api/v1/generate`

**Core Capabilities**:
- Generate professional music from text descriptions
- Support for both vocal and instrumental tracks
- Custom mode for precise control
- Non-custom mode for quick generation

**Generation Modes**:

#### Custom Mode (`customMode: true`)
- **With Vocals** (`instrumental: false`):
  - Requires: `prompt` (used as exact lyrics), `style`, `title`
  - Prompt becomes the actual sung lyrics
  - Character limits: 3000 (V3.5/V4) or 5000 (V4.5/V4.5+/V5)
  
- **Instrumental Only** (`instrumental: true`):
  - Requires: `style`, `title`
  - No lyrics generated
  - Pure instrumental music

#### Non-Custom Mode (`customMode: false`)
- Requires: Only `prompt` (max 500 characters)
- Auto-generates lyrics based on prompt
- Simpler, faster setup
- Recommended for first-time users

**Advanced Parameters**:
- **personaId**: Apply specific persona style to music
- **negativeTags**: Exclude specific styles (e.g., "Heavy Metal, Upbeat Drums")
- **vocalGender**: Choose male (`m`) or female (`f`) vocals
- **styleWeight**: Weight of style guidance (0.00-1.00)
- **weirdnessConstraint**: Creative deviation/novelty control (0.00-1.00)
- **audioWeight**: Input audio influence (0.00-1.00)
- **callBackUrl**: Webhook for completion notifications

**Callback Stages**:
1. **text**: Text/lyrics generation complete
2. **first**: First track complete
3. **complete**: All tracks complete

### 2. Extend Music
**Endpoint**: `POST /api/v1/extend`

**Capabilities**:
- Extend existing music tracks with AI-powered continuation
- Maintain musical coherence and style
- Seamlessly continue melodies and arrangements

### 3. Upload and Cover Audio
**Endpoint**: `POST /api/v1/upload-cover`

**Capabilities**:
- Transform existing audio with new styles
- AI-powered reinterpretation
- Create covers in different arrangements

### 4. Upload and Extend Audio
**Endpoint**: `POST /api/v1/upload-extend`

**Capabilities**:
- Upload custom audio files
- Extend them with AI-generated content
- Maintain original audio characteristics

### 5. Add Vocals
**Endpoint**: `POST /api/v1/add-vocals`

**Capabilities**:
- Generate vocal tracks for instrumental music
- AI-powered vocal synthesis
- Match instrumental style and mood

### 6. Add Instrumental
**Endpoint**: `POST /api/v1/add-instrumental`

**Capabilities**:
- Create instrumental accompaniment for vocals
- AI-powered arrangement generation
- Professional backing tracks

### 7. Generate Music Cover
**Endpoint**: `POST /api/v1/generate-cover`

**Capabilities**:
- Reinterpret existing music in different styles
- AI-powered style transfer
- Create unique arrangements

### 8. Replace Music Section
**Endpoint**: `POST /api/v1/replace-section`

**Capabilities**:
- Replace specific sections of a track
- Maintain overall song coherence
- Surgical editing with AI

---

## File Upload APIs

These endpoints allow you to upload audio files to the Suno API for use with cover, extend, and other audio processing features.

### 1. Upload File (Base64)
**Endpoint**: `POST /api/file-base64-upload`

**Capabilities**:
- Upload audio files as base64 encoded data
- Supports common audio formats (MP3, WAV, M4A, etc.)
- Returns a file reference ID for use in other API calls
- Best for smaller files or when streaming is not available

**Use Cases**:
- Upload audio from mobile apps
- Process audio captured in browser
- Upload files from memory buffers

### 2. Upload File (Stream)
**Endpoint**: `POST /api/file-stream-upload`

**Capabilities**:
- Upload audio files via HTTP streaming
- Efficient for larger files
- Lower memory footprint than base64
- Returns a file reference ID for use in other API calls

**Use Cases**:
- Upload large audio files
- Server-to-server file transfers
- Efficient batch uploads

### 3. Upload File (URL)
**Endpoint**: `POST /api/file-url-upload`

**Capabilities**:
- Upload audio files by providing a publicly accessible URL
- Suno API fetches the file directly
- No file transfer needed from client
- Returns a file reference ID for use in other API calls

**Use Cases**:
- Process audio already hosted online
- Integration with cloud storage (S3, GCS, etc.)
- Process files from other music platforms

---

## Lyrics Generation APIs

### 1. Generate Lyrics
**Endpoint**: `POST /api/v1/generate-lyrics`

**Capabilities**:
- Create AI-powered lyrics
- Customizable themes and styles
- Support for various genres and moods

### 2. Get Timestamped Lyrics
**Endpoint**: `POST /api/v1/timestamped-lyrics`

**Capabilities**:
- Retrieve lyrics with precise timestamps
- Perfect for synchronization with audio
- Karaoke and lyric display applications

---

## Audio Processing APIs

### 1. Separate Vocals from Music
**Endpoint**: `POST /api/v1/separate-vocals`

**Capabilities**:
- Extract vocals and instrumental tracks separately
- Advanced AI audio separation
- High-quality stem extraction
- Perfect for remixing and karaoke

### 2. Convert to WAV Format
**Endpoint**: `POST /api/v1/convert-wav`

**Capabilities**:
- Convert generated music to high-quality WAV
- Professional audio format
- Lossless quality for production use

### 3. Boost Music Style
**Endpoint**: `POST /api/v1/boost-style`

**Capabilities**:
- Enhance and refine music styles
- AI-powered audio processing
- Improve genre characteristics

---

## Music Video APIs

### Create Music Video
**Endpoint**: `POST /api/v1/create-video`

**Capabilities**:
- Generate visual music videos from audio tracks
- AI video generation technology
- Automated video creation from music

---

## Utility APIs

### 1. Get Music Generation Details
**Endpoint**: `GET /api/v1/music-details`

**Capabilities**:
- Monitor music generation tasks
- Retrieve detailed task information
- Check generation status
- Alternative to callbacks for polling

### 2. Get Remaining Credits
**Endpoint**: `GET /api/v1/credits`

**Capabilities**:
- Check account credit balance
- View usage statistics
- Monitor API consumption

### 3. Get Lyrics Generation Details
**Endpoint**: `GET /api/v1/lyrics-details`

**Capabilities**:
- Track lyrics generation status
- Retrieve lyrics details

### 4. Get WAV Conversion Details
**Endpoint**: `GET /api/v1/wav-details`

**Capabilities**:
- Monitor WAV conversion tasks
- Check download status

### 5. Get Vocal Separation Details
**Endpoint**: `GET /api/v1/separation-details`

**Capabilities**:
- Check vocal separation progress
- Access separated audio files

### 6. Get Music Video Details
**Endpoint**: `GET /api/v1/video-details`

**Capabilities**:
- Track video generation progress
- Retrieve download links

### 7. Get Cover Details
**Endpoint**: `GET /api/v1/cover-details`

**Capabilities**:
- Monitor music cover tasks
- Get cover results

### 8. Generate Persona
**Endpoint**: `POST /api/v1/generate-persona`

**Capabilities**:
- Create personalized music personas
- Apply consistent style across generations
- Build unique artist identities

---

## Key Technical Features

### Real-Time Data Synchronization
- Seamless data flow across platforms
- Instant updates on generation status

### Security
- Encrypted data transfers
- Robust authentication
- Bearer Token authorization
- Secure API transactions

### Integration
- Easy API setup
- Straightforward configuration
- Developer-friendly documentation
- Multiple programming language support
- Interactive API testing in documentation

### Callback System
- Webhook support for all major endpoints
- Real-time notifications
- Three-stage callback process (text, first, complete)
- Alternative polling with GET endpoints

---

## Use Cases

### Game Developers
- Dynamic background music
- Adaptive audio systems
- Sound effect generation
- In-game music creation

### Content Creators
- Royalty-free music for videos
- Podcast background music
- Social media content
- Unlimited commercial use

### Businesses
- App and website integration
- User-generated content platforms
- Music streaming services
- Entertainment applications

### Music Producers
- Song prototyping
- Idea generation
- Full composition creation
- Remixing with vocal separation

### Karaoke & Entertainment
- Timestamped lyrics integration
- Vocal separation for karaoke tracks
- Interactive music experiences

---

## Character Limits Summary

| Model | Prompt Limit (Custom) | Prompt Limit (Non-Custom) | Style Limit | Title Limit |
|-------|----------------------|---------------------------|-------------|-------------|
| V3.5 | 3000 chars | 500 chars | 200 chars | 80 chars |
| V4 | 3000 chars | 500 chars | 200 chars | 80 chars |
| V4.5 | 5000 chars | 500 chars | 1000 chars | 80 chars |
| V4.5 All | 5000 chars | 500 chars | 1000 chars | 80 chars |
| V4.5+ | 5000 chars | 500 chars | 1000 chars | 80 chars |
| V5 | 5000 chars | 500 chars | 1000 chars | 80 chars |

---

## API Response Codes

- **200** - Request successful
- **400** - Invalid parameters
- **401** - Unauthorized access
- **404** - Invalid request method or path
- **405** - Rate limit exceeded
- **500** - Internal server error

---

## Summary

Suno API provides a comprehensive suite of AI music generation tools with:
- **8 music generation endpoints** (generate, extend, cover, add vocals/instrumental, etc.)
- **3 file upload endpoints** (base64, stream, URL upload)
- **2 lyrics generation endpoints** (generate, timestamped)
- **3 audio processing endpoints** (vocal separation, WAV conversion, style boost)
- **1 video generation endpoint**
- **8 utility endpoints** for monitoring and management
- **6 AI model versions** (V3.5, V4, V4.5, V4.5 All, V4.5+, V5)
- **Multiple generation modes** (custom/non-custom, vocal/instrumental)
- **Advanced customization** (persona, style weights, vocal gender, negative tags)
- **Commercial-ready output** (watermark-free, 15-day retention)
- **High performance** (20-second streaming, 99.9% uptime)
