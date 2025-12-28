/**
 * SelectSongForArtworkScreen - Select a song to apply artwork as cover
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Music, Check } from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { subscribeToUserSongs } from '../../services/songsService'
import { applyArtworkToSong, getArtwork } from '../../services/artworkService'

const SelectSongForArtworkScreen = ({ navigation, route }) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  const { artworkId, onSuccess } = route?.params || {}

  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [artwork, setArtwork] = useState(null)
  const [selectedSongId, setSelectedSongId] = useState(null)
  const [applying, setApplying] = useState(false)

  // Fetch artwork info
  useEffect(() => {
    const fetchArtwork = async () => {
      if (artworkId) {
        const result = await getArtwork(artworkId)
        if (result.success) {
          setArtwork(result.artwork)
        }
      }
    }
    fetchArtwork()
  }, [artworkId])

  // Subscribe to user's songs
  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToUserSongs(currentUser.id, (fetchedSongs) => {
      setSongs(fetchedSongs)
      setLoading(false)
    })

    return () => unsubscribe?.()
  }, [currentUser?.id])

  const handleSelectSong = useCallback((song) => {
    setSelectedSongId(selectedSongId === song.id ? null : song.id)
  }, [selectedSongId])

  const handleApply = useCallback(async () => {
    if (!selectedSongId || !artworkId || !currentUser?.id) return

    setApplying(true)
    try {
      const result = await applyArtworkToSong(artworkId, selectedSongId, currentUser.id)
      if (result.success) {
        onSuccess?.()
        navigation.goBack()
      } else {
        Alert.alert('Error', result.error || 'Failed to apply artwork')
      }
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setApplying(false)
    }
  }, [selectedSongId, artworkId, currentUser?.id, onSuccess, navigation])

  const renderSongItem = ({ item }) => {
    const isSelected = selectedSongId === item.id
    return (
      <TouchableOpacity
        style={[
          styles.songItem,
          { backgroundColor: colorSet.grey3 },
          isSelected && { backgroundColor: colorSet.primaryForeground + '20' },
        ]}
        onPress={() => handleSelectSong(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.songImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, { color: colorSet.primaryText }]} numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <Text style={[styles.songStyle, { color: colorSet.secondaryText }]} numberOfLines={1}>
            {item.style || 'No style'}
          </Text>
        </View>
        {isSelected && (
          <View style={[styles.checkCircle, { backgroundColor: colorSet.primaryForeground }]}>
            <Check size={16} color="#fff" strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <Music size={64} color={colorSet.grey6} strokeWidth={1} />
        <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
          No Songs Yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
          Create some songs first to apply artwork as covers
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colorSet.grey3 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colorSet.primaryText }]}>
          Select Song
        </Text>
        <TouchableOpacity
          style={[
            styles.applyButton,
            !selectedSongId && styles.applyButtonDisabled,
          ]}
          onPress={handleApply}
          disabled={!selectedSongId || applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          ) : (
            <Text style={[
              styles.applyText,
              { color: selectedSongId ? colorSet.primaryForeground : colorSet.grey6 },
            ]}>
              Apply
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Artwork Preview */}
      {artwork && (
        <View style={[styles.artworkPreview, { backgroundColor: colorSet.grey3 }]}>
          <Image
            source={{ uri: artwork.thumbnailUrl || artwork.imageUrl }}
            style={styles.artworkImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Text style={[styles.previewText, { color: colorSet.secondaryText }]}>
            Applying artwork as song cover
          </Text>
        </View>
      )}

      {/* Songs List */}
      <FlatList
        data={songs}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  applyButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  artworkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  artworkImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  songStyle: {
    fontSize: 13,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
})

export default SelectSongForArtworkScreen
