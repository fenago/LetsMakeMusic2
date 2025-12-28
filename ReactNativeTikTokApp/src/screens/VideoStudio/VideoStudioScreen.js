/**
 * VideoStudioScreen - Main video clips management screen
 *
 * Features:
 * - View all saved video clips in a grid
 * - Create new videos via AI generation (Veo 3/3.1)
 * - Filter by generation mode (All, AI, Image, Morph)
 * - Apply video clips to songs
 * - Delete video clips
 */
import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Plus, Video, Sparkles } from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { useVideoClips } from '../../hooks/useVideoClips'
import VideoClipsGallery from '../../components/ui/VideoClipsGallery'
import VideoGeneratorModal from '../../components/ui/VideoGeneratorModal'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_PADDING = 16
const GRID_GAP = 12
const NUM_COLUMNS = 2
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

const VideoStudioScreen = ({ navigation, route }) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  // Get callback params if navigated from song selection
  const { selectMode, onSelect, songId, openGenerator } = route?.params || {}

  // Auto-open generator if requested
  useEffect(() => {
    if (openGenerator) {
      setShowGenerator(true)
    }
  }, [openGenerator])

  // Video clips state
  const {
    videoClips,
    completedClips,
    pendingClips,
    failedClips,
    videoClipsLoading,
    videoClipsError,
    operationLoading,
    videoClipsCount,
    saveVideoClip,
    deleteVideoClip,
    applyToSong,
    clearError,
  } = useVideoClips(currentUser?.id, {
    id: currentUser?.id,
    stageName: currentUser?.firstName || currentUser?.stageName || 'Unknown',
    profilePictureURL: currentUser?.profilePictureURL,
  })

  // Local state
  const [showGenerator, setShowGenerator] = useState(false)
  const [selectedClip, setSelectedClip] = useState(null)
  const [editMode, setEditMode] = useState(false)

  // Handle AI generation complete
  const handleGenerated = useCallback(async (videoData) => {
    const result = await saveVideoClip(videoData)
    if (result.success) {
      setShowGenerator(false)
    } else {
      Alert.alert('Error', result.error || 'Failed to save video clip')
    }
  }, [saveVideoClip])

  // Handle clip press (selection mode or detail view)
  const handleClipPress = useCallback((clip) => {
    if (selectMode) {
      setSelectedClip(selectedClip?.id === clip.id ? null : clip)
    } else {
      // Navigate to detail view
      navigation.navigate('VideoClipDetail', { clipId: clip.id })
    }
  }, [selectMode, selectedClip, navigation])

  // Handle clip long press (quick actions)
  const handleClipLongPress = useCallback((clip) => {
    Alert.alert(
      'Video Options',
      'What would you like to do?',
      [
        {
          text: 'Use as Song Video',
          onPress: () => {
            // Navigate to song picker
            navigation.navigate('SelectSongForVideoClip', { clipId: clip.id })
          },
        },
        {
          text: 'View Details',
          onPress: () => {
            navigation.navigate('VideoClipDetail', { clipId: clip.id })
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(clip),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    )
  }, [navigation])

  // Confirm delete
  const confirmDelete = useCallback((clip) => {
    Alert.alert(
      'Delete Video Clip',
      'Are you sure you want to delete this video? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteVideoClip(clip.id)
            if (!result.success) {
              Alert.alert('Error', result.error)
            }
          },
        },
      ]
    )
  }, [deleteVideoClip])

  // Handle selection confirm (when in select mode)
  const handleConfirmSelection = useCallback(async () => {
    if (!selectedClip) return

    if (songId) {
      const result = await applyToSong(selectedClip.id, songId)
      if (result.success) {
        onSelect?.(selectedClip)
        navigation.goBack()
      } else {
        Alert.alert('Error', result.error)
      }
    } else {
      onSelect?.(selectedClip)
      navigation.goBack()
    }
  }, [selectedClip, songId, applyToSong, onSelect, navigation])

  // Render header stats
  const renderHeaderStats = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statCard, { backgroundColor: colorSet.grey3 }]}>
        <Text style={[styles.statNumber, { color: colorSet.primaryForeground }]}>
          {completedClips.length}
        </Text>
        <Text style={[styles.statLabel, { color: colorSet.secondaryText }]}>
          Completed
        </Text>
      </View>
      {pendingClips.length > 0 && (
        <View style={[styles.statCard, { backgroundColor: colorSet.grey3 }]}>
          <View style={styles.statNumberRow}>
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
            <Text style={[styles.statNumber, { color: colorSet.primaryForeground }]}>
              {pendingClips.length}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colorSet.secondaryText }]}>
            Generating
          </Text>
        </View>
      )}
      {failedClips.length > 0 && (
        <View style={[styles.statCard, { backgroundColor: '#450a0a' }]}>
          <Text style={[styles.statNumber, { color: '#f87171' }]}>
            {failedClips.length}
          </Text>
          <Text style={[styles.statLabel, { color: '#fca5a5' }]}>
            Failed
          </Text>
        </View>
      )}
    </View>
  )

  // Render empty state
  const renderEmpty = () => {
    if (videoClipsLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      )
    }

    if (videoClipsError) {
      return (
        <View style={styles.emptyContainer}>
          <Video size={64} color="#ef4444" strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
            Something Went Wrong
          </Text>
          <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
            {videoClipsError}
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

    return null // VideoClipsGallery handles empty state with Create New card
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
          {selectMode ? 'Select Video' : 'Video Studio'}
        </Text>
        {selectMode ? (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedClip && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmSelection}
            disabled={!selectedClip}
          >
            <Text style={[
              styles.confirmText,
              { color: selectedClip ? colorSet.primaryForeground : colorSet.grey6 },
            ]}>
              Use
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButtons}>
            {videoClips.length > 0 && (
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
                onPress={() => setShowGenerator(true)}
              >
                <Plus size={24} color={colorSet.primaryForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Video Clips Gallery */}
      {videoClipsError ? (
        renderEmpty()
      ) : (
        <VideoClipsGallery
          clips={videoClips}
          loading={videoClipsLoading}
          onClipPress={handleClipPress}
          onClipLongPress={handleClipLongPress}
          onClipDelete={confirmDelete}
          onCreateNew={() => setShowGenerator(true)}
          showCreateNew={!selectMode && !editMode}
          showDeleteButton={editMode && !selectMode}
          showFilters={!selectMode}
          selectedClipId={selectMode ? selectedClip?.id : null}
          numColumns={NUM_COLUMNS}
          cardSize={ITEM_SIZE}
          ListHeaderComponent={
            videoClips.length > 0 && !selectMode ? renderHeaderStats() : null
          }
          emptyTitle="No Video Clips Yet"
          emptyMessage="Create your first AI-generated video with Veo 3.1"
        />
      )}

      {/* AI Video Generator Modal */}
      <VideoGeneratorModal
        visible={showGenerator}
        onClose={() => setShowGenerator(false)}
        onGenerated={handleGenerated}
        currentUser={currentUser}
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})

export default VideoStudioScreen
