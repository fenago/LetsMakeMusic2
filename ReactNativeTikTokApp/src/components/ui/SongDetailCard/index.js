import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native'

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

  const styles = getStyles(isDark)

  const imageUrl = song.imageUrl || song.thumbnailUrl || song.coverUrl

  return (
    <TouchableOpacity
      style={styles.container}
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

      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => onMenuPress?.(song, index)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.menuIcon}>⋯</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%', // w-full
    gap: 16, // gap-x-4
  },
  imageContainer: {
    // No extra margin - gap handles spacing
  },
  image: {
    width: 60, // w-[60px]
    height: 60, // h-[60px]
    borderRadius: 8, // rounded-lg
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
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
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: isDark ? '#737373' : '#a3a3a3', // text-background-500
  },
})

export default memo(SongDetailCard)
