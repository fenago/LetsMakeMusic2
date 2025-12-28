import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { Plus, Music } from 'lucide-react-native'

/**
 * PlaylistCard - User playlist card for horizontal scroll
 *
 * Features:
 * - 132x132 rounded cover artwork
 * - Playlist name with song count
 * - Special "Create New" variant
 */
const PlaylistCard = ({
  playlist,
  onPress,
  isCreateNew = false,
  size = 132,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const styles = getStyles(isDark, size)

  // Create New Playlist card variant
  if (isCreateNew) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.image, styles.createNewImage]}>
          <Plus
            size={size * 0.35}
            color={isDark ? '#a3a3a3' : '#525252'}
            strokeWidth={1.5}
          />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          Create New
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          Add a playlist
        </Text>
      </TouchableOpacity>
    )
  }

  const imageUrl = playlist?.coverImageUrl
  const songCount = playlist?.songCount || playlist?.songs?.length || 0

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(playlist)}
      activeOpacity={0.8}
    >
      {/* Cover Art */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Music
            size={size * 0.35}
            color={isDark ? '#a3a3a3' : '#737373'}
            strokeWidth={1.5}
          />
        </View>
      )}

      {/* Info */}
      <Text style={styles.name} numberOfLines={1}>
        {playlist?.name || 'Untitled Playlist'}
      </Text>
      <Text style={styles.description} numberOfLines={1}>
        {songCount} {songCount === 1 ? 'song' : 'songs'}
      </Text>
    </TouchableOpacity>
  )
}

const getStyles = (isDark, size) =>
  StyleSheet.create({
    container: {
      width: size,
    },
    image: {
      width: size,
      height: size,
      borderRadius: 8,
      backgroundColor: isDark ? '#333333' : '#e0e0e0',
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    createNewImage: {
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: isDark ? '#525252' : '#a3a3a3',
      backgroundColor: 'transparent',
    },
    name: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#d4d4d4' : '#262626',
      marginTop: 10,
    },
    description: {
      fontSize: 13,
      color: isDark ? '#737373' : '#a3a3a3',
      marginTop: 2,
    },
  })

export default memo(PlaylistCard)
