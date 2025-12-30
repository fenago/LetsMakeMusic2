import React, { memo, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { Heart, MoreHorizontal, Film } from 'lucide-react-native'
import { useLikedSongs } from '../../../contexts/MediaPlayerContext'

/**
 * SongDetailCard - Song list item for favorites/playlists
 *
 * Features:
 * - 60x60 rounded thumbnail
 * - Song name and description/artist
 * - Three dots menu button
 * - Press to play song
 */
const SongDetailCard = ({
  song,
  index,
  onPress,
  onMenuPress,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  // PERFORMANCE FIX: Use useLikedSongs instead of useMediaPlayer
  // This prevents re-renders on every play/pause toggle (caused 30-45s freeze)
  const {
    isLiked: isLikedFn,
    toggleLike,
  } = useLikedSongs()

  // Like loading state (local)
  const [isLikeLoading, setIsLikeLoading] = useState(false)

  // Get like status from shared context
  const isLiked = song?.id ? isLikedFn(song.id) : false

  // Handle like button press - uses shared context
  const handleLikePress = useCallback(async () => {
    if (!song?.id || isLikeLoading) {
      return
    }

    setIsLikeLoading(true)
    try {
      await toggleLike(song)
      // Note: isLiked will update automatically via Firebase subscription in context
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLikeLoading(false)
    }
  }, [song, isLikeLoading, toggleLike])

  const styles = getStyles(isDark)

  const imageUrl = song.imageUrl || song.thumbnailUrl || song.coverUrl

  return (
    <View style={styles.container}>
      {/* Touchable area for playing song - only image and info */}
      <TouchableOpacity
        style={styles.songTouchable}
        onPress={() => onPress?.(song, index)}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Text style={styles.placeholderIcon}>🎵</Text>
            </View>
          )}
          {/* Video badge - show if song has a video */}
          {song.videoUrl && (
            <View style={styles.videoBadge}>
              <Film size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {song.name || song.title || 'Unknown Track'}
          </Text>
          <Text style={styles.description} numberOfLines={1}>
            {song.description || song.artist || 'Unknown Artist'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons - OUTSIDE the song touchable */}
      <View style={styles.actionButtons}>
        {/* Like Button */}
        <TouchableOpacity
          style={styles.likeButton}
          onPress={handleLikePress}
          activeOpacity={0.6}
        >
          <Heart
            size={20}
            color={isLiked ? '#ef4444' : (isDark ? '#737373' : '#a3a3a3')}
            fill={isLiked ? '#ef4444' : 'transparent'}
          />
        </TouchableOpacity>

        {/* Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => onMenuPress?.(song, index)}
          activeOpacity={0.6}
        >
          <MoreHorizontal size={20} color={isDark ? '#737373' : '#a3a3a3'} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%', // w-full
  },
  songTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // gap-x-4
  },
  imageContainer: {
    position: 'relative',
    // No extra margin - gap handles spacing
  },
  image: {
    width: 60, // w-[60px]
    height: 60, // h-[60px]
    borderRadius: 8, // rounded-lg
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(56, 117, 232, 0.9)',
    borderRadius: 3,
    padding: 3,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16, // default text size
    fontWeight: '500', // font-medium
    color: isDark ? '#d4d4d4' : '#262626', // text-typography-800
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: isDark ? '#525252' : '#d4d4d4', // text-typography-300
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default memo(SongDetailCard)
