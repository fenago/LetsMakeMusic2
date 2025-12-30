import React, { memo } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
} from 'lucide-react-native'
import { usePlaybackState } from '../../../../contexts/MediaPlayerContext'

/**
 * FullPlayerControls - Playback control buttons
 *
 * PERFORMANCE: This component subscribes to usePlaybackState() which is a
 * separate context just for playback state. This prevents the parent FullPlayer
 * from re-rendering on every play/pause toggle - only this component re-renders.
 */
const FullPlayerControls = ({
  isShuffleOn,
  repeatMode,
  hasNext,
  onPlayPrevious,
  onPlayNext,
  onToggleShuffle,
  onToggleRepeat,
  isDark,
}) => {
  // PERFORMANCE: Subscribe to dedicated playback state context
  // This only causes this component to re-render, not FullPlayer
  const { isPlaying, togglePlayPause } = usePlaybackState()
  return (
    <View style={styles.controls}>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onToggleShuffle}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Shuffle
          size={24}
          color={isShuffleOn ? '#3875e8' : (isDark ? '#888888' : '#666666')}
          strokeWidth={2}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.controlButton}
        onPress={onPlayPrevious}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <SkipBack
          size={32}
          color={isDark ? '#ffffff' : '#151723'}
          fill={isDark ? '#ffffff' : '#151723'}
          strokeWidth={0}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.playPauseButton}
        onPress={togglePlayPause}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        {isPlaying ? (
          <Pause size={32} color="#ffffff" fill="#ffffff" strokeWidth={0} />
        ) : (
          <Play size={32} color="#ffffff" fill="#ffffff" strokeWidth={0} style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, !hasNext && styles.disabledButton]}
        onPress={onPlayNext}
        disabled={!hasNext}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <SkipForward
          size={32}
          color={isDark ? '#ffffff' : '#151723'}
          fill={isDark ? '#ffffff' : '#151723'}
          strokeWidth={0}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onToggleRepeat}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        {repeatMode === 'one' ? (
          <Repeat1 size={24} color="#3875e8" strokeWidth={2} />
        ) : (
          <Repeat
            size={24}
            color={repeatMode === 'all' ? '#3875e8' : (isDark ? '#888888' : '#666666')}
            strokeWidth={2}
          />
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3875e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
})

export default memo(FullPlayerControls)
