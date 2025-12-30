import React, { memo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native'
import { usePlaybackPosition, useMediaPlayer } from '../../../../contexts/MediaPlayerContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

/**
 * ProgressSection - Subscribes to position via usePlaybackPosition
 * This isolates position updates to this component only, preventing full parent re-renders
 * CRITICAL: This component is updated every ~100ms, must be highly optimized
 */
const ProgressSection = ({ isDark }) => {
  const { position, duration } = usePlaybackPosition()
  const { seek, formatTime } = useMediaPlayer()
  const progress = duration > 0 ? (position / duration) * 100 : 0

  const handleProgressPress = useCallback((event) => {
    const { locationX } = event.nativeEvent
    const progressBarWidth = SCREEN_WIDTH - 80
    const percentage = Math.max(0, Math.min(100, (locationX / progressBarWidth) * 100))
    const newPosition = (percentage / 100) * duration
    seek(newPosition)
  }, [duration, seek])

  return (
    <View style={styles.progressSection}>
      <Pressable
        style={styles.progressBarContainer}
        onPress={handleProgressPress}
        hitSlop={15}
      >
        <View style={[styles.progressBarBackground, isDark && styles.progressBarBackgroundDark]}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        <View
          style={[
            styles.progressKnob,
            { left: `${progress}%` },
          ]}
        />
      </Pressable>
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, isDark && styles.timeTextDark]}>{formatTime(position)}</Text>
        <Text style={[styles.timeText, isDark && styles.timeTextDark]}>{formatTime(duration)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  progressSection: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  progressBarContainer: {
    height: 20,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarBackgroundDark: {
    backgroundColor: '#333333',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3875e8',
  },
  progressKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3875e8',
    marginLeft: -6,
    top: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#7e7e7e',
  },
  timeTextDark: {
    color: '#c5c5c5',
  },
})

export default memo(ProgressSection)
