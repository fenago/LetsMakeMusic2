/**
 * VideoClipDetailScreen - Detail view for a single video clip
 *
 * Features:
 * - Full video player with controls
 * - Metadata display (prompt, model, settings)
 * - Reference images used (if any)
 * - Apply to song option
 * - Share/export options
 * - Delete option
 */
import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Video } from 'expo-av'
import { Image } from 'expo-image'
import {
  ChevronLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Trash2,
  Share2,
  Clock,
  Film,
  Sparkles,
  Image as ImageIcon,
  Layers,
  DollarSign,
  Calendar,
  RefreshCw,
} from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { useVideoClipDetail } from '../../hooks/useVideoClips'
import { VIDEO_CLIP_STATUS } from '../../services/videoClipsService'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const VideoClipDetailScreen = ({ navigation, route }) => {
  const { clipId } = route?.params || {}
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  // Video clip data
  const { clip, clipLoading, clipError, refetch } = useVideoClipDetail(clipId)

  // Video player state
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [videoError, setVideoError] = useState(null)
  const [videoLoading, setVideoLoading] = useState(true)

  // Check if URL is a valid Firebase Storage URL
  const isValidFirebaseUrl = (url) => {
    if (!url) return false
    // Valid Firebase Storage URLs contain firebasestorage.googleapis.com
    return url.includes('firebasestorage.googleapis.com')
  }

  // Check if URL is a Veo temporary URI
  const isVeoUri = (url) => {
    if (!url) return false
    // Veo returns URIs like: https://storage.googleapis.com/... (without firebasestorage)
    // Any storage.googleapis.com URL that's NOT firebasestorage is likely a Veo URI
    return url.includes('storage.googleapis.com') && !url.includes('firebasestorage')
  }

  // Track if this is a known expired Veo URL
  const [isExpiredVeoUrl, setIsExpiredVeoUrl] = React.useState(false)

  // Loading timeout - if video doesn't load in 20 seconds, show error
  // Increased from 10s to 20s to give Firebase Storage more time
  React.useEffect(() => {
    if (!videoLoading || videoError) return

    const timeoutId = setTimeout(() => {
      if (videoLoading && !videoError) {
        setVideoLoading(false)

        // Provide more specific error based on URL type
        if (isVeoUri(clip?.videoUrl)) {
          setIsExpiredVeoUrl(true)
          setVideoError('This video was saved with a temporary URL that has expired. Please delete this video and generate a new one.')
        } else if (isValidFirebaseUrl(clip?.videoUrl)) {
          setVideoError('Video failed to load from storage. Please check your internet connection and try again.')
        } else {
          setVideoError('Video failed to load. The URL may be invalid.')
        }
      }
    }, 20000) // 20 second timeout

    return () => clearTimeout(timeoutId)
  }, [videoLoading, videoError, clip?.videoUrl])

  // Check video URL validity and handle expired Veo URLs
  React.useEffect(() => {
    if (clip?.videoUrl) {
      // Reset states when URL changes
      setVideoLoading(true)
      setVideoError(null)
      setIsExpiredVeoUrl(false)

      if (isVeoUri(clip.videoUrl)) {
        setVideoLoading(false)
        setIsExpiredVeoUrl(true)
        setVideoError('This video was saved with a temporary URL that has expired. Please delete this video and generate a new one.')
      }
    }
  }, [clip?.videoUrl])

  // Toggle playback
  const togglePlayback = useCallback(async () => {
    if (!videoRef.current) return

    try {
      if (isPlaying) {
        await videoRef.current.setStatusAsync({ shouldPlay: false })
        setIsPlaying(false)
      } else {
        await videoRef.current.setStatusAsync({ shouldPlay: true })
        setIsPlaying(true)
      }
    } catch (error) {
      Alert.alert('Playback Error', error.message || String(error))
    }
  }, [isPlaying])

  // Toggle mute - get actual status from video to avoid stale state issues
  const toggleMute = useCallback(async () => {
    if (!videoRef.current) return

    try {
      // Get current status directly from video player
      const status = await videoRef.current.getStatusAsync()
      const currentlyPlaying = status.isLoaded && status.isPlaying
      const newMutedState = !status.isMuted

      // Only change isMuted, preserve current playback state
      await videoRef.current.setStatusAsync({
        isMuted: newMutedState,
        shouldPlay: currentlyPlaying,
      })
      setIsMuted(newMutedState)
    } catch (error) {
      // Fallback to simple mute toggle
      await videoRef.current.setStatusAsync({ isMuted: !isMuted })
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Apply to song
  const handleApplyToSong = useCallback(() => {
    navigation.navigate('SelectSongForVideoClip', { clipId: clip?.id })
  }, [clip?.id, navigation])

  // Share video
  const handleShare = useCallback(async () => {
    if (!clip?.videoUrl) return

    try {
      await Share.share({
        message: `Check out this AI-generated video! ${clip.prompt || ''}`,
        url: clip.videoUrl,
      })
    } catch (error) {
      console.error('[VideoClipDetail] Share error:', error)
    }
  }, [clip])

  // Delete video
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            try {
              const { deleteVideoClip } = require('../../services/videoClipsService')
              const result = await deleteVideoClip(clip?.id, currentUser?.id)
              if (result.success) {
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to delete video')
              }
            } catch (error) {
              Alert.alert('Error', error.message)
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
  }, [clip?.id, currentUser?.id, navigation])

  // Get mode info
  const getModeInfo = (mode) => {
    switch (mode) {
      case 'text':
        return { icon: Sparkles, label: 'Text to Video', color: '#9333ea' }
      case 'startFrame':
        return { icon: ImageIcon, label: 'Image Start Frame', color: '#3b82f6' }
      case 'interpolation':
        return { icon: Layers, label: 'Frame Interpolation', color: '#ec4899' }
      case 'reference':
        return { icon: Film, label: 'Style References', color: '#10b981' }
      default:
        return { icon: Film, label: 'Video', color: '#6b7280' }
    }
  }

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Loading state
  if (clipLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
          <Text style={[styles.loadingText, { color: colorSet.secondaryText }]}>
            Loading video...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (clipError || !clip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
        <View style={[styles.header, { borderBottomColor: colorSet.grey3 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={colorSet.primaryText} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colorSet.primaryText }]}>Video Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Film size={64} color="#ef4444" strokeWidth={1} />
          <Text style={[styles.errorTitle, { color: colorSet.primaryText }]}>
            Video Not Found
          </Text>
          <Text style={[styles.errorSubtitle, { color: colorSet.secondaryText }]}>
            {clipError || 'This video may have been deleted.'}
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const modeInfo = getModeInfo(clip.generationMode)
  const ModeIcon = modeInfo.icon
  const isGenerating = clip.status === VIDEO_CLIP_STATUS.GENERATING
  const isFailed = clip.status === VIDEO_CLIP_STATUS.FAILED

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colorSet.grey3 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colorSet.primaryText }]}>Video Details</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Trash2 size={22} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Player */}
        <View style={styles.videoSection}>
          {isGenerating ? (
            <View style={[styles.videoPlaceholder, { backgroundColor: colorSet.grey3 }]}>
              <ActivityIndicator size="large" color={colorSet.primaryForeground} />
              <Text style={[styles.generatingText, { color: colorSet.primaryText }]}>
                Generating Video...
              </Text>
              <Text style={[styles.generatingProgress, { color: colorSet.secondaryText }]}>
                {clip.generationProgress || 0}% complete
              </Text>
            </View>
          ) : isFailed ? (
            <View style={[styles.videoPlaceholder, { backgroundColor: '#450a0a' }]}>
              <Film size={48} color="#f87171" />
              <Text style={[styles.failedText, { color: '#f87171' }]}>
                Generation Failed
              </Text>
              <Text style={[styles.failedMessage, { color: '#fca5a5' }]}>
                {clip.errorMessage || 'An error occurred during generation'}
              </Text>
            </View>
          ) : videoError ? (
            <View style={[styles.videoPlaceholder, { backgroundColor: '#450a0a' }]}>
              <Film size={48} color="#f87171" />
              <Text style={[styles.failedText, { color: '#f87171' }]}>
                Video Unavailable
              </Text>
              <Text style={[styles.failedMessage, { color: '#fca5a5' }]}>
                {videoError}
              </Text>
              <View style={styles.errorActions}>
                {isExpiredVeoUrl ? (
                  <TouchableOpacity
                    style={styles.errorActionButton}
                    onPress={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Trash2 size={16} color="#fff" />
                        <Text style={styles.errorActionText}>Delete Video</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.errorActionButton, { backgroundColor: colorSet.primaryForeground }]}
                    onPress={() => {
                      setVideoError(null)
                      setVideoLoading(true)
                    }}
                  >
                    <RefreshCw size={16} color="#fff" />
                    <Text style={styles.errorActionText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : clip.videoUrl ? (
            <View style={styles.videoContainer}>
              {videoLoading && (
                <View style={[styles.videoLoadingOverlay, { backgroundColor: colorSet.grey3 }]}>
                  <ActivityIndicator size="large" color={colorSet.primaryForeground} />
                  <Text style={[styles.loadingText, { color: colorSet.secondaryText }]}>
                    Loading video...
                  </Text>
                </View>
              )}
              <Video
                ref={videoRef}
                source={{ uri: clip.videoUrl }}
                style={styles.video}
                resizeMode="contain"
                isLooping
                shouldPlay={false}
                isMuted={isMuted}
                onPlaybackStatusUpdate={(status) => {
                  setIsPlaying(status.isPlaying)
                  if (status.isLoaded) {
                    setVideoLoading(false)
                  }
                }}
                onError={(error) => {
                  setVideoLoading(false)
                  setVideoError(`Failed to load video: ${error || 'Unknown error'}`)
                }}
                onLoad={() => setVideoLoading(false)}
              />
              <View style={styles.videoControls}>
                <TouchableOpacity style={styles.controlButton} onPress={togglePlayback}>
                  {isPlaying ? (
                    <Pause size={32} color="#fff" />
                  ) : (
                    <Play size={32} color="#fff" fill="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
                  {isMuted ? (
                    <VolumeX size={24} color="#fff" />
                  ) : (
                    <Volume2 size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.videoPlaceholder, { backgroundColor: colorSet.grey3 }]}>
              <Film size={48} color={colorSet.grey6} />
              <Text style={[styles.noVideoText, { color: colorSet.secondaryText }]}>
                Video not available
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {!isGenerating && !isFailed && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colorSet.primaryForeground }]}
              onPress={handleApplyToSong}
            >
              <Music size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Use for Song</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonOutline, { borderColor: colorSet.grey3 }]}
              onPress={handleShare}
            >
              <Share2 size={20} color={colorSet.primaryText} />
            </TouchableOpacity>
          </View>
        )}

        {/* Prompt */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
            Prompt
          </Text>
          <Text style={[styles.promptText, { color: colorSet.primaryText }]}>
            {clip.prompt || 'No prompt available'}
          </Text>
          {clip.negativePrompt && (
            <>
              <Text style={[styles.subLabel, { color: colorSet.secondaryText }]}>
                Negative Prompt
              </Text>
              <Text style={[styles.negativePromptText, { color: colorSet.secondaryText }]}>
                {clip.negativePrompt}
              </Text>
            </>
          )}
        </View>

        {/* Generation Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
            Details
          </Text>

          <View style={styles.detailsGrid}>
            {/* Mode */}
            <View style={[styles.detailCard, { backgroundColor: colorSet.grey3 }]}>
              <ModeIcon size={18} color={modeInfo.color} />
              <Text style={[styles.detailLabel, { color: colorSet.secondaryText }]}>
                Mode
              </Text>
              <Text style={[styles.detailValue, { color: colorSet.primaryText }]}>
                {modeInfo.label}
              </Text>
            </View>

            {/* Duration */}
            <View style={[styles.detailCard, { backgroundColor: colorSet.grey3 }]}>
              <Clock size={18} color={colorSet.primaryForeground} />
              <Text style={[styles.detailLabel, { color: colorSet.secondaryText }]}>
                Duration
              </Text>
              <Text style={[styles.detailValue, { color: colorSet.primaryText }]}>
                {clip.duration || 8} seconds
              </Text>
            </View>

            {/* Model */}
            <View style={[styles.detailCard, { backgroundColor: colorSet.grey3 }]}>
              <Sparkles size={18} color="#9333ea" />
              <Text style={[styles.detailLabel, { color: colorSet.secondaryText }]}>
                Model
              </Text>
              <Text style={[styles.detailValue, { color: colorSet.primaryText }]}>
                {clip.modelName || 'Veo 3.1'}
              </Text>
            </View>

            {/* Aspect Ratio */}
            <View style={[styles.detailCard, { backgroundColor: colorSet.grey3 }]}>
              <Film size={18} color="#3b82f6" />
              <Text style={[styles.detailLabel, { color: colorSet.secondaryText }]}>
                Aspect
              </Text>
              <Text style={[styles.detailValue, { color: colorSet.primaryText }]}>
                {clip.aspectRatio || '9:16'}
              </Text>
            </View>
          </View>
        </View>

        {/* Reference Images */}
        {clip.referenceImages && clip.referenceImages.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
              Reference Images
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.referenceImagesRow}>
                {clip.referenceImages.map((img, index) => (
                  <Image
                    key={index}
                    source={{ uri: img.url || img.uri }}
                    style={styles.referenceImage}
                    contentFit="cover"
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Usage */}
        {clip.usedInSongs && clip.usedInSongs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
              Used In
            </Text>
            <View style={[styles.usageCard, { backgroundColor: colorSet.grey3 }]}>
              <Music size={18} color={colorSet.primaryForeground} />
              <Text style={[styles.usageText, { color: colorSet.primaryText }]}>
                {clip.usedInSongs.length} song{clip.usedInSongs.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <View style={styles.metadataRow}>
            <Calendar size={14} color={colorSet.secondaryText} />
            <Text style={[styles.metadataText, { color: colorSet.secondaryText }]}>
              Created {formatDate(clip.createdAt)}
            </Text>
          </View>
          {clip.estimatedCost && (
            <View style={styles.metadataRow}>
              <DollarSign size={14} color={colorSet.secondaryText} />
              <Text style={[styles.metadataText, { color: colorSet.secondaryText }]}>
                Estimated cost: ${clip.estimatedCost.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  deleteButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  videoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  videoContainer: {
    aspectRatio: 9 / 16,
    maxHeight: SCREEN_WIDTH * 0.8,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    width: '80%',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 16,
    gap: 12,
  },
  videoControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    aspectRatio: 9 / 16,
    maxHeight: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '70%',
    gap: 12,
  },
  generatingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  generatingProgress: {
    fontSize: 14,
  },
  failedText: {
    fontSize: 18,
    fontWeight: '600',
  },
  failedMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  errorActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noVideoText: {
    fontSize: 16,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonOutline: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  subLabel: {
    fontSize: 13,
    marginTop: 12,
    marginBottom: 4,
  },
  negativePromptText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2 - 0.5,
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  referenceImagesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  referenceImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  usageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  usageText: {
    fontSize: 15,
    fontWeight: '500',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 13,
  },
})

export default VideoClipDetailScreen
