import React, { useLayoutEffect, useState, useCallback } from 'react'
import { SafeAreaView, ScrollView, Image, View, Text, TouchableOpacity, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Video } from 'expo-av'
import { RefreshControl } from 'react-native'
import { Heart, Film, ChevronDown, ChevronUp, Search, Clock, Sparkles, Music, Hash } from 'lucide-react-native'
import { useTheme, ActivityIndicator, EmptyStateView } from '../../../core/dopebase'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import { prepareSongForPlayer } from '../../../utils/audioUtils'
import dynamicStyles from './styles'

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
    // Shared like state from context
    isLiked: isLikedFn,
    toggleLike,
  } = useMediaPlayer()

  const navigation = useNavigation()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const isDark = appearance === 'dark'
  const colorSet = theme.colors[appearance]

  // Filter tab state
  const [activeTab, setActiveTab] = useState('all')

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
      headerStyle: {
        backgroundColor: theme.colors[appearance].primaryBackground,
      },
      headerTintColor: theme.colors[appearance].primaryText,
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
    // Get a random selection of songs for discovery
    const discoverSongs = songs.length > 5
      ? [...songs].sort(() => Math.random() - 0.5).slice(0, 6)
      : songs.slice(0, 6)

    if (discoverSongs.length === 0) return null

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
            {discoverSongs.map((song) => {
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
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