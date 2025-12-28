/**
 * VideoClipCard - Video clip display card
 *
 * Features:
 * - Displays video thumbnail with play overlay
 * - Duration badge
 * - Generation mode indicator (AI/Text/Image)
 * - Status indicators (generating, completed, failed)
 * - Usage indicators (applied to songs)
 * - Create New variant for adding new clips
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
import {
  Plus,
  Sparkles,
  Play,
  Check,
  Music,
  Trash2,
  AlertCircle,
  Clock,
  Film,
  Image as ImageIcon,
  Layers,
  Video,
} from 'lucide-react-native'
import { VIDEO_CLIP_STATUS } from '../../../services/videoClipsService'

const VideoClipCard = ({
  clip,
  onPress,
  onLongPress,
  onDelete,
  isCreateNew = false,
  isSelected = false,
  isLoading = false,
  showUsage = true,
  showDeleteButton = false,
  size = 140,
  aspectRatio = 9 / 16, // Portrait by default
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark, size, aspectRatio)

  // Create New Video card variant
  if (isCreateNew) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.thumbnail, styles.createNewThumbnail]}>
          <Plus
            size={size * 0.25}
            color={isDark ? '#a3a3a3' : '#525252'}
            strokeWidth={1.5}
          />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          Create New
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          Generate video
        </Text>
      </TouchableOpacity>
    )
  }

  const thumbnailUrl = clip?.thumbnailUrl
  const status = clip?.status || VIDEO_CLIP_STATUS.COMPLETED
  const duration = clip?.duration || 8
  const generationMode = clip?.generationMode || 'text'
  const isGenerating = status === VIDEO_CLIP_STATUS.GENERATING
  const isFailed = status === VIDEO_CLIP_STATUS.FAILED

  // Usage indicators
  const usedInSongs = clip?.usedInSongs?.length > 0

  // Get mode icon and label
  const getModeInfo = () => {
    switch (generationMode) {
      case 'text':
        return { icon: Sparkles, label: 'AI', color: 'rgba(147, 51, 234, 0.9)' }
      case 'startFrame':
        return { icon: ImageIcon, label: 'Image', color: 'rgba(59, 130, 246, 0.9)' }
      case 'interpolation':
        return { icon: Layers, label: 'Morph', color: 'rgba(236, 72, 153, 0.9)' }
      case 'reference':
        return { icon: Film, label: 'Style', color: 'rgba(16, 185, 129, 0.9)' }
      default:
        return { icon: Video, label: 'Video', color: 'rgba(107, 114, 128, 0.9)' }
    }
  }

  const modeInfo = getModeInfo()
  const ModeIcon = modeInfo.icon

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(clip)}
      onLongPress={() => onLongPress?.(clip)}
      activeOpacity={0.8}
      disabled={isLoading || isGenerating}
    >
      {/* Thumbnail Container */}
      <View style={styles.thumbnailContainer}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <Video
              size={size * 0.25}
              color={isDark ? '#a3a3a3' : '#737373'}
              strokeWidth={1.5}
            />
          </View>
        )}

        {/* Play Overlay - Only for completed clips */}
        {!isGenerating && !isFailed && !isSelected && !isLoading && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Play size={size * 0.15} color="#fff" fill="#fff" />
            </View>
          </View>
        )}

        {/* Mode Badge */}
        <View style={[styles.badge, { backgroundColor: modeInfo.color }]}>
          <ModeIcon size={10} color="#fff" />
          <Text style={styles.badgeText}>{modeInfo.label}</Text>
        </View>

        {/* Duration Badge */}
        <View style={styles.durationBadge}>
          <Clock size={10} color="#fff" />
          <Text style={styles.durationText}>{duration}s</Text>
        </View>

        {/* Usage Indicators */}
        {showUsage && usedInSongs && (
          <View style={styles.usageContainer}>
            <View style={styles.usageIcon}>
              <Music size={10} color="#fff" />
            </View>
          </View>
        )}

        {/* Generating Overlay */}
        {isGenerating && (
          <View style={styles.generatingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.generatingText}>
              {clip?.generationProgress || 0}%
            </Text>
          </View>
        )}

        {/* Failed Overlay */}
        {isFailed && (
          <View style={styles.failedOverlay}>
            <AlertCircle size={24} color="#fff" />
            <Text style={styles.failedText}>Failed</Text>
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
        {showDeleteButton && onDelete && !isSelected && !isLoading && !isGenerating && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation?.()
              onDelete(clip)
            }}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <Trash2 size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Prompt/Title */}
      <Text style={styles.name} numberOfLines={1}>
        {clip?.prompt || 'Untitled Video'}
      </Text>

      {/* Date or model */}
      <Text style={styles.description} numberOfLines={1}>
        {clip?.modelName || formatDate(clip?.createdAt)}
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

const getStyles = (isDark, size, aspectRatio) => {
  const height = size / aspectRatio

  return StyleSheet.create({
    container: {
      width: size,
    },
    thumbnailContainer: {
      width: size,
      height: height,
      borderRadius: 10,
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
      backgroundColor: isDark ? '#333333' : '#e0e0e0',
    },
    createNewThumbnail: {
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: isDark ? '#525252' : '#a3a3a3',
      backgroundColor: 'transparent',
      borderRadius: 10,
      width: size,
      height: height,
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButton: {
      width: size * 0.35,
      height: size * 0.35,
      borderRadius: size * 0.175,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
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
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    durationBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      gap: 3,
    },
    durationText: {
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
    generatingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    generatingText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    failedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(239, 68, 68, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    failedText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
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
      bottom: 6,
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
}

export default memo(VideoClipCard)
