/**
 * VideoClipsGallery - Grid/list view of video clips
 *
 * Features:
 * - Responsive grid layout
 * - Filter by generation mode
 * - Filter by status (completed, generating, failed)
 * - Sort by date
 * - Empty state handling
 * - Pull to refresh
 * - Multi-select mode for batch operations
 */
import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import { Video, Sparkles, Image, Layers, Filter, X } from 'lucide-react-native'
import VideoClipCard from '../VideoClipCard'
import { VIDEO_CLIP_STATUS } from '../../../services/videoClipsService'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const VideoClipsGallery = ({
  clips = [],
  loading = false,
  onRefresh,
  onClipPress,
  onClipLongPress,
  onClipDelete,
  onCreateNew,
  showCreateNew = true,
  showDeleteButton = false,
  showFilters = true,
  showUsage = true,
  selectedClipId = null,
  multiSelect = false,
  selectedClips = [],
  onSelectionChange,
  numColumns = 2,
  cardSize,
  emptyTitle = 'No Video Clips',
  emptyMessage = 'Create your first AI-generated video clip',
  ListHeaderComponent,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark, numColumns)

  const [activeFilter, setActiveFilter] = useState(null) // null = all, 'text', 'startFrame', 'interpolation', 'reference'
  const [statusFilter, setStatusFilter] = useState(null) // null = all, 'completed', 'generating', 'failed'

  // Calculate card size based on columns if not provided
  const calculatedCardSize = cardSize || (SCREEN_WIDTH - 32 - (numColumns - 1) * 12) / numColumns

  // Filter clips
  const filteredClips = useMemo(() => {
    let result = [...clips]

    // Filter by generation mode
    if (activeFilter) {
      result = result.filter((clip) => clip.generationMode === activeFilter)
    }

    // Filter by status
    if (statusFilter) {
      result = result.filter((clip) => clip.status === statusFilter)
    }

    // Sort by date (newest first)
    result.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
      return dateB - dateA
    })

    return result
  }, [clips, activeFilter, statusFilter])

  // Handle clip press
  const handleClipPress = useCallback(
    (clip) => {
      if (multiSelect) {
        const isSelected = selectedClips.includes(clip.id)
        if (isSelected) {
          onSelectionChange?.(selectedClips.filter((id) => id !== clip.id))
        } else {
          onSelectionChange?.([...selectedClips, clip.id])
        }
      } else {
        onClipPress?.(clip)
      }
    },
    [multiSelect, selectedClips, onSelectionChange, onClipPress]
  )

  // Render filter chips
  const renderFilters = () => {
    if (!showFilters) return null

    const modeFilters = [
      { key: null, label: 'All', icon: Video },
      { key: 'text', label: 'AI', icon: Sparkles },
      { key: 'startFrame', label: 'Image', icon: Image },
      { key: 'interpolation', label: 'Morph', icon: Layers },
    ]

    return (
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          {modeFilters.map((filter) => {
            const isActive = activeFilter === filter.key
            const FilterIcon = filter.icon
            return (
              <TouchableOpacity
                key={filter.key || 'all'}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <FilterIcon
                  size={14}
                  color={isActive ? '#fff' : isDark ? '#a3a3a3' : '#525252'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Status filter (only show if there are non-completed clips) */}
        {clips.some((c) => c.status !== VIDEO_CLIP_STATUS.COMPLETED) && (
          <View style={styles.statusFilterRow}>
            <TouchableOpacity
              style={[
                styles.statusChip,
                statusFilter === null && styles.statusChipActive,
              ]}
              onPress={() => setStatusFilter(null)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  statusFilter === null && styles.statusChipTextActive,
                ]}
              >
                All Status
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusChip,
                statusFilter === VIDEO_CLIP_STATUS.GENERATING && styles.statusChipActive,
              ]}
              onPress={() => setStatusFilter(VIDEO_CLIP_STATUS.GENERATING)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  statusFilter === VIDEO_CLIP_STATUS.GENERATING &&
                    styles.statusChipTextActive,
                ]}
              >
                Generating
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusChip,
                statusFilter === VIDEO_CLIP_STATUS.FAILED && styles.statusChipActive,
              ]}
              onPress={() => setStatusFilter(VIDEO_CLIP_STATUS.FAILED)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  statusFilter === VIDEO_CLIP_STATUS.FAILED && styles.statusChipTextActive,
                ]}
              >
                Failed
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active filter indicator with clear button */}
        {(activeFilter || statusFilter) && (
          <TouchableOpacity
            style={styles.clearFilters}
            onPress={() => {
              setActiveFilter(null)
              setStatusFilter(null)
            }}
          >
            <X size={14} color={isDark ? '#a3a3a3' : '#525252'} />
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Video size={64} color={isDark ? '#525252' : '#a3a3a3'} strokeWidth={1} />
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      </View>
    )
  }

  // Prepare data with Create New card
  const data = useMemo(() => {
    if (showCreateNew) {
      return [{ id: 'create-new', isCreateNew: true }, ...filteredClips]
    }
    return filteredClips
  }, [filteredClips, showCreateNew])

  // Render item
  const renderItem = useCallback(
    ({ item }) => {
      if (item.isCreateNew) {
        return (
          <View style={styles.cardWrapper}>
            <VideoClipCard
              isCreateNew
              onPress={onCreateNew}
              size={calculatedCardSize}
            />
          </View>
        )
      }

      const isSelected = multiSelect
        ? selectedClips.includes(item.id)
        : selectedClipId === item.id

      return (
        <View style={styles.cardWrapper}>
          <VideoClipCard
            clip={item}
            onPress={handleClipPress}
            onLongPress={onClipLongPress}
            onDelete={onClipDelete}
            isSelected={isSelected}
            showDeleteButton={showDeleteButton}
            showUsage={showUsage}
            size={calculatedCardSize}
          />
        </View>
      )
    },
    [
      calculatedCardSize,
      multiSelect,
      selectedClips,
      selectedClipId,
      handleClipPress,
      onClipLongPress,
      onClipDelete,
      onCreateNew,
      showDeleteButton,
      showUsage,
    ]
  )

  const keyExtractor = useCallback((item) => item.id, [])

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {ListHeaderComponent}
            {renderFilters()}
          </>
        }
        ListEmptyComponent={!showCreateNew ? renderEmptyState : null}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={isDark ? '#a3a3a3' : '#525252'}
            />
          ) : undefined
        }
      />
    </View>
  )
}

const getStyles = (isDark, numColumns) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    columnWrapper: {
      justifyContent: 'flex-start',
      gap: 12,
    },
    cardWrapper: {
      marginBottom: 16,
    },
    filtersContainer: {
      marginBottom: 16,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#2c2c2c' : '#f1f5f9',
      gap: 6,
    },
    filterChipActive: {
      backgroundColor: '#9333ea',
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#a3a3a3' : '#525252',
    },
    filterChipTextActive: {
      color: '#fff',
    },
    statusFilterRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDark ? '#1f1f1f' : '#e2e8f0',
    },
    statusChipActive: {
      backgroundColor: isDark ? '#374151' : '#3b82f6',
    },
    statusChipText: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#64748b',
    },
    statusChipTextActive: {
      color: '#fff',
      fontWeight: '500',
    },
    clearFilters: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 4,
    },
    clearFiltersText: {
      fontSize: 12,
      color: isDark ? '#a3a3a3' : '#525252',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#d4d4d4' : '#262626',
      marginTop: 16,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: 14,
      color: isDark ? '#737373' : '#a3a3a3',
      marginTop: 8,
      textAlign: 'center',
    },
  })

export default VideoClipsGallery
