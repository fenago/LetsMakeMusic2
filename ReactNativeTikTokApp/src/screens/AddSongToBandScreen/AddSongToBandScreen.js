/**
 * AddSongToBandScreen - Pick songs to add to a band
 *
 * Displays user's songs and allows them to add to the band.
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
import { ChevronLeft, Check, Music, Plus } from 'lucide-react-native'
import { useTheme, ActivityIndicator } from '../../core/dopebase'
import { useBandSongs } from '../../hooks/useBandSongs'
import { useCurrentUser } from '../../core/onboarding'
import { subscribeToUserSongs } from '../../services/songsService'

const AddSongToBandScreen = ({ navigation, route }) => {
  const { band } = route.params || {}
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()
  const colorSet = theme.colors[theme.appearance]
  const currentUser = useCurrentUser()

  const [userSongs, setUserSongs] = useState([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [addingIds, setAddingIds] = useState(new Set())

  const { songs: bandSongs, addSong } = useBandSongs(band?.id, currentUser?.id)

  // Get set of song IDs already in band for quick lookup
  const bandSongIds = new Set(bandSongs.map(s => s.songId || s.id))

  // Subscribe to user's songs
  useEffect(() => {
    if (!currentUser?.id) return

    setSongsLoading(true)
    const unsubscribe = subscribeToUserSongs(currentUser.id, (songs) => {
      setUserSongs(songs || [])
      setSongsLoading(false)
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [currentUser?.id])

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleAddSong = useCallback(async (song) => {
    if (bandSongIds.has(song.id)) {
      Alert.alert('Already Added', 'This song is already in the band.')
      return
    }

    setAddingIds(prev => new Set(prev).add(song.id))

    try {
      await addSong(song)
      // Show success feedback
      Alert.alert('Success', `"${song.title}" added to band!`)
    } catch (error) {
      console.error('[AddSongToBandScreen] Error adding song:', error)
      Alert.alert('Error', error.message || 'Failed to add song. Please try again.')
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev)
        next.delete(song.id)
        return next
      })
    }
  }, [addSong, bandSongIds])

  const renderSong = ({ item }) => {
    const isInBand = bandSongIds.has(item.id)
    const isAdding = addingIds.has(item.id)

    return (
      <View style={[styles.songRow, { borderBottomColor: colorSet.hairline }]}>
        <Image
          source={{
            uri: item.imageUrl ||
              'https://via.placeholder.com/60x60?text=Song',
          }}
          style={styles.songImage}
        />
        <View style={styles.songInfo}>
          <Text
            style={[styles.songTitle, { color: colorSet.primaryText }]}
            numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <Text
            style={[styles.songArtist, { color: colorSet.secondaryText }]}
            numberOfLines={1}>
            {item.artist || item.author?.stageName || 'Unknown Artist'}
          </Text>
        </View>
        {isInBand ? (
          <View style={[styles.addedBadge, { backgroundColor: colorSet.secondaryBackground }]}>
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
            onPress={() => handleAddSong(item)}>
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
        No Songs Yet
      </Text>
      <Text style={[styles.emptyText, { color: colorSet.secondaryText }]}>
        Create some songs first, then you can share them with your band.
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colorSet.primaryForeground }]}
        onPress={() => navigation.navigate('Create')}>
        <Plus size={18} color="#fff" />
        <Text style={styles.createButtonText}>Create Song</Text>
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
      ]}>
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
            {band?.name}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colorSet.secondaryBackground }]}>
        <Text style={[styles.infoText, { color: colorSet.secondaryText }]}>
          Choose songs from your library to share with the band
        </Text>
      </View>

      {songsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      ) : (
        <FlatList
          data={userSongs}
          renderItem={renderSong}
          keyExtractor={(item) => item.id}
          contentContainerStyle={userSongs.length === 0 ? styles.emptyList : styles.listContent}
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
  infoBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})

export default AddSongToBandScreen
