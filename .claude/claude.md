# LetsMakeMusic - Project Memory

## Project Overview

React Native TikTok-style app with AI music generation (Suno API) on Instamobile framework + Firebase.

**Tech Stack:** React Native 0.81.1, React 19.1.0, Firebase, Node 20, Yarn 4

**Docs:** https://instamobile.io/docs/getting-started-with-react-native

---

## Firebase

| Property | Value |
|----------|-------|
| Project ID | `letsmakemusic-4e0fe` |
| Region | `us-central1` |
| Storage Bucket | `letsmakemusic-4e0fe.firebasestorage.app` |

**Collections:** `users`, `channels`, `social_feeds`, `notifications`, `songs`

---

## iOS Build

| Property | Value |
|----------|-------|
| Bundle ID | `music.letsmake.app` |
| Workspace | `Instamobile.xcworkspace` |
| Scheme | `Instamobile` |
| Simulator | `iPhone 17 Pro` |
| Simulator UDID | `454906BA-3B99-4E20-AA68-09A5DD7BDC22` |

**Commands:** See [Research/Commands.md](Research/Commands.md)

---

## Multi-Simulator Config

**CRITICAL:** User runs multiple projects. Stay in your lane!

| Resource | This Project | Other Project |
|----------|--------------|---------------|
| Metro Port | `8081` (default) | `8082` |
| Simulator | iPhone 17 Pro | iPhone 16e |
| UDID | `454906BA-3B99-4E20-AA68-09A5DD7BDC22` | - |

**Rules:**
1. **ALWAYS use UDID** for simctl commands, NOT `booted`
2. **NEVER kill port 8082** - that's another project
3. **Metro stays on 8081** - no `--port` flag

---

## Key Files

| Purpose | Path |
|---------|------|
| App Version | `src/config/appVersion.js` |
| Firebase Config | `src/core/firebase/config.js` |
| Audio Utils | `src/utils/audioUtils.js` |
| Songs Service | `src/services/songsService.js` |
| Cloud Functions | `firebase/functions/index.js` |

---

## Detailed Documentation

- [Commands.md](Research/Commands.md) - Build, run, deploy commands
- [CloudFunctions.md](Research/CloudFunctions.md) - Endpoints, song migration
- [KnownIssues.md](Research/KnownIssues.md) - Bug fixes and workarounds
- [UIintegration.md](Research/UIintegration.md) - Implementation phases
- [iOSBuild.md](Research/iOSBuild.md) - Detailed iOS build process

---

## React Native Firebase Syntax

**IMPORTANT:** This app uses `@react-native-firebase`, NOT the web SDK.

```javascript
// CORRECT - React Native Firebase
const fn = functions().httpsCallable('functionName')
const result = await fn({ data })

// WRONG - Web SDK (will error: "_url is not a function")
import { httpsCallable } from 'firebase/functions'
const fn = httpsCallable(functions, 'functionName')
```

---

## Security Warning

Firestore rules are WIDE OPEN (`allow read, write: if true`). **Secure before production!**
