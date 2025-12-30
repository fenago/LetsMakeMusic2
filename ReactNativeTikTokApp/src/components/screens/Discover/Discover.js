import React, { useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react'
import { SafeAreaView, ScrollView, Image, View, Text, TouchableOpacity, TextInput, Animated, PanResponder, Dimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Video } from 'expo-av'
import { RefreshControl } from 'react-native'
import { Heart, Film, ChevronDown, ChevronUp, Search, Clock, Sparkles, Music, Hash, Compass, User, LayoutGrid, Layers, ThumbsUp, ThumbsDown, Play, Pause, Undo2 } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image as ExpoImage } from 'expo-image'

// Brand colors from design guidelines
const BRAND_COLORS = {
  vibrantTeal: '#1F979E',
  deepMagenta: '#C12D79',
  richPurple: '#9C27B0',
}
import { useTheme, ActivityIndicator, EmptyStateView } from '../../../core/dopebase'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import { prepareSongForPlayer } from '../../../utils/audioUtils'
import { useSongSwipes } from '../../../hooks/useSongSwipes'
import { useCurrentUser } from '../../../core/onboarding'
import dynamicStyles from './styles'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25
const SWIPE_OUT_DURATION = 250
const CARD_WIDTH = SCREEN_WIDTH - 40

const GRID_PADDING = 16

// Filter tabs for Discover
const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'videos', label: 'Videos' },
  { id: 'trending', label: 'Trending' },
]

// NOTE: getPlayableUrl is now imported from centralized audioUtils via prepareSongForPlayer

export default function Discover(props) {
  const {
    onCategoryPress,
    onCategoryItemPress,
    feed,
    emptyStateConfig,
    refreshing,
    onRefresh,
    songs = [], // AI-generated songs from Firebase
    songsLoading = false,
  } = props

  const {
    playSong,
    pauseSong,
    currentSong,
    isPlaying,
    // Shared like state from context
    isLiked: isLikedFn,
    toggleLike,
  } = useMediaPlayer()

  const navigation = useNavigation()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const isDark = appearance === 'dark'
  const colorSet = theme.colors[appearance]
  const insets = useSafeAreaInsets()
  const currentUser = useCurrentUser()
  const userId = currentUser?.id

  // View mode: 'grid' or 'swipe' - default to swipe mode
  const [viewMode, setViewMode] = useState('swipe')

  // Filter tab state
  const [activeTab, setActiveTab] = useState('all')

  // Swipe mode state
  const position = useRef(new Animated.ValueXY()).current
  const [isAnimating, setIsAnimating] = useState(false)
  const isAnimatingRef = useRef(false)
  // Track songs being swiped (for immediate UI feedback before async completes)
  const [pendingSwipeIds, setPendingSwipeIds] = useState(new Set())

  // Song swipes hook
  const {
    swipedSongIds,
    loading: swipesLoading,
    swipe,
    undo,
    hasSwipedOn,
    canUndo,
    lastSwipedSong,
  } = useSongSwipes(userId)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState(['pop music', 'jazz', 'electronic', 'chill vibes'])

  // Collapsible section states
  const [isRecentSearchExpanded, setIsRecentSearchExpanded] = useState(true)
  const [isDiscoverNewExpanded, setIsDiscoverNewExpanded] = useState(true)
  const [isSongsExpanded, setIsSongsExpanded] = useState(true)
  const [isTrendingExpanded, setIsTrendingExpanded] = useState(true)

  // Toggle handlers
  const toggleRecentSearch = useCallback(() => setIsRecentSearchExpanded(prev => !prev), [])
  const toggleDiscoverNew = useCallback(() => setIsDiscoverNewExpanded(prev => !prev), [])
  const toggleSongs = useCallback(() => setIsSongsExpanded(prev => !prev), [])
  const toggleTrending = useCallback(() => setIsTrendingExpanded(prev => !prev), [])

  // Memoize random song selection for "Discover Something New" section
  // Only re-shuffles when songs array changes (not on every render)
  const discoverNewSongs = useMemo(() => {
    if (!songs.length) return []
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 6)
  }, [songs])

  // Filter out already swiped songs for swipe mode
  // Also filters out songs currently being swiped (pendingSwipeIds) for immediate UI feedback
  const swipeSongs = useMemo(() => {
    if (swipesLoading || !songs.length) return []
    return songs.filter(song => {
      const songId = song.id || song.songId
      // Filter out: own songs, already swiped, currently being swiped
      return song.authorID !== userId &&
             !hasSwipedOn(songId) &&
             !pendingSwipeIds.has(songId)
    })
  }, [songs, swipedSongIds, userId, hasSwipedOn, swipesLoading, pendingSwipeIds])

  // Current swipe card (show 3 cards for smooth animation)
  // Always read from index 0 - the filter removes swiped songs automatically
  const currentSwipeCard = swipeSongs[0]
  const nextSwipeCard = swipeSongs[1]
  const thirdSwipeCard = swipeSongs[2]

  // Calculate rotation for swipe card
  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-15deg', '0deg', '15deg'],
  })

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

  // Next card scales up from 0.95 to 1.0 as top card swipes away
  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  })

  // Next card moves up from 8px offset to 0 as top card swipes away
  const nextCardTranslateY = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0, 8, 0],
    extrapolate: 'clamp',
  })

  // Third card (furthest back) - slightly smaller and lower
  const thirdCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0.95, 0.90, 0.95],
    extrapolate: 'clamp',
  })

  // Swipe handlers
  const handleSwipeComplete = useCallback(async (direction) => {
    if (!currentSwipeCard) return

    const songId = currentSwipeCard.id || currentSwipeCard.songId
    const action = direction === 'right' ? 'like' : 'pass'

    // Immediately mark as pending for instant UI feedback (removes from swipeSongs)
    setPendingSwipeIds(prev => new Set([...prev, songId]))

    // Reset position and animation state
    position.setValue({ x: 0, y: 0 })
    setIsAnimating(false)
    isAnimatingRef.current = false

    // Save swipe in background
    try {
      await swipe(songId, action, currentSwipeCard)
    } catch (error) {
      console.error('[Discover] Swipe error:', error)
    }
  }, [currentSwipeCard, swipe, position])

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
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start()
        }
      },
    })
  , [position, animateSwipe])

  // Swipe button handlers
  const handleSwipeLike = () => {
    if (!isAnimating && currentSwipeCard) {
      animateSwipe('right')
    }
  }

  const handleSwipePass = () => {
    if (!isAnimating && currentSwipeCard) {
      animateSwipe('left')
    }
  }

  const handleSwipeUndo = async () => {
    if (canUndo && lastSwipedSong) {
      // Remove from pending swipes if it was just swiped
      const lastSongId = lastSwipedSong.id || lastSwipedSong.songId
      setPendingSwipeIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(lastSongId)
        return newSet
      })
      await undo()
    }
  }

  const handleSwipePlayPress = () => {
    if (!currentSwipeCard) return
    const isCurrentlyPlaying = currentSong?.id === currentSwipeCard.id && isPlaying
    if (isCurrentlyPlaying) {
      pauseSong()
    } else {
      const songForPlayer = prepareSongForPlayer(currentSwipeCard)
      if (songForPlayer) playSong(songForPlayer)
    }
  }

  // Reset state when switching to swipe mode
  const toggleViewMode = () => {
    if (viewMode === 'grid') {
      position.setValue({ x: 0, y: 0 })
    }
    setViewMode(prev => prev === 'grid' ? 'swipe' : 'grid')
  }

  // Track which songs are currently being liked (loading state)
  const [likingInProgress, setLikingInProgress] = useState({})

  // Handle like button press - uses shared context
  const handleLikePress = useCallback(async (song) => {
    if (!song?.id || likingInProgress[song?.id]) {
      return
    }

    setLikingInProgress(prev => ({ ...prev, [song.id]: true }))
    try {
      await toggleLike(song)
      // Note: isLiked will update automatically via Firebase subscription in context
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLikingInProgress(prev => ({ ...prev, [song.id]: false }))
    }
  }, [likingInProgress, toggleLike])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    })
  }, [navigation])

  // Collapsible section header component
  const CollapsibleSectionHeader = ({
    title,
    icon: Icon,
    iconColor,
    isExpanded,
    onToggle,
    onViewAll,
    count,
  }) => (
    <View style={discoverStyles.sectionHeader}>
      <TouchableOpacity
        style={discoverStyles.sectionTitleRow}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {Icon && (
          <View style={[discoverStyles.sectionIcon, { backgroundColor: `${iconColor}20` }]}>
            <Icon size={18} color={iconColor} />
          </View>
        )}
        <Text style={[discoverStyles.sectionTitleText, { color: colorSet.primaryText }]}>{title}</Text>
        {count !== undefined && count > 0 && (
          <View style={[discoverStyles.countBadge, { backgroundColor: colorSet.grey3 }]}>
            <Text style={[discoverStyles.countText, { color: colorSet.secondaryText }]}>{count}</Text>
          </View>
        )}
        {isExpanded ? (
          <ChevronUp size={20} color={colorSet.secondaryText} />
        ) : (
          <ChevronDown size={20} color={colorSet.secondaryText} />
        )}
      </TouchableOpacity>
      {onViewAll && (
        <TouchableOpacity style={[discoverStyles.viewAllButton, { backgroundColor: colorSet.grey3 }]} onPress={onViewAll}>
          <Text style={discoverStyles.viewAllText}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  // Render Explore header with icon and view mode toggle
  const renderExploreHeader = () => (
    <View style={exploreHeaderStyles.header}>
      {/* View mode toggle */}
      <TouchableOpacity
        style={[exploreHeaderStyles.viewToggle, { backgroundColor: colorSet.grey3 }]}
        onPress={toggleViewMode}
        activeOpacity={0.7}
      >
        {viewMode === 'grid' ? (
          <Layers size={20} color={BRAND_COLORS.vibrantTeal} />
        ) : (
          <LayoutGrid size={20} color={BRAND_COLORS.vibrantTeal} />
        )}
      </TouchableOpacity>
      <View style={exploreHeaderStyles.titleContainer}>
        <Compass size={22} color={BRAND_COLORS.vibrantTeal} strokeWidth={2.5} />
        <Text style={exploreHeaderStyles.title}>Explore</Text>
      </View>
      <TouchableOpacity
        style={exploreHeaderStyles.profileButton}
        onPress={() => navigation.navigate('Profile')}>
        <User size={22} color={colorSet.primaryText} />
      </TouchableOpacity>
    </View>
  )

  // Render search bar
  const renderSearchBar = () => (
    <View style={discoverStyles.searchContainer}>
      <View style={[discoverStyles.searchInputContainer, { backgroundColor: colorSet.grey3 }]}>
        <Search size={18} color={colorSet.secondaryText} />
        <TextInput
          style={[discoverStyles.searchInput, { color: colorSet.primaryText }]}
          placeholder="Search songs, artists, genres..."
          placeholderTextColor={colorSet.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  )

  // Render filter tabs
  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={discoverStyles.tabsContainer}
    >
      {FILTER_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            discoverStyles.tab,
            activeTab === tab.id
              ? { backgroundColor: colorSet.primaryForeground }
              : { backgroundColor: colorSet.grey3 },
          ]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Text
            style={[
              discoverStyles.tabText,
              activeTab === tab.id ? { color: '#fff' } : { color: colorSet.primaryText },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  // Render recent search section
  const renderRecentSearchSection = () => {
    if (recentSearches.length === 0) return null

    return (
      <View style={discoverStyles.section}>
        <CollapsibleSectionHeader
          title="Recent Searches"
          icon={Clock}
          iconColor="#3875e8"
          isExpanded={isRecentSearchExpanded}
          onToggle={toggleRecentSearch}
          count={recentSearches.length}
        />
        {isRecentSearchExpanded && (
          <View style={discoverStyles.recentSearchList}>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={[discoverStyles.recentSearchItem, { backgroundColor: colorSet.grey3 }]}
                onPress={() => setSearchQuery(search)}
              >
                <Clock size={14} color={colorSet.secondaryText} />
                <Text style={[discoverStyles.recentSearchText, { color: colorSet.primaryText }]}>
                  {search}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    )
  }

  // Render "Discover Something New" section
  const renderDiscoverNewSection = () => {
    // Use memoized random selection to prevent re-shuffle on every render
    if (discoverNewSongs.length === 0) return null

    return (
      <View style={discoverStyles.section}>
        <CollapsibleSectionHeader
          title="Discover Something New"
          icon={Sparkles}
          iconColor="#f59e0b"
          isExpanded={isDiscoverNewExpanded}
          onToggle={toggleDiscoverNew}
        />
        {isDiscoverNewExpanded && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={discoverStyles.discoverScrollContainer}
          >
            {discoverNewSongs.map((song) => {
              const isLiked = song?.id ? isLikedFn(song.id) : false
              return (
                <TouchableOpacity
                  key={song.id}
                  style={discoverStyles.discoverCard}
                  onPress={() => handleSongPress(song)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: song.imageUrl || 'https://picsum.photos/200/200?random=' + song.id }}
                    style={discoverStyles.discoverImage}
                  />
                  <View style={discoverStyles.discoverOverlay}>
                    <Text style={discoverStyles.discoverTitle} numberOfLines={1}>
                      {song.title || 'Untitled'}
                    </Text>
                    <Text style={discoverStyles.discoverStyle} numberOfLines={1}>
                      {song.style || 'AI Generated'}
                    </Text>
                  </View>
                  {/* Heart icon */}
                  <TouchableOpacity
                    style={discoverStyles.discoverHeart}
                    onPress={() => handleLikePress(song)}
                  >
                    <Heart
                      size={18}
                      color={isLiked ? '#ef4444' : '#fff'}
                      fill={isLiked ? '#ef4444' : 'transparent'}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>
    )
  }

  /**
   * Handle song tap - play the song
   * Uses centralized prepareSongForPlayer from audioUtils for consistent behavior
   */
  const handleSongPress = (song) => {
    console.log('[Discover] handleSongPress called:', { id: song?.id, title: song?.title })
    const songForPlayer = prepareSongForPlayer(song)
    if (songForPlayer && songForPlayer.audioUrl) {
      playSong(songForPlayer)
    } else {
      console.warn('[Discover] No playable URL found for song:', song?.id)
    }
  }

  /**
   * Render the AI Songs section - now with collapsible header
   */
  const renderSongsSection = () => {
    if (songsLoading && songs.length === 0) {
      return (
        <View style={discoverStyles.section}>
          <CollapsibleSectionHeader
            title="AI Generated Songs"
            icon={Music}
            iconColor="#8b5cf6"
            isExpanded={isSongsExpanded}
            onToggle={toggleSongs}
          />
          {isSongsExpanded && (
            <View style={songStyles.loadingContainer}>
              <ActivityIndicator />
            </View>
          )}
        </View>
      )
    }

    if (songs.length === 0) {
      return null // Don't show section if no songs
    }

    return (
      <View style={discoverStyles.section}>
        <CollapsibleSectionHeader
          title="AI Generated Songs"
          icon={Music}
          iconColor="#8b5cf6"
          isExpanded={isSongsExpanded}
          onToggle={toggleSongs}
          count={songs.length}
        />
        {isSongsExpanded && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={songStyles.songsHorizontalScroll}
          >
            {songs.slice(0, 20).map((song) => {
              const isLiked = song?.id ? isLikedFn(song.id) : false
              return (
                <View key={song.id} style={songStyles.songCard}>
                  {/* Song image - tap to play */}
                  <TouchableOpacity
                    onPress={() => handleSongPress(song)}
                    activeOpacity={0.8}
                    style={songStyles.songImageContainer}
                  >
                    <Image
                      source={{ uri: song.imageUrl || 'https://picsum.photos/200/200?random=' + song.id }}
                      style={songStyles.songImage}
                    />
                    {/* Video badge - show if song has a video */}
                    {song.videoUrl && (
                      <View style={songStyles.videoBadge}>
                        <Film size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Song info row with heart button */}
                  <View style={songStyles.songInfo}>
                    <View style={songStyles.songTextContainer}>
                      <Text
                        style={[songStyles.songTitle, { color: theme.colors[appearance].primaryText }]}
                        numberOfLines={1}
                      >
                        {song.title || 'Untitled Song'}
                      </Text>
                      <Text
                        style={[songStyles.songStyle, { color: theme.colors[appearance].secondaryText }]}
                        numberOfLines={1}
                      >
                        {song.style || 'AI Generated'}
                      </Text>
                    </View>

                    {/* Heart button - SEPARATE touchable */}
                    <TouchableOpacity
                      style={songStyles.heartButton}
                      onPress={() => handleLikePress(song)}
                      activeOpacity={0.6}
                    >
                      <Heart
                        size={20}
                        color={isLiked ? '#ef4444' : (isDark ? '#737373' : '#a3a3a3')}
                        fill={isLiked ? '#ef4444' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        )}
      </View>
    )
  }

  const renderContent = () => {
    // Show loading only if both feed and songs are loading
    if (!feed && songsLoading && songs.length === 0) {
      return <ActivityIndicator />
    }

    // Filter songs based on active tab and search query
    const filteredSongs = songs.filter(song => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = song.title?.toLowerCase().includes(query)
        const matchesStyle = song.style?.toLowerCase().includes(query)
        const matchesArtist = song.author?.stageName?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesStyle && !matchesArtist) {
          return false
        }
      }
      // Tab filter
      if (activeTab === 'songs') {
        return !song.videoUrl // Only songs without video
      }
      if (activeTab === 'videos') {
        return !!song.videoUrl // Only songs with video
      }
      // 'all' and 'trending' show everything
      return true
    })

    return (
      <>
        {/* Search bar */}
        {renderSearchBar()}

        {/* Filter tabs */}
        {renderFilterTabs()}

        {/* Recent searches section */}
        {!searchQuery && renderRecentSearchSection()}

        {/* Discover Something New section */}
        {!searchQuery && renderDiscoverNewSection()}

        {/* AI Generated Songs section - shows filtered results */}
        {filteredSongs.length > 0 && (
          <View style={discoverStyles.section}>
            <CollapsibleSectionHeader
              title={searchQuery ? `Results for "${searchQuery}"` : 'AI Generated Songs'}
              icon={Music}
              iconColor="#8b5cf6"
              isExpanded={isSongsExpanded}
              onToggle={toggleSongs}
              count={filteredSongs.length}
            />
            {isSongsExpanded && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={songStyles.songsHorizontalScroll}
              >
                {filteredSongs.slice(0, 20).map((song) => {
                  const isLiked = song?.id ? isLikedFn(song.id) : false
                  return (
                    <View key={song.id} style={songStyles.songCard}>
                      <TouchableOpacity
                        onPress={() => handleSongPress(song)}
                        activeOpacity={0.8}
                        style={songStyles.songImageContainer}
                      >
                        <Image
                          source={{ uri: song.imageUrl || 'https://picsum.photos/200/200?random=' + song.id }}
                          style={songStyles.songImage}
                        />
                        {song.videoUrl && (
                          <View style={songStyles.videoBadge}>
                            <Film size={12} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <View style={songStyles.songInfo}>
                        <View style={songStyles.songTextContainer}>
                          <Text
                            style={[songStyles.songTitle, { color: colorSet.primaryText }]}
                            numberOfLines={1}
                          >
                            {song.title || 'Untitled Song'}
                          </Text>
                          <Text
                            style={[songStyles.songStyle, { color: colorSet.secondaryText }]}
                            numberOfLines={1}
                          >
                            {song.style || 'AI Generated'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={songStyles.heartButton}
                          onPress={() => handleLikePress(song)}
                          activeOpacity={0.6}
                        >
                          <Heart
                            size={20}
                            color={isLiked ? '#ef4444' : colorSet.secondaryText}
                            fill={isLiked ? '#ef4444' : 'transparent'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Hashtag categories from feed */}
        {feed && feed.map((category, index) => renderVideoCategory(category, index))}

        {/* Empty state */}
        {(!feed || feed.length === 0) && songs.length === 0 && (
          <EmptyStateView emptyStateConfig={emptyStateConfig} />
        )}

        {/* Bottom spacing for mini player */}
        <View style={{ height: 120 }} />
      </>
    )
  }

  // Render swipe card for swipe mode
  // cardPosition: 'top' | 'middle' | 'back'
  const renderSwipeCard = (song, cardPosition = 'top') => {
    if (!song) return null

    const imageUrl = song.imageUrl || song.image_url || song.coverUrl
    const title = song.title || 'Untitled Song'
    const artist = song.author?.stageName || song.author?.firstName || song.artist || 'AI Generated'
    const style = song.style || song.genre || ''
    const isTop = cardPosition === 'top'
    const isCurrentSongPlaying = currentSong?.id === song.id && isPlaying

    // Build card style based on position in stack
    let cardStyle
    if (cardPosition === 'top') {
      cardStyle = [
        swipeStyles.card,
        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate: rotation },
          ],
          zIndex: 3,
        },
      ]
    } else if (cardPosition === 'middle') {
      cardStyle = [
        swipeStyles.card,
        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
        {
          transform: [
            { scale: nextCardScale },
            { translateY: nextCardTranslateY },
          ],
          zIndex: 2,
        },
      ]
    } else {
      // 'back' - third card
      cardStyle = [
        swipeStyles.card,
        { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
        {
          transform: [
            { scale: thirdCardScale },
            { translateY: 16 },
          ],
          zIndex: 1,
          opacity: 0.7,
        },
      ]
    }

    return (
      <Animated.View
        key={song.id || song.songId}
        style={cardStyle}
        {...(isTop ? panResponder.panHandlers : {})}
      >
        {/* Card Image */}
        <View style={swipeStyles.cardImageContainer}>
          {imageUrl ? (
            <ExpoImage
              source={{ uri: imageUrl }}
              style={swipeStyles.cardImage}
              contentFit="cover"
            />
          ) : (
            <View style={[swipeStyles.cardImagePlaceholder, { backgroundColor: colorSet.grey3 }]}>
              <Music size={80} color={colorSet.secondaryText} />
            </View>
          )}

          {/* Like/Pass Overlays */}
          {isTop && (
            <>
              <Animated.View style={[swipeStyles.likeOverlay, { opacity: likeOpacity }]}>
                <View style={swipeStyles.overlayBadge}>
                  <ThumbsUp size={48} color="#22c55e" strokeWidth={3} />
                  <Text style={swipeStyles.overlayText}>LIKE</Text>
                </View>
              </Animated.View>
              <Animated.View style={[swipeStyles.passOverlay, { opacity: passOpacity }]}>
                <View style={swipeStyles.overlayBadge}>
                  <ThumbsDown size={48} color="#ef4444" strokeWidth={3} />
                  <Text style={[swipeStyles.overlayText, { color: '#ef4444' }]}>PASS</Text>
                </View>
              </Animated.View>
            </>
          )}

          {/* Play button overlay */}
          {isTop && (
            <TouchableOpacity
              style={swipeStyles.playButtonOverlay}
              onPress={handleSwipePlayPress}
              activeOpacity={0.8}
            >
              <View style={swipeStyles.playButton}>
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
        <View style={swipeStyles.cardInfo}>
          <Text style={[swipeStyles.songTitle, { color: colorSet.primaryText }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[swipeStyles.artistName, { color: colorSet.secondaryText }]} numberOfLines={1}>
            {artist}
          </Text>
          {style && (
            <View style={swipeStyles.styleTag}>
              <Sparkles size={14} color="#8b5cf6" />
              <Text style={swipeStyles.styleText}>{style}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    )
  }

  // Render swipe mode empty state
  const renderSwipeEmptyState = () => (
    <View style={swipeStyles.emptyState}>
      <Sparkles size={64} color={colorSet.secondaryText} />
      <Text style={[swipeStyles.emptyTitle, { color: colorSet.primaryText }]}>
        You've discovered all songs!
      </Text>
      <Text style={[swipeStyles.emptySubtitle, { color: colorSet.secondaryText }]}>
        Check back later for new music to explore
      </Text>
      <TouchableOpacity
        style={[swipeStyles.refreshButton, { backgroundColor: colorSet.primaryForeground }]}
        onPress={() => setSwipeIndex(0)}
      >
        <Text style={swipeStyles.refreshButtonText}>Start Over</Text>
      </TouchableOpacity>
    </View>
  )

  // Render swipe view
  const renderSwipeView = () => (
    <View style={swipeStyles.swipeContainer}>
      {/* Counter */}
      <View style={swipeStyles.counterContainer}>
        <Text style={[swipeStyles.counter, { color: colorSet.secondaryText }]}>
          {swipeSongs.length > 0 ? `${swipeSongs.length} songs to discover` : ''}
        </Text>
      </View>

      {/* Card Stack - 3 cards for smooth animation */}
      <View style={swipeStyles.cardContainer}>
        {swipeSongs.length === 0 ? (
          renderSwipeEmptyState()
        ) : (
          <>
            {thirdSwipeCard && renderSwipeCard(thirdSwipeCard, 'back')}
            {nextSwipeCard && renderSwipeCard(nextSwipeCard, 'middle')}
            {currentSwipeCard && renderSwipeCard(currentSwipeCard, 'top')}
          </>
        )}
      </View>

      {/* Action Buttons */}
      {currentSwipeCard && (
        <View style={[swipeStyles.actionButtons, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[swipeStyles.actionButton, swipeStyles.undoButton, !canUndo && swipeStyles.buttonDisabled]}
            onPress={handleSwipeUndo}
            disabled={!canUndo}
          >
            <Undo2 size={24} color={canUndo ? '#888' : '#ccc'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[swipeStyles.actionButton, swipeStyles.passActionButton]}
            onPress={handleSwipePass}
            disabled={isAnimating}
          >
            <ThumbsDown size={32} color="#ef4444" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[swipeStyles.actionButton, swipeStyles.likeActionButton]}
            onPress={handleSwipeLike}
            disabled={isAnimating}
          >
            <ThumbsUp size={32} color="#22c55e" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[swipeStyles.actionButton, swipeStyles.playActionButton]}
            onPress={handleSwipePlayPress}
          >
            {currentSong?.id === currentSwipeCard?.id && isPlaying ? (
              <Pause size={24} color={colorSet.secondaryText} />
            ) : (
              <Play size={24} color={colorSet.secondaryText} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  const renderVideoCategory = (category, index) => (
    <View key={index.toString()} style={styles.categoryPrimary}>
      <View style={styles.categoryMain}>
        <View style={styles.categoryHashtagIcon}>
          <Image style={styles.icon} source={theme.icons.hashtagSymbol} />
        </View>
        <View style={styles.categoryDetail}>
          <Text style={styles.categoryName}>{category.hashtag}</Text>
          <Text style={styles.categoryDescription}>
            {category.description ?? 'Trending'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onCategoryPress(category.videos)}
          style={styles.categoryRightIcon}>
          <Image style={styles.icon} source={theme.icons.rightArrow} />
        </TouchableOpacity>
      </View>
      <View style={styles.categoryVideo}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {category.videos.map((video, key) =>
            video?.postMedia?.length < 1 ||
            !video?.postMedia[0].url ? null : (
              <TouchableOpacity
                key={video.id ?? key}
                onPress={() => onCategoryItemPress(category.videos, key)}>
                <Video
                  style={styles.video}
                  rate={1.0}
                  volume={1.0}
                  shouldPlay={false}
                  useNativeControls={false}
                  source={{ uri: video?.postMedia[0].url }}
                  resizeMode={'cover'}
                />
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {renderExploreHeader()}
      {viewMode === 'swipe' ? (
        renderSwipeView()
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {renderContent()}
        </ScrollView>
      )}
    </View>
  )
}

// Styles for the Discover sections
const discoverStyles = {
  searchContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  tabsContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 12,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3875e8',
  },
  recentSearchList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  recentSearchText: {
    fontSize: 14,
  },
  discoverScrollContainer: {
    paddingHorizontal: GRID_PADDING,
    gap: 12,
  },
  discoverCard: {
    width: 150,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  discoverImage: {
    width: '100%',
    height: '100%',
  },
  discoverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  discoverTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  discoverStyle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  discoverHeart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}

// Styles for the songs section
const songStyles = {
  sectionContainer: {
    paddingVertical: 16,
    paddingHorizontal: GRID_PADDING,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songsHorizontalScroll: {
    paddingRight: GRID_PADDING,
  },
  songCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  songImageContainer: {
    position: 'relative',
  },
  songImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(56, 117, 232, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  songInfo: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  songTextContainer: {
    flex: 1,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  songStyle: {
    fontSize: 12,
    marginTop: 4,
  },
  heartButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
}

// Styles for the Explore header
const exploreHeaderStyles = {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND_COLORS.vibrantTeal,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}

// Styles for the swipe mode
const swipeStyles = {
  swipeContainer: {
    flex: 1,
  },
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  counter: {
    fontSize: 14,
    fontWeight: '500',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  playActionButton: {
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
}