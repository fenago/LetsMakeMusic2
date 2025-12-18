# LetsMakeMusic - Project Memory

## Source of Truth

**Primary Documentation:** https://instamobile.io/docs/getting-started-with-react-native

### Related Documentation Links
- Firebase Integration: https://instamobile.io/docs/firebase-integration/
- Firebase Schemas: https://instamobile.io/docs/firebase-schemas/
- Authentication: https://instamobile.io/docs/authentication/
- Firestore Setup: https://instamobile.io/docs/firestore/
- Firebase Storage: https://instamobile.io/docs/firebase-storage/
- Cloud Functions: https://instamobile.io/docs/cloud-functions/

---

## Project Overview

This is a React Native TikTok-style application built on the Instamobile framework with Firebase as the backend.

### Tech Stack
- **Frontend:** React Native (Expo + React Native CLI hybrid)
- **Backend:** Firebase (Firestore, Cloud Functions, Authentication, Storage)
- **Node Version:** 20 (for Cloud Functions)

---

## Firebase Configuration

### Project Environments
| Environment | Project ID |
|-------------|------------|
| Development | development-69cdc |
| Production | production-a9404 |
| Instaflutter | instaflutter-85faa |

### Cloud Functions Region
- `us-central1`

### Emulator Ports
- Functions: 5001
- Firestore: 8080

---

## Backend Architecture

### Collection Strategy
The backend uses a "live" + "historical" collection pattern:
- **Live collections** (`*_live`): Limited to 50 items, used for real-time listeners
- **Historical collections** (`*_historical`): Contains older data, used for pagination

### Core Collections
- `users` - User profiles and settings
- `channels` - Chat channels/conversations
- `social_feeds` - User social feeds (posts, chat feeds)
- `notifications` - User notifications

### Cloud Functions Modules
1. **Media** - File upload handling
2. **Chat** - Messaging, channels, reactions
3. **User Reporting** - Block/abuse handling
4. **Dating** - Swipes, matches, recommendations
5. **Notifications** - Push notification management
6. **Triggers** - Data propagation on user profile updates

---

## Authentication Methods
- Email/Password
- Apple Sign In
- Google Sign In
- Facebook Login
- Phone/SMS OTP

---

## Important Notes

### Security Warning
Current Firestore rules are WIDE OPEN:
```
allow read, write: if true;
```
**This must be secured before production deployment.**

---

## Quick Commands

```bash
# Deploy functions
cd firebase/functions && npm run deploy

# Start emulators
cd firebase && firebase emulators:start

# View function logs
cd firebase/functions && npm run logs
```
