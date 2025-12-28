/**
 * ArtworkStudioScreen - Main artwork management screen
 *
 * Features:
 * - View all saved artwork in a grid
 * - Create new artwork via AI or stock photos
 * - Filter by source (All, AI Generated, Stock)
 * - Apply artwork to songs, profile, or bands
 * - Delete artwork
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Plus, Sparkles, ImageIcon, Trash2, Grid, List, Pencil } from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { useArtwork } from '../../hooks/useArtwork'
import ArtworkCard from '../../components/ui/ArtworkCard'
import ArtworkListItem from '../../components/ui/ArtworkListItem'
import ArtworkGeneratorModal from '../../components/ui/ArtworkGeneratorModal'
import StockMediaBrowser from '../../components/ui/StockMediaBrowser'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_PADDING = 16
const GRID_GAP = 12
const NUM_COLUMNS = 3
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

// Filter options
const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'generated', label: 'AI Created' },
  { key: 'stock', label: 'Stock' },
]

const ArtworkStudioScreen = ({ navigation, route }) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  // Get callback params if navigated from song/band selection
  const { selectMode, onSelect, songId, bandId, openGenerator } = route?.params || {}

  // Auto-open generator if requested (e.g., from "Create with AI" in ChangeSongCover)
  useEffect(() => {
    if (openGenerator) {
      setShowGenerator(true)
    }
  }, [openGenerator])

  // Artwork state
  const {
    artwork,
    artworkLoading,
    artworkError,
    operationLoading,
    artworkCount,
    saveArtwork,
    deleteArtwork,
    applyToSong,
    applyToBand,
    applyAsProfile,
    clearError,
  } = useArtwork(currentUser?.id, {
    id: currentUser?.id,
    stageName: currentUser?.firstName || currentUser?.stageName || 'Unknown',
    profilePictureURL: currentUser?.profilePictureURL,
  })

  // Local state
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [showGenerator, setShowGenerator] = useState(false)
  const [showStockBrowser, setShowStockBrowser] = useState(false)
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Filtered artwork
  const filteredArtwork = useMemo(() => {
    if (filter === 'all') return artwork
    return artwork.filter((item) => item.source === filter)
  }, [artwork, filter])

  // Handle create options
  const handleCreatePress = useCallback(() => {
    Alert.alert(
      'Create Artwork',
      'Choose how you want to create your artwork',
      [
        {
          text: 'AI Generate',
          onPress: () => setShowGenerator(true),
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

  // Handle AI generation complete
  const handleGenerated = useCallback(async (artworkData) => {
    const result = await saveArtwork(artworkData)
    if (result.success) {
      setShowGenerator(false)
    } else {
      Alert.alert('Error', result.error || 'Failed to save artwork')
    }
  }, [saveArtwork])

  // Handle stock photo selection
  const handleStockSelect = useCallback(async (photoData) => {
    const result = await saveArtwork(photoData)
    if (result.success) {
      setShowStockBrowser(false)
    } else {
      Alert.alert('Error', result.error || 'Failed to save artwork')
    }
  }, [saveArtwork])

  // Handle artwork press (selection mode or detail view)
  const handleArtworkPress = useCallback((item) => {
    if (selectMode) {
      setSelectedArtwork(selectedArtwork?.id === item.id ? null : item)
    } else {
      // Navigate to detail view
      navigation.navigate('ArtworkDetail', { artworkId: item.id })
    }
  }, [selectMode, selectedArtwork, navigation])

  // Handle artwork long press (quick actions)
  const handleArtworkLongPress = useCallback((item) => {
    Alert.alert(
      'Artwork Options',
      'What would you like to do?',
      [
        {
          text: 'Use as Song Cover',
          onPress: () => {
            // Navigate to song picker or show current songs
            Alert.alert('Coming Soon', 'Song selection will be available soon')
          },
        },
        {
          text: 'Use as Profile Picture',
          onPress: async () => {
            const result = await applyAsProfile(item.id)
            if (result.success) {
              Alert.alert('Success', 'Profile picture updated!')
            } else {
              Alert.alert('Error', result.error)
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(item),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    )
  }, [applyAsProfile])

  // Confirm delete
  const confirmDelete = useCallback((item) => {
    Alert.alert(
      'Delete Artwork',
      'Are you sure you want to delete this artwork? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            const result = await deleteArtwork(item.id)
            setIsDeleting(false)
            if (!result.success) {
              Alert.alert('Error', result.error)
            }
          },
        },
      ]
    )
  }, [deleteArtwork])

  // Handle selection confirm (when in select mode)
  const handleConfirmSelection = useCallback(async () => {
    if (!selectedArtwork) return

    if (songId) {
      const result = await applyToSong(selectedArtwork.id, songId)
      if (result.success) {
        onSelect?.(selectedArtwork)
        navigation.goBack()
      } else {
        Alert.alert('Error', result.error)
      }
    } else if (bandId) {
      const result = await applyToBand(selectedArtwork.id, bandId)
      if (result.success) {
        onSelect?.(selectedArtwork)
        navigation.goBack()
      } else {
        Alert.alert('Error', result.error)
      }
    } else {
      onSelect?.(selectedArtwork)
      navigation.goBack()
    }
  }, [selectedArtwork, songId, bandId, applyToSong, applyToBand, onSelect, navigation])

  // Render artwork item (grid view)
  const renderGridItem = useCallback(({ item }) => (
    <ArtworkCard
      artwork={item}
      onPress={handleArtworkPress}
      onLongPress={handleArtworkLongPress}
      onDelete={confirmDelete}
      isSelected={selectMode && selectedArtwork?.id === item.id}
      size={ITEM_SIZE}
      showUsage={!selectMode && !editMode}
      showDeleteButton={editMode && !selectMode}
    />
  ), [handleArtworkPress, handleArtworkLongPress, confirmDelete, selectMode, selectedArtwork, editMode])

  // Render artwork item (list view)
  const renderListItem = useCallback(({ item }) => (
    <ArtworkListItem
      artwork={item}
      onPress={handleArtworkPress}
      onLongPress={handleArtworkLongPress}
      onDelete={confirmDelete}
      isSelected={selectMode && selectedArtwork?.id === item.id}
      showUsage={!selectMode && !editMode}
      showDeleteButton={editMode && !selectMode}
    />
  ), [handleArtworkPress, handleArtworkLongPress, confirmDelete, selectMode, selectedArtwork, editMode])

  // Render header
  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Filter Row with View Toggle */}
      <View style={styles.filterRow}>
        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          {FILTER_OPTIONS.map((option) => (
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
              <Text style={[
                styles.filterText,
                {
                  color: filter === option.key ? '#fff' : colorSet.primaryText,
                },
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
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

      {/* Count */}
      <Text style={[styles.countText, { color: colorSet.secondaryText }]}>
        {filteredArtwork.length} {filteredArtwork.length === 1 ? 'item' : 'items'}
      </Text>
    </View>
  )

  // Render empty state
  const renderEmpty = () => {
    if (artworkLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      )
    }

    if (artworkError) {
      return (
        <View style={styles.emptyContainer}>
          <ImageIcon size={64} color="#ef4444" strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
            Something Went Wrong
          </Text>
          <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
            {artworkError}
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={clearError}
          >
            <Text style={styles.emptyButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <ImageIcon size={64} color={colorSet.grey6} strokeWidth={1} />
        <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
          No Artwork Yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
          Create AI artwork or browse stock photos to build your collection
        </Text>
        <View style={styles.emptyActions}>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={() => setShowGenerator(true)}
          >
            <Sparkles size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Create with AI</Text>
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
          {selectMode ? 'Select Artwork' : 'Your Artwork'}
        </Text>
        {selectMode ? (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedArtwork && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmSelection}
            disabled={!selectedArtwork}
          >
            <Text style={[
              styles.confirmText,
              { color: selectedArtwork ? colorSet.primaryForeground : colorSet.grey6 },
            ]}>
              Use
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButtons}>
            {artwork.length > 0 && (
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

      {/* Artwork Grid/List */}
      {viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={filteredArtwork}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
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
          data={filteredArtwork}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* AI Generator Modal */}
      <ArtworkGeneratorModal
        visible={showGenerator}
        onClose={() => setShowGenerator(false)}
        onGenerated={handleGenerated}
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
    gap: 12,
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
    paddingBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 2,
    marginLeft: 12,
  },
  viewToggleButton: {
    padding: 6,
    borderRadius: 6,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  countText: {
    fontSize: 13,
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

export default ArtworkStudioScreen
