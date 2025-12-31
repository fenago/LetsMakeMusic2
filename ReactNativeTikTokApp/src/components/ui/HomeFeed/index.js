import React, { memo, useState, useEffect, useCallback } from 'react'
import { observer } from 'mobx-react'
import {
  View,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MusicFeed from '../MusicFeed'
import FullStoriesModal from '../../../core/stories/FullStoriesModal/FullStoriesModal'
import storyStore from '../../../core/stories/FullStories/Store'
import { subscribeToAllSongs, subscribeToLikedSongs, subscribeToUserSongs } from '../../../services/songsService'
import { getPlayableUrl, getPlayableImageUrl } from '../../../utils/audioUtils'
import { useCurrentUser } from '../../../core/onboarding'
import { useNavigation } from '@react-navigation/native'
import { subscribeToHomeFeedPosts } from '../../../core/socialgraph/feed/api/firebase/firebaseFeedClient'
import { useStories } from '../../../core/socialgraph/feed'

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 * Creates a new shuffled array without modifying the original
 */
const shuffleArray = (array) => {
  if (!array?.length) return array
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// NO SAMPLE DATA - Only real Firebase songs
// NOTE: getPlayableUrl is now imported from centralized audioUtils

/**
 * Transform Firebase song to Today's Picks format
 * IMPORTANT: Spread original song FIRST, then override with calculated values
 * Otherwise spreading at the end would overwrite audioUrl with undefined
 *
 * CRITICAL: Explicitly preserve `author` object for "About the Artist" section
 * which needs: stageName, bio, profilePictureURL
 */
const songToPickFormat = (song) => {
  // CRITICAL: Use centralized image URL resolution for consistent behavior
  const resolvedImageUrl = getPlayableImageUrl(song)

  return {
    ...song, // Spread FIRST to preserve original data including sunoId
    id: song.id,
    label: song.title || 'Untitled Song',
    subLabel: song.style || 'AI Generated',
    imageUrl: resolvedImageUrl, // Use centralized URL resolution
    audioUrl: getPlayableUrl(song), // Use shared URL resolution
    title: song.title || 'Untitled Song', // Also set title for player
    // Use author.stageName for artist, NOT song.artist (which may have style text)
    artist: song.author?.stageName || song.author?.firstName || 'AI Generated',
    thumbnailUrl: resolvedImageUrl, // Player uses thumbnailUrl - use resolved URL
    // EXPLICIT: Preserve author object for "About the Artist" section
    author: song.author || null,
  }
}

/**
 * Transform Firebase song to Favorites format
 * IMPORTANT: Spread original song FIRST, then override with calculated values
 *
 * CRITICAL: Explicitly preserve `author` object for "About the Artist" section
 * which needs: stageName, bio, profilePictureURL
 */
const songToFavoriteFormat = (song) => {
  // CRITICAL: Use centralized image URL resolution for consistent behavior
  const resolvedImageUrl = getPlayableImageUrl(song)

  return {
    ...song, // Spread FIRST to preserve original data including sunoId
    id: song.id,
    name: song.title || 'Untitled Song',
    description: song.style || 'AI Generated',
    imageUrl: resolvedImageUrl, // Use centralized URL resolution
    audioUrl: getPlayableUrl(song), // Use shared URL resolution
    title: song.title || 'Untitled Song', // Also set title for player
    // Use author.stageName for artist, NOT song.artist (which may have style text)
    artist: song.author?.stageName || song.author?.firstName || 'AI Generated',
    thumbnailUrl: resolvedImageUrl, // Player uses thumbnailUrl - use resolved URL
    // EXPLICIT: Preserve author object for "About the Artist" section
    author: song.author || null,
  }
}

/**
 * HomeFeed - EXACT copy of reference home.tsx structure
 *
 * Fetches real songs from Firebase and displays them
 * NO SAMPLE DATA - shows empty state if no songs exist
 */
// Sample data for sections that don't have real data yet
const SAMPLE_PLAYLISTS = [
  { id: 'pl1', title: 'Chill Vibes', imageUrl: 'https://picsum.photos/200/200?random=pl1', songCount: 12 },
  { id: 'pl2', title: 'Workout Mix', imageUrl: 'https://picsum.photos/200/200?random=pl2', songCount: 8 },
  { id: 'pl3', title: 'Late Night', imageUrl: 'https://picsum.photos/200/200?random=pl3', songCount: 15 },
  { id: 'pl4', title: 'Party Time', imageUrl: 'https://picsum.photos/200/200?random=pl4', songCount: 20 },
]

const SAMPLE_ARTISTS = [
  { id: 'a1', name: 'Luna Strums', imageUrl: 'https://picsum.photos/150/150?random=a1', followers: 1200 },
  { id: 'a2', name: 'DJ Rhythm', imageUrl: 'https://picsum.photos/150/150?random=a2', followers: 3400 },
  { id: 'a3', name: 'Maya Songs', imageUrl: 'https://picsum.photos/150/150?random=a3', followers: 890 },
  { id: 'a4', name: 'Beat Master', imageUrl: 'https://picsum.photos/150/150?random=a4', followers: 5600 },
]

const SAMPLE_RADIO = [
  { id: 'r1', title: 'AI Hits Radio', imageUrl: 'https://picsum.photos/200/200?random=r1', listeners: 234 },
  { id: 'r2', title: 'Indie Discoveries', imageUrl: 'https://picsum.photos/200/200?random=r2', listeners: 567 },
  { id: 'r3', title: 'Electronic Beats', imageUrl: 'https://picsum.photos/200/200?random=r3', listeners: 890 },
]

const HomeFeed = observer(({
  userName = 'John',
  currentUserId = null,
  todaysPicks: propsTodaysPicks,
  favorites: propsFavorites,
  playlists: propsPlaylists,
  artists: propsArtists,
  radioStations: propsRadioStations,
  onViewAllFavorites,
  onViewAllPlaylists,
  onViewAllArtists,
  onViewAllRadio,
  onArtistPress,
  onPlaylistPress,
  onRadioPress,
  refreshing = false,
  onRefresh,
  onFilterChange, // NEW: Callback for media type filter (all/music/video)
  videoFeedComponent, // Existing TikTok-style video feed
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const insets = useSafeAreaInsets()
  const currentUser = useCurrentUser()
  const navigation = useNavigation()
  const userId = currentUserId || currentUser?.id

  // Stories hook for ephemeral 24-hour content
  const {
    groupedStories,
    myStories,
    subscribeToStories,
    loadMoreStories,
  } = useStories()

  // Subscribe to stories feed
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToStories(userId)
    return () => { if (unsubscribe) unsubscribe() }
  }, [userId, subscribeToStories])

  // Sync stories to MobX store for FullStoriesModal
  useEffect(() => {
    if (groupedStories?.length > 0) {
      storyStore.setSories(groupedStories)
    }
    if (myStories) {
      storyStore.updateUserStory(myStories)
    }
  }, [groupedStories, myStories])

  // State for real Firebase songs
  const [songs, setSongs] = useState([]) // All songs (For You)
  const [userOwnSongs, setUserOwnSongs] = useState([]) // User's own songs
  const [followingSongs, setFollowingSongs] = useState([]) // Songs from followed users (Following)
  const [likedSongs, setLikedSongs] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Subscribe to all songs from Firebase (for Today's Picks)
  useEffect(() => {
    setIsLoading(true)

    const unsubscribe = subscribeToAllSongs((fetchedSongs) => {
      // Shuffle songs for variety - users won't see same order every time
      const shuffledSongs = shuffleArray(fetchedSongs)
      setSongs(shuffledSongs)
      setIsLoading(false)
    }, 50)

    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  // Subscribe to user's LIKED songs for Favorites section
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToLikedSongs(userId, (fetchedLikedSongs) => {
      setLikedSongs(fetchedLikedSongs)
    })

    return () => { if (unsubscribe) unsubscribe() }
  }, [userId])

  // Subscribe to user's OWN songs for mixing into the feed
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToUserSongs(userId, (fetchedUserSongs) => {
      setUserOwnSongs(fetchedUserSongs)
    })

    return () => { if (unsubscribe) unsubscribe() }
  }, [userId])

  // Subscribe to home_feed_live for songs from FOLLOWED users (Following mode)
  // This extracts song posts from the social feed which contains posts from followed users
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToHomeFeedPosts(userId, (posts) => {
      // Extract songs from posts with postType === 'song'
      const songPosts = (posts || []).filter(post => post.postType === 'song')

      // Transform post data to song format
      // NOTE: Cloud function uses `songData` field, old posts may use `song`
      const songsFromPosts = songPosts.map(post => {
        const songInfo = post.songData || post.song || {}
        return {
          id: post.linkedSongId || songInfo.id || post.id,
          title: songInfo.title || post.description?.split(' ').slice(0, 5).join(' ') || 'Untitled',
          style: songInfo.style || 'AI Generated',
          imageUrl: songInfo.imageUrl || post.postMedia?.[0]?.thumbnailURL,
          audioUrl: songInfo.audioUrl || post.postMedia?.[0]?.url,
          author: post.author,
          ...songInfo, // Spread song data if available
        }
      })
      setFollowingSongs(songsFromPosts)
    })

    return () => { if (unsubscribe) unsubscribe() }
  }, [userId])

  /**
   * Mix user's own songs into the feed with a balanced ratio
   * Inserts 1 user song every 4 other songs to maintain variety
   * @param {Array} otherSongs - Songs from other users
   * @param {Array} userSongs - Current user's own songs
   * @param {number} insertEveryN - Insert a user song every N songs (default: 4)
   * @returns {Array} Mixed feed with balanced user/other songs
   */
  const mixUserSongsIntoFeed = (otherSongs, userSongs, insertEveryN = 4) => {
    if (!userSongs?.length) return otherSongs
    if (!otherSongs?.length) return userSongs

    const result = []
    let userSongIndex = 0

    for (let i = 0; i < otherSongs.length; i++) {
      result.push(otherSongs[i])

      // Insert a user song every N other songs (if we have more)
      if ((i + 1) % insertEveryN === 0 && userSongIndex < userSongs.length) {
        result.push(userSongs[userSongIndex])
        userSongIndex++
      }
    }

    // Add any remaining user songs at the end
    while (userSongIndex < userSongs.length) {
      result.push(userSongs[userSongIndex])
      userSongIndex++
    }

    return result
  }

  // Today's Picks - FOR YOU: Mix of songs from all users + user's own songs
  // Filter out user's own songs from the "all songs" list first to avoid duplicates
  const otherUsersSongs = songs.filter(song => song.userId !== userId)
  const mixedForYouSongs = mixUserSongsIntoFeed(otherUsersSongs, userOwnSongs, 4)

  const todaysPicksForYou = mixedForYouSongs.length > 0
    ? mixedForYouSongs.slice(0, 15).map(songToPickFormat)
    : (propsTodaysPicks || [])

  // Today's Picks - FOLLOWING: Songs from users you follow + user's own songs
  // Mix user's songs into the following feed for visibility
  const mixedFollowingSongs = mixUserSongsIntoFeed(followingSongs, userOwnSongs, 4)

  const todaysPicksFollowing = mixedFollowingSongs.length > 0
    ? mixedFollowingSongs.slice(0, 15).map(songToPickFormat)
    : userOwnSongs.length > 0
      ? userOwnSongs.slice(0, 10).map(songToPickFormat) // Fallback to just user's songs if no followed songs
      : []

  // Combined - MusicFeed will pick based on toggle
  // Start with For You if Following is empty
  const todaysPicks = todaysPicksForYou

  // Your Favorites: User's ACTUALLY liked songs (from likedSongs subcollection)
  // LOGIC: Songs the user has explicitly liked/hearted
  const favorites = likedSongs.length > 0
    ? likedSongs.slice(0, 10).map(songToFavoriteFormat)
    : (propsFavorites || [])

  // Playlists: Sample data for now, will be real playlists in future
  // LOGIC: Curated playlists based on user's listening history and preferences
  const playlists = propsPlaylists?.length > 0 ? propsPlaylists : SAMPLE_PLAYLISTS

  // Artists: Sample data for now, will be real followed/suggested artists
  // LOGIC: Artists the user follows + suggested based on listening habits
  const artists = propsArtists?.length > 0 ? propsArtists : SAMPLE_ARTISTS

  // Radio: Sample data for now, will be real radio stations
  // LOGIC: Personalized radio stations based on genres user listens to
  const radioStations = propsRadioStations?.length > 0 ? propsRadioStations : SAMPLE_RADIO

  // Story interaction handlers
  const handleStoryItemPress = useCallback((item, index) => {
    // Open the FullStoriesModal at the tapped story index
    if (groupedStories?.length > 0) {
      // Calculate offset for animation (center of screen)
      const offset = { top: 200, left: 200 }
      storyStore.openCarousel(index, offset)
    }
  }, [groupedStories])

  const handleAddStoryPress = useCallback((shouldOpenCamera) => {
    navigation.navigate('CreateStory', { openCamera: shouldOpenCamera })
  }, [navigation])

  // Handle closing the stories modal
  const handleStoriesModalClose = useCallback(() => {
    storyStore.dismissCarousel()
  }, [])

  const styles = getStyles(isDark, insets)

  // VStack className="flex-1 pt-safe bg-background-0"
  return (
    <View style={styles.container}>
      <MusicFeed
        userName={userName}
        currentUserId={currentUserId}
        currentUser={currentUser}
        todaysPicks={todaysPicks}
        todaysPicksForYou={todaysPicksForYou}
        todaysPicksFollowing={todaysPicksFollowing}
        favorites={favorites}
        playlists={playlists}
        artists={artists}
        radioStations={radioStations}
        onViewAllFavorites={onViewAllFavorites}
        onViewAllPlaylists={onViewAllPlaylists}
        onViewAllArtists={onViewAllArtists}
        onViewAllRadio={onViewAllRadio}
        onArtistPress={onArtistPress}
        onPlaylistPress={onPlaylistPress}
        onRadioPress={onRadioPress}
        refreshing={refreshing || isLoading}
        onRefresh={onRefresh}
        onFilterChange={onFilterChange}
        videoFeedComponent={videoFeedComponent}
        // Stories props
        groupedStories={groupedStories}
        myStories={myStories}
        onStoryItemPress={handleStoryItemPress}
        onAddStoryPress={handleAddStoryPress}
      />

      {/* Full-screen stories viewer modal */}
      <FullStoriesModal
        isModalOpen={storyStore.carouselOpen}
        onClosed={handleStoriesModalClose}
      />
    </View>
  )
})

const getStyles = (isDark, insets) => StyleSheet.create({
  // VStack className="flex-1 bg-background-0"
  // NOTE: Removed paddingTop - MusicFeed now handles safe area insets in its header
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff', // bg-background-0
  },
})

export default memo(HomeFeed)
