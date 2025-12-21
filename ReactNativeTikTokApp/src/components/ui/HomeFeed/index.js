import React, { memo, useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MusicFeed from '../MusicFeed'
import { subscribeToAllSongs } from '../../../services/songsService'
import { getPlayableUrl } from '../../../utils/audioUtils'

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
const songToPickFormat = (song) => ({
  ...song, // Spread FIRST to preserve original data
  id: song.id,
  label: song.title || 'Untitled Song',
  subLabel: song.style || 'AI Generated',
  imageUrl: song.imageUrl || 'https://picsum.photos/400/400?random=' + song.id,
  audioUrl: getPlayableUrl(song), // Use shared URL resolution
  title: song.title || 'Untitled Song', // Also set title for player
  // Use author.stageName for artist, NOT song.artist (which may have style text)
  artist: song.author?.stageName || song.author?.firstName || 'AI Generated',
  thumbnailUrl: song.imageUrl, // Player uses thumbnailUrl
  // EXPLICIT: Preserve author object for "About the Artist" section
  author: song.author || null,
})

/**
 * Transform Firebase song to Favorites format
 * IMPORTANT: Spread original song FIRST, then override with calculated values
 *
 * CRITICAL: Explicitly preserve `author` object for "About the Artist" section
 * which needs: stageName, bio, profilePictureURL
 */
const songToFavoriteFormat = (song) => ({
  ...song, // Spread FIRST to preserve original data
  id: song.id,
  name: song.title || 'Untitled Song',
  description: song.style || 'AI Generated',
  imageUrl: song.imageUrl || 'https://picsum.photos/200/200?random=' + song.id,
  audioUrl: getPlayableUrl(song), // Use shared URL resolution
  title: song.title || 'Untitled Song', // Also set title for player
  // Use author.stageName for artist, NOT song.artist (which may have style text)
  artist: song.author?.stageName || song.author?.firstName || 'AI Generated',
  thumbnailUrl: song.imageUrl, // Player uses thumbnailUrl
  // EXPLICIT: Preserve author object for "About the Artist" section
  author: song.author || null,
})

/**
 * HomeFeed - EXACT copy of reference home.tsx structure
 *
 * Fetches real songs from Firebase and displays them
 * NO SAMPLE DATA - shows empty state if no songs exist
 */
const HomeFeed = ({
  userName = 'John',
  todaysPicks: propsTodaysPicks,
  favorites: propsFavorites,
  playlists = [], // No sample data - only real playlists
  artists = [], // No sample data - only real artists
  radioStations = [], // No sample data - only real radio
  onViewAllFavorites,
  onViewAllPlaylists,
  onViewAllArtists,
  onViewAllRadio,
  onArtistPress,
  onPlaylistPress,
  onRadioPress,
  refreshing = false,
  onRefresh,
  videoFeedComponent, // Existing TikTok-style video feed
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const insets = useSafeAreaInsets()

  // State for real Firebase songs
  const [songs, setSongs] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Subscribe to all songs from Firebase
  useEffect(() => {
    console.log('[HomeFeed] Subscribing to all songs...')
    setIsLoading(true)

    const unsubscribe = subscribeToAllSongs((fetchedSongs) => {
      console.log('[HomeFeed] Received songs from Firebase:', fetchedSongs.length)
      // Debug: Log first song's URL fields
      if (fetchedSongs.length > 0) {
        const first = fetchedSongs[0]
        console.log('[HomeFeed] First song URL fields:', {
          id: first.id,
          title: first.title,
          audioUrl: first.audioUrl,
          streamUrl: first.streamUrl,
          firebaseAudioUrl: first.firebaseAudioUrl,
          sunoId: first.sunoId,
          resolvedUrl: getPlayableUrl(first),
        })
      }
      setSongs(fetchedSongs)
      setIsLoading(false)
    }, 50) // Fetch up to 50 songs

    return () => {
      console.log('[HomeFeed] Unsubscribing from songs')
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Transform songs into display formats - NO SAMPLE DATA FALLBACK
  // Today's Picks: First 5 songs from Firebase (empty if none)
  const todaysPicks = songs.length > 0
    ? songs.slice(0, 5).map(songToPickFormat)
    : (propsTodaysPicks || [])

  // Favorites: First 10 songs from Firebase (empty if none)
  const favorites = songs.length > 0
    ? songs.slice(0, 10).map(songToFavoriteFormat)
    : (propsFavorites || [])

  const styles = getStyles(isDark, insets)

  // VStack className="flex-1 pt-safe bg-background-0"
  return (
    <View style={styles.container}>
      <MusicFeed
        userName={userName}
        todaysPicks={todaysPicks}
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
        videoFeedComponent={videoFeedComponent}
      />
    </View>
  )
}

const getStyles = (isDark, insets) => StyleSheet.create({
  // VStack className="flex-1 pt-safe bg-background-0"
  container: {
    flex: 1,
    paddingTop: insets.top, // pt-safe
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff', // bg-background-0
  },
})

export default memo(HomeFeed)
