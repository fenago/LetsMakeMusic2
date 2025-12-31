import React, { useCallback, useState, memo, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  TouchableOpacity as RNTouchableOpacity,
  Pressable,
  Share,
  Alert as RNAlert,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import {
  X,
  BarChart3,
  Edit3,
  Share2,
  User,
  Music,
  Download,
  ListPlus,
  Plus,
  ListMusic,
  Play,
  Heart,
  MessageCircle,
  Clock,
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import { useCurrentUser } from '../../../core/onboarding'
import { useTheme } from '../../../core/dopebase'
import { usePlaylists } from '../../../hooks/usePlaylists'
import { useSongSwipes } from '../../../hooks/useSongSwipes'
import { fetchAndSaveTimestampedLyrics } from '../../../services/songsService'
import EditSongModal from '../EditSongModal'
import LyricsViewModal from '../LyricsViewModal'
import DebugOverlay from '../DebugOverlay'

// Import extracted section components
import FullPlayerHeader from './sections/FullPlayerHeader'
import FullPlayerArtwork from './sections/FullPlayerArtwork'
import FullPlayerTrackInfo from './sections/FullPlayerTrackInfo'
import FullPlayerControls from './sections/FullPlayerControls'
import ProgressSection from './sections/ProgressSection'
import LyricsSection from './sections/LyricsSection'
import QueueSection from './sections/QueueSection'
import AnalyticsSection from './sections/AnalyticsSection'
import EditSongButton from './sections/EditSongButton'
import ShareSection from './sections/ShareSection'
import ArtistSection from './sections/ArtistSection'
import CreatorSections from './sections/CreatorSections'
import SwipeButtons from './sections/SwipeButtons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

/**
 * FullPlayerBottomSheet - Full screen audio player
 *
 * ARCHITECTURE NOTES:
 * - Main component is a thin shell that orchestrates section components
 * - Each section manages its own collapsed state to prevent parent re-renders
 * - ProgressSection subscribes to position independently (updates every 100ms)
 * - QueueSection uses virtualized FlatList instead of .map()
 * - All sections are memoized to prevent unnecessary re-renders
 * - Nested modals render conditionally (only when visible)
 */
const FullPlayerBottomSheet = () => {
  const themeContext = useTheme()
  const isDark = (themeContext?.appearance ?? 'light') === 'dark'

  // Reduced state - sections manage their own collapse states
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off') // 'off' | 'all' | 'one'
  const [showLyricsModal, setShowLyricsModal] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [showEditSongModal, setShowEditSongModal] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [playlistsRequested, setPlaylistsRequested] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isFetchingKaraokeLyrics, setIsFetchingKaraokeLyrics] = useState(false)

  // PERFORMANCE: Deferred rendering for below-the-fold sections
  // Critical sections (artwork, controls, progress) render immediately
  // Heavy sections (lyrics, queue, analytics, etc.) render after short delay
  const [sectionsReady, setSectionsReady] = useState(false)

  const navigation = useNavigation()
  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  // PERFORMANCE: Only load playlists when modal is opened
  const { playlists, playlistsLoading, addSongToPlaylist } = usePlaylists(userId, {
    enabled: playlistsRequested || showPlaylistModal,
  })

  // Song swipe (like/pass) functionality for music discovery
  const {
    like: likeSong,
    pass: passSong,
    undo: undoSwipe,
    hasSwipedOn,
    getSwipeAction,
    canUndo: canUndoSwipe,
  } = useSongSwipes(userId)

  // PERFORMANCE: Removed isPlaying and togglePlayPause from this destructuring.
  // FullPlayerControls component gets these from usePlaybackState() internally.
  // Having them here caused the ENTIRE FullPlayer to re-render on every play/pause.
  const {
    mediaType,
    currentMedia,
    isFullPlayerVisible,
    hideFullPlayer,
    playNext,
    playPrevious,
    queue,
    queueIndex,
    playQueueItem,
    removeFromQueue,
    isLiked: isLikedFn,
    toggleLike,
    updateCurrentMedia,
  } = useMediaPlayer()

  const isLiked = currentMedia?.id ? isLikedFn(currentMedia.id) : false

  // PERFORMANCE: Defer heavy sections until after modal animation completes
  // Using setTimeout instead of InteractionManager which was unreliable
  useEffect(() => {
    let timeoutId = null

    if (isFullPlayerVisible && !sectionsReady) {
      // Short delay to let modal animation start, then mount heavy sections
      timeoutId = setTimeout(() => {
        setSectionsReady(true)
      }, 300)
    } else if (!isFullPlayerVisible && sectionsReady) {
      // Reset when player hides so we get fresh deferred load next time
      setSectionsReady(false)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isFullPlayerVisible, sectionsReady])

  // Callbacks
  const handleLikePress = useCallback(async () => {
    if (!currentMedia?.id || isLikeLoading) return
    setIsLikeLoading(true)
    try {
      await toggleLike(currentMedia)
    } catch (error) {
      if (__DEV__) console.error('Error toggling like:', error)
    } finally {
      setIsLikeLoading(false)
    }
  }, [currentMedia, isLikeLoading, toggleLike])

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all'
      if (prev === 'all') return 'one'
      return 'off'
    })
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffleOn(prev => !prev)
  }, [])

  const navigateToFeature = useCallback((screenName) => {
    hideFullPlayer()
    navigation.navigate(screenName, { song: currentMedia })
  }, [navigation, hideFullPlayer, currentMedia])

  const handleDownload = useCallback(async () => {
    if (!currentMedia?.audioUrl || isDownloading) return

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      const songTitle = (currentMedia.title || currentMedia.label || currentMedia.name || 'song')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50)
      const filename = `${songTitle}_${Date.now()}.mp3`
      const fileUri = `${FileSystem.documentDirectory}${filename}`

      const downloadResumable = FileSystem.createDownloadResumable(
        currentMedia.audioUrl,
        fileUri,
        {},
        (progress) => {
          const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite
          setDownloadProgress(Math.round(pct * 100))
        }
      )

      const result = await downloadResumable.downloadAsync()

      if (result?.uri) {
        RNAlert.alert(
          'Download Complete',
          `"${currentMedia.title || 'Song'}" has been downloaded.`,
          [
            {
              text: 'Share',
              onPress: async () => {
                try {
                  await Share.share({ url: result.uri, title: currentMedia.title || 'Song' })
                } catch (e) { /* ignore */ }
              },
            },
            { text: 'Done', style: 'cancel' },
          ]
        )
      }
    } catch (error) {
      if (__DEV__) console.error('[FullPlayer] Download error:', error)
      RNAlert.alert('Download Failed', error.message || 'Unable to download the song.')
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }, [currentMedia, isDownloading])

  const handleAddToPlaylist = useCallback(async (playlistId, playlistName) => {
    if (!currentMedia?.id) return
    try {
      const result = await addSongToPlaylist(playlistId, currentMedia)
      if (result.alreadyExists) {
        RNAlert.alert('Already in Playlist', `This song is already in "${playlistName}".`)
      } else if (result.success) {
        RNAlert.alert('Added to Playlist', `Added to "${playlistName}".`)
        setShowPlaylistModal(false)
      } else {
        RNAlert.alert('Error', result.error || 'Failed to add song.')
      }
    } catch (error) {
      RNAlert.alert('Error', error.message || 'Failed to add song.')
    }
  }, [currentMedia, addSongToPlaylist])

  const openPlaylistModal = useCallback(() => {
    if (!userId) {
      RNAlert.alert('Sign In Required', 'Please sign in to add songs to playlists.')
      return
    }
    setPlaylistsRequested(true)
    setShowPlaylistModal(true)
  }, [userId])

  const handleCreatePlaylist = useCallback(() => {
    setShowPlaylistModal(false)
    hideFullPlayer()
    navigation.navigate('CreatePlaylist', { songToAdd: currentMedia })
  }, [navigation, hideFullPlayer, currentMedia])

  const handleShare = useCallback(async () => {
    try {
      const songTitle = currentMedia.title || currentMedia.label || currentMedia.name || 'a song'
      const artistName = currentMedia.artist || currentMedia.author?.stageName || 'Unknown Artist'
      const shareUrl = currentMedia.shareUrl || currentMedia.audioUrl || ''
      await Share.share({
        message: `Check out "${songTitle}" by ${artistName} on Let's Make Music! ${shareUrl}`,
        title: songTitle,
      })
    } catch (error) { /* ignore */ }
  }, [currentMedia])

  const handleFetchKaraokeLyrics = useCallback(async () => {
    if (!currentMedia?.id || !userId || isFetchingKaraokeLyrics) return
    if (!currentMedia.sunoId && !currentMedia.sunoTaskId) {
      RNAlert.alert('Not Available', 'Karaoke lyrics are only available for Suno AI songs.')
      return
    }

    setIsFetchingKaraokeLyrics(true)
    try {
      const result = await fetchAndSaveTimestampedLyrics(currentMedia.id, userId)
      if (result.success && result.data) {
        updateCurrentMedia({
          timestampedLyrics: result.data.timestampedLyrics,
          rawLyrics: result.data.rawLyrics || currentMedia.rawLyrics,
        })
        RNAlert.alert('Karaoke Lyrics Ready!', 'Open the lyrics modal to see karaoke mode.')
      } else if (!result.success) {
        RNAlert.alert('Error', result.error || 'Failed to fetch karaoke lyrics.')
      }
    } catch (error) {
      RNAlert.alert('Error', error.message || 'Failed to fetch karaoke lyrics.')
    } finally {
      setIsFetchingKaraokeLyrics(false)
    }
  }, [currentMedia, userId, isFetchingKaraokeLyrics, updateCurrentMedia])

  const handleShareToFeed = useCallback(() => {
    // Only block if EXPLICITLY marked private via visibility field
    // Ignore isPublic field - it has bad default data from songsService
    if (currentMedia.visibility === 'private') {
      RNAlert.alert(
        'Private Song',
        'This song is private. Change visibility to public to share it.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Edit Song', onPress: () => setShowEditSongModal(true) }
        ]
      )
      return
    }
    navigateToFeature('ShareSongToFeed')
  }, [currentMedia, navigateToFeature])

  // Song swipe handlers
  const handleSwipeLike = useCallback(async () => {
    if (!currentMedia?.id) return
    const songData = {
      title: currentMedia.title || currentMedia.label || currentMedia.name,
      artist: currentMedia.artist || currentMedia.author?.stageName,
      imageUrl: currentMedia.thumbnailUrl || currentMedia.imageUrl || currentMedia.coverUrl,
      audioUrl: currentMedia.audioUrl,
    }
    await likeSong(currentMedia.id, songData)
  }, [currentMedia, likeSong])

  const handleSwipePass = useCallback(async () => {
    if (!currentMedia?.id) return
    const songData = {
      title: currentMedia.title || currentMedia.label || currentMedia.name,
      artist: currentMedia.artist || currentMedia.author?.stageName,
      imageUrl: currentMedia.thumbnailUrl || currentMedia.imageUrl || currentMedia.coverUrl,
    }
    await passSong(currentMedia.id, songData)
  }, [currentMedia, passSong])

  const handleSwipeUndo = useCallback(async () => {
    await undoSwipe()
  }, [undoSwipe])

  const handleShareWithUser = useCallback(() => {
    navigateToFeature('Friends')
  }, [navigateToFeature])

  const openLyricsModal = useCallback(() => {
    setShowLyricsModal(true)
  }, [])

  const closeLyricsModal = useCallback(() => setShowLyricsModal(false), [])
  const openOptionsMenu = useCallback(() => setShowOptionsMenu(true), [])
  const closeOptionsMenu = useCallback(() => setShowOptionsMenu(false), [])
  const openEditSongModal = useCallback(() => setShowEditSongModal(true), [])
  const closeEditSongModal = useCallback(() => setShowEditSongModal(false), [])
  const openAnalyticsModal = useCallback(() => setShowAnalyticsModal(true), [])
  const closeAnalyticsModal = useCallback(() => setShowAnalyticsModal(false), [])
  const closePlaylistModal = useCallback(() => setShowPlaylistModal(false), [])

  // Memoize styles
  const styles = useMemo(() => getStyles(isDark), [isDark])

  // Early return if no media
  if (mediaType !== 'audio' || !currentMedia) return null

  const thumbnailUrl = currentMedia.thumbnailUrl || currentMedia.imageUrl || currentMedia.coverUrl || currentMedia.profilePictureURL
  const hasNext = queueIndex < queue.length - 1
  const title = currentMedia.title || currentMedia.label || currentMedia.name || 'Unknown Track'
  const artist = currentMedia.artist || currentMedia.author?.stageName || currentMedia.subLabel || currentMedia.description || currentMedia.author?.firstName || 'Unknown Artist'
  const hasSunoId = !!(currentMedia.sunoId || currentMedia.sunoTaskId)

  return (
    <>
      <Modal
        visible={isFullPlayerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={hideFullPlayer}
      >
        <View style={styles.modalContainer}>
          {/* Debug overlay inside FullPlayer modal */}
          {__DEV__ && <DebugOverlay />}
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <FullPlayerHeader
              onClose={hideFullPlayer}
              onOptionsPress={openOptionsMenu}
              isDark={isDark}
            />

            <FullPlayerArtwork thumbnailUrl={thumbnailUrl} isDark={isDark} />

            <FullPlayerTrackInfo
              title={title}
              artist={artist}
              isLiked={isLiked}
              isLikeLoading={isLikeLoading}
              isDownloading={isDownloading}
              onLikePress={handleLikePress}
              onDownloadPress={handleDownload}
              onAddToPlaylistPress={openPlaylistModal}
              isDark={isDark}
            />

            <ProgressSection isDark={isDark} />

            <FullPlayerControls
              isShuffleOn={isShuffleOn}
              repeatMode={repeatMode}
              hasNext={hasNext}
              onPlayPrevious={playPrevious}
              onPlayNext={playNext}
              onToggleShuffle={toggleShuffle}
              onToggleRepeat={toggleRepeat}
              isDark={isDark}
            />

            {/* DEFERRED SECTIONS: Only mount after modal animation completes */}
            {sectionsReady ? (
              <>
                <SwipeButtons
                  songId={currentMedia?.id}
                  hasSwipedOn={hasSwipedOn}
                  getSwipeAction={getSwipeAction}
                  onLike={handleSwipeLike}
                  onPass={handleSwipePass}
                  onUndo={handleSwipeUndo}
                  canUndo={canUndoSwipe}
                  isDark={isDark}
                />

                <LyricsSection
                  rawLyrics={currentMedia.rawLyrics || currentMedia.lyrics}
                  timestampedLyrics={currentMedia.timestampedLyrics}
                  hasSunoId={hasSunoId}
                  isFetchingKaraokeLyrics={isFetchingKaraokeLyrics}
                  onOpenLyricsModal={openLyricsModal}
                  onFetchKaraokeLyrics={handleFetchKaraokeLyrics}
                  isDark={isDark}
                />

                <QueueSection
                  queue={queue}
                  queueIndex={queueIndex}
                  onPlayQueueItem={playQueueItem}
                  onRemoveFromQueue={removeFromQueue}
                  isDark={isDark}
                />

                <AnalyticsSection
                  playCount={currentMedia.playCount}
                  likeCount={currentMedia.likeCount}
                  commentCount={currentMedia.commentCount}
                  totalPlayTime={currentMedia.totalPlayTime}
                  shareCount={currentMedia.shareCount}
                  downloadCount={currentMedia.downloadCount}
                  isDark={isDark}
                />

                <EditSongButton onPress={openEditSongModal} isDark={isDark} />

                <ShareSection
                  onShare={handleShare}
                  onShareWithUser={handleShareWithUser}
                  onShareToFeed={handleShareToFeed}
                  isDark={isDark}
                />

                <ArtistSection
                  author={currentMedia.author}
                  artist={currentMedia.artist}
                  isDark={isDark}
                />

                <CreatorSections
                  onNavigateToFeature={navigateToFeature}
                  isDark={isDark}
                />
              </>
            ) : (
              // Placeholder while deferred sections load
              <View style={styles.deferredLoading}>
                <ActivityIndicator size="small" color={isDark ? '#888888' : '#cccccc'} />
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Lyrics overlay - INSIDE the Modal so absolute positioning works */}
          {showLyricsModal && (
            <LyricsViewModal
              visible={showLyricsModal}
              onClose={closeLyricsModal}
              title={title}
              rawLyrics={currentMedia?.rawLyrics || currentMedia?.lyrics}
              timestampedLyrics={currentMedia?.timestampedLyrics}
            />
          )}
        </View>
      </Modal>

      {/* ===== NESTED MODALS - Render only when visible ===== */}

      {/* Options Menu Modal */}
      {showOptionsMenu && (
        <OptionsMenuModal
          visible={showOptionsMenu}
          onClose={closeOptionsMenu}
          onViewAnalytics={() => { closeOptionsMenu(); openAnalyticsModal(); }}
          onEditSong={() => { closeOptionsMenu(); openEditSongModal(); }}
          onShare={() => { closeOptionsMenu(); handleShare(); }}
          onShareWithUser={() => { closeOptionsMenu(); handleShareWithUser(); }}
          onShareToFeed={() => { closeOptionsMenu(); handleShareToFeed(); }}
          onDownload={() => { closeOptionsMenu(); handleDownload(); }}
          onAddToPlaylist={() => { closeOptionsMenu(); openPlaylistModal(); }}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          isDark={isDark}
          styles={styles}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <AnalyticsModal
          visible={showAnalyticsModal}
          onClose={closeAnalyticsModal}
          currentMedia={currentMedia}
          isDark={isDark}
          styles={styles}
        />
      )}

      {/* Edit Song Modal */}
      {showEditSongModal && (
        <EditSongModal
          visible={showEditSongModal}
          song={currentMedia}
          onClose={closeEditSongModal}
          onSongUpdated={() => {}}
        />
      )}

      {/* Playlist Selection Modal */}
      {showPlaylistModal && (
        <PlaylistModal
          visible={showPlaylistModal}
          onClose={closePlaylistModal}
          currentMedia={currentMedia}
          playlists={playlists}
          playlistsLoading={playlistsLoading}
          onAddToPlaylist={handleAddToPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
          isDark={isDark}
          styles={styles}
        />
      )}
    </>
  )
}

/**
 * Options Menu Modal - Extracted inline component
 */
const OptionsMenuModal = memo(({
  visible,
  onClose,
  onViewAnalytics,
  onEditSong,
  onShare,
  onShareWithUser,
  onShareToFeed,
  onDownload,
  onAddToPlaylist,
  isDownloading,
  downloadProgress,
  isDark,
  styles,
}) => (
  <Modal
    visible={visible}
    animationType="none"
    transparent={true}
    onRequestClose={onClose}
  >
    <Pressable style={styles.optionsModalOverlay} onPress={onClose}>
      <View style={styles.optionsModalContent}>
        <View style={styles.optionsModalHeader}>
          <Text style={styles.optionsModalTitle}>Options</Text>
          <Pressable style={styles.optionsModalCloseButton} onPress={onClose} hitSlop={15}>
            <X size={20} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView style={styles.optionsModalScroll} showsVerticalScrollIndicator={false}>
          <RNTouchableOpacity style={styles.optionsMenuItem} onPress={onViewAnalytics}>
            <BarChart3 size={22} color="#10b981" strokeWidth={2} />
            <Text style={styles.optionsMenuText}>View Analytics</Text>
          </RNTouchableOpacity>

          <RNTouchableOpacity style={styles.optionsMenuItem} onPress={onEditSong}>
            <Edit3 size={22} color="#6366f1" strokeWidth={2} />
            <Text style={styles.optionsMenuText}>Edit Song</Text>
          </RNTouchableOpacity>

          <RNTouchableOpacity style={styles.optionsMenuItem} onPress={onShare}>
            <Share2 size={22} color="#ec4899" strokeWidth={2} />
            <Text style={styles.optionsMenuText}>Share</Text>
          </RNTouchableOpacity>

          <RNTouchableOpacity style={styles.optionsMenuItem} onPress={onShareWithUser}>
            <User size={22} color="#ec4899" strokeWidth={2} />
            <Text style={styles.optionsMenuText}>Share with User</Text>
          </RNTouchableOpacity>

          <RNTouchableOpacity style={styles.optionsMenuItem} onPress={onShareToFeed}>
            <Music size={22} color="#ec4899" strokeWidth={2} />
            <Text style={styles.optionsMenuText}>Share to Feed</Text>
          </RNTouchableOpacity>

          <RNTouchableOpacity
            style={[styles.optionsMenuItem, isDownloading && styles.optionsMenuItemDisabled]}
            onPress={onDownload}
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
          </RNTouchableOpacity>

          <RNTouchableOpacity style={styles.optionsMenuItem} onPress={onAddToPlaylist}>
            <ListPlus size={22} color="#3875e8" strokeWidth={2} />
            <Text style={styles.optionsMenuText}>Add to Playlist</Text>
          </RNTouchableOpacity>
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
))

/**
 * Analytics Modal - Extracted inline component
 */
const AnalyticsModal = memo(({ visible, onClose, currentMedia, isDark, styles }) => (
  <Modal
    visible={visible}
    animationType="none"
    presentationStyle="pageSheet"
    onRequestClose={onClose}
  >
    <View style={styles.analyticsModalContainer}>
      <View style={styles.analyticsModalHeader}>
        <Text style={styles.analyticsModalTitle}>Song Analytics</Text>
        <Pressable style={styles.analyticsModalCloseButton} onPress={onClose} hitSlop={15}>
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
))

/**
 * Playlist Modal - Extracted inline component
 */
const PlaylistModal = memo(({
  visible,
  onClose,
  currentMedia,
  playlists,
  playlistsLoading,
  onAddToPlaylist,
  onCreatePlaylist,
  isDark,
  styles,
}) => (
  <Modal
    visible={visible}
    animationType="none"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={styles.playlistModalOverlay}>
      <View style={styles.playlistModalContent}>
        <View style={styles.playlistModalHeader}>
          <Text style={styles.playlistModalTitle}>Add to Playlist</Text>
          <Pressable style={styles.playlistModalCloseButton} onPress={onClose} hitSlop={15}>
            <X size={24} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
          </Pressable>
        </View>

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

        <RNTouchableOpacity style={styles.playlistModalCreateButton} onPress={onCreatePlaylist}>
          <View style={styles.playlistModalCreateIcon}>
            <Plus size={24} color="#3875e8" strokeWidth={2} />
          </View>
          <Text style={styles.playlistModalCreateText}>Create New Playlist</Text>
        </RNTouchableOpacity>

        <View style={styles.playlistModalDivider}>
          <Text style={styles.playlistModalDividerText}>Your Playlists</Text>
        </View>

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
              <RNTouchableOpacity
                style={styles.playlistModalItem}
                onPress={() => onAddToPlaylist(item.id, item.name)}
              >
                {item.coverImageUrl ? (
                  <Image source={{ uri: item.coverImageUrl }} style={styles.playlistModalItemImage} />
                ) : (
                  <View style={[styles.playlistModalItemImage, styles.playlistModalItemImagePlaceholder]}>
                    <ListMusic size={20} color="#888888" />
                  </View>
                )}
                <View style={styles.playlistModalItemInfo}>
                  <Text style={styles.playlistModalItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.playlistModalItemCount}>{item.songCount || 0} songs</Text>
                </View>
                <Plus size={20} color="#888888" strokeWidth={2} />
              </RNTouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.playlistModalList}
          />
        )}
      </View>
    </View>
  </Modal>
))

const getStyles = (isDark) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deferredLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Options Modal styles
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
  optionsMenuItemDisabled: {
    opacity: 0.5,
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
    color: '#888888',
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
    color: '#888888',
  },
})

export default memo(FullPlayerBottomSheet)
