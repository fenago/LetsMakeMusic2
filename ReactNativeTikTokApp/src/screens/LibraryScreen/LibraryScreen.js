import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { ChevronDown, ChevronUp, Heart, Pencil, Trash2, Plus, Music, ListMusic, Sparkles, Clock, Play, LayoutGrid, List, Film, Users } from 'lucide-react-native'
import { useTheme, useTranslations } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { subscribeToUserSongs, deleteSong } from '../../services/songsService'
import { useMediaPlayer } from '../../contexts/MediaPlayerContext'
import { useBands } from '../../hooks/useBands'
import { useRecentlyPlayed } from '../../hooks/useRecentlyPlayed'
import { usePlaylists } from '../../hooks/usePlaylists'
import { useRecommendations } from '../../hooks/useRecommendations'
import { BandCard } from '../../components'
import PlaylistCard from '../../components/ui/PlaylistCard'
import EditSongModal from '../../components/ui/EditSongModal'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const HORIZONTAL_ITEM_WIDTH = 160 // Width for horizontal scroll items
const LIST_ITEM_HEIGHT = 64 // Height for list view items

// Filter tabs for the Library
const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'songs', label: 'Songs' },
  { id: 'videos', label: 'Videos' },
]

// Sort options
const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently played' },
  { id: 'added', label: 'Recently added' },
  { id: 'alphabetical', label: 'Alphabetical' },
]

const LibraryScreen = ({ navigation }) => {
  const { theme, appearance } = useTheme()
  const { localized } = useTranslations()
  const insets = useSafeAreaInsets()
  const currentUser = useCurrentUser()
  const { playSong, isLiked: isLikedFn, toggleLike, addToQueue } = useMediaPlayer()

  const [activeTab, setActiveTab] = useState('all')
  const [sortOption, setSortOption] = useState('recent')
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSortMenu, setShowSortMenu] = useState(false)

  // View mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState('grid')

  // Collapsible section states
  const [isRecentlyPlayedExpanded, setIsRecentlyPlayedExpanded] = useState(true)
  const [isRecommendedExpanded, setIsRecommendedExpanded] = useState(true)
  const [isYourSongsExpanded, setIsYourSongsExpanded] = useState(true)
  const [isYourPlaylistsExpanded, setIsYourPlaylistsExpanded] = useState(true)
  const [isLikedSongsExpanded, setIsLikedSongsExpanded] = useState(true)
  const [isYourBandsExpanded, setIsYourBandsExpanded] = useState(true)

  // Toggle handlers using useCallback to prevent re-creation
  const toggleRecentlyPlayed = useCallback(() => {
    setIsRecentlyPlayedExpanded(prev => !prev)
  }, [])
  const toggleRecommended = useCallback(() => {
    setIsRecommendedExpanded(prev => !prev)
  }, [])
  const toggleYourSongs = useCallback(() => {
    setIsYourSongsExpanded(prev => !prev)
  }, [])
  const toggleYourPlaylists = useCallback(() => {
    setIsYourPlaylistsExpanded(prev => !prev)
  }, [])
  const toggleLikedSongs = useCallback(() => {
    setIsLikedSongsExpanded(prev => !prev)
  }, [])
  const toggleYourBands = useCallback(() => {
    setIsYourBandsExpanded(prev => !prev)
  }, [])

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingSong, setEditingSong] = useState(null)

  // Like loading state (local) - shared like state comes from context
  const [likingInProgress, setLikingInProgress] = useState({})

  const colorSet = theme.colors[appearance]

  // Get user ID (handle both .id and .userID property names)
  const userId = currentUser?.id || currentUser?.userID

  // Subscribe to user's bands
  const { bands, bandsLoading, bandsCount } = useBands(userId)

  // Subscribe to recently played songs
  const { recentlyPlayed, recentlyPlayedLoading, recentlyPlayedCount } = useRecentlyPlayed(userId)

  // Subscribe to user's playlists
  const { playlists, playlistsLoading, playlistsCount } = usePlaylists(userId)

  // Get recommendations (will be fetched once songs are loaded)
  const likedSongsList = songs.filter((song) => isLikedFn(song.id))
  const { recommendations, recommendationsLoading, recommendationsCount, refreshRecommendations } =
    useRecommendations(userId, {
      likedSongs: likedSongsList,
      userSongs: songs,
      recentlyPlayed,
      limit: 10,
    })

  // Handle like button press - uses shared context
  const handleLikePress = async (song) => {
    if (!song?.id || likingInProgress[song.id]) {
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
  }

  // Subscribe to user's songs from Firebase
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToUserSongs(userId, (userSongs) => {
      setSongs(userSongs)
      setLoading(false)
    })

    return () => unsubscribe && unsubscribe()
  }, [userId])

  // Filter songs based on active tab
  const filteredSongs = useCallback(() => {
    switch (activeTab) {
      case 'songs':
      case 'ai':
        return songs // All songs are AI created for now
      case 'playlists':
        return [] // Playlists feature coming soon
      case 'videos':
        // Filter songs that have a video URL
        return songs.filter(song => song.videoUrl)
      case 'all':
      default:
        return songs
    }
  }, [activeTab, songs])

  // Sort songs based on sort option
  const sortedSongs = useCallback(() => {
    const filtered = filteredSongs()
    switch (sortOption) {
      case 'alphabetical':
        return [...filtered].sort((a, b) =>
          (a.title || '').localeCompare(b.title || '')
        )
      case 'added':
      case 'recent':
      default:
        return filtered // Already sorted by createdAt desc from Firebase
    }
  }, [filteredSongs, sortOption])

  /**
   * Get playable audio URL from a song object
   * UNIFIED PRIORITY ORDER (same across all screens):
   * 1. Firebase Storage URL (our permanent backup)
   * 2. Original audioUrl/streamUrl from Suno API
   * 3. Suno CDN (construct from sunoId) - Suno keeps files for ~2 weeks
   */
  const getPlayableUrl = (song) => {
    // Priority 1: Our Firebase Storage backup - permanent
    if (song.firebaseAudioUrl) return song.firebaseAudioUrl
    // Priority 2: Original URLs from song data
    if (song.audioUrl) return song.audioUrl
    if (song.streamUrl) return song.streamUrl
    // Priority 3: Suno CDN fallback - construct from sunoId
    if (song.sunoId) return `https://cdn1.suno.ai/${song.sunoId}.mp3`
    return null
  }

  // Check if a song is playable (has audio URL or can construct one)
  const isSongPlayable = (song) => {
    return !!getPlayableUrl(song)
  }

  // Handle song deletion with confirmation
  const handleDeleteSong = (song) => {
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${song.title || 'Untitled'}"?\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSong(song.id, userId)
              console.log('Song deleted:', song.id)
            } catch (error) {
              console.error('Error deleting song:', error)
              Alert.alert('Error', 'Failed to delete song. Please try again.')
            }
          },
        },
      ]
    )
  }

  // Long press handler - shows options menu
  const handleSongLongPress = (song) => {
    const options = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Song',
        style: 'destructive',
        onPress: () => handleDeleteSong(song),
      },
    ]

    // Add play option if song is playable
    if (isSongPlayable(song)) {
      const audioUrl = getPlayableUrl(song)
      options.unshift(
        {
          text: 'Play',
          onPress: () => handleSongPress(song),
        },
        {
          text: 'Add to Queue',
          onPress: () => {
            addToQueue({
              id: song.id,
              title: song.title || 'Untitled',
              artist: currentUser?.username || 'You',
              audioUrl: audioUrl,
              imageUrl: song.imageUrl,
              duration: song.duration,
              rawLyrics: song.rawLyrics,
              timestampedLyrics: song.timestampedLyrics,
            })
            Alert.alert('Added to Queue', `"${song.title || 'Untitled'}" has been added to your queue.`)
          },
        }
      )
    }

    Alert.alert(
      song.title || 'Untitled',
      song.style || 'AI Generated',
      options
    )
  }

  const handleSongPress = (song) => {
    console.log('=== LIBRARY: Song pressed ===')
    console.log('Song ID:', song.id)
    console.log('Song title:', song.title)
    console.log('Song audioUrl:', song.audioUrl)
    console.log('Song streamUrl:', song.streamUrl)
    console.log('Song sunoId:', song.sunoId)
    console.log('Song imageUrl:', song.imageUrl)
    console.log('Song rawLyrics:', song.rawLyrics ? 'present' : 'missing')
    console.log('Song timestampedLyrics:', song.timestampedLyrics?.length || 0, 'lines')
    console.log('Song duration:', song.duration)

    // Get the best available audio URL (with fallback to CDN construction)
    const audioUrl = getPlayableUrl(song)
    console.log('Resolved audioUrl:', audioUrl)

    if (audioUrl) {
      console.log('Playing song with audioUrl:', audioUrl)

      // Pass the full song data so player has access to all fields
      playSong({
        ...song, // Spread all song data (imageUrl, rawLyrics, timestampedLyrics, etc.)
        audioUrl, // Use resolved URL (could be from sunoId fallback)
        artist: currentUser?.username || 'You',
      })
    } else {
      console.warn('Song has no audioUrl, streamUrl, or sunoId!', song)
      // Show alert with option to delete unavailable song
      Alert.alert(
        'Song Unavailable',
        'This song cannot be played. The audio file is not available.',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Delete Song',
            style: 'destructive',
            onPress: () => handleDeleteSong(song),
          },
          { text: 'Create New Song', onPress: () => navigation.navigate('Create') },
        ]
      )
    }
  }

  const handleNewPlaylist = () => {
    navigation.navigate('CreatePlaylist')
  }

  const handlePlaylistPress = (playlist) => {
    navigation.navigate('PlaylistDetail', { playlistId: playlist.id })
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colorSet.primaryText }]}>
        {localized('Library')}
      </Text>
      <View style={styles.headerActions}>
        {/* View mode toggle */}
        <TouchableOpacity
          style={styles.viewToggleButton}
          onPress={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}>
          {viewMode === 'grid' ? (
            <List size={22} color={colorSet.primaryText} />
          ) : (
            <LayoutGrid size={22} color={colorSet.primaryText} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Discover')}>
          <Image
            source={theme.icons.search}
            style={[styles.searchIcon, { tintColor: colorSet.primaryText }]}
          />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}>
      {FILTER_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && {
              backgroundColor: colorSet.primaryForeground,
            },
            activeTab !== tab.id && {
              backgroundColor: colorSet.grey3,
            },
          ]}
          onPress={() => setActiveTab(tab.id)}>
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id && { color: '#fff' },
              activeTab !== tab.id && { color: colorSet.primaryText },
            ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  // Reusable collapsible section header
  const CollapsibleSectionHeader = ({
    title,
    icon: Icon,
    iconColor,
    isExpanded,
    onToggle,
    showAddButton,
    onAdd,
    count,
    comingSoon,
  }) => (
    <View style={styles.sectionHeader}>
      <TouchableOpacity
        style={styles.sectionTitleRow}
        onPress={onToggle}
        activeOpacity={0.7}>
        {Icon && (
          <View style={[styles.sectionIcon, { backgroundColor: `${iconColor}20` }]}>
            <Icon size={18} color={iconColor} />
          </View>
        )}
        <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
          {title}
        </Text>
        {count !== undefined && (
          <View style={[styles.countBadge, { backgroundColor: colorSet.grey3 }]}>
            <Text style={[styles.countText, { color: colorSet.secondaryText }]}>{count}</Text>
          </View>
        )}
        {comingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        )}
        {isExpanded ? (
          <ChevronUp size={20} color={colorSet.secondaryText} />
        ) : (
          <ChevronDown size={20} color={colorSet.secondaryText} />
        )}
      </TouchableOpacity>
      {showAddButton && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Plus size={20} color={colorSet.primaryForeground} />
        </TouchableOpacity>
      )}
    </View>
  )

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format date from Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Handle edit song - open modal
  const handleEditSong = (song) => {
    setEditingSong(song)
    setEditModalVisible(true)
  }

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setEditModalVisible(false)
    setEditingSong(null)
  }

  const renderSongItem = ({ item: song, index }) => {
    const isPlayable = isSongPlayable(song)

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.gridItem}>
        {/* Image area - touchable for playing song */}
        <TouchableOpacity
          onPress={() => handleSongPress(song)}
          onLongPress={() => handleSongLongPress(song)}
          delayLongPress={500}
          activeOpacity={0.8}>
          <View style={[styles.imageContainer, !isPlayable && styles.unplayableImageContainer]}>
            {song.imageUrl ? (
              <Image
                source={{ uri: song.imageUrl }}
                style={[styles.songImage, !isPlayable && styles.unplayableImage]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.songImagePlaceholder,
                  { backgroundColor: colorSet.grey3 },
                ]}>
                <Image
                  source={theme.icons.musicalNotes}
                  style={[styles.placeholderIcon, { tintColor: colorSet.grey9 }]}
                />
              </View>
            )}
            {/* Show unavailable badge only for unplayable songs */}
            {!isPlayable && (
              <View style={styles.unavailableOverlay}>
                <View style={styles.unavailableBadge}>
                  <Text style={styles.unavailableText}>Unavailable</Text>
                </View>
              </View>
            )}
            {/* Video badge - show if song has a video */}
            {song.videoUrl && (
              <View style={styles.videoBadge}>
                <Film size={12} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Song info row - OUTSIDE the image touchable */}
        <View style={styles.songInfoRow}>
          {/* Text area - touchable for playing song */}
          <TouchableOpacity
            style={styles.songTextContainer}
            onPress={() => handleSongPress(song)}
            activeOpacity={0.7}>
            <Text
              style={[styles.songTitle, { color: isPlayable ? colorSet.primaryText : colorSet.secondaryText }]}
              numberOfLines={1}>
              {song.title || 'Untitled'}
            </Text>
            <Text
              style={[styles.songDescription, { color: colorSet.secondaryText }]}
              numberOfLines={1}>
              {song.style || 'AI Generated'}
            </Text>
          </TouchableOpacity>

          {/* Like, Edit and Delete buttons - OUTSIDE any parent touchable */}
          <View style={styles.songActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLikePress(song)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={likingInProgress[song.id]}>
              <Heart
                size={18}
                color={isLikedFn(song.id) ? '#ef4444' : colorSet.secondaryText}
                fill={isLikedFn(song.id) ? '#ef4444' : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditSong(song)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Pencil size={16} color={colorSet.secondaryText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteSong(song)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Trash2 size={16} color={colorSet.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={theme.icons.musicalNotes}
        style={[styles.emptyIcon, { tintColor: colorSet.grey9 }]}
      />
      <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
        {activeTab === 'playlists'
          ? 'No Playlists Yet'
          : 'No Songs Yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
        {activeTab === 'playlists'
          ? 'Create your first playlist'
          : 'Create your first AI song'}
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colorSet.primaryForeground }]}
        onPress={() => navigation.navigate('Create')}>
        <Text style={styles.createButtonText}>
          {activeTab === 'playlists' ? 'New Playlist' : 'Create Song'}
        </Text>
      </TouchableOpacity>
    </View>
  )

  // Placeholder for coming soon sections
  const renderComingSoonPlaceholder = (message) => (
    <View style={styles.comingSoonPlaceholder}>
      <Sparkles size={32} color={colorSet.grey9} />
      <Text style={[styles.comingSoonPlaceholderText, { color: colorSet.secondaryText }]}>
        {message || 'Coming Soon'}
      </Text>
    </View>
  )

  // Get liked songs from user's songs (uses shared like state from context)
  const getLikedSongs = useCallback(() => {
    return songs.filter(song => isLikedFn(song.id))
  }, [songs, isLikedFn])

  // Render recently played item (horizontal scroll style)
  const renderRecentlyPlayedItem = ({ item: song, index }) => {
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.gridItem}>
        <TouchableOpacity
          onPress={() => handleSongPress(song)}
          activeOpacity={0.8}>
          <View style={styles.imageContainer}>
            {song.imageUrl ? (
              <Image
                source={{ uri: song.imageUrl }}
                style={styles.songImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.songImagePlaceholder,
                  { backgroundColor: colorSet.grey3 },
                ]}>
                <Image
                  source={theme.icons.musicalNotes}
                  style={[styles.placeholderIcon, { tintColor: colorSet.grey9 }]}
                />
              </View>
            )}
            {/* Play overlay icon */}
            <View style={styles.recentlyPlayedOverlay}>
              <Play size={24} color="#fff" fill="#fff" />
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.songInfoRow}>
          <TouchableOpacity
            style={styles.songTextContainer}
            onPress={() => handleSongPress(song)}
            activeOpacity={0.7}>
            <Text
              style={[styles.songTitle, { color: colorSet.primaryText }]}
              numberOfLines={1}>
              {song.title || 'Untitled'}
            </Text>
            <Text
              style={[styles.songDescription, { color: colorSet.secondaryText }]}
              numberOfLines={1}>
              {song.artist || 'Unknown Artist'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    )
  }

  // Render Recently Played section
  const renderRecentlyPlayedSection = () => (
    <View style={styles.section}>
      <CollapsibleSectionHeader
        title="Recently Played"
        icon={Clock}
        iconColor="#3875e8"
        isExpanded={isRecentlyPlayedExpanded}
        onToggle={toggleRecentlyPlayed}
        count={recentlyPlayedCount}
      />
      {isRecentlyPlayedExpanded && (
        recentlyPlayedLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          </View>
        ) : recentlyPlayed.length > 0 ? (
          <FlatList
            data={recentlyPlayed}
            renderItem={renderRecentlyPlayedItem}
            keyExtractor={(item) => item.recentlyPlayedId || item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContainer}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        ) : (
          <View style={styles.emptySection}>
            <Text style={[styles.emptySectionText, { color: colorSet.secondaryText }]}>
              Songs you play will appear here
            </Text>
          </View>
        )
      )}
    </View>
  )

  // Render recommendation item (horizontal scroll style)
  const renderRecommendationItem = ({ item: song, index }) => {
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.gridItem}>
        <TouchableOpacity
          onPress={() => handleSongPress(song)}
          activeOpacity={0.8}>
          <View style={styles.imageContainer}>
            {song.imageUrl ? (
              <Image
                source={{ uri: song.imageUrl }}
                style={styles.songImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.songImagePlaceholder,
                  { backgroundColor: colorSet.grey3 },
                ]}>
                <Image
                  source={theme.icons.musicalNotes}
                  style={[styles.placeholderIcon, { tintColor: colorSet.grey9 }]}
                />
              </View>
            )}
            {/* Recommendation badge */}
            <View style={styles.recommendationBadge}>
              <Sparkles size={12} color="#f59e0b" />
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.songInfoRow}>
          <TouchableOpacity
            style={styles.songTextContainer}
            onPress={() => handleSongPress(song)}
            activeOpacity={0.7}>
            <Text
              style={[styles.songTitle, { color: colorSet.primaryText }]}
              numberOfLines={1}>
              {song.title || 'Untitled'}
            </Text>
            <Text
              style={[styles.songDescription, { color: colorSet.secondaryText }]}
              numberOfLines={1}>
              {song.recommendationReason || song.style || 'Recommended'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    )
  }

  // Render Recommended section
  const renderRecommendedSection = () => (
    <View style={styles.section}>
      <CollapsibleSectionHeader
        title="Recommended For You"
        icon={Sparkles}
        iconColor="#f59e0b"
        isExpanded={isRecommendedExpanded}
        onToggle={toggleRecommended}
        count={recommendationsCount}
      />
      {isRecommendedExpanded && (
        recommendationsLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          </View>
        ) : recommendations.length > 0 ? (
          <FlatList
            data={recommendations}
            renderItem={renderRecommendationItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContainer}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        ) : (
          <View style={styles.emptySection}>
            <Text style={[styles.emptySectionText, { color: colorSet.secondaryText }]}>
              Like some songs to get personalized recommendations
            </Text>
          </View>
        )
      )}
    </View>
  )

  // Render song list based on viewMode
  const renderSongList = (songList, emptyMessage) => {
    if (!songList || songList.length === 0) {
      return (
        <View style={styles.emptySection}>
          <Text style={[styles.emptySectionText, { color: colorSet.secondaryText }]}>
            {emptyMessage || 'No songs yet'}
          </Text>
        </View>
      )
    }

    if (viewMode === 'list') {
      return (
        <View style={styles.listContainer}>
          {songList.map((song, index) => renderListItem({ item: song, index }))}
        </View>
      )
    }

    return (
      <FlatList
        data={songList}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    )
  }

  // Render list view item (compact row)
  const renderListItem = ({ item: song, index }) => {
    const isPlayable = isSongPlayable(song)
    return (
      <TouchableOpacity
        key={song.id}
        style={[styles.listItem, !isPlayable && { opacity: 0.6 }]}
        onPress={() => handleSongPress(song)}
        onLongPress={() => handleSongLongPress(song)}
        delayLongPress={500}
        activeOpacity={0.7}>
        <View style={styles.listItemImageContainer}>
          {song.imageUrl ? (
            <Image
              source={{ uri: song.imageUrl }}
              style={styles.listItemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.listItemImagePlaceholder, { backgroundColor: colorSet.grey3 }]}>
              <Music size={20} color={colorSet.grey9} />
            </View>
          )}
          {/* Video badge for list view */}
          {song.videoUrl && (
            <View style={styles.listVideoBadge}>
              <Film size={10} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.listItemInfo}>
          <Text
            style={[styles.listItemTitle, { color: colorSet.primaryText }]}
            numberOfLines={1}>
            {song.title || 'Untitled'}
          </Text>
          <Text
            style={[styles.listItemSubtitle, { color: colorSet.secondaryText }]}
            numberOfLines={1}>
            {song.style || 'AI Generated'} {song.duration ? `• ${formatDuration(song.duration)}` : ''}
          </Text>
        </View>
        <View style={styles.listItemActions}>
          <TouchableOpacity
            style={styles.listActionButton}
            onPress={() => handleLikePress(song)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={likingInProgress[song.id]}>
            <Heart
              size={18}
              color={isLikedFn(song.id) ? '#ef4444' : colorSet.secondaryText}
              fill={isLikedFn(song.id) ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.listActionButton}
            onPress={() => handleSongPress(song)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Play size={18} color={colorSet.primaryForeground} fill={colorSet.primaryForeground} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  // Render Your Songs section
  const renderYourSongsSection = () => {
    const sorted = sortedSongs()
    return (
      <View style={styles.section}>
        <CollapsibleSectionHeader
          title="Your Songs"
          icon={Music}
          iconColor="#10b981"
          isExpanded={isYourSongsExpanded}
          onToggle={toggleYourSongs}
          count={sorted.length}
          showAddButton
          onAdd={() => navigation.navigate('Create')}
        />
        {isYourSongsExpanded && (
          loading ? (
            <View style={styles.sectionLoading}>
              <ActivityIndicator size="small" color={colorSet.primaryForeground} />
            </View>
          ) : (
            renderSongList(sorted, 'Create your first song')
          )
        )}
      </View>
    )
  }

  // Render Your Playlists section
  const renderYourPlaylistsSection = () => (
    <View style={styles.section}>
      <CollapsibleSectionHeader
        title="Your Playlists"
        icon={ListMusic}
        iconColor="#8b5cf6"
        isExpanded={isYourPlaylistsExpanded}
        onToggle={toggleYourPlaylists}
        count={playlistsCount}
        showAddButton
        onAdd={handleNewPlaylist}
      />
      {isYourPlaylistsExpanded && (
        playlistsLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          </View>
        ) : (
          <FlatList
            data={[{ isCreateNew: true }, ...playlists]}
            renderItem={({ item }) => (
              <PlaylistCard
                playlist={item.isCreateNew ? null : item}
                onPress={item.isCreateNew ? handleNewPlaylist : handlePlaylistPress}
                isCreateNew={item.isCreateNew}
                size={140}
              />
            )}
            keyExtractor={(item) => item.isCreateNew ? 'create-new' : item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContainer}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        )
      )}
    </View>
  )

  // Render Liked Songs section
  const renderLikedSongsSection = () => {
    const likedSongs = getLikedSongs()
    return (
      <View style={styles.section}>
        <CollapsibleSectionHeader
          title="Liked Songs"
          icon={Heart}
          iconColor="#ef4444"
          isExpanded={isLikedSongsExpanded}
          onToggle={toggleLikedSongs}
          count={likedSongs.length}
        />
        {isLikedSongsExpanded && renderSongList(likedSongs, 'Songs you like will appear here')}
      </View>
    )
  }

  // Handle band card press - navigate to band detail
  const handleBandPress = (band) => {
    navigation.navigate('BandDetail', { band })
  }

  // Handle create band button
  const handleCreateBand = () => {
    navigation.navigate('CreateGroup', { isBand: true })
  }

  // Render band list item (compact row for list view)
  const renderBandListItem = (band, index) => {
    const members = band.participants || []
    const memberCount = members.length
    return (
      <TouchableOpacity
        key={band.id}
        style={styles.listItem}
        onPress={() => handleBandPress(band)}
        activeOpacity={0.7}>
        <View style={styles.listItemImageContainer}>
          {band.bandImageUrl || band.imageUrl ? (
            <Image
              source={{ uri: band.bandImageUrl || band.imageUrl }}
              style={styles.listItemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.listItemImagePlaceholder, { backgroundColor: '#7c3aed' }]}>
              <Users size={20} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.listItemInfo}>
          <Text
            style={[styles.listItemTitle, { color: colorSet.primaryText }]}
            numberOfLines={1}>
            {band.name || 'Unnamed Band'}
          </Text>
          <Text
            style={[styles.listItemSubtitle, { color: colorSet.secondaryText }]}
            numberOfLines={1}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <View style={styles.listItemActions}>
          <TouchableOpacity
            style={styles.listActionButton}
            onPress={() => handleBandPress(band)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronDown size={18} color={colorSet.secondaryText} style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  // Render Your Bands section
  const renderYourBandsSection = () => (
    <View style={styles.section}>
      <CollapsibleSectionHeader
        title="Your Bands"
        icon={Users}
        iconColor="#7c3aed"
        isExpanded={isYourBandsExpanded}
        onToggle={toggleYourBands}
        count={bandsCount}
        showAddButton
        onAdd={handleCreateBand}
      />
      {isYourBandsExpanded && (
        bandsLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          </View>
        ) : bands.length > 0 ? (
          viewMode === 'list' ? (
            <View style={styles.listContainer}>
              {bands.map((band, index) => renderBandListItem(band, index))}
            </View>
          ) : (
            <FlatList
              data={bands}
              renderItem={({ item }) => (
                <BandCard
                  band={item}
                  onPress={handleBandPress}
                  size={140}
                />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContainer}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          )
        ) : (
          <View style={styles.emptySection}>
            <Text style={[styles.emptySectionText, { color: colorSet.secondaryText }]}>
              Start a band to collaborate with other artists
            </Text>
          </View>
        )
      )}
    </View>
  )

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorSet.primaryBackground,
          paddingTop: insets.top,
        },
      ]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {renderHeader()}
        {renderTabs()}

        {/* All collapsible sections */}
        {renderYourSongsSection()}
        {renderYourBandsSection()}
        {renderLikedSongsSection()}
        {renderYourPlaylistsSection()}
        {renderRecentlyPlayedSection()}
        {renderRecommendedSection()}
      </ScrollView>

      {/* Edit Song Modal - Shared Component */}
      <EditSongModal
        visible={editModalVisible}
        song={editingSong}
        onClose={handleCloseEditModal}
        onDeleteSong={handleDeleteSong}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchButton: {
    padding: 8,
  },
  searchIcon: {
    width: 24,
    height: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleButton: {
    padding: 8,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 8,
  },
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
  comingSoonBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 4,
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listViewButton: {
    padding: 8,
  },
  listIcon: {
    width: 24,
    height: 24,
  },
  sectionLoading: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySection: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptySectionText: {
    fontSize: 14,
  },
  comingSoonPlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    marginBottom: 8,
  },
  comingSoonPlaceholderText: {
    fontSize: 14,
    marginTop: 8,
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    width: HORIZONTAL_ITEM_WIDTH,
  },
  horizontalListContainer: {
    paddingHorizontal: 16,
  },
  // List view styles
  listContainer: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  listItemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
  },
  listItemImage: {
    width: '100%',
    height: '100%',
  },
  listItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listActionButton: {
    padding: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  songImage: {
    width: '100%',
    height: '100%',
  },
  songImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 48,
    height: 48,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  unplayableImageContainer: {
    opacity: 0.6,
  },
  unplayableImage: {
    opacity: 0.7,
  },
  unavailableBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(56, 117, 232, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  recentlyPlayedOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listVideoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(56, 117, 232, 0.9)',
    borderRadius: 3,
    padding: 3,
  },
  songInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  songTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  songDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default LibraryScreen
