/**
 * StockMediaBrowser - Search and browse stock photos
 *
 * Features:
 * - Search bar with category chips
 * - Grid display of results with infinite scroll
 * - Photo selection for saving to collection
 * - Attribution display (required)
 *
 * Brand: LetsMake.Music
 * Uses brand colors: Vibrant Teal (#1F979E), Deep Magenta (#C12D79), Rich Purple (#9C27B0)
 */
import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Search, X, Check } from 'lucide-react-native'
import { useTheme } from '../../../core/dopebase'
import { useStockPhotos } from '../../../hooks/useStockMedia'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Brand colors from LetsMake.Music guidelines
const BRAND_COLORS = {
  light: {
    primary: '#1F979E', // Vibrant Teal 500
    secondary: '#C12D79', // Deep Magenta 500
    accent: '#9C27B0', // Rich Purple 500
    background: '#F8F9FA', // Neutral 50
    surface: '#FFFFFF',
    textPrimary: '#212529', // Neutral 900
    textSecondary: '#868E96', // Neutral 600
    border: '#E9ECEF', // Neutral 200
    chipBg: '#F1F3F5', // Neutral 100
  },
  dark: {
    primary: '#20B2AA', // Vibrant Teal 400
    secondary: '#D81B60', // Deep Magenta 400
    accent: '#AB47BC', // Rich Purple 400
    background: '#121212', // Neutral 50 dark
    surface: '#1E1E1E', // Neutral 100 dark
    textPrimary: '#F5F5F5', // Neutral 900 dark
    textSecondary: '#A0A0A0', // Neutral 600 dark
    border: '#2C2C2C', // Neutral 200 dark
    chipBg: '#2C2C2C', // Neutral 200 dark
  },
}
const GRID_PADDING = 16
const GRID_GAP = 8
const NUM_COLUMNS = 3
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

const StockMediaBrowser = ({
  visible,
  onClose,
  onSelect,
  title = 'Browse Photos',
}) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const brandColors = BRAND_COLORS[appearance] || BRAND_COLORS.dark

  const {
    photos,
    loading,
    error,
    hasMore,
    search,
    loadMore,
    getCurated,
    searchCategory,
    categories,
    clear,
    getPhotoUrl,
    getThumbnailUrl,
    getAttributionData,
  } = useStockPhotos()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load curated photos on mount
  useEffect(() => {
    if (visible && photos.length === 0) {
      getCurated({ perPage: 30 })
    }
  }, [visible])

  // Handle search
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      setSelectedCategory(null)
      search(searchQuery.trim(), { perPage: 30 })
    }
  }, [searchQuery, search])

  // Handle category selection
  const handleCategoryPress = useCallback((category) => {
    setSelectedCategory(category.id)
    setSearchQuery('')
    searchCategory(category.id, { perPage: 30 })
  }, [searchCategory])

  // Handle photo selection
  const handlePhotoPress = useCallback((photo) => {
    setSelectedPhoto(selectedPhoto?.id === photo.id ? null : photo)
  }, [selectedPhoto])

  // Handle save/select
  const handleSave = useCallback(async () => {
    if (!selectedPhoto) return

    setIsSaving(true)
    try {
      const attribution = getAttributionData(selectedPhoto)
      const result = {
        source: 'stock',
        stockId: String(selectedPhoto.id),
        imageUrl: getPhotoUrl(selectedPhoto, 'large'),
        thumbnailUrl: getThumbnailUrl(selectedPhoto),
        originalUrl: getPhotoUrl(selectedPhoto, 'original'),
        photographer: attribution?.photographer,
        photographerUrl: attribution?.photographerUrl,
        sourceUrl: attribution?.pexelsUrl,
        avgColor: selectedPhoto.avg_color,
        width: selectedPhoto.width,
        height: selectedPhoto.height,
        alt: selectedPhoto.alt,
      }

      onSelect?.(result)
      onClose()
    } catch (err) {
      console.error('[StockMediaBrowser] Error selecting photo:', err)
    } finally {
      setIsSaving(false)
    }
  }, [selectedPhoto, onSelect, onClose, getPhotoUrl, getThumbnailUrl, getAttributionData])

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMore({ perPage: 30 })
    }
  }, [loading, hasMore, loadMore])

  // Handle close
  const handleClose = useCallback(() => {
    setSelectedPhoto(null)
    setSearchQuery('')
    setSelectedCategory(null)
    clear()
    onClose()
  }, [clear, onClose])

  // Render photo item
  const renderPhoto = useCallback(({ item }) => {
    const isSelected = selectedPhoto?.id === item.id

    return (
      <TouchableOpacity
        style={styles.photoItem}
        onPress={() => handlePhotoPress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: getThumbnailUrl(item) }}
          style={[
            styles.photoImage,
            { backgroundColor: item.avg_color || brandColors.surface },
          ]}
          resizeMode="cover"
        />
        {isSelected && (
          <View style={[styles.selectedOverlay, { backgroundColor: 'rgba(31, 151, 158, 0.5)' }]}>
            <View style={[styles.checkCircle, { backgroundColor: brandColors.primary }]}>
              <Check size={16} color="#fff" strokeWidth={3} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    )
  }, [selectedPhoto, brandColors, getThumbnailUrl, handlePhotoPress])

  // Render footer
  const renderFooter = useCallback(() => {
    if (!loading) return null
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={brandColors.primary} />
      </View>
    )
  }, [loading, brandColors])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: brandColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: brandColors.border }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={brandColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: brandColors.textPrimary }]}>{title}</Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              !selectedPhoto && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!selectedPhoto || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={brandColors.primary} />
            ) : (
              <Text style={[
                styles.saveText,
                { color: selectedPhoto ? brandColors.primary : brandColors.textSecondary },
              ]}>
                Select
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: brandColors.surface, borderColor: brandColors.border }]}>
            <Search size={18} color={brandColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: brandColors.textPrimary }]}
              placeholder="Search photos..."
              placeholderTextColor={brandColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={brandColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Chips */}
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === category.id
                      ? brandColors.primary
                      : brandColors.chipBg,
                    borderColor: selectedCategory === category.id
                      ? brandColors.primary
                      : brandColors.border,
                  },
                ]}
                onPress={() => handleCategoryPress(category)}
              >
                <Text style={[
                  styles.categoryText,
                  {
                    color: selectedCategory === category.id
                      ? '#fff'
                      : brandColors.textPrimary,
                  },
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: '#F44336' }]}>{error}</Text>
          </View>
        )}

        {/* Photos Grid */}
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: brandColors.textSecondary }]}>
                  {error ? 'Failed to load photos' : 'Search or browse categories'}
                </Text>
              </View>
            ) : null
          }
        />

        {/* Selected Photo Attribution */}
        {selectedPhoto && (
          <View style={[styles.attributionBar, { backgroundColor: brandColors.surface, borderTopColor: brandColors.border }]}>
            <Text style={[styles.attributionText, { color: brandColors.textSecondary }]}>
              Photo by {selectedPhoto.photographer}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
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
  closeButton: {
    padding: 4,
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  saveButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  categoriesWrapper: {
    paddingBottom: 12,
  },
  categoriesContainer: {
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
  },
  gridContent: {
    padding: GRID_PADDING,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  attributionBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attributionText: {
    fontSize: 12,
    textAlign: 'center',
  },
})

export default StockMediaBrowser
