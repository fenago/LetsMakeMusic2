# Firebase Agent

## Identity

**Name:** `firebase-agent`
**Type:** Backend infrastructure specialist
**Priority:** P1 - Foundation

## Purpose

Expert in Firebase services (Firestore, Auth, Storage, Cloud Functions, FCM) for the LetsMakeMusic backend. Manages data architecture, serverless functions, and real-time synchronization.

## Project Configuration

| Property | Value |
|----------|-------|
| Project ID | `letsmakemusic-4e0fe` |
| Region | `us-central1` |
| Storage Bucket | `letsmakemusic-4e0fe.firebasestorage.app` |
| Node Version | 20 |

## Collections Overview

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles | id, email, walletAddress, profilePictureURL |
| `channels` | Chat channels | participants, lastMessage |
| `social_feeds` | Song posts | songId, authorID, hashtags |
| `notifications` | Push notifications | type, recipientID |
| `songs` | Song metadata | sunoId, audioUrl, imageUrl |

## Feed Architecture

**Live/Historical Pattern:**
```
social_feeds_live      (max 50 items per feed type)
social_feeds_historical (overflow storage)

Fanout writes for:
- User's own feed
- Followers' feeds
- Hashtag feeds
- Genre feeds
```

## Cloud Functions Structure

```
firebase/functions/
├── index.js           # Main exports
├── songs/
│   ├── generate.js    # Suno song generation
│   ├── extend.js      # Song extension
│   └── process.js     # Audio processing
├── media/
│   ├── upload.js      # Image/audio uploads
│   └── process.js     # Media processing
├── social/
│   ├── feed.js        # Feed operations
│   └── notifications.js
└── wallet/
    └── tokens.js      # Token operations (future)
```

## Implementation Patterns

### Cloud Function Template

```javascript
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

exports.myFunction = functions.https.onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    const { data, auth } = request;

    if (!auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    try {
      // Function logic here
      return { success: true, data: result };
    } catch (error) {
      console.error('Function error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message
      );
    }
  }
);
```

### Firestore Transaction Pattern

```javascript
const updateWithTransaction = async (songId, updates) => {
  const db = admin.firestore();

  return db.runTransaction(async (transaction) => {
    const songRef = db.collection('songs').doc(songId);
    const songDoc = await transaction.get(songRef);

    if (!songDoc.exists) {
      throw new Error('Song not found');
    }

    transaction.update(songRef, {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
};
```

### Storage Upload with Public URL

```javascript
const uploadAndMakePublic = async (buffer, fileName, contentType) => {
  const bucket = admin.storage().bucket();
  const file = bucket.file(fileName);

  await file.save(buffer, {
    metadata: { contentType },
  });

  // Make public (no IAM permissions needed)
  await file.makePublic();

  // Return public URL
  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
};
```

### Feed Fanout Write

```javascript
const fanoutToFeeds = async (post, authorId) => {
  const db = admin.firestore();
  const batch = db.batch();

  // Get author's followers
  const followersSnap = await db
    .collection('users')
    .doc(authorId)
    .collection('followers')
    .get();

  // Write to each follower's feed
  for (const follower of followersSnap.docs) {
    const feedRef = db
      .collection('social_feeds_live')
      .doc(`${follower.id}_following`)
      .collection('posts')
      .doc(post.id);

    batch.set(feedRef, post);
  }

  await batch.commit();
};
```

## Deploy Commands

```bash
# Deploy specific function
firebase deploy --only functions:generateSong --project letsmakemusic-4e0fe

# Deploy all functions
firebase deploy --only functions --project letsmakemusic-4e0fe

# View logs
firebase functions:log --project letsmakemusic-4e0fe

# View specific function logs
npx firebase-tools functions:log --only generateSong --project letsmakemusic-4e0fe
```

## Common Issues & Fixes

### Storage URLs Return 403
**Problem:** Manually constructed URLs need access tokens.
**Fix:** Use `file.makePublic()` instead of `getSignedUrl()`.

### Function Deploys to Wrong Project
**Problem:** Firebase CLI uses default project.
**Fix:** Always specify `--project letsmakemusic-4e0fe`.

### Return Format Mismatch
**Problem:** Service returns `true`, caller expects `{ success: true }`.
**Fix:** Always return consistent `{ success: boolean, data?, error? }`.

## Security Rules (Current: WIDE OPEN)

```javascript
// firestore.rules - NEEDS SECURING BEFORE PRODUCTION
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // TODO: SECURE THIS
    }
  }
}
```

## Files to Modify

| File | Purpose |
|------|---------|
| `firebase/functions/index.js` | Function exports |
| `firebase/functions/songs/*.js` | Song-related functions |
| `firebase/functions/media/*.js` | Media processing |
| `src/services/songsService.js` | Client-side service |
| `src/core/firebase/config.js` | Firebase configuration |

## Context Files

- [CloudFunctions.md](../../Research/CloudFunctions.md) - Full function documentation
- [DataArchitecture.md](../../Research/DataArchitecture.md) - Firestore schema
- [LessonsLearned.md](../../Research/LessonsLearned.md) - Firebase debugging tips
