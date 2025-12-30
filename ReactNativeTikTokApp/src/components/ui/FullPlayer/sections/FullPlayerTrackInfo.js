import React, { memo } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { Heart, Download, ListPlus } from 'lucide-react-native'

/**
 * FullPlayerTrackInfo - Track title, artist, and action buttons
 * Memoized to prevent unnecessary re-renders
 */
const FullPlayerTrackInfo = ({
  title,
  artist,
  isLiked,
  isLikeLoading,
  isDownloading,
  onLikePress,
  onDownloadPress,
  onAddToPlaylistPress,
  isDark,
}) => {
  return (
    <View style={styles.trackInfo}>
      <View style={styles.trackInfoText}>
        <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.artist, isDark && styles.artistDark]} numberOfLines={1}>
          {artist}
        </Text>
      </View>
      <View style={styles.trackActionButtons}>
        <TouchableOpacity
          style={styles.trackActionButton}
          onPress={onAddToPlaylistPress}
          activeOpacity={0.6}
        >
          <ListPlus size={24} color="#888888" strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.trackActionButton, isDownloading && styles.downloadingButton]}
          onPress={onDownloadPress}
          disabled={isDownloading}
          activeOpacity={0.6}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#888888" />
          ) : (
            <Download size={24} color="#888888" strokeWidth={2} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.trackActionButton, isLikeLoading && styles.likeLoading]}
          onPress={onLikePress}
          disabled={isLikeLoading}
          activeOpacity={0.6}
        >
          <Heart
            size={24}
            color={isLiked ? '#ef4444' : '#888888'}
            fill={isLiked ? '#ef4444' : 'transparent'}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  trackInfoText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#151723',
    marginBottom: 4,
  },
  titleDark: {
    color: '#ffffff',
  },
  artist: {
    fontSize: 16,
    color: '#7e7e7e',
  },
  artistDark: {
    color: '#c5c5c5',
  },
  trackActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeLoading: {
    opacity: 0.5,
  },
  downloadingButton: {
    opacity: 0.6,
  },
})

export default memo(FullPlayerTrackInfo)
