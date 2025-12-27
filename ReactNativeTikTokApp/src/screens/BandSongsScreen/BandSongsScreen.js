/**
 * BandSongsScreen - Full list of songs shared in a band
 *
 * Shows all songs in the band with options to play or remove them.
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
import { ChevronLeft, Plus, Music, Trash2, Play } from 'lucide-react-native'
import { useTheme, ActivityIndicator } from '../../core/dopebase'
import { useBandSongs } from '../../hooks/useBandSongs'
import { useCurrentUser } from '../../core/onboarding'

const BandSongsScreen = ({ navigation, route }) => {
  const { band } = route.params || {}
  const insets = useSafeAreaInsets()
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  const { songs, songsLoading, removeSong } = useBandSongs(band?.id, currentUser?.id)

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleAddSong = useCallback(() => {
    navigation.navigate('AddSongToBand', { band })
  }, [navigation, band])

  const handlePlaySong = useCallback((song) => {
    // TODO: Integrate with audio player
    console.log('[BandSongsScreen] Play song:', song.id)
  }, [])

  const handleRemoveSong = useCallback(async (song) => {
    Alert.alert(
      'Remove Song',
      `Remove "${song.title}" from the band?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSong(song.id)
            } catch (error) {
              Alert.alert('Error', 'Failed to remove song. Please try again.')
            }
          },
        },
      ],
    )
  }, [removeSong])

  const renderSong = ({ item }) => (
    <View style={[styles.songRow, { borderBottomColor: colorSet.hairline }]}>
      <TouchableOpacity
        style={styles.songMain}
        onPress={() => handlePlaySong(item)}>
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
            {item.artist || 'Unknown Artist'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colorSet.primaryForeground }]}
          onPress={() => handlePlaySong(item)}>
          <Play size={16} color="#fff" fill="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveSong(item)}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
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
        Add songs to collaborate with your band members.
      </Text>
      <TouchableOpacity
        style={[styles.addFirstButton, { backgroundColor: colorSet.primaryForeground }]}
        onPress={handleAddSong}>
        <Plus size={18} color="#fff" />
        <Text style={styles.addFirstButtonText}>Add First Song</Text>
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
            Band Songs
          </Text>
          <Text style={[styles.headerSubtitle, { color: colorSet.secondaryText }]}>
            {band?.name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleAddSong} style={styles.addButton}>
          <Plus size={24} color={colorSet.primaryForeground} />
        </TouchableOpacity>
      </View>

      {songsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSong}
          keyExtractor={(item) => item.id}
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
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
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

export default BandSongsScreen
