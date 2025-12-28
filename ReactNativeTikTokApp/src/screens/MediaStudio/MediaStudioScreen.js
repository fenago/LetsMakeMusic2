/**
 * MediaStudioScreen - Unified media management screen
 *
 * Features:
 * - View all video clips AND artwork in one place
 * - Filter by type (All, Videos, Images)
 * - Search functionality
 * - Create new media (AI Video, AI Image, Stock Photo)
 * - Apply media to songs/bands
 * - Grid/List view toggle
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft,
  Plus,
  Sparkles,
  ImageIcon,
  Film,
  Grid,
  List,
  Search,
  X,
} from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { useArtwork } from '../../hooks/useArtwork'
import { useVideoClips } from '../../hooks/useVideoClips'
import ArtworkCard from '../../components/ui/ArtworkCard'
import ArtworkListItem from '../../components/ui/ArtworkListItem'
import ArtworkGeneratorModal from '../../components/ui/ArtworkGeneratorModal'
import StockMediaBrowser from '../../components/ui/StockMediaBrowser'
import VideoGeneratorModal from '../../components/ui/VideoGeneratorModal'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_PADDING = 16
const GRID_GAP = 12
const NUM_COLUMNS = 3
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

// Filter options
const FILTER_OPTIONS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'videos', label: 'Videos', icon: Film },
  { key: 'images', label: 'Images', icon: ImageIcon },
]

const MediaStudioScreen = ({ navigation, route }) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()
  const searchInputRef = useRef(null)

  // Get callback params if navigated from song/band selection
  const { selectMode, onSelect, songId, bandId, mediaType, openGenerator } = route?.params || {}

  // Artwork state
  const {
    artwork,
    artworkLoading,
    artworkError,
    saveArtwork,
    deleteArtwork,
    applyToSong: applyArtworkToSong,
    applyToBand: applyArtworkToBand,
    applyAsProfile,
    clearError: clearArtworkError,
  } = useArtwork(currentUser?.id, {
    id: currentUser?.id,
    stageName: currentUser?.firstName || currentUser?.stageName || 'Unknown',
    profilePictureURL: currentUser?.profilePictureURL,
  })

  // Video clips state
  const {
    videoClips,
    completedClips,
    pendingClips,
    videoClipsLoading,
    videoClipsError,
    saveVideoClip,
    deleteVideoClip,
    applyToSong: applyVideoToSong,
    clearError: clearVideoError,
  } = useVideoClips(currentUser?.id, {
    id: currentUser?.id,
    stageName: currentUser?.firstName || currentUser?.stageName || 'Unknown',
    profilePictureURL: currentUser?.profilePictureURL,
  })

  // Local state
  const [filter, setFilter] = useState(mediaType === 'video' ? 'videos' : mediaType === 'image' ? 'images' : 'all')
  const [viewMode, setViewMode] = useState('grid')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showImageGenerator, setShowImageGenerator] = useState(false)
  const [showVideoGenerator, setShowVideoGenerator] = useState(false)
  const [showStockBrowser, setShowStockBrowser] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [editMode, setEditMode] = useState(false)

  // Auto-open generator if requested
  useEffect(() => {
    if (openGenerator === 'video') {
      setShowVideoGenerator(true)
    } else if (openGenerator === 'image') {
      setShowImageGenerator(true)
    }
  }, [openGenerator])

  // Combine and normalize media items
  const allMedia = useMemo(() => {
    const normalizedArtwork = artwork.map((item) => ({
      ...item,
      mediaType: 'image',
      displayTitle: item.prompt || (item.photographer ? `by ${item.photographer}` : 'Untitled'),
      displaySubtitle: item.style || (item.source === 'generated' ? 'AI Created' : 'Stock Photo'),
      thumbnailUrl: item.thumbnailUrl || item.imageUrl,
      sortDate: item.createdAt?.toDate?.() || new Date(item.createdAt) || new Date(0),
    }))

    const normalizedVideos = completedClips.map((item) => ({
      ...item,
      mediaType: 'video',
      displayTitle: item.prompt || 'Untitled Video',
      displaySubtitle: item.modelName || `${item.duration || 8}s • AI Generated`,
      thumbnailUrl: item.thumbnailUrl,
      sortDate: item.createdAt?.toDate?.() || new Date(item.createdAt) || new Date(0),
    }))

    // Combine and sort by date (newest first)
    return [...normalizedArtwork, ...normalizedVideos].sort(
      (a, b) => b.sortDate - a.sortDate
    )
  }, [artwork, completedClips])

  // Filtered and searched media
  const filteredMedia = useMemo(() => {
    let result = allMedia

    // Apply type filter
    if (filter === 'videos') {
      result = result.filter((item) => item.mediaType === 'video')
    } else if (filter === 'images') {
      result = result.filter((item) => item.mediaType === 'image')
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.displayTitle?.toLowerCase().includes(query) ||
          item.displaySubtitle?.toLowerCase().includes(query) ||
          item.prompt?.toLowerCase().includes(query) ||
          item.style?.toLowerCase().includes(query)
      )
    }

    return result
  }, [allMedia, filter, searchQuery])

  // Handle create options
  const handleCreatePress = useCallback(() => {
    Alert.alert(
      'Create Media',
      'Choose what you want to create',
      [
        {
          text: 'AI Video (Veo 3.1)',
          onPress: () => setShowVideoGenerator(true),
        },
        {
          text: 'AI Image (Imagen)',
          onPress: () => setShowImageGenerator(true),
        },
        {
          text: 'Browse Stock Photos',
          onPress: () => setShowStockBrowser(true),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    )
  }, [])

  // Handle AI image generation complete
  const handleImageGenerated = useCallback(async (artworkData) => {
    const result = await saveArtwork(artworkData)
    if (result.success) {
      setShowImageGenerator(false)
    } else {
      Alert.alert('Error', result.error || 'Failed to save artwork')
    }
  }, [saveArtwork])

  // Handle AI video generation complete
  const handleVideoGenerated = useCallback(async (videoData) => {
    const result = await saveVideoClip(videoData)
    if (result.success) {
      setShowVideoGenerator(false)
    } else {
      Alert.alert('Error', result.error || 'Failed to save video clip')
    }
  }, [saveVideoClip])

  // Handle stock photo selection
  const handleStockSelect = useCallback(async (photoData) => {
    const result = await saveArtwork(photoData)
    if (result.success) {
      setShowStockBrowser(false)
    } else {
      Alert.alert('Error', result.error || 'Failed to save artwork')
    }
  }, [saveArtwork])

  // Handle media press (selection mode or detail view)
  const handleMediaPress = useCallback((item) => {
    if (selectMode) {
      setSelectedMedia(selectedMedia?.id === item.id ? null : item)
    } else {
      // Navigate to appropriate detail view
      if (item.mediaType === 'video') {
        navigation.navigate('VideoClipDetail', { clipId: item.id })
      } else {
        navigation.navigate('ArtworkDetail', { artworkId: item.id })
      }
    }
  }, [selectMode, selectedMedia, navigation])

  // Handle media long press
  const handleMediaLongPress = useCallback((item) => {
    const options = [
      {
        text: 'Use as Song Cover',
        onPress: () => {
          if (item.mediaType === 'video') {
            Alert.alert('Note', 'Video clips can be used as song videos, not cover art. Use an image for cover art.')
          } else {
            navigation.navigate('SelectSongForArtwork', { artworkId: item.id })
          }
        },
      },
    ]

    if (item.mediaType === 'image') {
      options.push({
        text: 'Use as Profile Picture',
        onPress: async () => {
          const result = await applyAsProfile(item.id)
          if (result.success) {
            Alert.alert('Success', 'Profile picture updated!')
          } else {
            Alert.alert('Error', result.error)
          }
        },
      })
    }

    if (item.mediaType === 'video') {
      options.push({
        text: 'Use as Song Video',
        onPress: () => {
          navigation.navigate('SelectSongForVideoClip', { clipId: item.id })
        },
      })
    }

    options.push(
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(item),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      }
    )

    Alert.alert(
      item.mediaType === 'video' ? 'Video Options' : 'Image Options',
      'What would you like to do?',
      options
    )
  }, [navigation, applyAsProfile])

  // Confirm delete
  const confirmDelete = useCallback((item) => {
    const typeLabel = item.mediaType === 'video' ? 'video' : 'artwork'
    Alert.alert(
      `Delete ${item.mediaType === 'video' ? 'Video' : 'Artwork'}`,
      `Are you sure you want to delete this ${typeLabel}? This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item.mediaType === 'video') {
              const result = await deleteVideoClip(item.id)
              if (!result.success) {
                Alert.alert('Error', result.error)
              }
            } else {
              const result = await deleteArtwork(item.id)
              if (!result.success) {
                Alert.alert('Error', result.error)
              }
            }
          },
        },
      ]
    )
  }, [deleteVideoClip, deleteArtwork])

  // Handle selection confirm
  const handleConfirmSelection = useCallback(async () => {
    if (!selectedMedia) return

    if (selectedMedia.mediaType === 'video') {
      if (songId) {
        const result = await applyVideoToSong(selectedMedia.id, songId)
        if (result.success) {
          onSelect?.(selectedMedia)
          navigation.goBack()
        } else {
          Alert.alert('Error', result.error)
        }
      } else {
        onSelect?.(selectedMedia)
        navigation.goBack()
      }
    } else {
      if (songId) {
        const result = await applyArtworkToSong(selectedMedia.id, songId)
        if (result.success) {
          onSelect?.(selectedMedia)
          navigation.goBack()
        } else {
          Alert.alert('Error', result.error)
        }
      } else if (bandId) {
        const result = await applyArtworkToBand(selectedMedia.id, bandId)
        if (result.success) {
          onSelect?.(selectedMedia)
          navigation.goBack()
        } else {
          Alert.alert('Error', result.error)
        }
      } else {
        onSelect?.(selectedMedia)
        navigation.goBack()
      }
    }
  }, [selectedMedia, songId, bandId, applyVideoToSong, applyArtworkToSong, applyArtworkToBand, onSelect, navigation])

  // Toggle search
  const toggleSearch = useCallback(() => {
    if (showSearch) {
      setShowSearch(false)
      setSearchQuery('')
      Keyboard.dismiss()
    } else {
      setShowSearch(true)
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [showSearch])

  // Render media item with video badge for videos
  const renderMediaItem = useCallback(({ item }) => {
    // Use ArtworkCard for both, but add video overlay for videos
    return (
      <View style={styles.mediaItemWrapper}>
        <ArtworkCard
          artwork={{
            ...item,
            imageUrl: item.thumbnailUrl,
            source: item.mediaType === 'video' ? 'video' : item.source,
          }}
          onPress={() => handleMediaPress(item)}
          onLongPress={() => handleMediaLongPress(item)}
          onDelete={() => confirmDelete(item)}
          isSelected={selectMode && selectedMedia?.id === item.id}
          size={ITEM_SIZE}
          showUsage={!selectMode && !editMode}
          showDeleteButton={editMode && !selectMode}
        />
        {/* Video type badge */}
        {item.mediaType === 'video' && (
          <View style={styles.videoBadge}>
            <Film size={12} color="#fff" />
            {item.duration && (
              <Text style={styles.videoDurationText}>{item.duration}s</Text>
            )}
          </View>
        )}
      </View>
    )
  }, [handleMediaPress, handleMediaLongPress, confirmDelete, selectMode, selectedMedia, editMode])

  // Render list item
  const renderListItem = useCallback(({ item }) => (
    <View style={styles.listItemWrapper}>
      <ArtworkListItem
        artwork={{
          ...item,
          imageUrl: item.thumbnailUrl,
          source: item.mediaType === 'video' ? 'video' : item.source,
          prompt: item.displayTitle,
          style: item.displaySubtitle,
        }}
        onPress={() => handleMediaPress(item)}
        onLongPress={() => handleMediaLongPress(item)}
        onDelete={() => confirmDelete(item)}
        isSelected={selectMode && selectedMedia?.id === item.id}
        showUsage={!selectMode && !editMode}
        showDeleteButton={editMode && !selectMode}
      />
      {/* Video indicator in list view */}
      {item.mediaType === 'video' && (
        <View style={styles.listVideoBadge}>
          <Film size={14} color="#3b82f6" />
        </View>
      )}
    </View>
  ), [handleMediaPress, handleMediaLongPress, confirmDelete, selectMode, selectedMedia, editMode])

  // Render header with filters and search
  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Search Bar (when active) */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colorSet.grey3 }]}>
          <Search size={18} color={colorSet.secondaryText} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colorSet.primaryText }]}
            placeholder="Search media..."
            placeholderTextColor={colorSet.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colorSet.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Row with View Toggle */}
      <View style={styles.filterRow}>
        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {FILTER_OPTIONS.map((option) => {
            const Icon = option.icon
            const count = option.key === 'all'
              ? allMedia.length
              : option.key === 'videos'
                ? completedClips.length
                : artwork.length
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filter === option.key
                      ? colorSet.primaryForeground
                      : colorSet.grey3,
                  },
                ]}
                onPress={() => setFilter(option.key)}
              >
                {Icon && (
                  <Icon
                    size={14}
                    color={filter === option.key ? '#fff' : colorSet.primaryText}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[
                  styles.filterText,
                  {
                    color: filter === option.key ? '#fff' : colorSet.primaryText,
                  },
                ]}>
                  {option.label} ({count})
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* View Mode Toggle */}
        <View style={[styles.viewToggle, { backgroundColor: colorSet.grey3 }]}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'grid' && { backgroundColor: colorSet.primaryForeground },
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Grid size={18} color={viewMode === 'grid' ? '#fff' : colorSet.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'list' && { backgroundColor: colorSet.primaryForeground },
            ]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? '#fff' : colorSet.secondaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pending videos indicator */}
      {pendingClips.length > 0 && (
        <View style={[styles.pendingBanner, { backgroundColor: colorSet.grey3 }]}>
          <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          <Text style={[styles.pendingText, { color: colorSet.primaryText }]}>
            {pendingClips.length} video{pendingClips.length > 1 ? 's' : ''} generating...
          </Text>
        </View>
      )}

      {/* Results count */}
      {searchQuery.trim() && (
        <Text style={[styles.resultsText, { color: colorSet.secondaryText }]}>
          {filteredMedia.length} result{filteredMedia.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Text>
      )}
    </View>
  )

  // Render empty state
  const renderEmpty = () => {
    const isLoading = artworkLoading || videoClipsLoading
    const hasError = artworkError || videoClipsError

    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      )
    }

    if (hasError) {
      return (
        <View style={styles.emptyContainer}>
          <ImageIcon size={64} color="#ef4444" strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
            Something Went Wrong
          </Text>
          <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
            {artworkError || videoClipsError}
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={() => {
              clearArtworkError?.()
              clearVideoError?.()
            }}
          >
            <Text style={styles.emptyButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={64} color={colorSet.grey6} strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
            No Results Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
            Try a different search term
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconRow}>
          <Film size={48} color={colorSet.grey6} strokeWidth={1} />
          <ImageIcon size={48} color={colorSet.grey6} strokeWidth={1} />
        </View>
        <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
          No Media Yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
          Create AI videos, generate artwork, or browse stock photos
        </Text>
        <View style={styles.emptyActions}>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: '#3b82f6' }]}
            onPress={() => setShowVideoGenerator(true)}
          >
            <Film size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Create Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={() => setShowImageGenerator(true)}
          >
            <Sparkles size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Create Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emptyButtonOutline, { borderColor: colorSet.primaryForeground }]}
            onPress={() => setShowStockBrowser(true)}
          >
            <ImageIcon size={18} color={colorSet.primaryForeground} />
            <Text style={[styles.emptyButtonOutlineText, { color: colorSet.primaryForeground }]}>
              Browse Stock
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colorSet.grey3 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colorSet.primaryText }]}>
          {selectMode ? 'Select Media' : 'Media Studio'}
        </Text>
        {selectMode ? (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedMedia && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmSelection}
            disabled={!selectedMedia}
          >
            <Text style={[
              styles.confirmText,
              { color: selectedMedia ? colorSet.primaryForeground : colorSet.grey6 },
            ]}>
              Use
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButtons}>
            {/* Search button */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={toggleSearch}
            >
              <Search
                size={22}
                color={showSearch ? colorSet.primaryForeground : colorSet.primaryText}
              />
            </TouchableOpacity>
            {/* Edit button */}
            {allMedia.length > 0 && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditMode(!editMode)}
              >
                <Text style={[
                  styles.editButtonText,
                  { color: editMode ? '#ef4444' : colorSet.primaryForeground },
                ]}>
                  {editMode ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            )}
            {/* Create button */}
            {!editMode && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleCreatePress}
              >
                <Plus size={24} color={colorSet.primaryForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Media Grid/List */}
      {viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={filteredMedia}
          renderItem={renderMediaItem}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key="list"
          data={filteredMedia}
          renderItem={renderListItem}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* AI Image Generator Modal */}
      <ArtworkGeneratorModal
        visible={showImageGenerator}
        onClose={() => setShowImageGenerator(false)}
        onGenerated={handleImageGenerated}
        currentUser={currentUser}
      />

      {/* AI Video Generator Modal */}
      <VideoGeneratorModal
        visible={showVideoGenerator}
        onClose={() => setShowVideoGenerator(false)}
        onGenerated={handleVideoGenerated}
        currentUser={currentUser}
      />

      {/* Stock Browser Modal */}
      <StockMediaBrowser
        visible={showStockBrowser}
        onClose={() => setShowStockBrowser(false)}
        onSelect={handleStockSelect}
        title="Browse Photos"
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
    minWidth: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 6,
  },
  editButton: {
    padding: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    padding: 4,
  },
  confirmButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listHeader: {
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    marginLeft: 12,
  },
  viewToggleButton: {
    padding: 6,
    borderRadius: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultsText: {
    fontSize: 13,
    marginTop: 4,
  },
  gridContent: {
    padding: GRID_PADDING,
    flexGrow: 1,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: GRID_PADDING,
    flexGrow: 1,
  },
  mediaItemWrapper: {
    position: 'relative',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  listItemWrapper: {
    position: 'relative',
  },
  listVideoBadge: {
    position: 'absolute',
    right: 48,
    top: '50%',
    marginTop: -7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
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
    marginBottom: 24,
  },
  emptyActions: {
    width: '100%',
    gap: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  emptyButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

export default MediaStudioScreen
