import React, { useCallback, useRef, useEffect, memo, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  useColorScheme,
  ScrollView,
  Modal,
  TouchableOpacity as RNTouchableOpacity,
  Pressable,
} from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
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
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const ARTWORK_SIZE = SCREEN_WIDTH - 80
const LYRICS_PREVIEW_LINES = 4

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
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const bottomSheetRef = useRef(null)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off') // 'off' | 'all' | 'one'
  const [showLyrics, setShowLyrics] = useState(true)
  const [showQueue, setShowQueue] = useState(true)
  const [showArtist, setShowArtist] = useState(true)
  const [showLyricsModal, setShowLyricsModal] = useState(false)
  const [lyricsTab, setLyricsTab] = useState('raw') // 'raw' | 'timestamped'
  // New expandable sections
  const [showCreateVideo, setShowCreateVideo] = useState(false)
  const [showMusicGeneration, setShowMusicGeneration] = useState(false)
  const [showSongCover, setShowSongCover] = useState(false)
  const [showAudioProcessing, setShowAudioProcessing] = useState(false)

  const navigation = useNavigation()

  const {
    mediaType,
    isPlaying,
    currentMedia,
    position,
    duration,
    isFullPlayerVisible,
    togglePlayPause,
    hideFullPlayer,
    playNext,
    playPrevious,
    seek,
    formatTime,
    queue,
    queueIndex,
    // Shared like state from context
    isLiked: isLikedFn,
    toggleLike,
  } = useMediaPlayer()

  // Get like status from shared context
  const isLiked = currentMedia?.id ? isLikedFn(currentMedia.id) : false

  // Debug: Log media data when media changes (lyrics + author info)
  useEffect(() => {
    if (currentMedia) {
      console.log('=== FULLPLAYER: Media Debug ===')
      console.log('Title:', currentMedia.title)
      console.log('rawLyrics:', currentMedia.rawLyrics ? `${currentMedia.rawLyrics.substring(0, 100)}...` : 'MISSING')
      console.log('timestampedLyrics length:', currentMedia.timestampedLyrics?.length || 0)

      // Debug: Log author info for "About the Artist" section
      console.log('=== FULLPLAYER: Author Debug (About the Artist) ===')
      console.log('author object:', currentMedia.author)
      console.log('author.stageName:', currentMedia.author?.stageName)
      console.log('author.bio:', currentMedia.author?.bio)
      console.log('author.profilePictureURL:', currentMedia.author?.profilePictureURL)
      console.log('artist field:', currentMedia.artist)
    }
  }, [currentMedia])

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

  // Handle progress bar press
  const handleProgressPress = useCallback((event) => {
    const { locationX } = event.nativeEvent
    const progressWidth = SCREEN_WIDTH - 40 // padding
    const percentage = locationX / progressWidth
    const newPosition = percentage * duration
    seek(Math.max(0, Math.min(duration, newPosition)))
  }, [duration, seek])

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

  // Don't render if no media or wrong type
  if (mediaType !== 'audio' || !currentMedia) {
    return null
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0
  const thumbnailUrl = currentMedia.thumbnailUrl || currentMedia.imageUrl || currentMedia.coverUrl || currentMedia.profilePictureURL
  const hasNext = queueIndex < queue.length - 1
  const hasPrevious = queueIndex > 0 || position > 3000

  // Get next songs in queue for display
  const nextSongs = queue.slice(queueIndex + 1, queueIndex + 4)

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
          <TouchableOpacity style={styles.headerButton}>
            <MoreHorizontal size={24} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Artwork */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.artworkContainer}
        >
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.placeholderArtwork]}>
              <Music size={100} color={isDark ? '#666666' : '#cccccc'} strokeWidth={1.5} />
            </View>
          )}
        </Animated.View>

        {/* Track Info with Favorite Button */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.trackInfo}
        >
          <View style={styles.trackInfoText}>
            <Text style={styles.title} numberOfLines={2}>
              {currentMedia.title || currentMedia.label || currentMedia.name || 'Unknown Track'}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentMedia.artist || currentMedia.author?.stageName || currentMedia.subLabel || currentMedia.description || currentMedia.author?.firstName || 'Unknown Artist'}
            </Text>
          </View>
          <RNTouchableOpacity
            style={[styles.favoriteButton, isLikeLoading && styles.likeLoading]}
            onPress={handleLikePress}
            disabled={isLikeLoading}
            activeOpacity={0.6}
          >
            <Heart
              size={26}
              color={isLiked ? '#ef4444' : (isDark ? '#888888' : '#888888')}
              fill={isLiked ? '#ef4444' : 'transparent'}
              strokeWidth={2}
            />
          </RNTouchableOpacity>
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          style={styles.progressSection}
        >
          <TouchableOpacity
            style={styles.progressBarContainer}
            onPress={handleProgressPress}
            activeOpacity={1}
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
          </TouchableOpacity>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </Animated.View>

        {/* Controls */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.controls}
        >
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setIsShuffleOn(!isShuffleOn)}
          >
            <Shuffle
              size={24}
              color={isShuffleOn ? '#3875e8' : (isDark ? '#888888' : '#666666')}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !hasPrevious && styles.disabledButton]}
            onPress={playPrevious}
            disabled={!hasPrevious && position <= 3000}
          >
            <SkipBack
              size={32}
              color={isDark ? '#ffffff' : '#151723'}
              fill={isDark ? '#ffffff' : '#151723'}
              strokeWidth={0}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={() => {
              console.log('=== FULLPLAYER PLAY/PAUSE BUTTON PRESSED ===')
              console.log('Current isPlaying state:', isPlaying)
              togglePlayPause()
            }}
          >
            {isPlaying ? (
              <Pause size={32} color="#ffffff" fill="#ffffff" strokeWidth={0} />
            ) : (
              <Play size={32} color="#ffffff" fill="#ffffff" strokeWidth={0} style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !hasNext && styles.disabledButton]}
            onPress={playNext}
            disabled={!hasNext}
          >
            <SkipForward
              size={32}
              color={isDark ? '#ffffff' : '#151723'}
              fill={isDark ? '#ffffff' : '#151723'}
              strokeWidth={0}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={toggleRepeat}
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
          </TouchableOpacity>
        </Animated.View>

        {/* Lyrics Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.section}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
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
        </Animated.View>

        {/* Full Lyrics Modal */}
        <Modal
          visible={showLyricsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLyricsModal(false)}
        >
          <View style={styles.lyricsModalContainer}>
            <View style={styles.lyricsModalHeader}>
              <Text style={styles.lyricsModalTitle}>Lyrics</Text>
              <Pressable
                style={styles.lyricsModalCloseButton}
                onPress={() => setShowLyricsModal(false)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={22} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2.5} />
              </Pressable>
            </View>
            <Text style={styles.lyricsModalTrackName} numberOfLines={1}>
              {currentMedia.title || currentMedia.label || currentMedia.name || 'Unknown Track'}
            </Text>

            {/* Lyrics Tabs - Only show when we have timestamped lyrics (for Karaoke mode) */}
            {(() => {
              const hasTimestampedLyrics = currentMedia.timestampedLyrics &&
                Array.isArray(currentMedia.timestampedLyrics) &&
                currentMedia.timestampedLyrics.length > 0

              if (hasTimestampedLyrics) {
                return (
                  <View style={styles.lyricsTabs}>
                    <TouchableOpacity
                      style={[styles.lyricsTab, lyricsTab === 'raw' && styles.lyricsTabActive]}
                      onPress={() => setLyricsTab('raw')}
                    >
                      <Text style={[styles.lyricsTabText, lyricsTab === 'raw' && styles.lyricsTabTextActive]}>
                        Lyrics
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.lyricsTab, lyricsTab === 'timestamped' && styles.lyricsTabActive]}
                      onPress={() => setLyricsTab('timestamped')}
                    >
                      <Text style={[styles.lyricsTabText, lyricsTab === 'timestamped' && styles.lyricsTabTextActive]}>
                        Karaoke
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              }
              return null
            })()}

            <ScrollView
              style={styles.lyricsModalScroll}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.lyricsModalScrollContent}
              scrollEnabled={true}
              bounces={true}
              nestedScrollEnabled={true}
            >
              {lyricsTab === 'raw' ? (
                <Text style={styles.lyricsModalText}>
                  {currentMedia.rawLyrics || currentMedia.lyrics ||
                    "Lyrics not available for this track.\n\nCheck back later or try playing the song again."}
                </Text>
              ) : (
                currentMedia.timestampedLyrics && Array.isArray(currentMedia.timestampedLyrics) && currentMedia.timestampedLyrics.length > 0 ? (
                  currentMedia.timestampedLyrics.map((line, index) => {
                    const lineStartMs = (line.startTime || 0) * 1000
                    const lineEndMs = (line.endTime || 0) * 1000
                    const lineDuration = lineEndMs - lineStartMs
                    const isActive = position >= lineStartMs && position < lineEndMs
                    const isPast = position >= lineEndMs

                    // Split line into words for karaoke-style highlighting
                    const words = (line.text || '').split(/(\s+)/)
                    const wordCount = words.filter(w => w.trim()).length

                    // Calculate progress within the line (0 to 1)
                    const lineProgress = isActive
                      ? Math.min(1, Math.max(0, (position - lineStartMs) / lineDuration))
                      : isPast ? 1 : 0

                    // Calculate which word index we're currently on
                    const currentWordIndex = Math.floor(lineProgress * wordCount)

                    let actualWordIndex = 0 // Track only non-whitespace words

                    return (
                      <Text
                        key={index}
                        style={[
                          styles.timestampedLyricLine,
                          isActive && styles.timestampedLyricLineActive
                        ]}
                      >
                        {words.map((word, wordIdx) => {
                          // Skip styling for whitespace
                          if (!word.trim()) {
                            return <Text key={wordIdx}>{word}</Text>
                          }

                          const thisWordIndex = actualWordIndex
                          actualWordIndex++

                          const isWordSung = isPast || (isActive && thisWordIndex < currentWordIndex)
                          const isCurrentWord = isActive && thisWordIndex === currentWordIndex

                          return (
                            <Text
                              key={wordIdx}
                              style={[
                                isWordSung && styles.karaokeWordSung,
                                isCurrentWord && styles.karaokeWordCurrent,
                              ]}
                            >
                              {word}
                            </Text>
                          )
                        })}
                      </Text>
                    )
                  })
                ) : (
                  <Text style={styles.lyricsModalText}>
                    Timestamped lyrics not available for this track.
                  </Text>
                )
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Next in Queue Section */}
        {nextSongs.length > 0 && (
          <Animated.View
            entering={FadeInRight.duration(400).delay(600)}
            style={styles.section}
          >
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowQueue(!showQueue)}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Next in queue</Text>
                <Text style={styles.queueCount}>{queue.length - queueIndex - 1} songs</Text>
              </View>
              {showQueue ? (
                <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
              ) : (
                <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
              )}
            </TouchableOpacity>
            {showQueue && (
              <View style={styles.queueList}>
                {nextSongs.map((song, index) => (
                  <View key={song.id || index} style={styles.queueItem}>
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
                      <Text style={styles.queueItemTitle} numberOfLines={1}>
                        {song.title || song.label || song.name || 'Unknown Track'}
                      </Text>
                      <Text style={styles.queueItemArtist} numberOfLines={1}>
                        {song.artist || song.subLabel || song.description || 'Unknown Artist'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.queueItemMenu}>
                      <MoreHorizontal size={18} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* About the Artist Section */}
        <Animated.View
          entering={FadeInRight.duration(400).delay(700)}
          style={styles.section}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
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
        </Animated.View>

        {/* Create Video Section */}
        <Animated.View
          entering={FadeInRight.duration(400).delay(750)}
          style={styles.section}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
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
        </Animated.View>

        {/* Music Generation Section */}
        <Animated.View
          entering={FadeInRight.duration(400).delay(800)}
          style={styles.section}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
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
        </Animated.View>

        {/* Change Song Cover Section */}
        <Animated.View
          entering={FadeInRight.duration(400).delay(850)}
          style={styles.section}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
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
        </Animated.View>

        {/* Audio Processing Section */}
        <Animated.View
          entering={FadeInRight.duration(400).delay(900)}
          style={[styles.section, styles.lastSection]}
        >
          <TouchableOpacity
            style={styles.sectionHeader}
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
        </Animated.View>

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
})

export default memo(FullPlayerBottomSheet)
