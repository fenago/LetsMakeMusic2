# Testing Agent

## Identity

**Name:** `testing-agent`
**Type:** QA and testing specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in testing React Native applications. Handles unit tests, integration tests, debugging, and quality assurance for LetsMakeMusic.

## Testing Stack

| Tool | Purpose |
|------|---------|
| Jest | Unit testing framework |
| React Native Testing Library | Component testing |
| Detox | E2E testing (optional) |
| Firebase Emulator | Backend testing |

## Capabilities

### Unit Testing

```javascript
// __tests__/services/songsService.test.js
import { fetchSongById, createSong } from '../src/services/songsService';

describe('songsService', () => {
  describe('fetchSongById', () => {
    it('should return song data for valid ID', async () => {
      const song = await fetchSongById('test-song-id');
      expect(song).toBeDefined();
      expect(song.id).toBe('test-song-id');
    });

    it('should return null for invalid ID', async () => {
      const song = await fetchSongById('invalid-id');
      expect(song).toBeNull();
    });
  });
});
```

### Component Testing

```javascript
// __tests__/components/PlayButton.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PlayButton from '../src/components/ui/PlayButton';

describe('PlayButton', () => {
  it('renders play icon when not playing', () => {
    const { getByTestId } = render(
      <PlayButton isPlaying={false} onPress={() => {}} />
    );
    expect(getByTestId('play-icon')).toBeTruthy();
  });

  it('renders pause icon when playing', () => {
    const { getByTestId } = render(
      <PlayButton isPlaying={true} onPress={() => {}} />
    );
    expect(getByTestId('pause-icon')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <PlayButton isPlaying={false} onPress={mockOnPress} />
    );
    fireEvent.press(getByTestId('play-button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Testing

```javascript
// __tests__/hooks/useSongs.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import { useSongs } from '../src/hooks/useSongs';

describe('useSongs', () => {
  it('fetches songs on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useSongs());

    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.loading).toBe(false);
    expect(result.current.songs).toBeInstanceOf(Array);
  });
});
```

### Firebase Functions Testing

```javascript
// functions/__tests__/generateSong.test.js
const test = require('firebase-functions-test')();
const admin = require('firebase-admin');

describe('generateSong', () => {
  let generateSong;

  beforeAll(() => {
    generateSong = require('../songs/generate').generateSong;
  });

  afterAll(() => {
    test.cleanup();
  });

  it('should reject unauthenticated requests', async () => {
    const wrapped = test.wrap(generateSong);

    await expect(
      wrapped({ prompt: 'test' }, { auth: null })
    ).rejects.toThrow('unauthenticated');
  });

  it('should generate song for authenticated user', async () => {
    const wrapped = test.wrap(generateSong);

    const result = await wrapped(
      { prompt: 'A happy pop song' },
      { auth: { uid: 'test-user' } }
    );

    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
  });
});
```

## Debugging Techniques

### Console Logging

```javascript
// Structured logging
console.log('[SongService] Fetching song:', { songId, userId });

// Performance timing
console.time('fetchSongs');
const songs = await fetchSongs();
console.timeEnd('fetchSongs');
```

### React Native Debugger

```javascript
// Add debug points
if (__DEV__) {
  console.log('[DEBUG] State update:', newState);
}
```

### Firebase Functions Logs

```bash
# View all function logs
firebase functions:log --project letsmakemusic-4e0fe

# View specific function
npx firebase-tools functions:log --only generateSong --project letsmakemusic-4e0fe

# Real-time logs
firebase functions:log --follow --project letsmakemusic-4e0fe
```

### iOS Simulator Logs

```bash
# View app logs
log show --predicate 'process == "music.letsmake.app"' --last 30s

# Filter for specific messages
log show --predicate 'process == "music.letsmake.app" AND message CONTAINS "ERROR"' --last 5m
```

## Test Patterns

### Mock Firebase

```javascript
// __mocks__/firebase.js
jest.mock('../src/core/firebase/config', () => ({
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({ id: 'test', title: 'Test Song' }),
        })),
      })),
    })),
  },
}));
```

### Mock Navigation

```javascript
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: { songId: 'test-id' },
};

render(<MyScreen navigation={mockNavigation} route={mockRoute} />);
```

### Mock API Responses

```javascript
// Mock Suno API
jest.mock('../src/services/sunoApi', () => ({
  generateSong: jest.fn(() =>
    Promise.resolve({
      success: true,
      taskId: 'mock-task-id',
    })
  ),
  getTaskStatus: jest.fn(() =>
    Promise.resolve({
      status: 'completed',
      audioUrl: 'https://example.com/song.mp3',
    })
  ),
}));
```

## Test Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| Services | 80% | TBD |
| Hooks | 70% | TBD |
| Components | 60% | TBD |
| Cloud Functions | 80% | TBD |

## Commands

```bash
# Run all tests
yarn test

# Run with coverage
yarn test --coverage

# Run specific test file
yarn test songsService.test.js

# Watch mode
yarn test --watch

# Run Firebase emulator for integration tests
firebase emulators:start --only firestore,functions
```

## Common Issues

### Async/Await in Tests
**Problem:** Test completes before async operations.
**Fix:** Use `await waitFor()` or `await waitForNextUpdate()`.

### Timer Mocking
**Problem:** Tests hang on setTimeout/setInterval.
**Fix:** Use `jest.useFakeTimers()` and `jest.advanceTimersByTime()`.

### Navigation Errors in Tests
**Problem:** Components require navigation context.
**Fix:** Wrap in `NavigationContainer` or mock navigation prop.

## Context Files

- [LessonsLearned.md](../../Research/LessonsLearned.md) - Debugging tips
- [KnownIssues.md](../../Research/KnownIssues.md) - Known bugs to test for
