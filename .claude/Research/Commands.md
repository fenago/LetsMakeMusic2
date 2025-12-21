# LetsMakeMusic - Command Reference

## iOS Build & Run

### Start Metro Bundler
```bash
cd ReactNativeTikTokApp && npx react-native start --reset-cache
```

### Build iOS App
Use xcodebuild directly (NOT `npx react-native run-ios` - avoids Ruby/bundler issues):
```bash
cd ReactNativeTikTokApp/ios && xcodebuild -workspace Instamobile.xcworkspace -scheme Instamobile -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 17 Pro" build
```

### Install App on Simulator
```bash
DEVICE_ID="454906BA-3B99-4E20-AA68-09A5DD7BDC22"
xcrun simctl install "$DEVICE_ID" "/Users/ernestolee/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/Instamobile.app"
```

### Launch/Terminate App
```bash
DEVICE_ID="454906BA-3B99-4E20-AA68-09A5DD7BDC22"

# Launch
xcrun simctl launch "$DEVICE_ID" music.letsmake.app

# Terminate
xcrun simctl terminate "$DEVICE_ID" music.letsmake.app

# Quick relaunch (for JS changes)
xcrun simctl terminate "$DEVICE_ID" music.letsmake.app && xcrun simctl launch "$DEVICE_ID" music.letsmake.app
```

### Kill Metro Bundler
```bash
pkill -f "react-native start"; lsof -ti:8081 | xargs kill -9 2>/dev/null
```

### Stop Everything
```bash
DEVICE_ID="454906BA-3B99-4E20-AA68-09A5DD7BDC22"
pkill -f "react-native start"; pkill -f "metro"; pkill -f "xcodebuild"; xcrun simctl terminate "$DEVICE_ID" music.letsmake.app 2>/dev/null; lsof -ti:8081 | xargs kill -9 2>/dev/null
```

---

## Firebase Commands

### Deploy Functions
```bash
cd firebase/functions && npm run deploy
```

### Start Emulators
```bash
cd firebase && firebase emulators:start
```

### View Function Logs
```bash
cd firebase/functions && npm run logs
```

---

## App Version Verification

To verify cache invalidation after changes:

1. Update `BUILD_NUMBER` in `src/config/appVersion.js`
2. Relaunch app:
   ```bash
   DEVICE_ID="454906BA-3B99-4E20-AA68-09A5DD7BDC22"
   xcrun simctl terminate "$DEVICE_ID" music.letsmake.app && xcrun simctl launch "$DEVICE_ID" music.letsmake.app
   ```
3. Check version on Profile screen

**Version format:** `YYYYMMDD.N` where N is daily counter

---

## Build Notes

- **Always use `iPhone 17 Pro`** (iPhone 16 Pro doesn't exist in current Xcode)
- **Metro must be running** for the app to load JavaScript
- **Full build:** 3-5 minutes
- **Incremental build:** ~30 seconds
