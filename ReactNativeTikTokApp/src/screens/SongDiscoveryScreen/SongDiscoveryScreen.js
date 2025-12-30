import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image as ExpoImage } from 'expo-image'
import {
  ThumbsUp,
  ThumbsDown,
  Play,
  Pause,
  RefreshCw,
  Undo2,
  Volume2,
  ChevronLeft,
  Music,
  Sparkles,
} from 'lucide-react-native'
import { useCurrentUser } from '../../core/onboarding'
import { useTheme, useTranslations } from '../../core/dopebase'
import { useMediaPlayer } from '../../hooks/useMediaPlayer'
import { useSongSwipes } from '../../hooks/useSongSwipes'
import { subscribeToAllSongs } from '../../services/songsService'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25
const SWIPE_OUT_DURATION = 250
const CARD_WIDTH = SCREEN_WIDTH - 40

/**
 * SongDiscoveryScreen - Tinder-style song discovery experience
 *
 * Shows one song at a time as a card that users can swipe left (pass) or right (like).
 * Songs are filtered to exclude those the user has already swiped on.
 */
const SongDiscoveryScreen = ({ navigation }) => {
  const { theme, appearance } = useTheme()
  const { localized } = useTranslations()
  const insets = useSafeAreaInsets()
  const currentUser = useCurrentUser()
  const userId = currentUser?.id

  const colorSet = theme.colors[appearance]
  const isDark = appearance === 'dark'

  // Songs state
  const [allSongs, setAllSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Animation values
  const position = useRef(new Animated.ValueXY()).current
  const [isAnimating, setIsAnimating] = useState(false)
  const isAnimatingRef = useRef(false)

  // Media player
  const {
    playSong,
    pauseSong,
    currentSong,
    isPlaying,
  } = useMediaPlayer()

  // Song swipes
  const {
    swipedSongIds,
    loading: swipesLoading,
    swipe,
    undo,
    hasSwipedOn,
    canUndo,
    lastSwipedSong,
  } = useSongSwipes(userId)

  // Subscribe to all songs
  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToAllSongs((songs) => {
      setAllSongs(songs)
      setLoading(false)
    }, 30)

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Filter out already swiped songs
  const discoverySongs = useMemo(() => {
    if (swipesLoading || !allSongs.length) return []

    return allSongs.filter(song => {
      const songId = song.id || song.songId
      // Filter out user's own songs and already swiped songs
      return song.authorID !== userId && !hasSwipedOn(songId)
    })
  }, [allSongs, swipedSongIds, userId, hasSwipedOn, swipesLoading])

  // Current card song
  const currentSongCard = discoverySongs[currentIndex]
  const nextSongCard = discoverySongs[currentIndex + 1]

  // Calculate rotation based on swipe position
  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-15deg', '0deg', '15deg'],
  })

  // Opacity for like/pass overlays
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // Card scale for stacked effect
  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  })

  // Swipe handlers
  const handleSwipeComplete = useCallback(async (direction) => {
    if (!currentSongCard) return

    const songId = currentSongCard.id || currentSongCard.songId
    const action = direction === 'right' ? 'like' : 'pass'

    try {
      await swipe(songId, action)
    } catch (error) {
      console.error('[SongDiscovery] Swipe error:', error)
    }

    // Move to next card
    setCurrentIndex(prev => prev + 1)
    position.setValue({ x: 0, y: 0 })
    setIsAnimating(false)
    isAnimatingRef.current = false
  }, [currentSongCard, swipe, position])

  const animateSwipe = useCallback((direction) => {
    setIsAnimating(true)
    isAnimatingRef.current = true
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5

    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => {
      handleSwipeComplete(direction)
    })
  }, [position, handleSwipeComplete])

  // Pan responder for swipe gestures
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimatingRef.current,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return !isAnimatingRef.current && Math.abs(gesture.dx) > 5
      },
      onPanResponderMove: (_, gesture) => {
        if (!isAnimatingRef.current) {
          position.setValue({ x: gesture.dx, y: gesture.dy * 0.2 })
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isAnimatingRef.current) return

        if (gesture.dx > SWIPE_THRESHOLD) {
          animateSwipe('right')
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          animateSwipe('left')
        } else {
          // Reset position
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start()
        }
      },
    })
  , [position, animateSwipe])

  // Button handlers
  const handleLikePress = () => {
    if (!isAnimating && currentSongCard) {
      animateSwipe('right')
    }
  }

  const handlePassPress = () => {
    if (!isAnimating && currentSongCard) {
      animateSwipe('left')
    }
  }

  const handleUndo = async () => {
    if (canUndo && currentIndex > 0) {
      await undo()
      setCurrentIndex(prev => Math.max(0, prev - 1))
    }
  }

  const handlePlayPress = () => {
    if (!currentSongCard) return

    const isCurrentlyPlaying = currentSong?.id === currentSongCard.id && isPlaying

    if (isCurrentlyPlaying) {
      pauseSong()
    } else {
      playSong(currentSongCard)
    }
  }

  const handleRefresh = () => {
    setCurrentIndex(0)
  }

  const renderCard = (song, isTop = false) => {
    if (!song) return null

    const imageUrl = song.imageUrl || song.image_url || song.coverUrl
    const title = song.title || 'Untitled Song'
    const artist = song.artist || song.creatorName || 'Unknown Artist'
    const style = song.style || song.genre || ''
    const isCurrentSongPlaying = currentSong?.id === song.id && isPlaying

    const cardStyle = isTop
      ? [
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate: rotation },
            ],
          },
        ]
      : [
          styles.card,
          styles.cardBehind,
          { transform: [{ scale: nextCardScale }] },
        ]

    return (
      <Animated.View
        key={song.id || song.songId}
        style={cardStyle}
        {...(isTop ? panResponder.panHandlers : {})}
      >
        {/* Card Image */}
        <View style={styles.cardImageContainer}>
          {imageUrl ? (
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.cardImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: colorSet.grey3 }]}>
              <Music size={80} color={colorSet.secondaryText} />
            </View>
          )}

          {/* Like/Pass Overlays */}
          {isTop && (
            <>
              <Animated.View style={[styles.likeOverlay, { opacity: likeOpacity }]}>
                <View style={styles.overlayBadge}>
                  <ThumbsUp size={48} color="#22c55e" strokeWidth={3} />
                  <Text style={styles.overlayText}>LIKE</Text>
                </View>
              </Animated.View>
              <Animated.View style={[styles.passOverlay, { opacity: passOpacity }]}>
                <View style={styles.overlayBadge}>
                  <ThumbsDown size={48} color="#ef4444" strokeWidth={3} />
                  <Text style={[styles.overlayText, { color: '#ef4444' }]}>PASS</Text>
                </View>
              </Animated.View>
            </>
          )}

          {/* Play button overlay */}
          {isTop && (
            <TouchableOpacity
              style={styles.playButtonOverlay}
              onPress={handlePlayPress}
              activeOpacity={0.8}
            >
              <View style={styles.playButton}>
                {isCurrentSongPlaying ? (
                  <Pause size={28} color="#fff" fill="#fff" />
                ) : (
                  <Play size={28} color="#fff" fill="#fff" />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.songTitle, { color: colorSet.primaryText }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.artistName, { color: colorSet.secondaryText }]} numberOfLines={1}>
            {artist}
          </Text>
          {style && (
            <View style={styles.styleTag}>
              <Sparkles size={14} color="#8b5cf6" />
              <Text style={styles.styleText}>{style}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Sparkles size={64} color={colorSet.secondaryText} />
      <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
        You've discovered all songs!
      </Text>
      <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
        Check back later for new music to explore
      </Text>
      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: colorSet.primaryForeground }]}
        onPress={handleRefresh}
      >
        <RefreshCw size={20} color="#fff" />
        <Text style={styles.refreshButtonText}>Start Over</Text>
      </TouchableOpacity>
    </View>
  )

  if (loading || swipesLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colorSet.primaryBackground, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={28} color={colorSet.primaryText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colorSet.primaryText }]}>Discover</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
          <Text style={[styles.loadingText, { color: colorSet.secondaryText }]}>
            Loading songs...
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colorSet.primaryBackground, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colorSet.primaryText }]}>Discover</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.counter, { color: colorSet.secondaryText }]}>
            {discoverySongs.length > 0 ? `${currentIndex + 1}/${discoverySongs.length}` : ''}
          </Text>
        </View>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {discoverySongs.length === 0 || currentIndex >= discoverySongs.length ? (
          renderEmptyState()
        ) : (
          <>
            {/* Render next card first (behind) */}
            {nextSongCard && renderCard(nextSongCard, false)}
            {/* Render current card on top */}
            {currentSongCard && renderCard(currentSongCard, true)}
          </>
        )}
      </View>

      {/* Action Buttons */}
      {currentSongCard && (
        <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 20 }]}>
          {/* Undo Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.undoButton, !canUndo && styles.buttonDisabled]}
            onPress={handleUndo}
            disabled={!canUndo}
          >
            <Undo2 size={24} color={canUndo ? '#888' : '#ccc'} />
          </TouchableOpacity>

          {/* Pass Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.passActionButton]}
            onPress={handlePassPress}
            disabled={isAnimating}
          >
            <ThumbsDown size={32} color="#ef4444" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Like Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.likeActionButton]}
            onPress={handleLikePress}
            disabled={isAnimating}
          >
            <ThumbsUp size={32} color="#22c55e" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Sound Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.soundButton]}
            onPress={handlePlayPress}
          >
            <Volume2 size={24} color={colorSet.secondaryText} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerSpacer: {
    width: 60,
  },
  counter: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  cardBehind: {
    top: 10,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 16,
  },
  overlayText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#22c55e',
    marginTop: 8,
  },
  playButtonOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: 20,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 16,
    marginBottom: 12,
  },
  styleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  styleText: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    gap: 16,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  undoButton: {
    width: 48,
    height: 48,
    backgroundColor: '#f5f5f5',
  },
  passActionButton: {
    width: 64,
    height: 64,
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  likeActionButton: {
    width: 64,
    height: 64,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  soundButton: {
    width: 48,
    height: 48,
    backgroundColor: '#f5f5f5',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default SongDiscoveryScreen
