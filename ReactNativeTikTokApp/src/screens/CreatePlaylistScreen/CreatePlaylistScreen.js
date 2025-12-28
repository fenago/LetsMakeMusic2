import React, { useState, useLayoutEffect, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
} from 'react-native'
import { Check, Music, Plus, Search, X } from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { usePlaylists } from '../../hooks/usePlaylists'
import { subscribeToUserSongs } from '../../services/songsService'
import { useMediaPlayer } from '../../contexts/MediaPlayerContext'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../core/firebase/config'

const MAX_SONGS_TO_SHOW = 50

const CreatePlaylistScreen = (props) => {
  const { navigation } = props
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID
  const { createPlaylist, addSongToPlaylist } = usePlaylists(userId)
  const { isLiked } = useMediaPlayer()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [userSongs, setUserSongs] = useState([])
  const [publicSongs, setPublicSongs] = useState([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [selectedSongs, setSelectedSongs] = useState([])
  const [showSongPicker, setShowSongPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'New Playlist',
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
        borderBottomColor: colorSet.hairline,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [navigation, colorSet])

  // Load user's songs
  useEffect(() => {
    if (!userId) {
      setSongsLoading(false)
      return
    }

    const unsubscribe = subscribeToUserSongs(userId, (songs) => {
      setUserSongs(songs)
    })

    return () => unsubscribe && unsubscribe()
  }, [userId])

  // Load popular public songs
  useEffect(() => {
    const fetchPublicSongs = async () => {
      setSongsLoading(true)
      try {
        const songsRef = collection(db, 'songs')
        const publicQuery = query(
          songsRef,
          where('isPublic', '==', true),
          orderBy('playCount', 'desc'),
          limit(MAX_SONGS_TO_SHOW)
        )

        const snapshot = await getDocs(publicQuery)
        const songs = []
        snapshot.forEach((doc) => {
          songs.push({ id: doc.id, ...doc.data() })
        })
        setPublicSongs(songs)
      } catch (error) {
        console.warn('[CreatePlaylistScreen] Error fetching public songs:', error)
        // Try without ordering if index doesn't exist
        try {
          const songsRef = collection(db, 'songs')
          const fallbackQuery = query(
            songsRef,
            where('isPublic', '==', true),
            limit(MAX_SONGS_TO_SHOW)
          )
          const snapshot = await getDocs(fallbackQuery)
          const songs = []
          snapshot.forEach((doc) => {
            songs.push({ id: doc.id, ...doc.data() })
          })
          // Sort by playCount client-side
          songs.sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
          setPublicSongs(songs)
        } catch (fallbackError) {
          console.error('[CreatePlaylistScreen] Fallback query also failed:', fallbackError)
        }
      } finally {
        setSongsLoading(false)
      }
    }

    fetchPublicSongs()
  }, [])

  // Combine user's songs and public songs, deduplicated
  const allAvailableSongs = useMemo(() => {
    const songMap = new Map()

    // Add user's songs first (higher priority)
    userSongs.forEach((song) => {
      songMap.set(song.id, { ...song, isOwned: true })
    })

    // Add public songs (if not already in map)
    publicSongs.forEach((song) => {
      if (!songMap.has(song.id)) {
        songMap.set(song.id, { ...song, isOwned: false })
      }
    })

    // Convert to array and sort by playCount
    const songs = Array.from(songMap.values())
    songs.sort((a, b) => (b.playCount || 0) - (a.playCount || 0))

    return songs.slice(0, MAX_SONGS_TO_SHOW)
  }, [userSongs, publicSongs])

  // Filter songs by search query
  const displayedSongs = useMemo(() => {
    if (!searchQuery.trim()) {
      return allAvailableSongs
    }

    const query = searchQuery.toLowerCase().trim()
    return allAvailableSongs.filter((song) => {
      const title = (song.title || '').toLowerCase()
      const artist = (song.artist || song.creatorUsername || '').toLowerCase()
      const style = (song.style || '').toLowerCase()
      return title.includes(query) || artist.includes(query) || style.includes(query)
    })
  }, [allAvailableSongs, searchQuery])

  const toggleSongSelection = useCallback((song) => {
    setSelectedSongs((prev) => {
      const isSelected = prev.find((s) => s.id === song.id)
      if (isSelected) {
        return prev.filter((s) => s.id !== song.id)
      } else {
        return [...prev, song]
      }
    })
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a playlist name')
      return
    }

    if (!userId) {
      Alert.alert('Error', 'Please log in to create playlists')
      return
    }

    setLoading(true)

    try {
      const result = await createPlaylist(name.trim(), description.trim())

      if (result.success) {
        // If songs were selected, add them to the playlist
        if (selectedSongs.length > 0) {
          for (const song of selectedSongs) {
            await addSongToPlaylist(result.playlist.id, {
              songId: song.id,
              title: song.title || 'Untitled',
              imageUrl: song.imageUrl,
              artist: song.artist || song.creatorUsername || currentUser?.username || 'Unknown',
              audioUrl: song.firebaseAudioUrl || song.audioUrl || song.streamUrl,
              duration: song.duration || 0,
            })
          }
        }

        // Navigate to the new playlist detail screen
        navigation.replace('PlaylistDetail', {
          playlistId: result.playlist.id,
          playlistName: result.playlist.name,
        })
      } else {
        Alert.alert('Error', result.error || 'Failed to create playlist')
      }
    } catch (error) {
      console.error('[CreatePlaylistScreen] Error:', error)
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderSongItem = ({ item: song }) => {
    const isSelected = selectedSongs.find((s) => s.id === song.id)

    return (
      <TouchableOpacity
        style={[styles.songItem, isSelected && styles.songItemSelected]}
        onPress={() => toggleSongSelection(song)}
        activeOpacity={0.7}
      >
        <View style={styles.songImageContainer}>
          {song.imageUrl ? (
            <Image source={{ uri: song.imageUrl }} style={styles.songImage} />
          ) : (
            <View style={[styles.songImagePlaceholder, { backgroundColor: colorSet.grey3 }]}>
              <Music size={20} color={colorSet.grey9} />
            </View>
          )}
        </View>
        <View style={styles.songInfo}>
          <Text style={[styles.songTitle, { color: colorSet.primaryText }]} numberOfLines={1}>
            {song.title || 'Untitled'}
          </Text>
          <Text style={[styles.songArtist, { color: colorSet.secondaryText }]} numberOfLines={1}>
            {song.artist || song.creatorUsername || song.style || 'Unknown'}
            {song.playCount ? ` • ${song.playCount} plays` : ''}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Check size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    )
  }

  const styles = getStyles(colorSet)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Playlist Name</Text>
            <TextInput
              style={styles.input}
              placeholder="My Awesome Playlist"
              placeholderTextColor={colorSet.secondaryText}
              value={name}
              onChangeText={setName}
              maxLength={50}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this playlist about?"
              placeholderTextColor={colorSet.secondaryText}
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>

          {/* Add Songs Section */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.addSongsHeader}
              onPress={() => setShowSongPicker(!showSongPicker)}
              activeOpacity={0.7}
            >
              <Text style={styles.label}>
                Add Songs {selectedSongs.length > 0 && `(${selectedSongs.length} selected)`}
              </Text>
              <View style={styles.expandButton}>
                <Plus
                  size={20}
                  color={colorSet.primaryForeground}
                  style={{ transform: [{ rotate: showSongPicker ? '45deg' : '0deg' }] }}
                />
              </View>
            </TouchableOpacity>

            {showSongPicker && (
              <View style={styles.songPickerContainer}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <Search size={18} color={colorSet.secondaryText} />
                  <TextInput
                    style={[styles.searchInput, { color: colorSet.primaryText }]}
                    placeholder="Search songs..."
                    placeholderTextColor={colorSet.secondaryText}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X size={18} color={colorSet.secondaryText} />
                    </TouchableOpacity>
                  )}
                </View>

                {songsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colorSet.primaryForeground} />
                  </View>
                ) : displayedSongs.length > 0 ? (
                  <View style={styles.songListContainer}>
                    <FlatList
                      data={displayedSongs}
                      renderItem={renderSongItem}
                      keyExtractor={(item) => item.id}
                      nestedScrollEnabled={true}
                      ItemSeparatorComponent={() => <View style={styles.separator} />}
                      ListFooterComponent={() => (
                        <Text style={[styles.songCountText, { color: colorSet.secondaryText }]}>
                          {displayedSongs.length} songs • sorted by popularity
                        </Text>
                      )}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colorSet.secondaryText }]}>
                      {searchQuery ? 'No songs match your search' : 'No songs available'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Selected Songs Preview */}
          {selectedSongs.length > 0 && !showSongPicker && (
            <View style={styles.selectedPreview}>
              <Text style={[styles.selectedText, { color: colorSet.secondaryText }]}>
                {selectedSongs.length} song{selectedSongs.length !== 1 ? 's' : ''} will be added
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.createButton,
              (!name.trim() || loading) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>
                Create Playlist{selectedSongs.length > 0 ? ` with ${selectedSongs.length} Songs` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const getStyles = (colorSet) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.primaryBackground,
    },
    scrollView: {
      flex: 1,
    },
    form: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colorSet.primaryText,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colorSet.secondaryBackground,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colorSet.primaryText,
      borderWidth: 1,
      borderColor: colorSet.hairline,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
      paddingTop: 14,
    },
    charCount: {
      fontSize: 12,
      color: colorSet.secondaryText,
      textAlign: 'right',
      marginTop: 4,
    },
    addSongsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    expandButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colorSet.grey3,
      justifyContent: 'center',
      alignItems: 'center',
    },
    songPickerContainer: {
      marginTop: 12,
      backgroundColor: colorSet.secondaryBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colorSet.hairline,
      overflow: 'hidden',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colorSet.hairline,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      padding: 0,
    },
    songListContainer: {
      height: 350,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
    },
    songItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    songItemSelected: {
      backgroundColor: 'rgba(0, 212, 170, 0.1)',
    },
    songImageContainer: {
      width: 44,
      height: 44,
      borderRadius: 6,
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
    songInfo: {
      flex: 1,
      marginLeft: 12,
      marginRight: 12,
    },
    songTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    songArtist: {
      fontSize: 13,
      marginTop: 2,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colorSet.grey6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: '#00D4AA',
      borderColor: '#00D4AA',
    },
    separator: {
      height: 1,
      backgroundColor: colorSet.hairline,
    },
    songCountText: {
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 12,
    },
    selectedPreview: {
      marginBottom: 16,
    },
    selectedText: {
      fontSize: 14,
    },
    createButton: {
      backgroundColor: '#00D4AA',
      borderRadius: 10,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    createButtonDisabled: {
      backgroundColor: '#00D4AA80',
    },
    createButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  })

export default CreatePlaylistScreen
