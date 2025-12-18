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
- **Frontend:** React Native 0.81.1, React 19.1.0 (Expo + React Native CLI hybrid)
- **Backend:** Firebase (Firestore, Cloud Functions, Authentication, Storage)
- **Node Version:** 20 (for Cloud Functions)
- **Package Manager:** Yarn 4 (uses `.yarnrc.yml` with `nodeLinker: node-modules`)

---

## Firebase Configuration

### Project
| Property | Value |
|----------|-------|
| Project ID | `letsmakemusic-4e0fe` |
| Region | `us-central1` |

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

### Cloud Functions (Active)

Located in `firebase/functions/index.js`:

| Category | Functions |
|----------|-----------|
| **Media** | `uploadMedia` |
| **User Reporting** | `fetchBlockedUsers`, `markAbuse`, `unblockUser`, `onReportWrite` |
| **Chat** | `fetchMessagesOfFormerParticipant`, `listMessages`, `insertMessage`, `deleteMessage`, `createChannel`, `markAsRead`, `markUserAsTypingInChannel`, `addMessageReaction`, `listChannels` |
| **Social Graph** | `searchUsers`, `add`, `unfriend`, `unfollow`, `fetchFriends`, `fetchFriendships`, `fetchOtherUserFriendships` |
| **Profile** | `fetchProfile` |
| **Triggers** | `propagateUserProfileUpdates` |
| **Seed Data** | `seedMusicTestUsers`, `seedMusicTestUsersHTTP`, `makeTestUsersFollowUser`, `makeTestUsersFollowUserHTTP` |

**Note:** Dating functions are disabled (not needed for this app).

### Seed Data HTTP Endpoints
```bash
# Create test users
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/seedMusicTestUsersHTTP"

# Make test users follow a specific user
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/makeTestUsersFollowUserHTTP?username=ernestolee"
```

---

## Authentication Methods
- Email/Password
- Apple Sign In
- Google Sign In
- Facebook Login
- Phone/SMS OTP

---

## App Version Tracking

Version is displayed on the Profile screen (own profile only).

**Config file:** `src/config/appVersion.js`

```javascript
export const APP_VERSION = '1.0.0'
export const BUILD_NUMBER = '20251218.2'
export const VERSION_STRING = `v${APP_VERSION} (${BUILD_NUMBER})`
```

**To verify cache invalidation:**
1. Update `BUILD_NUMBER` in `appVersion.js`
2. Relaunch app: `xcrun simctl terminate booted music.letsmake.app && xcrun simctl launch booted music.letsmake.app`
3. Check version on Profile screen

**IMPORTANT: Update version on every major change!**
- When making significant UI changes, bug fixes, or feature additions
- Increment BUILD_NUMBER: `YYYYMMDD.N` where N is a daily counter
- This helps verify cache is invalidated and changes are visible

---

## iOS Build Process

**Detailed Documentation:** [.claude/Research/iOSBuild.md](Research/iOSBuild.md)

### App Configuration
| Property | Value |
|----------|-------|
| Bundle ID | `music.letsmake.app` |
| Workspace | `Instamobile.xcworkspace` |
| Scheme | `Instamobile` |
| Simulator | `iPhone 17 Pro` |

### Essential Commands

```bash
# Start Metro bundler
cd ReactNativeTikTokApp && npx react-native start --reset-cache

# Build iOS (use xcodebuild directly - NOT npx react-native run-ios)
cd ReactNativeTikTokApp/ios && xcodebuild -workspace Instamobile.xcworkspace -scheme Instamobile -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 17 Pro" build

# Install app on simulator
xcrun simctl install booted "/Users/ernestolee/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/Instamobile.app"

# Launch app
xcrun simctl launch booted music.letsmake.app

# Kill app
xcrun simctl terminate booted music.letsmake.app

# Quick relaunch (for JS changes)
xcrun simctl terminate booted music.letsmake.app; xcrun simctl launch booted music.letsmake.app

# Kill Metro bundler
pkill -f "react-native start"; lsof -ti:8081 | xargs kill -9 2>/dev/null

# Stop everything
pkill -f "react-native start"; pkill -f "metro"; pkill -f "xcodebuild"; xcrun simctl terminate booted music.letsmake.app 2>/dev/null; lsof -ti:8081 | xargs kill -9 2>/dev/null
```

### Important Notes
- **Always use `iPhone 17 Pro`** (iPhone 16 Pro doesn't exist in current Xcode)
- **Use `xcodebuild` directly** instead of `npx react-native run-ios` to avoid Ruby/bundler issues
- **Metro must be running** for the app to load JavaScript
- **Full build takes 3-5 minutes**, incremental builds ~30 seconds

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

---

## Important Notes

### Security Warning
Current Firestore rules are WIDE OPEN:
```
allow read, write: if true;
```
**This must be secured before production deployment.**

---

## Known Issues & Fixes

### Profile Screen Infinite Refresh Loop
**Symptom:** Spinner never stops, avatar flickers
**Cause:** `useFocusEffect` with `pullToRefresh` in dependency array causes infinite re-renders because `pullToRefresh` is not memoized
**Fix:** Use a ref to store `pullToRefresh` instead of putting it in the dependency array

```javascript
const pullToRefreshRef = useRef(pullToRefresh)
pullToRefreshRef.current = pullToRefresh

useFocusEffect(
  useCallback(() => {
    if (currentUser?.id && pullToRefreshRef.current) {
      pullToRefreshRef.current(currentUser?.id)
    }
  }, [currentUser?.id])
)
```

---

## Project Structure

```
LetsMakeMusic/
├── .claude/                    # Claude Code configuration
│   ├── CLAUDE.md              # This file
│   └── Research/              # Research documentation
├── firebase/
│   ├── functions/             # Cloud Functions (Node 20)
│   │   ├── index.js           # Main exports
│   │   ├── triggers.js        # Firestore triggers
│   │   ├── chat/              # Chat functions
│   │   ├── social-graph/      # Friendships, followers
│   │   ├── profile/           # Profile functions
│   │   ├── media/             # Media upload
│   │   ├── user-reporting/    # Abuse handling
│   │   └── seed/              # Test data seeding
│   └── .firebaserc            # Firebase project config
└── ReactNativeTikTokApp/
    ├── src/
    │   ├── components/        # Reusable components
    │   ├── screens/           # Screen components
    │   ├── config/            # App configuration
    │   │   └── appVersion.js  # Version tracking
    │   └── core/              # Core modules
    │       ├── dopebase/      # UI framework
    │       ├── onboarding/    # Auth flows
    │       ├── socialgraph/   # Feed & friendships
    │       └── media/         # Media handling
    ├── ios/                   # iOS native code
    └── android/               # Android native code
```
