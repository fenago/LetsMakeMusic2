import React, { memo } from 'react'
import { View, Image, StyleSheet, Dimensions } from 'react-native'
import { Music } from 'lucide-react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const ARTWORK_SIZE = SCREEN_WIDTH - 80

/**
 * FullPlayerArtwork - Memoized artwork component
 * Prevents re-renders when other parts of FullPlayer update
 */
const FullPlayerArtwork = ({ thumbnailUrl, isDark }) => {
  return (
    <View style={styles.artworkContainer}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.artwork} />
      ) : (
        <View style={[styles.artwork, styles.placeholderArtwork, isDark && styles.placeholderArtworkDark]}>
          <Music size={100} color={isDark ? '#666666' : '#cccccc'} strokeWidth={1.5} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  artworkContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  placeholderArtwork: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderArtworkDark: {
    backgroundColor: '#333333',
  },
})

export default memo(FullPlayerArtwork)
