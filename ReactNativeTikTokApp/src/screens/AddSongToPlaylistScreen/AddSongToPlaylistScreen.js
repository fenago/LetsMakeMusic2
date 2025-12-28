/**
 * AddSongToPlaylistScreen - Pick songs to add to a playlist
 *
 * Displays user's songs and liked songs for adding to playlists.
 */

import React, { useCallback, useEffect, useState } from 'react'
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
import { ChevronLeft, Check, Music, Plus, Heart, User } from 'lucide-react-native'
import { useTheme, ActivityIndicator } from '../../core/dopebase'
import { usePlaylist, usePlaylists } from '../../hooks/usePlaylists'
import { useCurrentUser } from '../../core/onboarding'
import { subscribeToUserSongs, subscribeToLikedSongs } from '../../services/songsService'

const TABS = [
  { id: 'my-songs', label: 'My Songs', icon: User },
  { id: 'liked', label: 'Liked', icon: Heart },
]

const AddSongToPlaylistScreen = ({ navigation, route }) => {
  const { playlistId, playlistName } = route.params || {}
  const insets = useSafeAreaInsets()
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  const [activeTab, setActiveTab] = useState('my-songs')
  const [userSongs, setUserSongs] = useState([])
  const [likedSongs, setLikedSongs] = useState([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [addingIds, setAddingIds] = useState(new Set())

  const { playlist } = usePlaylist(userId, playlistId)
  const { addSongToPlaylist } = usePlaylists(userId)

  // Get set of song IDs already in playlist for quick lookup
  const playlistSongIds = new Set((playlist?.songs || []).map((s) => s.songId))

  // Subscribe to user's songs
  useEffect(() => {
    if (!userId) return

    setSongsLoading(true)
    const unsubscribe = subscribeToUserSongs(userId, (songs) => {
      setUserSongs(songs || [])
      setSongsLoading(false)
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [userId])

  // Subscribe to liked songs
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToLikedSongs(userId, (songs) => {
      setLikedSongs(songs || [])
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [userId])

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleAddSong = useCallback(
    async (song) => {
      if (playlistSongIds.has(song.id)) {
        Alert.alert('Already Added', 'This song is already in the playlist.')
        return
      }

      setAddingIds((prev) => new Set(prev).add(song.id))

      try {
        const result = await addSongToPlaylist(playlistId, song)
        if (result.alreadyExists) {
          Alert.alert('Already Added', 'This song is already in the playlist.')
        } else if (result.success) {
          // Success feedback - no alert to keep flow smooth
        } else {
          Alert.alert('Error', result.error || 'Failed to add song')
        }
      } catch (error) {
        console.error('[AddSongToPlaylistScreen] Error adding song:', error)
        Alert.alert('Error', error.message || 'Failed to add song. Please try again.')
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev)
          next.delete(song.id)
          return next
        })
      }
    },
    [addSongToPlaylist, playlistId, playlistSongIds]
  )

  const currentSongs = activeTab === 'my-songs' ? userSongs : likedSongs

  const renderSong = ({ item }) => {
    const isInPlaylist = playlistSongIds.has(item.id)
    const isAdding = addingIds.has(item.id)

    return (
      <View style={[styles.songRow, { borderBottomColor: colorSet.hairline }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.songImage} />
        ) : (
          <View style={[styles.songImage, styles.songImagePlaceholder, { backgroundColor: colorSet.secondaryBackground }]}>
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
            {item.artist || item.author?.stageName || item.style || 'Unknown Artist'}
          </Text>
        </View>
        {isInPlaylist ? (
          <View
            style={[styles.addedBadge, { backgroundColor: colorSet.secondaryBackground }]}
          >
            <Check size={16} color={colorSet.primaryForeground} />
            <Text style={[styles.addedText, { color: colorSet.primaryForeground }]}>
              Added
            </Text>
          </View>
        ) : isAdding ? (
          <View style={styles.addingContainer}>
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={() => handleAddSong(item)}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colorSet.secondaryBackground }]}>
        <Music size={40} color={colorSet.secondaryText} />
      </View>
      <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
        {activeTab === 'my-songs' ? 'No Songs Yet' : 'No Liked Songs'}
      </Text>
      <Text style={[styles.emptyText, { color: colorSet.secondaryText }]}>
        {activeTab === 'my-songs'
          ? 'Create some songs first, then you can add them to your playlist.'
          : 'Like some songs to add them to your playlist.'}
      </Text>
    </View>
  )

  const renderTab = (tab) => {
    const isActive = activeTab === tab.id
    const Icon = tab.icon

    return (
      <TouchableOpacity
        key={tab.id}
        style={[
          styles.tab,
          isActive && { backgroundColor: colorSet.primaryForeground },
        ]}
        onPress={() => setActiveTab(tab.id)}
      >
        <Icon
          size={18}
          color={isActive ? '#fff' : colorSet.secondaryText}
        />
        <Text
          style={[
            styles.tabText,
            { color: isActive ? '#fff' : colorSet.secondaryText },
          ]}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    )
  }

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
            Add Songs
          </Text>
          <Text style={[styles.headerSubtitle, { color: colorSet.secondaryText }]}>
            {playlistName || 'Playlist'}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colorSet.hairline }]}>
        {TABS.map(renderTab)}
      </View>

      {songsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      ) : (
        <FlatList
          data={currentSongs}
          renderItem={renderSong}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            currentSongs.length === 0 ? styles.emptyList : styles.listContent
          }
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
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  addedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addingContainer: {
    width: 80,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
})

export default AddSongToPlaylistScreen
