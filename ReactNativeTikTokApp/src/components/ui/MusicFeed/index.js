import React, { memo, useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native'
// Note: Reanimated entering animations removed to fix refresh crash
// import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { ChevronDown, ChevronUp, Music, Heart, ListMusic, Users, Radio, Search, LayoutGrid, List, Play, Video, Menu, X, ChevronRight, Mic2 } from 'lucide-react-native'

// Brand colors from LetsMake.Music guidelines
const BRAND_COLORS = {
  vibrantTeal: '#1F979E',      // Primary - key actions, active states
  deepMagenta: '#C12D79',      // Secondary - likes, notifications, special CTAs
  richPurple: '#9C27B0',       // Accent
}
import TodaysPicks from '../TodaysPicks'
import SongDetailCard from '../SongDetailCard'
import AlbumCard from '../AlbumCard'
import ArtistCard from '../ArtistCard'
import SongActionMenu from '../SongActionMenu'
import { StoriesTray } from '../../../core/dopebase'
import { FEED_ITEM_HEIGHT } from '../../screens/Feed/FeedItem/styles'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import { prepareSongsForPlaylist } from '../../../utils/audioUtils'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// NEW: Simplified filter tabs for social feed
const FEED_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'video', label: 'Video' },
  { id: 'podcast', label: 'Podcast', comingSoon: true },
  { id: 'radio', label: 'Radio', comingSoon: true },
  { id: 'events', label: 'Events', comingSoon: true },
]

// Menu sections that appear in the slide-out menu
const MENU_SECTIONS = [
  { id: 'todaysPicks', label: "Today's Picks", icon: Music, color: '#3875e8' },
  { id: 'playlist', label: 'Playlist for You', icon: ListMusic, color: '#8b5cf6' },
  { id: 'artists', label: 'Artists', icon: Users, color: '#10b981' },
  { id: 'radio', label: 'Radio for You', icon: Radio, color: '#f59e0b' },
]

// Legacy tabs kept for potential future use
const FILTER_TABS = [
  { id: 0, label: 'All' },
  { id: 1, label: 'Music' },
  { id: 2, label: 'Videos' },
  { id: 3, label: 'Podcast' },
  { id: 4, label: 'Radio' },
  { id: 5, label: 'Events' },
]

/**
 * MusicFeed - EXACT copy of reference home.tsx
 *
 * EVERYTHING scrolls together in ONE ScrollView:
 * - Greeting text (Good Morning John)
 * - Subtitle (Have a nice day!)
 * - Tabs (All, Music, Videos)
 * - Today's Picks carousel
 * - Your favorites section
 * - Playlist for you section
 * - Artists section
 * - Radio for you section
 */
const MusicFeed = ({
  userName = 'John',
  currentUserId = null,
  currentUser = null,
  todaysPicks = [],
  todaysPicksForYou = [],
  todaysPicksFollowing = [],
  favorites = [],
  playlists = [],
  artists = [],
  radioStations = [],
  onViewAllFavorites,
  onViewAllPlaylists,
  onViewAllArtists,
  onViewAllRadio,
  onViewAllTodaysPicks,
  onArtistPress,
  onPlaylistPress,
  onRadioPress,
  onAddToPlaylist,
  onViewArtistProfile,
  onEditSong,
  refreshing = false,
  onRefresh,
  videoFeedComponent, // Existing video feed from HomeScreen
  // NEW: Filter callbacks from HomeScreen to filter the feed
  onFilterChange,
  // Stories props
  groupedStories = [],
  myStories = null,
  onStoryItemPress,
  onAddStoryPress,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { playList } = useMediaPlayer()

  // NEW: Primary states for new layout
  const [menuVisible, setMenuVisible] = useState(false) // Menu modal visibility
  const [activeMenuSection, setActiveMenuSection] = useState(null) // Which menu section is being viewed
  const [feedFilter, setFeedFilter] = useState('all') // 'all', 'music', 'video'

  // Legacy state (kept for menu sections)
  const [activeTab, setActiveTab] = useState(0)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  // Collapsible section states (used in menu sections)
  const [isTodaysPicksExpanded, setIsTodaysPicksExpanded] = useState(true)
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true)
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(true)
  const [isArtistsExpanded, setIsArtistsExpanded] = useState(true)
  const [isRadioExpanded, setIsRadioExpanded] = useState(true)
  const [isSocialFeedExpanded, setIsSocialFeedExpanded] = useState(true)

  // Today's Picks toggle: FOLLOWING vs FOR YOU
  // FOLLOWING = picks from users you follow
  // FOR YOU = algorithmic recommendations from all users
  const [todaysPicksMode, setTodaysPicksMode] = useState('following')

  // Get the active picks list based on mode
  // Falls back to For You if Following is empty
  const activePicks = todaysPicksMode === 'following'
    ? (todaysPicksFollowing.length > 0 ? todaysPicksFollowing : todaysPicksForYou)
    : todaysPicksForYou

  // Toggle handlers using useCallback to prevent re-creation
  const toggleTodaysPicks = useCallback(() => setIsTodaysPicksExpanded(prev => !prev), [])
  const toggleFavorites = useCallback(() => setIsFavoritesExpanded(prev => !prev), [])
  const togglePlaylists = useCallback(() => setIsPlaylistsExpanded(prev => !prev), [])
  const toggleArtists = useCallback(() => setIsArtistsExpanded(prev => !prev), [])
  const toggleRadio = useCallback(() => setIsRadioExpanded(prev => !prev), [])
  const toggleSocialFeed = useCallback(() => setIsSocialFeedExpanded(prev => !prev), [])

  // NEW: Handle feed filter change
  const handleFilterChange = useCallback((filterId) => {
    setFeedFilter(filterId)
    onFilterChange?.(filterId)
  }, [onFilterChange])

  // NEW: Handle menu section selection
  const handleMenuSectionPress = useCallback((sectionId) => {
    setActiveMenuSection(sectionId)
  }, [])

  // NEW: Return to main feed from menu section
  const handleBackToFeed = useCallback(() => {
    setActiveMenuSection(null)
    setMenuVisible(false)
  }, [])

  // Song Action Menu state (renamed to avoid conflict with menu modal)
  const [songMenuVisible, setSongMenuVisible] = useState(false)
  const [selectedSong, setSelectedSong] = useState(null)

  // Handle song action menu press (3-dot menu on songs)
  const handleSongMenuPress = useCallback((song) => {
    console.log('[MusicFeed] handleSongMenuPress:', song?.id, song?.title)
    setSelectedSong(song)
    setSongMenuVisible(true)
  }, [])

  // Close the song action menu
  const handleSongMenuClose = useCallback(() => {
    setSongMenuVisible(false)
    setSelectedSong(null)
  }, [])

  const styles = getStyles(isDark)

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Handle today's pick press - play the song directly
  const handlePickPress = useCallback((item, index) => {
    console.log('[MusicFeed] handlePickPress:', {
      index,
      id: item?.id,
      title: item?.title || item?.label,
      audioUrl: item?.audioUrl?.substring(0, 60),
    })

    if (item?.audioUrl) {
      // Play directly - no prep needed, audioUrl already resolved by HomeFeed
      playList([item], 0)
    } else {
      console.warn('[MusicFeed] No audioUrl for item:', item?.id)
    }
  }, [playList])

  // Handle favorite song press - play the song
  // Uses centralized audioUtils for consistent URL resolution
  const handleFavoriteSongPress = useCallback((song, index) => {
    console.log('[MusicFeed] handleFavoriteSongPress called:', {
      index,
      songId: song?.id,
      songName: song?.name,
    })
    // Use centralized utility for consistent audio URL resolution
    const audioTracks = prepareSongsForPlaylist(favorites)
    console.log('[MusicFeed] Prepared favorites audioTracks count:', audioTracks.length)
    if (audioTracks.length > 0) {
      playList(audioTracks, index)
    } else {
      console.warn('[MusicFeed] No playable tracks found in favorites')
    }
  }, [favorites, playList])

  // Reusable collapsible section header component
  const CollapsibleSectionHeader = ({
    title,
    icon: Icon,
    iconColor,
    isExpanded,
    onToggle,
    onViewAll,
    count,
  }) => (
    <View style={styles.sectionHeader}>
      <TouchableOpacity
        style={styles.sectionTitleRow}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {Icon && (
          <View style={[styles.sectionIcon, { backgroundColor: `${iconColor}20` }]}>
            <Icon size={18} color={iconColor} />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && count > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
        {isExpanded ? (
          <ChevronUp size={20} color={isDark ? '#888' : '#666'} />
        ) : (
          <ChevronDown size={20} color={isDark ? '#888' : '#666'} />
        )}
      </TouchableOpacity>
      {onViewAll && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  // NEW: Primary header for full-screen social feed layout
  // Menu icon (left) | Title "Feed" (center) | Search icon (right)
  const renderPrimaryHeader = () => (
    <View style={[styles.primaryHeaderContainer, { paddingTop: insets.top + 8 }]}>
      {/* Menu button - opens slide-out menu */}
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setMenuVisible(true)}
      >
        <Menu size={24} color={isDark ? '#e5e5e5' : '#171717'} />
      </TouchableOpacity>

      {/* Title with mic icon */}
      <View style={styles.primaryHeaderTitleContainer}>
        <Mic2 size={22} color={BRAND_COLORS.vibrantTeal} strokeWidth={2.5} />
        <Text style={styles.primaryHeaderTitle}>Stage</Text>
      </View>

      {/* Search button */}
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => navigation.navigate('Discover')}
      >
        <Search size={24} color={isDark ? '#e5e5e5' : '#171717'} />
      </TouchableOpacity>
    </View>
  )

  // NEW: Filter tabs for social feed (All/Music/Video/Podcast/Radio/Events)
  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterTabsContainer}
      style={styles.filterTabsWrapper}
    >
      {FEED_FILTER_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.filterTab,
            feedFilter === tab.id && styles.filterTabActive,
          ]}
          onPress={() => handleFilterChange(tab.id)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.filterTabText,
            feedFilter === tab.id && styles.filterTabTextActive,
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  // NEW: Coming Soon placeholder for Podcast/Radio/Events tabs
  const renderComingSoon = () => (
    <View style={styles.comingSoonContainer}>
      <Text style={styles.comingSoonTitle}>Coming Soon</Text>
      <Text style={styles.comingSoonSubtitle}>
        {feedFilter === 'podcast' && 'Podcasts are on the way!'}
        {feedFilter === 'radio' && 'Radio stations coming soon!'}
        {feedFilter === 'events' && 'Live events feature in development!'}
      </Text>
    </View>
  )

  // NEW: Menu Modal with sections (Today's Picks, Playlist, Artists, Radio)
  const renderMenuModal = () => (
    <Modal
      visible={menuVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setMenuVisible(false)}
    >
      <View style={styles.menuModalOverlay}>
        <View style={[styles.menuModalContent, { paddingTop: insets.top }]}>
          {/* Menu Header */}
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>
              {activeMenuSection ? MENU_SECTIONS.find(s => s.id === activeMenuSection)?.label : 'Explore'}
            </Text>
            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => {
                setActiveMenuSection(null)
                setMenuVisible(false)
              }}
            >
              <X size={24} color={isDark ? '#e5e5e5' : '#171717'} />
            </TouchableOpacity>
          </View>

          {/* Menu Content */}
          {!activeMenuSection ? (
            // Main menu - show section buttons
            <ScrollView style={styles.menuList}>
              {MENU_SECTIONS.map((section) => {
                const IconComponent = section.icon
                return (
                  <TouchableOpacity
                    key={section.id}
                    style={styles.menuItem}
                    onPress={() => handleMenuSectionPress(section.id)}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: `${section.color}20` }]}>
                      <IconComponent size={22} color={section.color} />
                    </View>
                    <Text style={styles.menuItemText}>{section.label}</Text>
                    <ChevronRight size={20} color={isDark ? '#666' : '#999'} />
                  </TouchableOpacity>
                )
              })}

              {/* Back to Feed button */}
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemBackToFeed]}
                onPress={handleBackToFeed}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#ec489920' }]}>
                  <Play size={22} color="#ec4899" />
                </View>
                <Text style={styles.menuItemText}>Back to Feed</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // Section content
            <ScrollView style={styles.menuSectionContent}>
              {/* Back button */}
              <TouchableOpacity
                style={styles.menuBackButton}
                onPress={() => setActiveMenuSection(null)}
              >
                <ChevronDown size={20} color={isDark ? '#888' : '#666'} style={{ transform: [{ rotate: '90deg' }] }} />
                <Text style={styles.menuBackText}>Back to Menu</Text>
              </TouchableOpacity>

              {/* Section-specific content */}
              {activeMenuSection === 'todaysPicks' && activePicks.length > 0 && (
                <TodaysPicks
                  picks={activePicks}
                  onPickPress={handlePickPress}
                />
              )}

              {activeMenuSection === 'playlist' && playlists.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {playlists.map((playlist, index) => (
                    <View key={playlist.id ?? index}>
                      <AlbumCard
                        album={playlist}
                        onPress={onPlaylistPress}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}

              {activeMenuSection === 'artists' && artists.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.artistsScroll}
                >
                  {artists.map((artist, index) => (
                    <View key={artist.id ?? index}>
                      <ArtistCard
                        artist={artist}
                        onPress={onArtistPress}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}

              {activeMenuSection === 'radio' && radioStations.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {radioStations.map((radio, index) => (
                    <View key={radio.id ?? index}>
                      <AlbumCard
                        album={radio}
                        onPress={onRadioPress}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )

  // Handle story item press - navigate to full story viewer
  const handleStoryItemPress = useCallback((item, index) => {
    console.log('[MusicFeed] Story pressed:', item?.firstName, 'index:', index)
    onStoryItemPress?.(item, index)
  }, [onStoryItemPress])

  // Handle add story press - navigate to story creation
  const handleAddStoryPress = useCallback((shouldOpenCamera, refIndex, index) => {
    console.log('[MusicFeed] Add story pressed, openCamera:', shouldOpenCamera)
    onAddStoryPress?.(shouldOpenCamera)
  }, [onAddStoryPress])

  // Render StoriesTray if there are stories
  const renderStoriesTray = () => {
    // Only show stories on All or Music tabs
    if (feedFilter !== 'all' && feedFilter !== 'music') {
      return null
    }

    // Only render if we have stories OR if we want to show the add story button
    const hasStories = groupedStories && groupedStories.length > 0
    const showAddStory = currentUser != null

    if (!hasStories && !showAddStory) {
      return null
    }

    return (
      <View style={styles.storiesTrayContainer}>
        <StoriesTray
          data={groupedStories || []}
          user={currentUser}
          displayUserItem={showAddStory}
          userItemShouldOpenCamera={true}
          userStoryTitle="Add"
          onStoryItemPress={handleStoryItemPress}
          onUserItemPress={handleAddStoryPress}
          displayVerifiedBadge={false}
        />
      </View>
    )
  }

  // NEW: Main layout - Full-screen social feed with header and filter tabs
  // This is now the PRIMARY view (inverted from before)
  const isComingSoonTab = ['podcast', 'radio', 'events'].includes(feedFilter)

  return (
    <View style={styles.container}>
      {renderPrimaryHeader()}
      {renderFilterTabs()}
      {renderStoriesTray()}

      {/* Main content area */}
      {isComingSoonTab ? (
        renderComingSoon()
      ) : videoFeedComponent ? (
        <View style={styles.fullScreenFeedContainer}>
          {videoFeedComponent}
        </View>
      ) : (
        <View style={styles.emptyFeedContainer}>
          <Text style={styles.emptyFeedText}>No posts yet</Text>
          <Text style={styles.emptyFeedSubtext}>Follow some artists to see their posts here!</Text>
        </View>
      )}

      {/* Menu Modal */}
      {renderMenuModal()}

      {/* Song Action Menu */}
      <SongActionMenu
        visible={songMenuVisible}
        song={selectedSong}
        currentUserId={currentUserId}
        onClose={handleSongMenuClose}
        onAddToPlaylist={onAddToPlaylist}
        onViewArtist={onViewArtistProfile}
        onEditSong={onEditSong}
      />
    </View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff', // bg-background-0
    justifyContent: 'flex-start', // Ensure children stack from top
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20, // pb-5
  },
  // Header container for greeting + tabs (used in both layouts)
  headerContainer: {
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff', // bg-background-0
  },
  // Title bar with actions (like Library header)
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#e5e5e5' : '#171717',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
  },
  // Greeting: size="3xl" font-medium text-typography-900 px-4 pt-4 pb-1
  greeting: {
    fontSize: 30, // 3xl
    fontWeight: '500', // font-medium
    color: isDark ? '#e5e5e5' : '#171717', // text-typography-900
    paddingHorizontal: 16, // px-4
    paddingTop: 16, // pt-4
    paddingBottom: 4, // pb-1
  },
  // Subtitle: size="xl" text-typography-600 px-4
  subGreeting: {
    fontSize: 20, // xl
    color: isDark ? '#737373' : '#525252', // text-typography-600
    paddingHorizontal: 16, // px-4
  },
  // Tabs: my-6
  tabsWrapper: {
    marginVertical: 24, // my-6
  },
  // Tabs content: gap-2.5 px-4
  tabsContainer: {
    paddingHorizontal: 16, // px-4
    gap: 10, // gap-2.5
  },
  // Tab: bg-background-50 rounded-full px-5 py-2
  tab: {
    paddingHorizontal: 20, // px-5
    paddingVertical: 8, // py-2
    borderRadius: 9999, // rounded-full
    backgroundColor: isDark ? '#262626' : '#f5f5f5', // bg-background-50
  },
  // Active tab: bg-[#2126A2]
  activeTab: {
    backgroundColor: '#2126A2',
  },
  // Tab text: size="lg" text-typography-950
  tabText: {
    fontSize: 18, // lg
    color: isDark ? '#fafafa' : '#0a0a0a', // text-typography-950
  },
  activeTabText: {
    color: '#ffffff',
  },
  // Section container
  section: {
    marginBottom: 8,
  },
  // Section header with collapsible toggle
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionTitleRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevronButton: {
    padding: 4,
    marginLeft: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: isDark ? '#fafafa' : '#0a0a0a',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
    backgroundColor: isDark ? '#262626' : '#f5f5f5',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#888' : '#666',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isDark ? '#262626' : '#f5f5f5',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3875e8',
  },
  // SubHeading style from reference (kept for backwards compat)
  subHeading: {
    fontSize: 24, // size="2xl"
    fontWeight: '500', // font-medium
    color: isDark ? '#fafafa' : '#0a0a0a', // text-typography-950
    paddingHorizontal: 16, // px-4
    marginTop: 24, // mt-6
    marginBottom: 12, // mb-3
  },
  // Favorites: VStack space="md" px-4
  favoritesList: {
    paddingHorizontal: 16, // px-4
    gap: 12, // space-md
  },
  // Horizontal scroll: gap-2.5 px-4
  horizontalScroll: {
    paddingHorizontal: 16, // px-4
    gap: 10, // gap-2.5
  },
  // Artists: gap-2 px-4
  artistsScroll: {
    paddingHorizontal: 16, // px-4
    gap: 8, // gap-2
  },
  // Video feed container - takes full remaining space
  videoFeedContainer: {
    flex: 1,
    minHeight: 500, // Ensure video feed has space
  },
  // Social Feed container (embedded in ScrollView)
  // Uses shared FEED_ITEM_HEIGHT for responsive sizing across all screen sizes
  socialFeedContainer: {
    height: FEED_ITEM_HEIGHT,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
  },
  // Mode toggle (FOLLOWING | FOR YOU)
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#262626' : '#f5f5f5',
    borderRadius: 20,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  modeButtonActive: {
    backgroundColor: '#3875e8',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#888' : '#666',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },

  // ========== NEW: Primary Header Styles ==========
  primaryHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    // NOTE: paddingTop is applied dynamically via inline style with insets.top
  },
  primaryHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F979E', // Brand vibrant teal for "Stage" title
  },

  // ========== NEW: Filter Tabs Styles ==========
  filterTabsWrapper: {
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
  },
  filterTabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? '#262626' : '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#1F979E', // Brand vibrant teal
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#a3a3a3' : '#525252',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },

  // ========== NEW: Coming Soon Styles ==========
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#e5e5e5' : '#171717',
    marginBottom: 12,
  },
  comingSoonSubtitle: {
    fontSize: 16,
    color: isDark ? '#737373' : '#525252',
    textAlign: 'center',
  },

  // ========== NEW: Menu Modal Styles ==========
  menuModalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
  },
  menuModalContent: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    marginLeft: '15%',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#262626' : '#e5e5e5',
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: isDark ? '#e5e5e5' : '#171717',
  },
  menuCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
  },
  menuList: {
    flex: 1,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: isDark ? '#e5e5e5' : '#171717',
  },
  menuItemBackToFeed: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#262626' : '#e5e5e5',
    paddingTop: 20,
  },
  menuSectionContent: {
    flex: 1,
    paddingTop: 12,
  },
  menuBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  menuBackText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3875e8',
  },

  // ========== Stories Tray Styles ==========
  storiesTrayContainer: {
    height: 100,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1a1a1a' : '#f0f0f0',
  },

  // ========== NEW: Full-Screen Feed Styles ==========
  fullScreenFeedContainer: {
    flex: 1,
  },
  emptyFeedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyFeedText: {
    fontSize: 22,
    fontWeight: '600',
    color: isDark ? '#e5e5e5' : '#171717',
    marginBottom: 8,
  },
  emptyFeedSubtext: {
    fontSize: 15,
    color: isDark ? '#737373' : '#525252',
    textAlign: 'center',
  },
})

export default memo(MusicFeed)
