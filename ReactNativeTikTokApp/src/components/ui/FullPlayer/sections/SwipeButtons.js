import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { ThumbsUp, ThumbsDown, Undo2 } from 'lucide-react-native'

/**
 * SwipeButtons - Like/Pass buttons for song discovery
 *
 * Allows users to swipe (like or pass) on songs to build their
 * music taste profile and get better recommendations.
 */
const SwipeButtons = ({
  songId,
  hasSwipedOn,
  getSwipeAction,
  onLike,
  onPass,
  onUndo,
  canUndo,
  isDark,
}) => {
  const [isLiking, setIsLiking] = useState(false)
  const [isPassing, setIsPassing] = useState(false)
  const [likeScale] = useState(new Animated.Value(1))
  const [passScale] = useState(new Animated.Value(1))

  const currentSwipe = songId ? getSwipeAction(songId) : null
  const alreadySwiped = songId && hasSwipedOn(songId)

  const animateButton = useCallback((scaleValue, callback) => {
    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 0.85,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start()
    callback()
  }, [])

  const handleLike = useCallback(async () => {
    if (isLiking || isPassing) return
    setIsLiking(true)
    animateButton(likeScale, async () => {
      await onLike()
      setIsLiking(false)
    })
  }, [isLiking, isPassing, onLike, animateButton, likeScale])

  const handlePass = useCallback(async () => {
    if (isLiking || isPassing) return
    setIsPassing(true)
    animateButton(passScale, async () => {
      await onPass()
      setIsPassing(false)
    })
  }, [isLiking, isPassing, onPass, animateButton, passScale])

  const handleUndo = useCallback(async () => {
    if (!canUndo) return
    await onUndo()
  }, [canUndo, onUndo])

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, isDark && styles.headerTextDark]}>
          Do you like this song?
        </Text>
        {canUndo && (
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
            activeOpacity={0.7}
          >
            <Undo2 size={18} color="#888888" strokeWidth={2} />
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonsRow}>
        {/* Pass Button */}
        <Animated.View style={{ transform: [{ scale: passScale }] }}>
          <TouchableOpacity
            style={[
              styles.swipeButton,
              styles.passButton,
              isDark && styles.passButtonDark,
              currentSwipe === 'pass' && styles.passButtonActive,
              (isPassing || isLiking) && styles.buttonDisabled,
            ]}
            onPress={handlePass}
            disabled={isPassing || isLiking}
            activeOpacity={0.7}
          >
            <ThumbsDown
              size={28}
              color={currentSwipe === 'pass' ? '#ffffff' : '#ef4444'}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.buttonText,
                styles.passText,
                currentSwipe === 'pass' && styles.buttonTextActive,
              ]}
            >
              Pass
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Like Button */}
        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <TouchableOpacity
            style={[
              styles.swipeButton,
              styles.likeButton,
              isDark && styles.likeButtonDark,
              currentSwipe === 'like' && styles.likeButtonActive,
              (isPassing || isLiking) && styles.buttonDisabled,
            ]}
            onPress={handleLike}
            disabled={isPassing || isLiking}
            activeOpacity={0.7}
          >
            <ThumbsUp
              size={28}
              color={currentSwipe === 'like' ? '#ffffff' : '#22c55e'}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.buttonText,
                styles.likeText,
                currentSwipe === 'like' && styles.buttonTextActive,
              ]}
            >
              Like
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {alreadySwiped && (
        <Text style={styles.swipedText}>
          You {currentSwipe === 'like' ? 'liked' : 'passed on'} this song
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  containerDark: {
    backgroundColor: '#2c2c2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#151723',
  },
  headerTextDark: {
    color: '#ffffff',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  undoText: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  swipeButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },
  passButton: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  passButtonDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  passButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  likeButton: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  likeButtonDark: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  likeButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  passText: {
    color: '#ef4444',
  },
  likeText: {
    color: '#22c55e',
  },
  buttonTextActive: {
    color: '#ffffff',
  },
  swipedText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888888',
    marginTop: 12,
    fontStyle: 'italic',
  },
})

export default memo(SwipeButtons)
