import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const MINI_PLAYER_HEIGHT = 72
const TAB_BAR_HEIGHT = 49 // Standard iOS tab bar height

/**
 * MiniPlayer - Floating card at bottom of screen for audio playback
 *
 * Features:
 * - Shows current track thumbnail, title, artist
 * - Play/pause button
 * - Progress bar at bottom
 * - Tap to expand to full player
 * - Rounded card design matching reference app
 * - Only visible when audio is playing (NOT for video)
 */
const MiniPlayer = ({ tabBarHeight = TAB_BAR_HEIGHT }) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const {
    mediaType,
    isPlaying,
    currentMedia,
    position,
    duration,
    isMiniPlayerVisible,
    isFullPlayerVisible,
    togglePlayPause,
    showFullPlayer,
    dismissPlayer,
  } = useMediaPlayer()

  // Only show for audio playback AND when full player is NOT visible
  if (!isMiniPlayerVisible || isFullPlayerVisible || mediaType !== 'audio' || !currentMedia) {
    return null
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0
  const thumbnailUrl = currentMedia.thumbnailUrl || currentMedia.imageUrl || currentMedia.coverUrl || currentMedia.profilePictureURL

  const styles = getStyles(isDark, tabBarHeight)

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        onPress={showFullPlayer}
        activeOpacity={0.95}
      >
        <View style={styles.content}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {thumbnailUrl ? (
              <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                <Text style={styles.placeholderIcon}>🎵</Text>
              </View>
            )}
          </View>

          {/* Track info */}
          <View style={styles.trackInfo}>
            <Text style={styles.title} numberOfLines={1}>
              {currentMedia.title || currentMedia.label || currentMedia.name || 'Unknown Track'}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentMedia.artist || currentMedia.subLabel || currentMedia.description || currentMedia.author?.firstName || 'Unknown Artist'}
            </Text>
          </View>

          {/* Controls - using separate touchables to prevent event bubbling */}
          <View style={styles.controls}>
            {/* Play/Pause button */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => {
                console.log('=== MINIPLAYER BUTTON PRESSED ===')
                console.log('isPlaying state:', isPlaying)
                togglePlayPause()
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.playButtonCircle}>
                <Text style={styles.playButtonText}>
                  {isPlaying ? '⏸' : '▶️'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={(e) => {
                e.stopPropagation()
                dismissPlayer()
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar at bottom */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </TouchableOpacity>
    </View>
  )
}

const getStyles = (isDark, tabBarHeight) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: tabBarHeight + 8,
    left: 16, // mx-4
    right: 16, // mx-4
    zIndex: 100,
  },
  card: {
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: isDark ? '#262626' : '#f5f5f5', // bg-background-50
    borderRadius: 8, // rounded-lg
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12, // ml-3
    marginRight: 8, // mr-2
    paddingTop: 12, // pt-3
    gap: 12, // space-md
  },
  thumbnailContainer: {
    // No extra margin - gap handles spacing
  },
  thumbnail: {
    width: 48, // h-12 w-12
    height: 48,
    borderRadius: 8, // rounded-lg (implicit from Image)
    backgroundColor: isDark ? '#404040' : '#e0e0e0',
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16, // default
    fontWeight: '500', // font-medium
    color: isDark ? '#d4d4d4' : '#262626', // text-typography-800
    marginBottom: 2,
  },
  artist: {
    fontSize: 14,
    color: isDark ? '#525252' : '#d4d4d4', // text-typography-300
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    marginRight: 8,
  },
  playButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#fafafa' : '#0a0a0a', // bg-typography-950 (inverted for button)
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 16,
    color: isDark ? '#0a0a0a' : '#fafafa', // Inverted text color
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: isDark ? '#737373' : '#a3a3a3',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2, // h-0.5
    backgroundColor: isDark ? '#404040' : '#e5e5e5', // Progress track bg
  },
  progressBar: {
    height: '100%',
    backgroundColor: isDark ? '#fafafa' : '#0a0a0a', // bg-background-950
  },
})

export default memo(MiniPlayer)
