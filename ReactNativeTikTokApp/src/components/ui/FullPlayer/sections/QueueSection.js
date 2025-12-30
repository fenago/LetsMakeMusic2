import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, Image, Pressable, StyleSheet } from 'react-native'
import { ChevronUp, ChevronDown, Music, Volume2, Trash2 } from 'lucide-react-native'

/**
 * QueueSection - Virtualized queue list with FlatList
 * CRITICAL: Uses FlatList instead of .map() for performance with large queues
 * Has its own collapsed state to prevent parent re-renders
 */
const QueueSection = ({
  queue,
  queueIndex,
  onPlayQueueItem,
  onRemoveFromQueue,
  isDark,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const renderQueueItem = useCallback(({ item, index }) => {
    const isCurrentlyPlaying = index === queueIndex
    const thumbnailUrl = item.thumbnailUrl || item.imageUrl || item.coverUrl

    return (
      <Pressable
        style={[
          styles.queueItem,
          isCurrentlyPlaying && styles.queueItemPlaying,
          isDark && styles.queueItemDark,
        ]}
        onPress={() => !isCurrentlyPlaying && onPlayQueueItem(index)}
      >
        {/* Queue position number or playing indicator */}
        <View style={styles.queueItemNumber}>
          {isCurrentlyPlaying ? (
            <Volume2 size={16} color="#3875e8" strokeWidth={2} />
          ) : (
            <Text style={[styles.queueNumberText, isDark && styles.queueNumberTextDark]}>
              {index + 1}
            </Text>
          )}
        </View>

        {/* Thumbnail */}
        <View style={styles.queueItemThumbnail}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.queueThumbnail} />
          ) : (
            <View style={[styles.queueThumbnail, styles.queuePlaceholder, isDark && styles.queuePlaceholderDark]}>
              <Music size={20} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={1.5} />
            </View>
          )}
        </View>

        {/* Track info */}
        <View style={styles.queueItemInfo}>
          <Text
            style={[
              styles.queueItemTitle,
              isDark && styles.queueItemTitleDark,
              isCurrentlyPlaying && styles.queueItemTitlePlaying
            ]}
            numberOfLines={1}
          >
            {item.title || item.label || item.name || 'Unknown Track'}
          </Text>
          <Text style={[styles.queueItemArtist, isDark && styles.queueItemArtistDark]} numberOfLines={1}>
            {item.artist || item.subLabel || item.description || 'Unknown Artist'}
          </Text>
        </View>

        {/* Remove button (only for non-playing items) */}
        {!isCurrentlyPlaying && (
          <TouchableOpacity
            style={styles.queueItemRemove}
            onPress={() => onRemoveFromQueue(index)}
          >
            <Trash2 size={16} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </Pressable>
    )
  }, [queueIndex, onPlayQueueItem, onRemoveFromQueue, isDark])

  const keyExtractor = useCallback((item, index) => item.id || `queue-${index}`, [])

  if (queue.length === 0) {
    return null
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={toggleExpanded}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Queue</Text>
          <Text style={[styles.queueCount, isDark && styles.queueCountDark]}>
            {queue.length} songs
          </Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.queueList, isDark && styles.queueListDark]}>
          <FlatList
            data={queue}
            renderItem={renderQueueItem}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            initialNumToRender={5}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#151723',
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  queueCount: {
    fontSize: 13,
    color: '#7e7e7e',
  },
  queueCountDark: {
    color: '#c5c5c5',
  },
  queueList: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  queueListDark: {
    backgroundColor: '#2c2c2e',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  queueItemDark: {
    borderBottomColor: '#444444',
  },
  queueItemPlaying: {
    backgroundColor: 'rgba(56, 117, 232, 0.1)',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  queueItemNumber: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueNumberText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
  },
  queueNumberTextDark: {
    color: '#888888',
  },
  queueItemThumbnail: {
    marginRight: 12,
  },
  queueThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  queuePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  queuePlaceholderDark: {
    backgroundColor: '#444444',
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#151723',
    marginBottom: 2,
  },
  queueItemTitleDark: {
    color: '#ffffff',
  },
  queueItemTitlePlaying: {
    color: '#3875e8',
    fontWeight: '600',
  },
  queueItemArtist: {
    fontSize: 13,
    color: '#7e7e7e',
  },
  queueItemArtistDark: {
    color: '#c5c5c5',
  },
  queueItemRemove: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default memo(QueueSection)
