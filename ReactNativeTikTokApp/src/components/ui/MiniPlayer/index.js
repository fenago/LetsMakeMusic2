import React, { memo, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native'
import { Play, Pause, X, Music, Heart } from 'lucide-react-native'
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
    // Shared like state from context
    isLiked: isLikedFn,
    toggleLike,
  } = useMediaPlayer()

  // Like loading state (local)
  const [isLikeLoading, setIsLikeLoading] = useState(false)

  // Get like status from shared context
  const isLiked = currentMedia?.id ? isLikedFn(currentMedia.id) : false

  // Handle like button press - uses shared context
  const handleLikePress = useCallback(async () => {
    if (!currentMedia?.id || isLikeLoading) {
      return
    }

    setIsLikeLoading(true)
    try {
      await toggleLike(currentMedia)
      // Note: isLiked will update automatically via Firebase subscription in context
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLikeLoading(false)
    }
  }, [currentMedia, isLikeLoading, toggleLike])

  // Only show for audio playback AND when full player is NOT visible
  if (!isMiniPlayerVisible || isFullPlayerVisible || mediaType !== 'audio' || !currentMedia) {
    return null
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0
  const thumbnailUrl = currentMedia.thumbnailUrl || currentMedia.imageUrl || currentMedia.coverUrl || currentMedia.profilePictureURL

  const styles = getStyles(isDark, tabBarHeight)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.content}>
          {/* Thumbnail + Track info - touchable to show full player */}
          <TouchableOpacity
            style={styles.trackArea}
            onPress={showFullPlayer}
            activeOpacity={0.7}
          >
            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
              {thumbnailUrl ? (
                <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                  <Music size={24} color={isDark ? '#737373' : '#a3a3a3'} />
                </View>
              )}
            </View>

            {/* Track info */}
            <View style={styles.trackInfo}>
              <Text style={styles.title} numberOfLines={1}>
                {currentMedia.title || currentMedia.label || currentMedia.name || 'Unknown Track'}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {currentMedia.author?.stageName || currentMedia.artist || currentMedia.subLabel || currentMedia.author?.firstName || 'Unknown Artist'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Controls - OUTSIDE the track touchable */}
          <View style={styles.controls}>
            {/* Like button */}
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLikePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isLikeLoading}
            >
              <Heart
                size={22}
                color={isLiked ? '#ef4444' : (isDark ? '#737373' : '#a3a3a3')}
                fill={isLiked ? '#ef4444' : 'transparent'}
              />
            </TouchableOpacity>

            {/* Play/Pause button */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.playButtonCircle}>
                {isPlaying ? (
                  <Pause size={18} color={isDark ? '#0a0a0a' : '#fafafa'} fill={isDark ? '#0a0a0a' : '#fafafa'} />
                ) : (
                  <Play size={18} color={isDark ? '#0a0a0a' : '#fafafa'} fill={isDark ? '#0a0a0a' : '#fafafa'} />
                )}
              </View>
            </TouchableOpacity>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={dismissPlayer}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={isDark ? '#737373' : '#a3a3a3'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar at bottom */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>
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
  },
  trackArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  likeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
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
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
