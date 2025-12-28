/**
 * ArtworkListItem - List view display for artwork
 *
 * Features:
 * - Horizontal layout with thumbnail, info, and actions
 * - Shows source badge (AI/Stock), prompt/photographer, date
 * - Usage indicators for song covers, profile, bands
 * - Selection mode support
 */
import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { Sparkles, ImageIcon, Check, Music, User, Users, ChevronRight, Trash2 } from 'lucide-react-native'

const ArtworkListItem = ({
  artwork,
  onPress,
  onLongPress,
  onDelete,
  isSelected = false,
  isLoading = false,
  showUsage = true,
  showDeleteButton = false,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const imageUrl = artwork?.thumbnailUrl || artwork?.imageUrl
  const isGenerated = artwork?.source === 'generated'
  const isStock = artwork?.source === 'stock'

  // Usage indicators
  const usedAsSongCover = artwork?.usedAs?.songCovers?.length > 0
  const usedAsProfile = artwork?.usedAs?.profilePicture === true
  const usedAsBand = artwork?.usedAs?.bandImages?.length > 0
  const hasUsage = usedAsSongCover || usedAsProfile || usedAsBand

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Get title/name
  const getTitle = () => {
    if (artwork?.prompt) {
      return artwork.prompt.length > 50
        ? artwork.prompt.substring(0, 50) + '...'
        : artwork.prompt
    }
    if (artwork?.photographer) {
      return `Photo by ${artwork.photographer}`
    }
    return 'Untitled Artwork'
  }

  // Get subtitle
  const getSubtitle = () => {
    const parts = []
    if (artwork?.style && artwork.style !== 'NONE') {
      parts.push(artwork.style.replace(/_/g, ' '))
    }
    parts.push(formatDate(artwork?.createdAt))
    return parts.filter(Boolean).join(' • ')
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.containerSelected,
      ]}
      onPress={() => onPress?.(artwork)}
      onLongPress={() => onLongPress?.(artwork)}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <ImageIcon size={24} color={isDark ? '#a3a3a3' : '#737373'} />
          </View>
        )}

        {/* Source Badge */}
        {(isGenerated || isStock) && (
          <View style={[
            styles.badge,
            isGenerated ? styles.badgeGenerated : styles.badgeStock,
          ]}>
            {isGenerated ? (
              <Sparkles size={10} color="#fff" />
            ) : (
              <ImageIcon size={10} color="#fff" />
            )}
          </View>
        )}

        {/* Selection Overlay */}
        {isSelected && (
          <View style={styles.selectionOverlay}>
            <Check size={16} color="#fff" strokeWidth={3} />
          </View>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {getTitle()}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {getSubtitle()}
        </Text>

        {/* Usage Indicators */}
        {showUsage && hasUsage && (
          <View style={styles.usageRow}>
            {usedAsSongCover && (
              <View style={styles.usageTag}>
                <Music size={10} color={isDark ? '#a3a3a3' : '#737373'} />
                <Text style={styles.usageText}>Song Cover</Text>
              </View>
            )}
            {usedAsProfile && (
              <View style={styles.usageTag}>
                <User size={10} color={isDark ? '#a3a3a3' : '#737373'} />
                <Text style={styles.usageText}>Profile</Text>
              </View>
            )}
            {usedAsBand && (
              <View style={styles.usageTag}>
                <Users size={10} color={isDark ? '#a3a3a3' : '#737373'} />
                <Text style={styles.usageText}>Band</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Delete Button or Arrow */}
      {showDeleteButton && onDelete ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(artwork)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      ) : (
        <ChevronRight size={20} color={isDark ? '#525252' : '#a3a3a3'} />
      )}
    </TouchableOpacity>
  )
}

const getStyles = (isDark) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2a2a2a' : '#f0f0f0',
    },
    containerSelected: {
      backgroundColor: isDark ? '#2d2040' : '#f5f0ff',
    },
    thumbnailContainer: {
      width: 64,
      height: 64,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: isDark ? '#333333' : '#e0e0e0',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    placeholderThumbnail: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      top: 4,
      left: 4,
      padding: 4,
      borderRadius: 4,
    },
    badgeGenerated: {
      backgroundColor: 'rgba(147, 51, 234, 0.9)',
    },
    badgeStock: {
      backgroundColor: 'rgba(16, 185, 129, 0.9)',
    },
    selectionOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(147, 51, 234, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: '500',
      color: isDark ? '#e5e5e5' : '#1a1a1a',
      lineHeight: 20,
    },
    subtitle: {
      fontSize: 12,
      color: isDark ? '#737373' : '#a3a3a3',
      marginTop: 2,
    },
    usageRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 6,
      gap: 6,
    },
    usageTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      gap: 4,
    },
    usageText: {
      fontSize: 10,
      color: isDark ? '#a3a3a3' : '#737373',
    },
    deleteButton: {
      padding: 8,
      marginLeft: 4,
    },
  })

export default memo(ArtworkListItem)
