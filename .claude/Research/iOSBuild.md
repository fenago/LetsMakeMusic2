# iOS Build Process - LetsMakeMusic

## Quick Reference

| Action | Command |
|--------|---------|
| Start Metro | `cd ReactNativeTikTokApp && npx react-native start --reset-cache` |
| Build iOS | `cd ReactNativeTikTokApp/ios && xcodebuild -workspace Instamobile.xcworkspace -scheme Instamobile -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 17 Pro" build` |
| Install App | `xcrun simctl install booted "/Users/ernestolee/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/Instamobile.app"` |
| Launch App | `xcrun simctl launch booted music.letsmake.app` |
| Kill App | `xcrun simctl terminate booted music.letsmake.app` |

---

## App Information

| Property | Value |
|----------|-------|
| Bundle Identifier | `music.letsmake.app` |
| App Name | Instamobile (display: LetsMakeMusic) |
| Workspace | `Instamobile.xcworkspace` |
| Scheme | `Instamobile` |
| Build Products Path | `/Users/ernestolee/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/Instamobile.app` |

---

## Available Simulators

Check available simulators:
```bash
xcrun simctl list devices available | grep -E "iPhone|iPad"
```

**Known Working Simulators:**
- iPhone 17 Pro (iOS 26.1)
- iPhone 17 Pro Max (iOS 26.1)

**NOT Available (older Xcode versions):**
- iPhone 16 Pro (doesn't exist in current Xcode)
- iPhone 15 Pro (may not be available)

---

## Step-by-Step Processes

### 1. FRESH START (Cold Start)

Use this when starting from scratch or after a reboot.

```bash
# Step 1: Boot the simulator
xcrun simctl boot "iPhone 17 Pro" 2>/dev/null || echo "Already booted"

# Step 2: Open Simulator app (optional - for visual)
open -a Simulator

# Step 3: Start Metro bundler (in background)
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp
npx react-native start --reset-cache &

# Step 4: Wait for Metro to be ready (check http://localhost:8081)
sleep 10

# Step 5: Build the iOS app
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios
xcodebuild -workspace Instamobile.xcworkspace \
  -scheme Instamobile \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro" \
  build

# Step 6: Install the app
xcrun simctl install booted "/Users/ernestolee/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/Instamobile.app"

# Step 7: Launch the app
xcrun simctl launch booted music.letsmake.app
```

### 2. QUICK RESTART (App Already Built)

Use this when the app is already built and you just want to restart it.

```bash
# Kill the running app
xcrun simctl terminate booted music.letsmake.app

# Re-launch the app
xcrun simctl launch booted music.letsmake.app
```

### 3. REBUILD (Code Changes)

Use this after making JavaScript/TypeScript changes.

```bash
# If only JS changes - just reload in simulator
# Press Cmd+R in simulator, or shake device

# If native code changes - rebuild:
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios

xcodebuild -workspace Instamobile.xcworkspace \
  -scheme Instamobile \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro" \
  build

# Re-install and launch
xcrun simctl install booted "/Users/ernestolee/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/Instamobile.app"
xcrun simctl launch booted music.letsmake.app
```

### 4. CLEAN BUILD (When Things Go Wrong)

Use this when builds fail or behave unexpectedly.

```bash
# Step 1: Kill all Metro bundlers
pkill -f "react-native start" 2>/dev/null
pkill -f "metro" 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null

# Step 2: Clean Xcode build
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios
xcodebuild clean -workspace Instamobile.xcworkspace -scheme Instamobile

# Step 3: Clear DerivedData (nuclear option)
rm -rf ~/Library/Developer/Xcode/DerivedData/Instamobile-*

# Step 4: Clear Metro cache
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp
rm -rf node_modules/.cache
watchman watch-del-all 2>/dev/null

# Step 5: Reinstall pods
cd ios
pod install

# Step 6: Start fresh (follow FRESH START process)
```

### 5. FULL CLEANUP (Stop Everything)

Use this to completely stop all build processes.

```bash
# Kill Metro bundler
pkill -f "react-native start" 2>/dev/null
pkill -f "metro" 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null

# Kill any running xcodebuild processes
pkill -f "xcodebuild" 2>/dev/null

# Kill the app on simulator
xcrun simctl terminate booted music.letsmake.app 2>/dev/null

# Optionally shutdown simulator
xcrun simctl shutdown all
```

---

## Troubleshooting

### Error: "Unable to find device with identifier iPhone 16 Pro"
**Cause:** Device doesn't exist in current Xcode/simulator version.
**Solution:** Use `iPhone 17 Pro` instead. Check available devices with:
```bash
xcrun simctl list devices available | grep iPhone
```

### Error: "Could not find 'bundler' (2.7.1)"
**Cause:** Ruby bundler version mismatch.
**Solution:** Skip `npx react-native run-ios` and use direct xcodebuild:
```bash
xcodebuild -workspace Instamobile.xcworkspace -scheme Instamobile ...
```

### Error: "FBSOpenApplicationServiceErrorDomain, code=4"
**Cause:** Wrong bundle identifier used in launch command.
**Solution:** Use correct bundle ID: `music.letsmake.app` (not `io.instamobile.VideoSharingApp`)

### Metro bundler port 8081 in use
```bash
lsof -ti:8081 | xargs kill -9
```

### App won't install - "device not found"
```bash
# Check which simulators are booted
xcrun simctl list devices | grep Booted

# Boot a simulator if none running
xcrun simctl boot "iPhone 17 Pro"
```

### Build succeeds but app crashes on launch
1. Check Metro is running: `curl http://localhost:8081/status`
2. Check simulator logs: `xcrun simctl spawn booted log show --predicate 'processImagePath contains "Instamobile"' --last 5m`

---

## File Locations

| Item | Path |
|------|------|
| Project Root | `/Users/ernestolee/ClaudeProjects/LetsMakeMusic` |
| React Native App | `/Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp` |
| iOS Workspace | `/Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios/Instamobile.xcworkspace` |
| Podfile | `/Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios/Podfile` |
| Info.plist | `/Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios/Instamobile/Info.plist` |
| Build Output | `/Users/ernestolee/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/` |
| JS Bundle | `/Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios/main.jsbundle` |

---

## Build Configuration

### Debug vs Release
- **Debug:** Uses Metro bundler for hot reload, slower but allows live development
- **Release:** Bundles JS into app, faster runtime but no hot reload

### Pod Install Required After:
- Adding new native dependencies (`yarn add` packages with native code)
- Modifying Podfile
- Updating React Native version
- Switching between architectures (Old/New Architecture)

```bash
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp/ios
pod install
```

---

## One-Liner Commands

### Start Everything (assumes simulator booted)
```bash
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic/ReactNativeTikTokApp && npx react-native start --reset-cache & sleep 10 && cd ios && xcodebuild -workspace Instamobile.xcworkspace -scheme Instamobile -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 17 Pro" build && xcrun simctl install booted ~/Library/Developer/Xcode/DerivedData/Instamobile-dffqmgyswerbogefhcpmxgcpnhba/Build/Products/Debug-iphonesimulator/Instamobile.app && xcrun simctl launch booted music.letsmake.app
```

### Stop Everything
```bash
pkill -f "react-native start"; pkill -f "metro"; pkill -f "xcodebuild"; xcrun simctl terminate booted music.letsmake.app 2>/dev/null; lsof -ti:8081 | xargs kill -9 2>/dev/null
```

### Quick Relaunch
```bash
xcrun simctl terminate booted music.letsmake.app; xcrun simctl launch booted music.letsmake.app
```

---

## Notes

1. **Build takes 3-5 minutes** for a full build (209 targets including Firebase, gRPC, etc.)
2. **Incremental builds** are much faster (~30 seconds) if only a few files changed
3. **Metro bundler** must be running for the app to load JavaScript
4. **Simulator must be booted** before install/launch commands work
5. **Use `xcodebuild` directly** instead of `npx react-native run-ios` to avoid Ruby/bundler issues
