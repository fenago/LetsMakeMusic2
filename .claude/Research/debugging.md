# LetsMakeMusic App - Debugging & Setup Documentation

## Tech Stack

| Component | Version | Notes |
|-----------|---------|-------|
| React Native | 0.81.1 | With New Architecture (Fabric) enabled |
| Expo SDK | 54 | Managed workflow hybrid |
| Node.js | 20.x | For development and Cloud Functions |
| iOS Target | iOS 26.1 | iPhone 17 Pro Simulator |
| Xcode | 17 | With iOS 26 SDK |
| Firebase | Latest | Firestore, Auth, Storage, Cloud Functions |
| Bundle ID | music.letsmake.app | iOS app identifier |

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| expo-camera | Latest | Camera functionality (CameraView API) |
| expo-image-picker | ~17.0.10 | Photo library access |
| expo-av | Latest | Video playback |
| react-native-screens | 4.19.0 | Navigation screens (upgraded from 4.3.0) |
| react-native-reanimated | 3.17.1 | Animations |
| react-native-gesture-handler | Latest | Touch gestures |

---

## Issues Fixed & Solutions

### 1. Firebase Swift Headers Issue
**Error:** Swift compilation errors in Firebase modules
**Solution:** Clean DerivedData and rebuild with proper header paths

### 2. CocoaPods UTF-8 Encoding
**Error:** Pod install fails with encoding errors
**Solution:** Set environment variables before pod install:
```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

### 3. react-native-screens Build Error (Xcode 17)
**Error:** `no member named 'move' in namespace 'std'` in RNSScreenStackHeaderConfig.mm
**Cause:** react-native-screens 4.3.0 incompatible with Xcode 17/iOS 26
**Solution:** Upgrade to 4.19.0:
```bash
npx expo install react-native-screens@latest
```

### 4. expo-camera API Migration
**Error:** `Cannot read property 'Type' of undefined`
**Cause:** Old `Camera.Constants.Type` API deprecated in new expo-camera
**File:** `src/core/camera/IMCameraModal.js`

**Before (broken):**
```javascript
import { Camera } from 'expo-camera'

const [cameraType, setCameraType] = useState(Camera.Constants.Type.back)
const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off)

<Camera
  type={cameraType}
  flashMode={flashMode}
/>
```

**After (fixed):**
```javascript
import { CameraView } from 'expo-camera'

const [cameraType, setCameraType] = useState('back')
const [flashMode, setFlashMode] = useState(false)

<CameraView
  facing={cameraType}
  enableTorch={flashMode}
  mode="video"
/>
```

### 5. expo-image-picker Missing
**Error:** `Unable to resolve module expo-image-picker`
**Solution:**
```bash
npx expo install expo-image-picker
cd ios && pod install
```

### 6. IMPostCamera Null Check
**Error:** `Cannot read property 'startsWith' of undefined`
**File:** `src/core/camera/IMPostCamera.js`
**Solution:** Add proper null checking:
```javascript
const renderMedia = () => {
  if (!imageSource) {
    return null
  }
  if (imageSource.type?.startsWith('image')) {
    // render image
  }
}
```

### 7. AWS to Firebase API Migration
**Files Changed:**
- `src/core/socialgraph/feed/api/index.js` - Switched to Firebase exports
- `src/core/chat/api/index.js` - Switched to Firebase exports
- `src/core/socialgraph/friendships/api/index.js` - Switched to Firebase exports

**Pattern:**
```javascript
// Using Firebase backend
export { useHomeFeedPosts } from './firebase/useHomeFeedPosts'
// etc.
```

### 8. Onboarding Config Hook Error
**Error:** `useOnboardingConfig is not a function`
**Cause:** Wrong hook being imported
**Solution:** Change from `useOnboardingConfig` to `useConfig` from `../../../../config`

### 9. App Icon Replacement
**Task:** Replace Instamobile logo with LetsMakeMusic logo
**Location:** `ios/Instamobile/Images.xcassets/AppIcon.appiconset/`
**Solution:** Generated all required iOS icon sizes using sips:
```bash
sips -z 180 180 logo.png --out Icon-App-60x60@3x.png
sips -z 120 120 logo.png --out Icon-App-60x60@2x.png
# ... etc for all sizes
```

---

## Common Commands

### Start Metro Bundler (with cache clear)
```bash
npm start -- --reset-cache
```

### Pod Install (with UTF-8 fix)
```bash
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

### Build iOS App
```bash
xcodebuild -workspace Instamobile.xcworkspace -scheme Instamobile \
  -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData build
```

### Install on Simulator
```bash
xcrun simctl install "iPhone 17 Pro" path/to/Instamobile.app
xcrun simctl launch "iPhone 17 Pro" music.letsmake.app
```

### Kill Metro and Clear Cache
```bash
pkill -f "node.*metro"
rm -rf node_modules/.cache
npm start -- --reset-cache
```

---

## Firebase Configuration

### Project IDs
| Environment | Project ID |
|-------------|------------|
| Development | development-69cdc |
| Production | production-a9404 |

### Cloud Functions Region
- `us-central1`

---

## File Structure (Key Files Modified)

```
ReactNativeTikTokApp/
├── src/
│   ├── core/
│   │   ├── camera/
│   │   │   ├── IMCameraModal.js      # Updated expo-camera API
│   │   │   └── IMPostCamera.js       # Fixed null checks
│   │   ├── chat/api/index.js         # Firebase exports
│   │   ├── socialgraph/
│   │   │   ├── feed/api/index.js     # Firebase exports
│   │   │   └── friendships/api/index.js # Firebase exports
│   │   └── onboarding/screens/       # Config hook fixes
│   └── config/                        # App configuration
├── ios/
│   └── Instamobile/
│       └── Images.xcassets/
│           └── AppIcon.appiconset/   # Custom app icons
└── package.json                       # Dependencies
```

---

## Troubleshooting Tips

1. **Metro bundler issues:** Always try `npm start -- --reset-cache` first
2. **iOS build failures:** Clean DerivedData and rebuild
3. **Pod install errors:** Use UTF-8 environment variables
4. **Module not found:** Check if package is installed, run `npx expo install <package>`
5. **Xcode version conflicts:** Check package compatibility with your Xcode version
