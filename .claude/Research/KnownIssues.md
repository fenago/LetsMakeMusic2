# Known Issues & Fixes

## Profile Screen Infinite Refresh Loop

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

## Suno Audio URLs Expiring

**Symptom:** Songs that played before no longer play

**Cause:** Suno CDN URLs expire after ~2 weeks

**Fix:** Run the migration script to backup audio to Firebase Storage:

```bash
curl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/migrateSongsToCorrectBucketHTTP"
```

See [CloudFunctions.md](CloudFunctions.md) for details.

---

## Ruby/Bundler Issues with react-native run-ios

**Symptom:** `npx react-native run-ios` fails with Ruby errors

**Fix:** Use xcodebuild directly instead:

```bash
cd ReactNativeTikTokApp/ios && xcodebuild -workspace Instamobile.xcworkspace -scheme Instamobile -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 17 Pro" build
```

See [Commands.md](Commands.md) for full build process.
