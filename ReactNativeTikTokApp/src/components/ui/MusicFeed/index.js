import React, { memo, useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
} from 'react-native'
// Note: Reanimated entering animations removed to fix refresh crash
// import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import TodaysPicks from '../TodaysPicks'
import SongDetailCard from '../SongDetailCard'
import AlbumCard from '../AlbumCard'
import ArtistCard from '../ArtistCard'
import SongActionMenu from '../SongActionMenu'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import { prepareSongsForPlaylist } from '../../../utils/audioUtils'

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
  todaysPicks = [],
  favorites = [],
  playlists = [],
  artists = [],
  radioStations = [],
  onViewAllFavorites,
  onViewAllPlaylists,
  onViewAllArtists,
  onViewAllRadio,
  onArtistPress,
  onPlaylistPress,
  onRadioPress,
  onAddToPlaylist,
  onViewArtistProfile,
  onEditSong,
  refreshing = false,
  onRefresh,
  videoFeedComponent, // Existing video feed from HomeScreen
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { playList } = useMediaPlayer()
  const [activeTab, setActiveTab] = useState(0)

  // Song Action Menu state
  const [menuVisible, setMenuVisible] = useState(false)
  const [selectedSong, setSelectedSong] = useState(null)

  // Handle menu press on a song
  const handleMenuPress = useCallback((song) => {
    console.log('[MusicFeed] handleMenuPress:', song?.id, song?.title)
    setSelectedSong(song)
    setMenuVisible(true)
  }, [])

  // Close the action menu
  const handleMenuClose = useCallback(() => {
    setMenuVisible(false)
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

  // Header component (greeting + tabs) - used for both layouts
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Greeting - text-typography-900 px-4 pt-4 pb-1 */}
      <Text style={styles.greeting}>
        {getGreeting()} {userName}
      </Text>

      {/* Subtitle - text-typography-600 px-4 */}
      <Text style={styles.subGreeting}>
        Have a nice day!
      </Text>

      {/* Tabs - className="my-6" */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabsWrapper}
      >
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  // Videos tab - render header fixed at top, video feed takes remaining space
  // This avoids nesting the video FlatList inside our ScrollView
  if (activeTab === 2 && videoFeedComponent) {
    return (
      <>
        <View style={styles.container}>
          {renderHeader()}
          <View style={styles.videoFeedContainer}>
            {videoFeedComponent}
          </View>
        </View>
        <SongActionMenu
          visible={menuVisible}
          song={selectedSong}
          currentUserId={currentUserId}
          onClose={handleMenuClose}
          onAddToPlaylist={onAddToPlaylist}
          onViewArtist={onViewArtistProfile}
          onEditSong={onEditSong}
        />
      </>
    )
  }

  // Other tabs - normal ScrollView layout
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
    >
      {renderHeader()}

      {/* Today's Picks */}
      {todaysPicks.length > 0 && (
        <TodaysPicks
          picks={todaysPicks}
          onPickPress={handlePickPress}
        />
      )}

      {/* Your Favorites - SubHeading + VStack space="md" px-4 */}
      {favorites.length > 0 && (
        <View>
          <Text style={styles.subHeading}>Your favorites</Text>
          <View style={styles.favoritesList}>
            {favorites.map((song, index) => (
              <View key={song.id ?? index}>
                <SongDetailCard
                  song={song}
                  index={index}
                  onPress={handleFavoriteSongPress}
                  onMenuPress={handleMenuPress}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Playlist for you */}
      {playlists.length > 0 && (
        <View>
          <Text style={styles.subHeading}>Playlist for you</Text>
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
        </View>
      )}

      {/* Artists */}
      {artists.length > 0 && (
        <View>
          <Text style={styles.subHeading}>Artists</Text>
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
        </View>
      )}

      {/* Radio for you */}
      {radioStations.length > 0 && (
        <View>
          <Text style={styles.subHeading}>Radio for you</Text>
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
        </View>
      )}

      {/* Bottom spacing for MiniPlayer */}
      <View style={{ height: 150 }} />

      {/* Song Action Menu */}
      <SongActionMenu
        visible={menuVisible}
        song={selectedSong}
        currentUserId={currentUserId}
        onClose={handleMenuClose}
        onAddToPlaylist={onAddToPlaylist}
        onViewArtist={onViewArtistProfile}
        onEditSong={onEditSong}
      />
    </ScrollView>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff', // bg-background-0
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20, // pb-5
  },
  // Header container for greeting + tabs (used in both layouts)
  headerContainer: {
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff', // bg-background-0
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
  // SubHeading style from reference
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
})

export default memo(MusicFeed)
