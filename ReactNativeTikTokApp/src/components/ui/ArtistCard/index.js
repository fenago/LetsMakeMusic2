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
 * ArtistCard - Artist profile card for horizontal scroll
 *
 * Features:
 * - 96x96 circular artist image
 * - Centered artist name below
 */
const ArtistCard = ({
  artist,
  onPress,
  size = 96,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const styles = getStyles(isDark, size)

  const imageUrl = artist.imageUrl || artist.profilePictureURL || artist.thumbnailUrl

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(artist)}
      activeOpacity={0.8}
    >
      {/* Artist Image */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Text style={styles.placeholderIcon}>👤</Text>
        </View>
      )}

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {artist.name || artist.firstName || 'Unknown Artist'}
      </Text>
    </TouchableOpacity>
  )
}

const getStyles = (isDark, size) => StyleSheet.create({
  container: {
    alignItems: 'center', // items-center
    // No width constraint - let content size naturally
    // No marginRight - gap in parent handles spacing (gap-2 = 8px)
  },
  image: {
    width: size, // w-[96px]
    height: size, // h-[96px]
    borderRadius: size / 2, // rounded-full
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: size * 0.4,
  },
  name: {
    fontSize: 14, // size="sm"
    fontWeight: '500', // font-medium
    color: isDark ? '#d4d4d4' : '#262626', // text-typography-800
    textAlign: 'center',
    marginTop: 12, // space-md
  },
})

export default memo(ArtistCard)
