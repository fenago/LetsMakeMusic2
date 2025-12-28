import React, { useCallback, useRef, useEffect, useState, memo } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  TouchableOpacity as RNTouchableOpacity,
  Pressable,
  Share,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import BottomSheet, { BottomSheetScrollView, TouchableOpacity } from '@gorhom/bottom-sheet'
import * as FileSystem from 'expo-file-system/legacy'
import {
  ChevronDown,
  MoreHorizontal,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  ChevronUp,
  ChevronRight,
  Music,
  User,
  X,
  Video,
  Wand2,
  Image as ImageIcon,
  AudioWaveform,
  Mic,
  Guitar,
  FileText,
  Upload,
  Film,
  Scissors,
  Layers,
  Trash2,
  Volume2,
  Download,
  ListPlus,
  Plus,
  ListMusic,
  BarChart3,
  Edit3,
  Share2,
  MessageCircle,
  Clock,
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import { useCurrentUser } from '../../../core/onboarding'
import { useTheme } from '../../../core/dopebase'
import { usePlaylists } from '../../../hooks/usePlaylists'
import EditSongModal from '../EditSongModal'
import LyricsViewModal from '../LyricsViewModal'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const ARTWORK_SIZE = SCREEN_WIDTH - 80
const LYRICS_PREVIEW_LINES = 4

/**
 * Separate Progress Section component - Subscribes directly to position from context
 * This isolates position updates to this component only, preventing full parent re-renders
 */
const ProgressSection = ({ styles }) => {
  const { position, duration, seek, formatTime } = useMediaPlayer()
  const progress = duration > 0 ? (position / duration) * 100 : 0

  const handleProgressPress = useCallback((event) => {
    const { locationX } = event.nativeEvent
    const progressBarWidth = SCREEN_WIDTH - 80
    const percentage = Math.max(0, Math.min(100, (locationX / progressBarWidth) * 100))
    const newPosition = (percentage / 100) * duration
    seek(newPosition)
  }, [duration, seek])

  return (
    <View style={styles.progressSection}>
      <Pressable
        style={styles.progressBarContainer}
        onPress={handleProgressPress}
        hitSlop={15}
      >
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        <View
          style={[
            styles.progressKnob,
            { left: `${progress}%` },
          ]}
        />
      </Pressable>
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  )
}

/**
 * FullPlayerBottomSheet - Full screen audio player
 *
 * Features:
 * - Large album artwork
 * - Track info (title, artist) with favorite button
 * - Progress slider with time display
 * - Play/pause, next, previous, shuffle, repeat buttons
 * - Lyrics section (expandable)
 * - Next in queue section
 * - About the artist section
 * - Drag down to minimize
 */
const FullPlayerBottomSheet = () => {
  // Use useTheme from DopebaseContext for safer theme access
  // This avoids "hasValue of undefined" errors from useColorScheme in certain contexts
  const themeContext = useTheme()
  const isDark = (themeContext?.appearance ?? 'light') === 'dark'

  const bottomSheetRef = useRef(null)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off') // 'off' | 'all' | 'one'
  const [showLyrics, setShowLyrics] = useState(true)
  const [showQueue, setShowQueue] = useState(true)
  const [showArtist, setShowArtist] = useState(true)
  const [showLyricsModal, setShowLyricsModal] = useState(false)
  // New expandable sections
  const [showCreateVideo, setShowCreateVideo] = useState(false)
  const [showMusicGeneration, setShowMusicGeneration] = useState(false)
  const [showSongCover, setShowSongCover] = useState(false)
  const [showAudioProcessing, setShowAudioProcessing] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [showEditSongModal, setShowEditSongModal] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const navigation = useNavigation()
  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID
  const { playlists, playlistsLoading, addSongToPlaylist } = usePlaylists(userId)

  const {
    mediaType,
    isPlaying,
    currentMedia,
    position, // Still needed for hasPrevious and karaoke lyrics
    isFullPlayerVisible,
    togglePlayPause,
    hideFullPlayer,
    playNext,
    playPrevious,
    queue,
    queueIndex,
    playQueueItem,
    removeFromQueue,
    // Shared like state from context
    isLiked: isLikedFn,
    toggleLike,
  } = useMediaPlayer()

  // Get like status from shared context
  const isLiked = currentMedia?.id ? isLikedFn(currentMedia.id) : false


  // Handle like button press - uses shared context
  const handleLikePress = useCallback(async () => {
    if (!currentMedia?.id || isLikeLoading) {
      return
    }

    setIsLikeLoading(true)
    try {
      await toggleLike(currentMedia)
      // Note: isLiked will update automatically via Firebase subscription in context
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLikeLoading(false)
    }
  }, [currentMedia, isLikeLoading, toggleLike])

  // Handle visibility changes
  useEffect(() => {
    if (isFullPlayerVisible && bottomSheetRef.current) {
      bottomSheetRef.current.expand()
    } else if (!isFullPlayerVisible && bottomSheetRef.current) {
      bottomSheetRef.current.close()
    }
  }, [isFullPlayerVisible])

  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      hideFullPlayer()
    }
  }, [hideFullPlayer])

  // Toggle repeat mode
  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all'
      if (prev === 'all') return 'one'
      return 'off'
    })
  }, [])

  // Navigate to a feature screen with the current song
  const navigateToFeature = useCallback((screenName) => {
    hideFullPlayer()
    navigation.navigate(screenName, { song: currentMedia })
  }, [navigation, hideFullPlayer, currentMedia])

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!currentMedia?.audioUrl) {
      Alert.alert('Download Error', 'No audio file available to download.')
      return
    }

    if (isDownloading) {
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      // Create filename from song title
      const songTitle = (currentMedia.title || currentMedia.label || currentMedia.name || 'song')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50)
      const timestamp = Date.now()
      const filename = `${songTitle}_${timestamp}.mp3`
      const fileUri = `${FileSystem.documentDirectory}${filename}`

      // Download the file with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        currentMedia.audioUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
          setDownloadProgress(Math.round(progress * 100))
        }
      )

      const result = await downloadResumable.downloadAsync()

      if (result?.uri) {
        // Offer to share/save the downloaded file
        Alert.alert(
          'Download Complete',
          `"${currentMedia.title || 'Song'}" has been downloaded. Would you like to share it?`,
          [
            {
              text: 'Share',
              onPress: async () => {
                try {
                  await Share.share({
                    url: result.uri,
                    title: currentMedia.title || 'Song',
                  })
                } catch (shareError) {
                  console.log('[FullPlayer] Share cancelled or failed:', shareError)
                }
              },
            },
            {
              text: 'Done',
              style: 'cancel',
            },
          ]
        )
      } else {
        throw new Error('Download failed')
      }
    } catch (error) {
      console.error('[FullPlayer] Download error:', error)
      Alert.alert('Download Failed', error.message || 'Unable to download the song. Please try again.')
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }, [currentMedia, isDownloading])

  // Handle add to playlist
  const handleAddToPlaylist = useCallback(async (playlistId, playlistName) => {
    if (!currentMedia?.id) {
      Alert.alert('Error', 'No song selected.')
      return
    }

    try {
      const result = await addSongToPlaylist(playlistId, currentMedia)

      if (result.alreadyExists) {
        Alert.alert('Already in Playlist', `This song is already in "${playlistName}".`)
      } else if (result.success) {
        Alert.alert('Added to Playlist', `"${currentMedia.title || 'Song'}" has been added to "${playlistName}".`)
        setShowPlaylistModal(false)
      } else {
        Alert.alert('Error', result.error || 'Failed to add song to playlist.')
      }
    } catch (error) {
      console.error('[FullPlayer] Add to playlist error:', error)
      Alert.alert('Error', error.message || 'Failed to add song to playlist.')
    }
  }, [currentMedia, addSongToPlaylist])

  // Open playlist selection modal
  const openPlaylistModal = useCallback(() => {
    if (!userId) {
      Alert.alert('Sign In Required', 'Please sign in to add songs to playlists.')
      return
    }
    setShowPlaylistModal(true)
  }, [userId])

  // Navigate to create playlist screen
  const handleCreatePlaylist = useCallback(() => {
    setShowPlaylistModal(false)
    hideFullPlayer()
    navigation.navigate('CreatePlaylist', { songToAdd: currentMedia })
  }, [navigation, hideFullPlayer, currentMedia])

  // Handle native share
  const handleShare = useCallback(async () => {
    try {
      const songTitle = currentMedia.title || currentMedia.label || currentMedia.name || 'a song'
      const artistName = currentMedia.artist || currentMedia.author?.stageName || 'Unknown Artist'
      const shareUrl = currentMedia.shareUrl || currentMedia.audioUrl || ''

      await Share.share({
        message: `Check out "${songTitle}" by ${artistName} on Let's Make Music! ${shareUrl}`,
        title: songTitle,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }, [currentMedia])

  // Handle share to feed with visibility check
  const handleShareToFeed = useCallback(() => {
    // Check if song is public (visibility can be 'public', true, or undefined defaults to public)
    const isPublic = currentMedia.visibility === 'public' ||
                     currentMedia.isPublic === true ||
                     (currentMedia.visibility === undefined && currentMedia.isPublic === undefined)

    if (!isPublic) {
      Alert.alert(
        'Private Song',
        'This song is set to private and cannot be shared to the feed. To share it, go to Edit Song and change the visibility to public.',
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Edit Song',
            onPress: () => setShowEditSongModal(true)
          }
        ]
      )
      return
    }

    navigateToFeature('ShareSongToFeed')
  }, [currentMedia, navigateToFeature])

  // Don't render if no media or wrong type
  if (mediaType !== 'audio' || !currentMedia) {
    return null
  }

  const thumbnailUrl = currentMedia.thumbnailUrl || currentMedia.imageUrl || currentMedia.coverUrl || currentMedia.profilePictureURL
  const hasNext = queueIndex < queue.length - 1
  const hasPrevious = queueIndex > 0 || position > 3000

  const styles = getStyles(isDark)

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['100%']}
      enablePanDownToClose={true}
      onChange={handleSheetChanges}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={hideFullPlayer}
          >
            <ChevronDown size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Now Playing
          </Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowOptionsMenu(true)}>
            <MoreHorizontal size={24} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Artwork */}
        <View style={styles.artworkContainer}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.placeholderArtwork]}>
              <Music size={100} color={isDark ? '#666666' : '#cccccc'} strokeWidth={1.5} />
            </View>
          )}
        </View>

        {/* Track Info with Action Buttons */}
        <View style={styles.trackInfo}>
          <View style={styles.trackInfoText}>
            <Text style={styles.title} numberOfLines={2}>
              {currentMedia.title || currentMedia.label || currentMedia.name || 'Unknown Track'}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentMedia.artist || currentMedia.author?.stageName || currentMedia.subLabel || currentMedia.description || currentMedia.author?.firstName || 'Unknown Artist'}
            </Text>
          </View>
          <View style={styles.trackActionButtons}>
            <RNTouchableOpacity
              style={styles.trackActionButton}
              onPress={openPlaylistModal}
              activeOpacity={0.6}
            >
              <ListPlus
                size={24}
                color={isDark ? '#888888' : '#888888'}
                strokeWidth={2}
              />
            </RNTouchableOpacity>
            <RNTouchableOpacity
              style={[styles.trackActionButton, isDownloading && styles.downloadingButton]}
              onPress={handleDownload}
              disabled={isDownloading}
              activeOpacity={0.6}
            >
              {isDownloading ? (
                <View style={styles.downloadProgressContainer}>
                  <ActivityIndicator size="small" color={isDark ? '#888888' : '#888888'} />
                </View>
              ) : (
                <Download
                  size={24}
                  color={isDark ? '#888888' : '#888888'}
                  strokeWidth={2}
                />
              )}
            </RNTouchableOpacity>
            <RNTouchableOpacity
              style={[styles.trackActionButton, isLikeLoading && styles.likeLoading]}
              onPress={handleLikePress}
              disabled={isLikeLoading}
              activeOpacity={0.6}
            >
              <Heart
                size={24}
                color={isLiked ? '#ef4444' : (isDark ? '#888888' : '#888888')}
                fill={isLiked ? '#ef4444' : 'transparent'}
                strokeWidth={2}
              />
            </RNTouchableOpacity>
          </View>
        </View>

        {/* Progress Bar - Separate component to isolate position updates */}
        <ProgressSection styles={styles} />

        {/* Controls - Using Pressable for fastest response */}
        <View style={styles.controls}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setIsShuffleOn(!isShuffleOn)}
            hitSlop={12}
          >
            <Shuffle
              size={24}
              color={isShuffleOn ? '#3875e8' : (isDark ? '#888888' : '#666666')}
              strokeWidth={2}
            />
          </Pressable>

          <Pressable
            style={[styles.controlButton, !hasPrevious && styles.disabledButton]}
            onPress={playPrevious}
            disabled={!hasPrevious && position <= 3000}
            hitSlop={12}
          >
            <SkipBack
              size={32}
              color={isDark ? '#ffffff' : '#151723'}
              fill={isDark ? '#ffffff' : '#151723'}
              strokeWidth={0}
            />
          </Pressable>

          <Pressable
            style={styles.playPauseButton}
            onPress={togglePlayPause}
            hitSlop={12}
          >
            {isPlaying ? (
              <Pause size={32} color="#ffffff" fill="#ffffff" strokeWidth={0} />
            ) : (
              <Play size={32} color="#ffffff" fill="#ffffff" strokeWidth={0} style={{ marginLeft: 4 }} />
            )}
          </Pressable>

          <Pressable
            style={[styles.controlButton, !hasNext && styles.disabledButton]}
            onPress={playNext}
            disabled={!hasNext}
            hitSlop={12}
          >
            <SkipForward
              size={32}
              color={isDark ? '#ffffff' : '#151723'}
              fill={isDark ? '#ffffff' : '#151723'}
              strokeWidth={0}
            />
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={toggleRepeat}
            hitSlop={12}
          >
            {repeatMode === 'one' ? (
              <Repeat1 size={24} color="#3875e8" strokeWidth={2} />
            ) : (
              <Repeat
                size={24}
                color={repeatMode === 'all' ? '#3875e8' : (isDark ? '#888888' : '#666666')}
                strokeWidth={2}
              />
            )}
          </Pressable>
        </View>

        {/* Lyrics Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowLyrics(!showLyrics)}
          >
            <Text style={styles.sectionTitle}>Lyrics</Text>
            {showLyrics ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showLyrics && (
            <TouchableOpacity
              style={styles.lyricsContainer}
              onPress={() => setShowLyricsModal(true)}
              activeOpacity={0.9}
            >
              <Text style={styles.lyricsText} numberOfLines={LYRICS_PREVIEW_LINES}>
                {currentMedia.rawLyrics || currentMedia.lyrics ||
                  "Lyrics not available for this track"}
              </Text>
              <View style={styles.lyricsExpandButton}>
                <Text style={styles.lyricsExpandText}>Tap to see full lyrics</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Options Menu Modal */}
        <Modal
          visible={showOptionsMenu}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <Pressable
            style={styles.optionsModalOverlay}
            onPress={() => setShowOptionsMenu(false)}
          >
            <View style={styles.optionsModalContent}>
              <View style={styles.optionsModalHeader}>
                <Text style={styles.optionsModalTitle}>Options</Text>
                <Pressable
                  style={styles.optionsModalCloseButton}
                  onPress={() => setShowOptionsMenu(false)}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <X size={20} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2.5} />
                </Pressable>
              </View>

              <ScrollView style={styles.optionsModalScroll} showsVerticalScrollIndicator={false}>
                {/* Analytics */}
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false)
                    setShowAnalyticsModal(true)
                  }}
                >
                  <BarChart3 size={22} color="#10b981" strokeWidth={2} />
                  <Text style={styles.optionsMenuText}>View Analytics</Text>
                </TouchableOpacity>

                {/* Edit Song (includes details and rights) */}
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false)
                    setShowEditSongModal(true)
                  }}
                >
                  <Edit3 size={22} color="#6366f1" strokeWidth={2} />
                  <Text style={styles.optionsMenuText}>Edit Song</Text>
                </TouchableOpacity>

                {/* Share (native share dialog) */}
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false)
                    handleShare()
                  }}
                >
                  <Share2 size={22} color="#ec4899" strokeWidth={2} />
                  <Text style={styles.optionsMenuText}>Share</Text>
                </TouchableOpacity>

                {/* Share with User */}
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false)
                    navigateToFeature('Friends')
                  }}
                >
                  <User size={22} color="#ec4899" strokeWidth={2} />
                  <Text style={styles.optionsMenuText}>Share with User</Text>
                </TouchableOpacity>

                {/* Share to Feed */}
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false)
                    handleShareToFeed()
                  }}
                >
                  <Music size={22} color="#ec4899" strokeWidth={2} />
                  <Text style={styles.optionsMenuText}>Share to Feed</Text>
                </TouchableOpacity>

                {/* Download */}
                <TouchableOpacity
                  style={[styles.optionsMenuItem, isDownloading && styles.optionsMenuItemDisabled]}
                  onPress={() => {
                    setShowOptionsMenu(false)
                    handleDownload()
                  }}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#22c55e" />
                  ) : (
                    <Download size={22} color="#22c55e" strokeWidth={2} />
                  )}
                  <Text style={styles.optionsMenuText}>
                    {isDownloading ? `Downloading ${downloadProgress}%` : 'Download Song'}
                  </Text>
                </TouchableOpacity>

                {/* Add to Playlist */}
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false)
                    openPlaylistModal()
                  }}
                >
                  <ListPlus size={22} color="#3875e8" strokeWidth={2} />
                  <Text style={styles.optionsMenuText}>Add to Playlist</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Full Lyrics Modal */}
        <LyricsViewModal
          visible={showLyricsModal}
          onClose={() => setShowLyricsModal(false)}
          title={currentMedia?.title || currentMedia?.label || currentMedia?.name || 'Unknown Track'}
          rawLyrics={currentMedia?.rawLyrics || currentMedia?.lyrics}
          timestampedLyrics={currentMedia?.timestampedLyrics}
          currentPosition={position}
        />

        {/* Analytics Modal */}
        <Modal
          visible={showAnalyticsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAnalyticsModal(false)}
        >
          <View style={styles.analyticsModalContainer}>
            <View style={styles.analyticsModalHeader}>
              <Text style={styles.analyticsModalTitle}>Song Analytics</Text>
              <Pressable
                style={styles.analyticsModalCloseButton}
                onPress={() => setShowAnalyticsModal(false)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={22} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2.5} />
              </Pressable>
            </View>
            <Text style={styles.analyticsModalTrackName} numberOfLines={1}>
              {currentMedia.title || currentMedia.label || currentMedia.name || 'Unknown Track'}
            </Text>

            <ScrollView style={styles.analyticsModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.analyticsModalGrid}>
                <View style={styles.analyticsModalItem}>
                  <Play size={28} color="#3875e8" strokeWidth={2} />
                  <Text style={styles.analyticsModalValue}>{currentMedia.playCount || 0}</Text>
                  <Text style={styles.analyticsModalLabel}>Total Plays</Text>
                </View>
                <View style={styles.analyticsModalItem}>
                  <Heart size={28} color="#ef4444" strokeWidth={2} />
                  <Text style={styles.analyticsModalValue}>{currentMedia.likeCount || 0}</Text>
                  <Text style={styles.analyticsModalLabel}>Likes</Text>
                </View>
                <View style={styles.analyticsModalItem}>
                  <MessageCircle size={28} color="#8b5cf6" strokeWidth={2} />
                  <Text style={styles.analyticsModalValue}>{currentMedia.commentCount || 0}</Text>
                  <Text style={styles.analyticsModalLabel}>Comments</Text>
                </View>
                <View style={styles.analyticsModalItem}>
                  <Clock size={28} color="#f59e0b" strokeWidth={2} />
                  <Text style={styles.analyticsModalValue}>
                    {currentMedia.totalPlayTime ? Math.floor(currentMedia.totalPlayTime / 60) : 0}
                  </Text>
                  <Text style={styles.analyticsModalLabel}>Mins Played</Text>
                </View>
                <View style={styles.analyticsModalItem}>
                  <Share2 size={28} color="#06b6d4" strokeWidth={2} />
                  <Text style={styles.analyticsModalValue}>{currentMedia.shareCount || 0}</Text>
                  <Text style={styles.analyticsModalLabel}>Shares</Text>
                </View>
                <View style={styles.analyticsModalItem}>
                  <Download size={28} color="#22c55e" strokeWidth={2} />
                  <Text style={styles.analyticsModalValue}>{currentMedia.downloadCount || 0}</Text>
                  <Text style={styles.analyticsModalLabel}>Downloads</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Edit Song Modal */}
        <EditSongModal
          visible={showEditSongModal}
          song={currentMedia}
          onClose={() => setShowEditSongModal(false)}
          onSongUpdated={(updatedSong) => {
            console.log('Song updated:', updatedSong)
          }}
        />

        {/* Playlist Selection Modal */}
        <Modal
          visible={showPlaylistModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPlaylistModal(false)}
        >
          <View style={styles.playlistModalOverlay}>
            <View style={styles.playlistModalContent}>
              {/* Modal Header */}
              <View style={styles.playlistModalHeader}>
                <Text style={styles.playlistModalTitle}>Add to Playlist</Text>
                <Pressable
                  style={styles.playlistModalCloseButton}
                  onPress={() => setShowPlaylistModal(false)}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <X size={24} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
                </Pressable>
              </View>

              {/* Song Info */}
              <View style={styles.playlistModalSongInfo}>
                {currentMedia?.imageUrl ? (
                  <Image source={{ uri: currentMedia.imageUrl }} style={styles.playlistModalSongImage} />
                ) : (
                  <View style={[styles.playlistModalSongImage, styles.playlistModalSongImagePlaceholder]}>
                    <Music size={24} color="#888888" />
                  </View>
                )}
                <View style={styles.playlistModalSongDetails}>
                  <Text style={styles.playlistModalSongTitle} numberOfLines={1}>
                    {currentMedia?.title || currentMedia?.label || 'Unknown Track'}
                  </Text>
                  <Text style={styles.playlistModalSongArtist} numberOfLines={1}>
                    {currentMedia?.artist || currentMedia?.author?.stageName || 'Unknown Artist'}
                  </Text>
                </View>
              </View>

              {/* Create New Playlist Button */}
              <TouchableOpacity
                style={styles.playlistModalCreateButton}
                onPress={handleCreatePlaylist}
              >
                <View style={styles.playlistModalCreateIcon}>
                  <Plus size={24} color="#3875e8" strokeWidth={2} />
                </View>
                <Text style={styles.playlistModalCreateText}>Create New Playlist</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.playlistModalDivider}>
                <Text style={styles.playlistModalDividerText}>Your Playlists</Text>
              </View>

              {/* Playlists List */}
              {playlistsLoading ? (
                <View style={styles.playlistModalLoading}>
                  <ActivityIndicator size="large" color="#3875e8" />
                </View>
              ) : playlists.length === 0 ? (
                <View style={styles.playlistModalEmpty}>
                  <ListMusic size={48} color="#888888" strokeWidth={1.5} />
                  <Text style={styles.playlistModalEmptyTitle}>No Playlists Yet</Text>
                  <Text style={styles.playlistModalEmptyText}>
                    Create your first playlist to start organizing your music.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={playlists}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.playlistModalItem}
                      onPress={() => handleAddToPlaylist(item.id, item.name)}
                    >
                      {item.coverImageUrl ? (
                        <Image
                          source={{ uri: item.coverImageUrl }}
                          style={styles.playlistModalItemImage}
                        />
                      ) : (
                        <View style={[styles.playlistModalItemImage, styles.playlistModalItemImagePlaceholder]}>
                          <ListMusic size={20} color="#888888" />
                        </View>
                      )}
                      <View style={styles.playlistModalItemInfo}>
                        <Text style={styles.playlistModalItemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.playlistModalItemCount}>
                          {item.songCount || 0} songs
                        </Text>
                      </View>
                      <Plus size={20} color="#888888" strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.playlistModalList}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Queue Section - Shows full queue with currently playing indicator */}
        {queue.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              activeOpacity={0.7}
              onPress={() => setShowQueue(!showQueue)}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Queue</Text>
                <Text style={styles.queueCount}>{queue.length} songs</Text>
              </View>
              {showQueue ? (
                <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
              ) : (
                <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
              )}
            </TouchableOpacity>
            {showQueue && (
              <View style={styles.queueList}>
                {queue.map((song, index) => {
                  const isCurrentlyPlaying = index === queueIndex
                  return (
                    <Pressable
                      key={song.id || index}
                      style={[
                        styles.queueItem,
                        isCurrentlyPlaying && styles.queueItemPlaying
                      ]}
                      onPress={() => !isCurrentlyPlaying && playQueueItem(index)}
                    >
                      {/* Queue position number or playing indicator */}
                      <View style={styles.queueItemNumber}>
                        {isCurrentlyPlaying ? (
                          <Volume2 size={16} color="#3875e8" strokeWidth={2} />
                        ) : (
                          <Text style={styles.queueNumberText}>{index + 1}</Text>
                        )}
                      </View>
                      <View style={styles.queueItemThumbnail}>
                        {(song.thumbnailUrl || song.imageUrl || song.coverUrl) ? (
                          <Image source={{ uri: song.thumbnailUrl || song.imageUrl || song.coverUrl }} style={styles.queueThumbnail} />
                        ) : (
                          <View style={[styles.queueThumbnail, styles.queuePlaceholder]}>
                            <Music size={20} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={1.5} />
                          </View>
                        )}
                      </View>
                      <View style={styles.queueItemInfo}>
                        <Text
                          style={[
                            styles.queueItemTitle,
                            isCurrentlyPlaying && styles.queueItemTitlePlaying
                          ]}
                          numberOfLines={1}
                        >
                          {song.title || song.label || song.name || 'Unknown Track'}
                        </Text>
                        <Text style={styles.queueItemArtist} numberOfLines={1}>
                          {song.artist || song.subLabel || song.description || 'Unknown Artist'}
                        </Text>
                      </View>
                      {!isCurrentlyPlaying && (
                        <TouchableOpacity
                          style={styles.queueItemRemove}
                          onPress={() => removeFromQueue(index)}
                        >
                          <Trash2 size={16} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* Analytics Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowAnalytics(!showAnalytics)}
          >
            <View style={styles.sectionHeaderLeft}>
              <BarChart3 size={20} color="#10b981" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Analytics</Text>
            </View>
            {showAnalytics ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showAnalytics && (
            <View style={styles.analyticsContainer}>
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsItem}>
                  <Play size={20} color="#3875e8" strokeWidth={2} />
                  <Text style={styles.analyticsValue}>{currentMedia.playCount || 0}</Text>
                  <Text style={styles.analyticsLabel}>Plays</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Heart size={20} color="#ef4444" strokeWidth={2} />
                  <Text style={styles.analyticsValue}>{currentMedia.likeCount || 0}</Text>
                  <Text style={styles.analyticsLabel}>Likes</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <MessageCircle size={20} color="#8b5cf6" strokeWidth={2} />
                  <Text style={styles.analyticsValue}>{currentMedia.commentCount || 0}</Text>
                  <Text style={styles.analyticsLabel}>Comments</Text>
                </View>
              </View>
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsItem}>
                  <Clock size={20} color="#f59e0b" strokeWidth={2} />
                  <Text style={styles.analyticsValue}>
                    {currentMedia.totalPlayTime ? Math.floor(currentMedia.totalPlayTime / 60) : 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>Mins Played</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Share2 size={20} color="#06b6d4" strokeWidth={2} />
                  <Text style={styles.analyticsValue}>{currentMedia.shareCount || 0}</Text>
                  <Text style={styles.analyticsLabel}>Shares</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Download size={20} color="#22c55e" strokeWidth={2} />
                  <Text style={styles.analyticsValue}>{currentMedia.downloadCount || 0}</Text>
                  <Text style={styles.analyticsLabel}>Downloads</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Edit Song Section - Opens modal directly */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowEditSongModal(true)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Edit3 size={20} color="#6366f1" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Edit Song</Text>
            </View>
            <ChevronRight size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.sectionSubtext}>
            Edit title, style, visibility, and rights
          </Text>
        </View>

        {/* Share Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowShareOptions(!showShareOptions)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Share2 size={20} color="#ec4899" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Share</Text>
            </View>
            {showShareOptions ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showShareOptions && (
            <View style={styles.actionsList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleShare}
              >
                <View style={styles.actionItemLeft}>
                  <Share2 size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Share</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('Friends')}
              >
                <View style={styles.actionItemLeft}>
                  <User size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Share with user</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleShareToFeed}
              >
                <View style={styles.actionItemLeft}>
                  <Music size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Share to feed</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* About the Artist Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowArtist(!showArtist)}
          >
            <Text style={styles.sectionTitle}>About the artist</Text>
            {showArtist ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showArtist && (
            <View style={styles.artistSection}>
              <View style={styles.artistInfo}>
                {currentMedia.author?.profilePictureURL ? (
                  <Image source={{ uri: currentMedia.author.profilePictureURL }} style={styles.artistImage} />
                ) : (
                  <View style={[styles.artistImage, styles.artistPlaceholder]}>
                    <User size={24} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={1.5} />
                  </View>
                )}
                <View style={styles.artistDetails}>
                  <Text style={styles.artistName}>
                    {currentMedia.author?.stageName || currentMedia.artist || currentMedia.author?.firstName || 'Unknown Artist'}
                  </Text>
                  {currentMedia.author?.stageName && currentMedia.author?.firstName && (
                    <Text style={styles.artistRealName}>
                      {currentMedia.author.firstName} {currentMedia.author.lastName || ''}
                    </Text>
                  )}
                </View>
              </View>
              {currentMedia.author?.bio ? (
                <Text style={styles.artistBio} numberOfLines={4}>
                  {currentMedia.author.bio}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Create Video Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowCreateVideo(!showCreateVideo)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Video size={20} color="#3875e8" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Create Video</Text>
            </View>
            {showCreateVideo ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showCreateVideo && (
            <View style={styles.actionsList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('CreateMusicVideo')}
              >
                <View style={styles.actionItemLeft}>
                  <Film size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Create built-in music video</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Music Generation Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowMusicGeneration(!showMusicGeneration)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Wand2 size={20} color="#a855f7" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Music Generation</Text>
            </View>
            {showMusicGeneration ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showMusicGeneration && (
            <View style={styles.actionsList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('ExtendSong')}
              >
                <View style={styles.actionItemLeft}>
                  <Music size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Extend your song</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('ReinterpretSong')}
              >
                <View style={styles.actionItemLeft}>
                  <Wand2 size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Reinterpret your song (new style)</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('AddVocals')}
              >
                <View style={styles.actionItemLeft}>
                  <Mic size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Add vocals to an instrumental</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('AddInstruments')}
              >
                <View style={styles.actionItemLeft}>
                  <Guitar size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Add instruments to an acapella</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('GetTimestampedLyrics')}
              >
                <View style={styles.actionItemLeft}>
                  <FileText size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Get timestamped lyrics</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Change Song Cover Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowSongCover(!showSongCover)}
          >
            <View style={styles.sectionHeaderLeft}>
              <ImageIcon size={20} color="#22c55e" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Change Song Cover</Text>
            </View>
            {showSongCover ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showSongCover && (
            <View style={styles.actionsList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('ChangeSongCover')}
              >
                <View style={styles.actionItemLeft}>
                  <Upload size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Upload a new image for song cover</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('AddMediaForVideo')}
              >
                <View style={styles.actionItemLeft}>
                  <Film size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Add pics and vids for custom video</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Audio Processing Section */}
        <View style={[styles.section, styles.lastSection]}>
          <TouchableOpacity
            style={styles.sectionHeader}
            activeOpacity={0.7}
            onPress={() => setShowAudioProcessing(!showAudioProcessing)}
          >
            <View style={styles.sectionHeaderLeft}>
              <AudioWaveform size={20} color="#f97316" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Audio Processing</Text>
            </View>
            {showAudioProcessing ? (
              <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
            )}
          </TouchableOpacity>
          {showAudioProcessing && (
            <View style={styles.actionsList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('GetAcapella')}
              >
                <View style={styles.actionItemLeft}>
                  <Mic size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Get Acapella</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => navigateToFeature('StemSong')}
              >
                <View style={styles.actionItemLeft}>
                  <Layers size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
                  <Text style={styles.actionItemText}>Stem your song</Text>
                </View>
                <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  sheetBackground: {
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
  },
  handleIndicator: {
    backgroundColor: isDark ? '#666666' : '#cccccc',
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 24,
    color: isDark ? '#ffffff' : '#151723',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#c5c5c5' : '#7e7e7e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artworkContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 12,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
  },
  placeholderArtwork: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 100,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  trackInfoText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  artist: {
    fontSize: 16,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 28,
  },
  trackActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIconActive: {
    transform: [{ scale: 1.1 }],
  },
  likeLoading: {
    opacity: 0.5,
  },
  progressSection: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  progressBarContainer: {
    height: 20,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3875e8',
  },
  progressKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3875e8',
    marginLeft: -6,
    top: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 22,
    opacity: 0.6,
  },
  activeButtonText: {
    opacity: 1,
  },
  controlButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
  skipButtonText: {
    fontSize: 32,
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3875e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playPauseText: {
    fontSize: 32,
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 0,
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
    color: isDark ? '#ffffff' : '#151723',
  },
  sectionSubtext: {
    fontSize: 13,
    color: isDark ? '#888888' : '#999999',
    marginTop: -4,
  },
  sectionToggle: {
    fontSize: 14,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  queueCount: {
    fontSize: 13,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  lyricsContainer: {
    backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  lyricsText: {
    fontSize: 15,
    lineHeight: 24,
    color: isDark ? '#e0e0e0' : '#333333',
  },
  lyricsExpandButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#444444' : '#e0e0e0',
  },
  lyricsExpandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3875e8',
    textAlign: 'center',
  },
  // Lyrics Modal Styles
  lyricsModalContainer: {
    flex: 1,
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
    paddingTop: 20,
  },
  lyricsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  lyricsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
  },
  lyricsModalCloseButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsModalCloseText: {
    fontSize: 20,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
  },
  lyricsModalTrackName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#c5c5c5' : '#7e7e7e',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  lyricsModalScroll: {
    flex: 1,
  },
  lyricsModalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 60,
  },
  lyricsModalText: {
    fontSize: 18,
    lineHeight: 32,
    color: isDark ? '#ffffff' : '#151723',
    textAlign: 'center',
  },
  lyricsTabs: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  lyricsTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  lyricsTabActive: {
    backgroundColor: isDark ? '#3875e8' : '#3875e8',
  },
  lyricsTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  lyricsTabTextActive: {
    color: '#ffffff',
  },
  timestampedLyricLine: {
    fontSize: 18,
    lineHeight: 32,
    color: isDark ? '#888888' : '#aaaaaa',
    textAlign: 'center',
    marginBottom: 8,
  },
  timestampedLyricLineActive: {
    fontSize: 22,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    transform: [{ scale: 1.05 }],
  },
  // Karaoke word highlighting styles
  karaokeWordSung: {
    color: isDark ? '#ffffff' : '#151723',
    fontWeight: '700',
  },
  karaokeWordCurrent: {
    color: '#3875e8',
    fontWeight: '700',
    textShadowColor: 'rgba(56, 117, 232, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  queueList: {
    backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: isDark ? '#444444' : '#e0e0e0',
  },
  queueItemThumbnail: {
    marginRight: 12,
  },
  queueThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: isDark ? '#444444' : '#e0e0e0',
  },
  queuePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  queuePlaceholderIcon: {
    fontSize: 20,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 2,
  },
  queueItemArtist: {
    fontSize: 13,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  queueItemMenu: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemMenuText: {
    fontSize: 18,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  queueItemNumber: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueNumberText: {
    fontSize: 14,
    color: isDark ? '#888888' : '#999999',
    fontWeight: '500',
  },
  queueItemPlaying: {
    backgroundColor: isDark ? 'rgba(56, 117, 232, 0.15)' : 'rgba(56, 117, 232, 0.1)',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  queueItemTitlePlaying: {
    color: '#3875e8',
    fontWeight: '600',
  },
  queueItemRemove: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistSection: {
    backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  artistImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: isDark ? '#444444' : '#e0e0e0',
    marginRight: 12,
  },
  artistPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistPlaceholderIcon: {
    fontSize: 24,
  },
  artistDetails: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 2,
  },
  artistRealName: {
    fontSize: 13,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  artistBio: {
    fontSize: 14,
    lineHeight: 20,
    color: isDark ? '#c5c5c5' : '#666666',
  },
  // Analytics styles
  analyticsContainer: {
    backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  analyticsItem: {
    alignItems: 'center',
    flex: 1,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    marginTop: 8,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  // Options modal styles
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModalContent: {
    backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    paddingBottom: 16,
  },
  optionsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#444444' : '#e0e0e0',
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
  },
  optionsModalCloseButton: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#444444' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModalScroll: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  optionsMenuText: {
    fontSize: 16,
    color: isDark ? '#ffffff' : '#151723',
    fontWeight: '500',
  },
  // Action list styles for new sections
  actionsList: {
    backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: isDark ? '#444444' : '#e0e0e0',
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionItemText: {
    fontSize: 15,
    color: isDark ? '#ffffff' : '#151723',
    flex: 1,
  },
  // Analytics Modal styles
  analyticsModalContainer: {
    flex: 1,
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
    paddingTop: 20,
  },
  analyticsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  analyticsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
  },
  analyticsModalCloseButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsModalTrackName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#c5c5c5' : '#7e7e7e',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  analyticsModalScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  analyticsModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  analyticsModalItem: {
    width: '48%',
    backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  analyticsModalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    marginTop: 12,
    marginBottom: 4,
  },
  analyticsModalLabel: {
    fontSize: 14,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
    fontWeight: '500',
  },
  // Download button styles
  downloadingButton: {
    opacity: 0.6,
  },
  downloadProgressContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenuItemDisabled: {
    opacity: 0.5,
  },
  // Playlist Modal styles
  playlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  playlistModalContent: {
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  playlistModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  playlistModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
  },
  playlistModalCloseButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistModalSongInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  playlistModalSongImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  playlistModalSongImagePlaceholder: {
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistModalSongDetails: {
    flex: 1,
    marginLeft: 14,
  },
  playlistModalSongTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  playlistModalSongArtist: {
    fontSize: 14,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  playlistModalCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  playlistModalCreateIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  playlistModalCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3875e8',
  },
  playlistModalDivider: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  playlistModalDividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#888888' : '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playlistModalLoading: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  playlistModalEmpty: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  playlistModalEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginTop: 16,
    marginBottom: 8,
  },
  playlistModalEmptyText: {
    fontSize: 14,
    color: isDark ? '#c5c5c5' : '#7e7e7e',
    textAlign: 'center',
    lineHeight: 20,
  },
  playlistModalList: {
    paddingHorizontal: 8,
  },
  playlistModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  playlistModalItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  playlistModalItemImagePlaceholder: {
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistModalItemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  playlistModalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 3,
  },
  playlistModalItemCount: {
    fontSize: 13,
    color: isDark ? '#888888' : '#888888',
  },
})

export default memo(FullPlayerBottomSheet)
