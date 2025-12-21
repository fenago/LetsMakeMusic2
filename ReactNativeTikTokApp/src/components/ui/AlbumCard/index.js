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
 * AlbumCard - Playlist/Album card for horizontal scroll
 *
 * Features:
 * - 132x132 rounded album artwork
 * - Album/playlist name
 * - Description/artist below
 */
const AlbumCard = ({
  album,
  onPress,
  size = 132,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const styles = getStyles(isDark, size)

  const imageUrl = album.imageUrl || album.thumbnailUrl || album.coverUrl

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(album)}
      activeOpacity={0.8}
    >
      {/* Album Art */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Text style={styles.placeholderIcon}>🎶</Text>
        </View>
      )}

      {/* Info */}
      <Text style={styles.name} numberOfLines={1}>
        {album.name || album.title || 'Unknown Album'}
      </Text>
      <Text style={styles.description} numberOfLines={1}>
        {album.description || album.artist || ''}
      </Text>
    </TouchableOpacity>
  )
}

const getStyles = (isDark, size) => StyleSheet.create({
  container: {
    width: size,
    // No marginRight - gap in parent handles spacing
  },
  image: {
    width: size, // w-[132px]
    height: size, // h-[132px]
    borderRadius: 8, // rounded-lg
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: size * 0.35,
  },
  name: {
    fontSize: 18, // size="lg"
    fontWeight: '500', // font-medium
    color: isDark ? '#d4d4d4' : '#262626', // text-typography-800
    marginTop: 10, // mt-2.5
  },
  description: {
    fontSize: 14, // default
    color: isDark ? '#525252' : '#d4d4d4', // text-typography-300
    maxWidth: size - 4, // max-w-[132px] pr-1
  },
})

export default memo(AlbumCard)
