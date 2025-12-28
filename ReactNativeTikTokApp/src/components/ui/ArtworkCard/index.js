/**
 * ArtworkCard - Visual artwork display card
 *
 * Features:
 * - Displays artwork thumbnail with source badge (AI/Stock)
 * - Shows usage indicators (song cover, profile, band)
 * - Supports selection mode for applying artwork
 * - Create New variant for adding new artwork
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
import { Plus, Sparkles, ImageIcon, Check, Music, User, Users, Trash2 } from 'lucide-react-native'

const ArtworkCard = ({
  artwork,
  onPress,
  onLongPress,
  onDelete,
  isCreateNew = false,
  isSelected = false,
  isLoading = false,
  showUsage = true,
  showDeleteButton = false,
  size = 140,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark, size)

  // Create New Artwork card variant
  if (isCreateNew) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.image, styles.createNewImage]}>
          <Plus
            size={size * 0.3}
            color={isDark ? '#a3a3a3' : '#525252'}
            strokeWidth={1.5}
          />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          Create New
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          Add artwork
        </Text>
      </TouchableOpacity>
    )
  }

  const imageUrl = artwork?.thumbnailUrl || artwork?.imageUrl
  const isGenerated = artwork?.source === 'generated'
  const isStock = artwork?.source === 'stock'

  // Usage indicators
  const usedAsSongCover = artwork?.usedAs?.songCovers?.length > 0
  const usedAsProfile = artwork?.usedAs?.profilePicture === true
  const usedAsBand = artwork?.usedAs?.bandImages?.length > 0

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(artwork)}
      onLongPress={() => onLongPress?.(artwork)}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <ImageIcon
              size={size * 0.3}
              color={isDark ? '#a3a3a3' : '#737373'}
              strokeWidth={1.5}
            />
          </View>
        )}

        {/* Source Badge - AI or Stock */}
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
            <Text style={styles.badgeText}>
              {isGenerated ? 'AI' : 'Stock'}
            </Text>
          </View>
        )}

        {/* Usage Indicators */}
        {showUsage && (usedAsSongCover || usedAsProfile || usedAsBand) && (
          <View style={styles.usageContainer}>
            {usedAsSongCover && (
              <View style={styles.usageIcon}>
                <Music size={10} color="#fff" />
              </View>
            )}
            {usedAsProfile && (
              <View style={styles.usageIcon}>
                <User size={10} color="#fff" />
              </View>
            )}
            {usedAsBand && (
              <View style={styles.usageIcon}>
                <Users size={10} color="#fff" />
              </View>
            )}
          </View>
        )}

        {/* Selection Overlay */}
        {isSelected && (
          <View style={styles.selectionOverlay}>
            <View style={styles.checkCircle}>
              <Check size={18} color="#fff" strokeWidth={3} />
            </View>
          </View>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}

        {/* Delete Button */}
        {showDeleteButton && onDelete && !isSelected && !isLoading && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation?.()
              onDelete(artwork)
            }}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Trash2 size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info - show prompt for generated, photographer for stock */}
      {artwork?.prompt && (
        <Text style={styles.name} numberOfLines={1}>
          {artwork.prompt}
        </Text>
      )}
      {artwork?.photographer && !artwork?.prompt && (
        <Text style={styles.name} numberOfLines={1}>
          by {artwork.photographer}
        </Text>
      )}
      {!artwork?.prompt && !artwork?.photographer && (
        <Text style={styles.name} numberOfLines={1}>
          Untitled
        </Text>
      )}

      {/* Date or style */}
      <Text style={styles.description} numberOfLines={1}>
        {artwork?.style || formatDate(artwork?.createdAt)}
      </Text>
    </TouchableOpacity>
  )
}

// Format date helper
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getStyles = (isDark, size) =>
  StyleSheet.create({
    container: {
      width: size,
    },
    imageContainer: {
      width: size,
      height: size,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: isDark ? '#333333' : '#e0e0e0',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#333333' : '#e0e0e0',
    },
    createNewImage: {
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: isDark ? '#525252' : '#a3a3a3',
      backgroundColor: 'transparent',
      borderRadius: 8,
      width: size,
      height: size,
    },
    badge: {
      position: 'absolute',
      top: 8,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      gap: 3,
    },
    badgeGenerated: {
      backgroundColor: 'rgba(147, 51, 234, 0.9)', // Purple for AI
    },
    badgeStock: {
      backgroundColor: 'rgba(16, 185, 129, 0.9)', // Green for stock
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    usageContainer: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      flexDirection: 'row',
      gap: 4,
    },
    usageIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectionOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(147, 51, 234, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#9333ea',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButton: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    name: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#d4d4d4' : '#262626',
      marginTop: 8,
    },
    description: {
      fontSize: 11,
      color: isDark ? '#737373' : '#a3a3a3',
      marginTop: 2,
    },
  })

export default memo(ArtworkCard)
