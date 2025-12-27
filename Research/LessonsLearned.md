# Lessons Learned

## Issue: Song Cover Upload Shows Gray Image Despite Successful Database Save

### Symptoms
- Upload appeared to succeed (database verification showed correct URL)
- Feed displayed gray/empty circle instead of the new image
- Restarting app didn't help

### Root Causes Found

#### 1. React Keys Missing Dynamic Data
**Problem:** React keys like `key={item.id}` don't trigger re-renders when `imageUrl` changes.

**Fix:** Include dynamic fields in keys:
```javascript
// Before (broken)
key={item.id ?? index}

// After (working)
key={`${item.id}-${item.imageUrl || index}`}
```

**Files affected:**
- `src/components/ui/TodaysPicks/index.js`
- `src/components/ui/MusicFeed/index.js`

#### 2. Firebase Storage URLs Without Access Tokens Return 403
**Problem:** Manually constructed URLs like:
```
https://firebasestorage.googleapis.com/v0/b/BUCKET/o/FILE?alt=media
```
Return **403 Forbidden** without an access token.

**Diagnosis:** Use `curl -sI <url>` to check HTTP status codes.

#### 3. getSignedUrl() Requires IAM Permissions
**Problem:** Using `file.getSignedUrl()` in Cloud Functions throws:
```
Error: Permission 'iam.serviceAccounts.signBlob' denied on resource
name: 'SigningError'
```

**Fix:** Use `makePublic()` instead - no special IAM permissions needed:
```javascript
// Make file publicly readable
const file = bucket.file(imageFileName)
await file.makePublic()

// Construct the public URL
const publicUrl = `https://storage.googleapis.com/${storageBucket}/${imageFileName}`
```

### Debugging Techniques That Helped

1. **Database Verification Alert** - Show what's actually in Firestore after update
2. **Direct Firestore REST API queries** - Verify data outside the app
3. **curl -sI** - Check if URLs are actually accessible
4. **Firebase Functions logs** - `firebase functions:log --project PROJECT_ID`

### Key Takeaways

| Issue | Quick Fix |
|-------|-----------|
| Image not updating after save | Add dynamic data to React key |
| Storage URL returns 403 | Use `makePublic()` not manual URL |
| SigningError in Cloud Functions | Use `makePublic()` not `getSignedUrl()` |
| Need to verify DB state | Add temporary Alert showing fetched data |

### Files Modified

- `firebase/functions/media/upload.js` - Changed to use `makePublic()` for public URLs
- `src/components/ui/TodaysPicks/index.js` - Fixed React key
- `src/components/ui/MusicFeed/index.js` - Fixed React key

## React Native Switch Component Issues

**Problem:** React Native's built-in `Switch` component can render off-screen or get cut off on the right edge, especially in flex layouts with `justifyContent: 'space-between'`.

**Solution:** Replace `Switch` with custom toggle buttons using `TouchableOpacity`:

```javascript
<View style={styles.optionRow}>
  <Text style={styles.optionTitle}>Setting Label</Text>
  <View style={[styles.toggleButton, isEnabled && styles.toggleButtonActive]}>
    <Text style={[styles.toggleButtonText, isEnabled && styles.toggleButtonTextActive]}>
      {isEnabled ? 'ON' : 'OFF'}
    </Text>
  </View>
</View>
```

**Styles:**
```javascript
optionRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
toggleButton: {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: isDark ? '#333' : '#e0e0e0',
  minWidth: 50,
  alignItems: 'center',
},
toggleButtonActive: {
  backgroundColor: '#3875e8',
},
toggleButtonText: {
  fontSize: 13,
  fontWeight: '600',
  color: isDark ? '#888' : '#666',
},
toggleButtonTextActive: {
  color: '#ffffff',
},
```

**Why:** Custom toggle buttons have predictable sizing and won't have native rendering quirks.

## Firebase Deploy Targets Wrong Project

**Problem:** Running `firebase deploy --only functions:myFunction` deploys to the wrong Firebase project (e.g., `instaflutter-85faa` instead of `letsmakemusic-4e0fe`).

**Cause:** Firebase CLI uses:
1. The default project in `.firebaserc` (may not exist or be wrong)
2. A global Firebase alias or last-used project

**Fix:** Always explicitly specify the project:
```bash
firebase deploy --only functions:myFunction --project letsmakemusic-4e0fe
```

**Verification:** Check `.firebaserc` in your project root to see configured projects.

## Function Return Format Mismatch

**Problem:** Service function returns `true` but caller expects `{ success: true }`.

```javascript
// Service returns:
return true

// Caller expects:
if (result.success) { ... }  // result.success is undefined!
```

**Fix:** Ensure consistent return format:
```javascript
// Service function
return { success: true }

// On error
return { success: false, error: error.message }
```

**Always check:** When calling a service function, verify what it actually returns.
