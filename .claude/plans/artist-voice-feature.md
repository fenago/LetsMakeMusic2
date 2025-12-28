# Artist Voice (Synthetic Singers) Implementation Plan

## Overview
Create reusable "Artist Voices" from songs using Suno's Generate Persona API. Users can save a voice they like and reuse it for future songs.

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### Tasks
1. ✅ Add `generatePersona()` to `sunoApi.js`
2. ✅ Add `checkArtistVoiceEligibility()` helper
3. ✅ Create `artistVoiceService.js` with Firebase CRUD
4. ✅ Update `services/index.js` exports
5. ✅ Add translations for Artist Voice UI

### Firebase Schema
```
users/{userId}/artistVoices/{voiceId}
├── personaId: string          // Suno's persona ID (key for reuse)
├── name: string               // User-given name
├── description: string        // User-given description
├── sourceSong: {
│   ├── songId: string         // Firebase song ID
│   ├── sunoId: string         // Suno audio ID
│   ├── taskId: string         // Suno task ID
│   ├── title: string          // Original song title
│   └── imageUrl: string       // Song artwork
│ }
├── usageCount: number         // Times used in new songs
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

---

## Phase 2: UI Integration

### Tasks
1. ⬜ Add "Create Artist Voice" action to song options
   - Show in FullPlayer menu
   - Show in Feed song actions
   - Show in Library/My Songs
   - Include expiration countdown (X days left)

2. ⬜ Create Voice Picker component
   - Used in CreateSongScreen
   - Used in CustomModeScreen
   - Dropdown/modal to select saved voice

3. ⬜ Add "My Voices" section
   - In Profile > Settings area
   - Or in Library tab
   - List all saved Artist Voices

### Key UX Elements
- **Expiration Badge**: "Create Artist Voice (8 days left)"
- **Disabled State**: Grey out after 15 days
- **Voice Card**: Shows source song artwork + voice name
- **Usage Counter**: "Used in 5 songs"

---

## Phase 3: Enhanced Features (Future)

### Tasks
1. ⬜ Voice management (rename, delete)
2. ⬜ Voice usage history
3. ⬜ Voice preview/sample playback
4. ⬜ Band voice sharing (optional)
5. ⬜ Popular voices discovery

---

## API Reference

### Create Voice (Suno API)
```javascript
POST /api/v1/generate/generate-persona
{
  taskId: "original-task-id",
  audioId: "suno-audio-id",
  name: "My Pop Voice",
  description: "Upbeat female vocals"
}
// Returns: { personaId: "xxx" }
```

### Use Voice in Song
```javascript
generateSongCustom({
  title: "New Song",
  style: "pop rock",
  lyrics: "...",
  personaId: "saved-persona-id"  // <-- Apply the voice
})
```

### Constraints
- Song must be Model V4+
- Song must be complete
- Song must be <15 days old (Suno file retention)
- One persona per audioId (can't create twice)
- personaId only works with customMode: true

---

## Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| `src/services/sunoApi.js` | ✅ Modified | 1 |
| `src/services/artistVoiceService.js` | ✅ Created | 1 |
| `src/services/index.js` | ✅ Modified | 1 |
| `src/translations/en.json` | ✅ Modified | 1 |
| `src/components/VoicePicker/` | Create | 2 |
| `src/screens/MyVoicesScreen/` | Create | 2 |
| FullPlayer song actions | Modify | 2 |
| Feed song actions | Modify | 2 |
| CreateSongScreen | Modify | 2 |

