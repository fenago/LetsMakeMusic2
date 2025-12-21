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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import ffirestore from '@react-native-firebase/firestore'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useTheme, useTranslations } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { subscribeToUserSongs, deleteSong } from '../../services/songsService'
import { useMediaPlayer } from '../../contexts/MediaPlayerContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2 // 2 columns with padding

// Filter tabs for the Library
const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'songs', label: 'Songs' },
  { id: 'ai', label: 'AI Created' },
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
  const { playSong } = useMediaPlayer()

  const [activeTab, setActiveTab] = useState('all')
  const [sortOption, setSortOption] = useState('recent')
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingSong, setEditingSong] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStyle, setEditStyle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const colorSet = theme.colors[appearance]

  // Subscribe to user's songs from Firebase
  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToUserSongs(currentUser.id, (userSongs) => {
      setSongs(userSongs)
      setLoading(false)
    })

    return () => unsubscribe && unsubscribe()
  }, [currentUser?.id])

  // Filter songs based on active tab
  const filteredSongs = useCallback(() => {
    switch (activeTab) {
      case 'songs':
      case 'ai':
        return songs // All songs are AI created for now
      case 'playlists':
        return [] // Playlists feature coming soon
      case 'videos':
        return [] // Filter by videos when available
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
              await deleteSong(song.id, currentUser?.id)
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
      options.unshift({
        text: 'Play',
        onPress: () => handleSongPress(song),
      })
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
    // TODO: Open new playlist modal
    console.log('Create new playlist')
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colorSet.primaryText }]}>
        {localized('Library')}
      </Text>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => navigation.navigate('Discover')}>
        <Image
          source={theme.icons.search}
          style={[styles.searchIcon, { tintColor: colorSet.primaryText }]}
        />
      </TouchableOpacity>
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

  const renderSortBar = () => (
    <View style={styles.sortBar}>
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortMenu(!showSortMenu)}>
        <Text style={[styles.sortText, { color: colorSet.primaryText }]}>
          {SORT_OPTIONS.find((o) => o.id === sortOption)?.label}
        </Text>
        <Text style={[styles.sortArrow, { color: colorSet.secondaryText }]}>
          ▼
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.listViewButton}>
        <Image
          source={theme.icons.libraryLandscape}
          style={[styles.listIcon, { tintColor: colorSet.secondaryText }]}
        />
      </TouchableOpacity>
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

  // Handle edit song - open modal with all metadata
  const handleEditSong = (song) => {
    setEditingSong(song)
    setEditTitle(song.title || '')
    setEditStyle(song.style || '')
    setEditModalVisible(true)
  }

  // Save edited song
  const handleSaveEdit = async () => {
    if (!editingSong) return

    setIsSaving(true)
    try {
      const { songsRef } = require('../../services/songsService')
      const updates = {}

      if (editTitle.trim() !== editingSong.title) {
        updates.title = editTitle.trim()
      }
      if (editStyle.trim() !== editingSong.style) {
        updates.style = editStyle.trim()
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = ffirestore.FieldValue.serverTimestamp()
        await songsRef.doc(editingSong.id).update(updates)
        console.log('Song updated:', editingSong.id, updates)
      }

      setEditModalVisible(false)
      setEditingSong(null)
    } catch (error) {
      console.error('Error updating song:', error)
      Alert.alert('Error', 'Failed to update song.')
    } finally {
      setIsSaving(false)
    }
  }

  // Render metadata row
  const MetadataRow = ({ label, value, copyable = false }) => (
    <View style={styles.metadataRow}>
      <Text style={[styles.metadataLabel, { color: colorSet.secondaryText }]}>{label}</Text>
      <Text
        style={[styles.metadataValue, { color: colorSet.primaryText }]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value || 'N/A'}
      </Text>
    </View>
  )

  const renderSongItem = ({ item: song, index }) => {
    const isPlayable = isSongPlayable(song)

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={styles.gridItem}>
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
            {/* Play indicator overlay */}
            <View style={styles.playOverlay}>
              {isPlayable ? (
                <View style={styles.playButton}>
                  <Image
                    source={theme.icons.playButton}
                    style={styles.playIcon}
                  />
                </View>
              ) : (
                <View style={styles.unavailableBadge}>
                  <Text style={styles.unavailableText}>Unavailable</Text>
                </View>
              )}
            </View>
          </View>

          {/* Song info row with edit/delete buttons */}
          <View style={styles.songInfoRow}>
            <View style={styles.songTextContainer}>
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
            </View>

            {/* Edit and Delete buttons */}
            <View style={styles.songActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditSong(song)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteSong(song)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.actionIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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

  const renderSongsGrid = () => {
    const sorted = sortedSongs()

    if (sorted.length === 0) {
      return renderEmptyState()
    }

    return (
      <FlatList
        data={sorted}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
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
      ]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {renderHeader()}
        {renderTabs()}
        {renderSortBar()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorSet.primaryForeground} />
          </View>
        ) : (
          renderSongsGrid()
        )}
      </ScrollView>

      {/* FAB - Create Song */}
      <TouchableOpacity
        style={[styles.fab, styles.fabSong, { backgroundColor: '#3875e8' }]}
        onPress={() => navigation.navigate('Create')}>
        <Text style={styles.fabEmoji}>🎵</Text>
        <Text style={styles.fabText}>Create Song</Text>
      </TouchableOpacity>

      {/* FAB - New Playlist */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colorSet.primaryForeground }]}
        onPress={handleNewPlaylist}>
        <Image
          source={theme.icons.add}
          style={styles.fabIcon}
        />
        <Text style={styles.fabText}>New Playlist</Text>
      </TouchableOpacity>

      {/* Edit Song Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colorSet.primaryBackground }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colorSet.grey3 }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: colorSet.secondaryText }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colorSet.primaryText }]}>Edit Song</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colorSet.primaryForeground} />
              ) : (
                <Text style={[styles.modalSaveText, { color: colorSet.primaryForeground }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {editingSong && (
              <>
                {/* Song Cover Image */}
                <View style={styles.editImageContainer}>
                  {editingSong.imageUrl ? (
                    <Image
                      source={{ uri: editingSong.imageUrl }}
                      style={styles.editSongImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.editSongImagePlaceholder, { backgroundColor: colorSet.grey3 }]}>
                      <Image
                        source={theme.icons.musicalNotes}
                        style={[styles.editPlaceholderIcon, { tintColor: colorSet.grey9 }]}
                      />
                    </View>
                  )}
                </View>

                {/* Editable Fields */}
                <View style={styles.editSection}>
                  <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Editable</Text>

                  <View style={styles.editField}>
                    <Text style={[styles.editFieldLabel, { color: colorSet.secondaryText }]}>Title</Text>
                    <TextInput
                      style={[styles.editInput, {
                        color: colorSet.primaryText,
                        backgroundColor: colorSet.grey3,
                        borderColor: colorSet.grey6,
                      }]}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Song title"
                      placeholderTextColor={colorSet.secondaryText}
                    />
                  </View>

                  <View style={styles.editField}>
                    <Text style={[styles.editFieldLabel, { color: colorSet.secondaryText }]}>Style / Genre</Text>
                    <TextInput
                      style={[styles.editInput, {
                        color: colorSet.primaryText,
                        backgroundColor: colorSet.grey3,
                        borderColor: colorSet.grey6,
                      }]}
                      value={editStyle}
                      onChangeText={setEditStyle}
                      placeholder="e.g., Pop, Rock, Jazz"
                      placeholderTextColor={colorSet.secondaryText}
                    />
                  </View>
                </View>

                {/* Read-Only Metadata */}
                <View style={styles.editSection}>
                  <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Song Info</Text>
                  <MetadataRow label="Duration" value={formatDuration(editingSong.duration)} />
                  <MetadataRow label="Instrumental" value={editingSong.instrumental ? 'Yes' : 'No'} />
                  <MetadataRow label="AI Model" value={editingSong.model || editingSong.sunoModelName || 'Unknown'} />
                  <MetadataRow label="Play Count" value={String(editingSong.playCount || 0)} />
                  <MetadataRow label="Likes" value={String(editingSong.likeCount || 0)} />
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Dates</Text>
                  <MetadataRow label="Created" value={formatDate(editingSong.createdAt)} />
                  <MetadataRow label="Updated" value={formatDate(editingSong.updatedAt)} />
                  {editingSong.sunoCreatedAt && (
                    <MetadataRow label="Suno Created" value={editingSong.sunoCreatedAt} />
                  )}
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Technical IDs</Text>
                  <MetadataRow label="Firebase ID" value={editingSong.id} />
                  <MetadataRow label="Suno ID" value={editingSong.sunoId} />
                  <MetadataRow label="User ID" value={editingSong.userId} />
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Audio URLs</Text>
                  <MetadataRow label="Suno CDN" value={editingSong.sunoId ? `cdn1.suno.ai/${editingSong.sunoId}.mp3` : 'N/A'} />
                  <MetadataRow label="Firebase Backup" value={editingSong.firebaseAudioUrl ? 'Available' : 'Not backed up'} />
                  <MetadataRow label="Stream URL" value={editingSong.streamUrl} />
                  <MetadataRow label="Audio URL" value={editingSong.audioUrl} />
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Lyrics</Text>
                  <MetadataRow label="Has Raw Lyrics" value={editingSong.rawLyrics ? 'Yes' : 'No'} />
                  <MetadataRow label="Timestamped Lines" value={String(editingSong.timestampedLyrics?.length || 0)} />
                  {editingSong.rawLyrics && (
                    <View style={[styles.lyricsPreview, { backgroundColor: colorSet.grey3 }]}>
                      <Text
                        style={[styles.lyricsPreviewText, { color: colorSet.secondaryText }]}
                        numberOfLines={6}
                      >
                        {editingSong.rawLyrics}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.editSection}>
                  <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Visibility</Text>
                  <MetadataRow label="Public" value={editingSong.isPublic ? 'Yes' : 'No'} />
                  <MetadataRow label="Deleted" value={editingSong.isDeleted ? 'Yes' : 'No'} />
                </View>

                {/* Danger Zone */}
                <View style={[styles.editSection, styles.dangerSection]}>
                  <Text style={[styles.editSectionTitle, { color: '#ff4444' }]}>Danger Zone</Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      setEditModalVisible(false)
                      handleDeleteSong(editingSong)
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete Song</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom padding */}
                <View style={{ height: 50 }} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortArrow: {
    fontSize: 10,
    marginLeft: 4,
  },
  listViewButton: {
    padding: 8,
  },
  listIcon: {
    width: 24,
    height: 24,
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
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
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 20,
    height: 20,
    tintColor: '#000',
    marginLeft: 2,
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
    padding: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
  deleteButton: {
    // Slightly separated from edit
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
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
    marginRight: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fabSong: {
    bottom: 156, // Position above the playlist FAB
  },
  fabEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  // Edit Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
    minWidth: 60,
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  editSongImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  editSongImagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPlaceholderIcon: {
    width: 60,
    height: 60,
  },
  editSection: {
    marginBottom: 24,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  editField: {
    marginBottom: 16,
  },
  editFieldLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  editInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  metadataLabel: {
    fontSize: 14,
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  lyricsPreview: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  lyricsPreviewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dangerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.3)',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default LibraryScreen
