/**
 * PlaylistDetailScreen - View and manage songs in a playlist
 *
 * Shows all songs in a playlist with options to play, remove, or add more songs.
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ChevronLeft,
  Plus,
  Music,
  Trash2,
  Play,
  MoreVertical,
  Pencil,
  SkipBack,
  SkipForward,
  Shuffle,
} from 'lucide-react-native'
import { useTheme, ActivityIndicator } from '../../core/dopebase'
import { usePlaylist, usePlaylists } from '../../hooks/usePlaylists'
import { useCurrentUser } from '../../core/onboarding'
import { useMediaPlayer, usePlaybackState } from '../../contexts/MediaPlayerContext'

const PlaylistDetailScreen = ({ navigation, route }) => {
  const { playlistId, playlistName } = route.params || {}
  const insets = useSafeAreaInsets()
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  const { playlist, playlistLoading, songs } = usePlaylist(userId, playlistId)
  const { removeSongFromPlaylist, deletePlaylist } = usePlaylists(userId)
  const { playList, playNext, playPrevious, currentMedia, queue, queueIndex } = useMediaPlayer()
  const { isPlaying } = usePlaybackState()

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleAddSong = useCallback(() => {
    navigation.navigate('AddSongToPlaylist', {
      playlistId,
      playlistName: playlist?.name || playlistName,
    })
  }, [navigation, playlistId, playlist?.name, playlistName])

  const handlePlaySong = useCallback(
    (song, index) => {
      // Transform playlist songs to player format
      const queueSongs = songs.map((s) => ({
        id: s.songId,
        title: s.title,
        imageUrl: s.imageUrl,
        artist: s.artist,
        audioUrl: s.audioUrl,
        duration: s.duration,
      }))

      // Play the list starting from the selected index
      playList(queueSongs, index)
    },
    [songs, playList]
  )

  const handlePlayAll = useCallback(() => {
    if (songs.length === 0) return
    handlePlaySong(songs[0], 0)
  }, [songs, handlePlaySong])

  // Check if we have an active queue (for skip button styling)
  const hasQueue = queue && queue.length > 1

  // Handle skip previous
  const handleSkipPrevious = useCallback(async () => {
    console.log('[PlaylistDetail] handleSkipPrevious called, queue:', queue?.length, 'queueIndex:', queueIndex)
    if (playPrevious) {
      await playPrevious()
    }
  }, [playPrevious, queue, queueIndex])

  // Handle skip next
  const handleSkipNext = useCallback(async () => {
    console.log('[PlaylistDetail] handleSkipNext called, queue:', queue?.length, 'queueIndex:', queueIndex)
    if (playNext) {
      await playNext()
    }
  }, [playNext, queue, queueIndex])

  // Handle shuffle play
  const handleShufflePlay = useCallback(async () => {
    console.log('[PlaylistDetail] handleShufflePlay called, songs:', songs?.length)
    if (songs.length === 0) {
      console.log('[PlaylistDetail] No songs to shuffle')
      return
    }
    // Shuffle the songs array and play from first
    const shuffled = [...songs].sort(() => Math.random() - 0.5)
    const queueSongs = shuffled.map((s) => ({
      id: s.songId,
      title: s.title,
      imageUrl: s.imageUrl,
      artist: s.artist,
      audioUrl: s.audioUrl,
      duration: s.duration,
    }))
    console.log('[PlaylistDetail] Playing shuffled queue:', queueSongs.map(s => s.title))
    await playList(queueSongs, 0)
  }, [songs, playList])

  const handleRemoveSong = useCallback(
    async (song) => {
      Alert.alert('Remove Song', `Remove "${song.title}" from this playlist?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await removeSongFromPlaylist(playlistId, song.songId)
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to remove song')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove song. Please try again.')
            }
          },
        },
      ])
    },
    [playlistId, removeSongFromPlaylist]
  )

  const handleDeletePlaylist = useCallback(() => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deletePlaylist(playlistId)
              if (result.success) {
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to delete playlist')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete playlist. Please try again.')
            }
          },
        },
      ]
    )
  }, [playlistId, playlist?.name, deletePlaylist, navigation])

  const handleShowOptions = useCallback(() => {
    Alert.alert(playlist?.name || 'Playlist Options', '', [
      { text: 'Delete Playlist', style: 'destructive', onPress: handleDeletePlaylist },
      { text: 'Cancel', style: 'cancel' },
    ])
  }, [playlist?.name, handleDeletePlaylist])

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderSong = ({ item, index }) => (
    <View style={[styles.songRow, { borderBottomColor: colorSet.hairline }]}>
      <TouchableOpacity
        style={styles.songMain}
        onPress={() => handlePlaySong(item, index)}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.songImage} />
        ) : (
          <View style={[styles.songImage, styles.songImagePlaceholder]}>
            <Music size={24} color={colorSet.secondaryText} />
          </View>
        )}
        <View style={styles.songInfo}>
          <Text
            style={[styles.songTitle, { color: colorSet.primaryText }]}
            numberOfLines={1}
          >
            {item.title || 'Untitled'}
          </Text>
          <Text
            style={[styles.songArtist, { color: colorSet.secondaryText }]}
            numberOfLines={1}
          >
            {item.artist || 'Unknown'} • {formatDuration(item.duration)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colorSet.primaryForeground }]}
          onPress={() => handlePlaySong(item, index)}
        >
          <Play size={16} color="#fff" fill="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveSong(item)}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  )

  const renderHeader = () => (
    <View style={styles.playlistHeader}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {playlist?.coverImageUrl ? (
          <Image source={{ uri: playlist.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder, { backgroundColor: colorSet.secondaryBackground }]}>
            <Music size={60} color={colorSet.secondaryText} />
          </View>
        )}
      </View>

      {/* Playlist Info */}
      <Text style={[styles.playlistName, { color: colorSet.primaryText }]}>
        {playlist?.name || playlistName || 'Playlist'}
      </Text>
      {playlist?.description ? (
        <Text style={[styles.playlistDescription, { color: colorSet.secondaryText }]}>
          {playlist.description}
        </Text>
      ) : null}
      <Text style={[styles.songCount, { color: colorSet.secondaryText }]}>
        {songs.length} {songs.length === 1 ? 'song' : 'songs'}
      </Text>

      {/* Playback Controls */}
      {songs.length > 0 && (
        <View style={styles.playbackControls}>
          {/* Shuffle Button */}
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colorSet.secondaryBackground }]}
            onPress={handleShufflePlay}
          >
            <Shuffle size={20} color={colorSet.primaryText} />
          </TouchableOpacity>

          {/* Skip Previous */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: colorSet.secondaryBackground },
              !hasQueue && styles.controlButtonDisabled,
            ]}
            onPress={handleSkipPrevious}
          >
            <SkipBack size={22} color={hasQueue ? colorSet.primaryText : colorSet.grey6} fill={hasQueue ? colorSet.primaryText : colorSet.grey6} />
          </TouchableOpacity>

          {/* Play All Button */}
          <TouchableOpacity
            style={[styles.playAllButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={handlePlayAll}
          >
            <Play size={24} color="#fff" fill="#fff" />
          </TouchableOpacity>

          {/* Skip Next */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: colorSet.secondaryBackground },
              !hasQueue && styles.controlButtonDisabled,
            ]}
            onPress={handleSkipNext}
          >
            <SkipForward size={22} color={hasQueue ? colorSet.primaryText : colorSet.grey6} fill={hasQueue ? colorSet.primaryText : colorSet.grey6} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colorSet.secondaryBackground }]}>
        <Music size={40} color={colorSet.secondaryText} />
      </View>
      <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
        No Songs Yet
      </Text>
      <Text style={[styles.emptyText, { color: colorSet.secondaryText }]}>
        Add songs to your playlist to start listening.
      </Text>
      <TouchableOpacity
        style={[styles.addFirstButton, { backgroundColor: colorSet.primaryForeground }]}
        onPress={handleAddSong}
      >
        <Plus size={18} color="#fff" />
        <Text style={styles.addFirstButtonText}>Add Songs</Text>
      </TouchableOpacity>
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
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colorSet.hairline }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colorSet.primaryText }]}>
            Playlist
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleAddSong} style={styles.headerButton}>
            <Plus size={24} color={colorSet.primaryForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShowOptions} style={styles.headerButton}>
            <MoreVertical size={22} color={colorSet.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {playlistLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSong}
          keyExtractor={(item) => item.songId}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={songs.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  playlistHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  coverContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coverImage: {
    width: 160,
    height: 160,
    borderRadius: 8,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  playlistDescription: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  songCount: {
    fontSize: 14,
    marginBottom: 20,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  playAllButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  songMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginRight: 12,
  },
  songImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  songArtist: {
    fontSize: 13,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    padding: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})

export default PlaylistDetailScreen
