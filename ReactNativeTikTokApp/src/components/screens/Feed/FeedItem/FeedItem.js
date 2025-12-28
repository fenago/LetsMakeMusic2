import React, { useCallback, useEffect, useRef, memo, useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, Alert, Share, PanResponder, Dimensions } from 'react-native'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { useIsFocused } from '@react-navigation/native'
import { Image } from 'expo-image'
import { Audio } from 'expo-av'
import { Video, Music, MoreHorizontal } from 'lucide-react-native'
import { useTheme, useTranslations } from '../../../../core/dopebase'
import { getPlayableImageUrl, getPlayableUrl } from '../../../../utils/audioUtils'
import { addReaction as addReactionAPI } from '../../../../core/socialgraph/feed/api/firebase/firebaseFeedClient'
import { add as followUserAPI, unfollow as unfollowUserAPI } from '../../../../core/socialgraph/friendships/api/firebase/firebaseSocialGraphClient'

import VideoPlayer from '../VideoPlayer'
import IMRichTextView from '../../../../core/mentions/IMRichTextView/IMRichTextView'
import LyricsViewModal from '../../../ui/LyricsViewModal'
import { DEFAULT_SONG_RIGHTS } from '../../../../constants/songRights'
import { dynamicStyles, getStageColors } from './styles'

const defaultAvatar =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

// Helper to format milliseconds to mm:ss
const formatTime = (millis, showRemaining = false) => {
  if (!millis || millis < 0) return '0:00'
  const totalSeconds = Math.floor(millis / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const prefix = showRemaining ? '-' : ''
  return `${prefix}${minutes}:${seconds.toString().padStart(2, '0')}`
}

const FeedItem = props => {
  const {
    video,
    paused,
    selected,
    index,
    onReaction,
    onFeedUserItemPress,
    onCommentPress,
    setPaused,
    onSharePost,
    onTextFieldUserPress,
    onTextFieldHashTagPress,
    user,
    onDeletePost,
    onUserReport,
    onMediaComplete,
    stageTheme,
  } = props

  const { localized } = useTranslations()
  const { theme } = useTheme()

  // Generate dynamic styles based on stage theme
  const styles = useMemo(() => dynamicStyles(stageTheme), [stageTheme])
  const stageColors = useMemo(() => getStageColors(stageTheme), [stageTheme])

  const isFocused = useIsFocused()
  const audioRef = useRef(null)

  const { showActionSheetWithOptions } = useActionSheet()

  // LOCAL STATE for reactions - prevents FlatList re-render on like press
  // This is the key fix: by managing reaction state locally, clicking heart
  // doesn't trigger a parent state update that causes FlatList to reset scroll
  const [localMyReaction, setLocalMyReaction] = useState(video.myReaction)
  const [localReactionsCount, setLocalReactionsCount] = useState(video.reactionsCount || 0)

  // LOCAL STATE for following - tracks if current user follows the post author
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // Playback timer state - for showing elapsed/remaining time on song posts
  const [playbackPosition, setPlaybackPosition] = useState(0) // in milliseconds
  const [playbackDuration, setPlaybackDuration] = useState(0) // in milliseconds
  const [isSeeking, setIsSeeking] = useState(false) // True when user is dragging the progress bar
  const [seekPosition, setSeekPosition] = useState(0) // Temporary position while seeking
  const progressBarRef = useRef(null)
  const progressBarWidth = useRef(0)

  // Video playback timer state
  const [videoPosition, setVideoPosition] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  // Lyrics modal state
  const [lyricsModalVisible, setLyricsModalVisible] = useState(false)

  // Sync local state with props when they change (e.g., on initial load or pull-to-refresh)
  // But only if the values actually differ to avoid unnecessary re-renders
  useEffect(() => {
    if (video.myReaction !== localMyReaction) {
      setLocalMyReaction(video.myReaction)
    }
    if ((video.reactionsCount || 0) !== localReactionsCount) {
      setLocalReactionsCount(video.reactionsCount || 0)
    }
  }, [video.id]) // Only sync when the video ID changes (different post)

  const selectedIcon = localMyReaction ? 'filledHeart' : 'heartUnfilled'
  const reactionCount = localReactionsCount

  // Debug: Log post structure with full audio URL info
  console.log('[FeedItem] 📋 Post:', {
    id: video.id?.substring(0, 8),
    postType: video.postType,
    mediaType: video.postMedia?.[0]?.type,
    hasSongData: !!video.songData,
    songDataAudioUrl: video.songData?.audioUrl?.substring(0, 60),
    songDataFirebaseUrl: video.songData?.firebaseAudioUrl?.substring(0, 60),
  })

  // Determine post type for audio handling
  // NOTE: postMedia[0].type contains mime types like 'video/mp4' or 'audio/mpeg'
  const mediaType = video.postMedia?.[0]?.type || ''
  const isVideoPost = mediaType.includes('video') || mediaType.startsWith('video')
  const isImagePost = mediaType.includes('image') || mediaType.startsWith('image')
  // Song posts use `songData` field (from createSongPost cloud function), NOT `song`
  const isSongPost = video.postType === 'song' || mediaType.includes('audio') || (!isVideoPost && !isImagePost && (video.songData || video.song))

  // Get song data - cloud function uses `songData`, old posts may use `song`
  // IMPORTANT: Only use actual song data, DO NOT fallback to video object
  // Otherwise video posts without songs will try to play the video object as audio
  const songInfo = video.songData || video.song || null

  // For audio URL: prioritize songInfo, but fallback to postMedia[0].url for audio-type posts
  // This handles posts where mediaType is 'audio/*' but songData wasn't populated
  const audioUrl = (() => {
    if (isSongPost && songInfo) {
      return getPlayableUrl(songInfo)
    }
    // Fallback: audio-type post without songData - use the media URL directly
    if (isSongPost && mediaType.includes('audio') && video.postMedia?.[0]?.url) {
      return video.postMedia[0].url
    }
    return null
  })()

  // DEBUG: Log audio resolution result
  if (isSongPost) {
    console.log('[FeedItem] 🎵 Song post audio resolution:', {
      id: video.id?.substring(0, 8),
      isSongPost,
      hasSongInfo: !!songInfo,
      usedFallback: !songInfo && mediaType.includes('audio'),
      postMediaUrl: video.postMedia?.[0]?.url?.substring(0, 60),
      resolvedAudioUrl: audioUrl?.substring(0, 80) || 'NULL',
    })
  }


  // Track if audio is ready to play
  const audioReadyRef = useRef(false)
  const isMountedRef = useRef(true)
  // Track playback position to prevent false didJustFinish triggers
  const lastPositionRef = useRef(0)
  const durationRef = useRef(0)
  // Flag to ignore status updates during state changes (like button, etc.)
  const ignoreStatusUpdatesRef = useRef(false)

  // Setup audio for song posts
  useEffect(() => {
    isMountedRef.current = true
    audioReadyRef.current = false
    ignoreStatusUpdatesRef.current = false
    lastPositionRef.current = 0
    durationRef.current = 0

    async function setupAudio() {
      if (!isSongPost || !audioUrl) {
        console.log('[FeedItem] Skipping audio setup:', { isSongPost, hasAudioUrl: !!audioUrl })
        return
      }

      console.log('[FeedItem] 🎵 Setting up audio for song post:', {
        id: video.id?.substring(0, 8),
        audioUrl: audioUrl,  // Full URL for debugging
      })

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        })

        // Use new Audio.Sound() instead of createAsync for better reliability
        const sound = new Audio.Sound()

        console.log('[FeedItem] 📥 Loading audio from:', audioUrl?.substring(0, 60))

        await sound.loadAsync(
          { uri: audioUrl },
          { shouldPlay: false, isLooping: false }  // No looping - we'll auto-advance when finished
        )

        // Listen for playback completion to trigger auto-advance
        sound.setOnPlaybackStatusUpdate((status) => {
          // Skip status updates when ignoring (during UI interactions)
          if (ignoreStatusUpdatesRef.current) {
            return
          }

          // Track position and duration for validation AND timer display
          if (status.isLoaded) {
            lastPositionRef.current = status.positionMillis || 0
            durationRef.current = status.durationMillis || 0
            // Update state for UI timer (throttled via ref comparison to reduce re-renders)
            if (status.positionMillis !== undefined) {
              setPlaybackPosition(status.positionMillis)
            }
            if (status.durationMillis !== undefined && status.durationMillis > 0) {
              setPlaybackDuration(status.durationMillis)
            }
          }

          // Only trigger auto-advance if audio ACTUALLY finished playing
          // Check: didJustFinish AND position is within 2 seconds of the end
          // This prevents false triggers from state changes/re-renders
          if (status.didJustFinish && !status.isLooping && status.isLoaded) {
            const position = status.positionMillis || 0
            const duration = status.durationMillis || 0
            const nearEnd = duration > 0 && (duration - position) < 2000 // Within 2 seconds of end

            console.log('[FeedItem] 🎵 Playback status:', {
              didJustFinish: status.didJustFinish,
              position,
              duration,
              nearEnd,
            })

            if (nearEnd || duration === 0) {
              console.log('[FeedItem] ✅ Audio finished, triggering auto-advance')
              onMediaComplete?.(index)
            } else {
              console.log('[FeedItem] ⚠️ Ignoring false didJustFinish (position not near end)')
            }
          }
        })

        console.log('[FeedItem] ✅ Audio loaded, sound object:', {
          hasPlayAsync: typeof sound.playAsync,
          hasPauseAsync: typeof sound.pauseAsync,
          hasUnloadAsync: typeof sound.unloadAsync,
        })

        if (!isMountedRef.current) {
          // Component unmounted while loading
          await sound.unloadAsync()
          return
        }

        audioRef.current = sound
        audioReadyRef.current = true
        console.log('[FeedItem] ✅ Audio ready for:', video.id?.substring(0, 8))

        // DISABLED: Auto-play when audio loads - users now tap to play
        // Audio is loaded and ready, but won't auto-start
        // User must tap to play via handlePress() which toggles paused state
        console.log('[FeedItem] 🎵 Audio loaded, ready to play on tap:', video.id?.substring(0, 8))
      } catch (error) {
        console.log('[FeedItem] ❌ Error loading audio:', error.message || error)
      }
    }

    setupAudio()

    return () => {
      isMountedRef.current = false
      ignoreStatusUpdatesRef.current = true // Prevent any status updates during cleanup
      if (audioRef.current) {
        console.log('[FeedItem] 🔇 Unloading audio for:', video.id?.substring(0, 8))
        audioRef.current.unloadAsync()
        audioRef.current = null
        audioReadyRef.current = false
      }
      lastPositionRef.current = 0
      durationRef.current = 0
    }
  }, [audioUrl, isSongPost, video.id])

  // Control audio playback based on selection and pause state
  useEffect(() => {
    if (!isSongPost) return

    const isMounted = selected === index
    const shouldPlay = isMounted && !paused && isFocused

    console.log('[FeedItem] 🎮 Audio control check:', {
      id: video.id?.substring(0, 8),
      shouldPlay,
      isMounted,
      paused,
      isFocused,
      audioReady: audioReadyRef.current,
      hasAudioRef: !!audioRef.current,
    })

    if (!audioRef.current || !audioReadyRef.current) {
      console.log('[FeedItem] ⏳ Audio not ready yet, skipping control')
      return
    }

    // Use setStatusAsync instead of playAsync/pauseAsync (not available in this expo-av version)
    // Use optional chaining to prevent race conditions where audioRef.current
    // becomes null during cleanup between the check above and these calls
    if (shouldPlay) {
      console.log('[FeedItem] ▶️ Playing audio')
      audioRef.current?.setStatusAsync?.({ shouldPlay: true })?.catch(e => console.log('[FeedItem] Play error:', e))
    } else {
      console.log('[FeedItem] ⏸️ Pausing audio')
      audioRef.current?.setStatusAsync?.({ shouldPlay: false })?.catch(e => console.log('[FeedItem] Pause error:', e))
    }
  }, [selected, index, paused, isFocused, isSongPost])

  useEffect(() => {
    if (!isFocused) {
      setPaused(true)
    }
  }, [isFocused])

  const moreArray = useRef([localized('Share Track')])
  const isUserAuthor = video.authorID === user.id

  useEffect(() => {
    if (isUserAuthor) {
      moreArray.current.push(localized('Delete Track'))
    } else {
      moreArray.current.push(localized('Block User'))
      moreArray.current.push(localized('Report Track'))
    }

    moreArray.current.push(localized('Cancel'))
  }, [])

  const onMorePress = useCallback(() => {
    showActionSheetWithOptions(
      {
        title: localized('More'),
        options: moreArray.current,
        cancelButtonIndex: moreArray.current.length - 1,
        destructiveButtonIndex: moreArray.current.indexOf('Delete Track'),
      },
      onMoreDialogDone,
    )
  }, [])

  const onMoreDialogDone = useCallback(
    indx => {
      if (indx === moreArray.current.indexOf(localized('Share Track'))) {
        onSharePost(video)
      }

      if (
        indx === moreArray.current.indexOf(localized('Report Track')) ||
        indx === moreArray.current.indexOf(localized('Block User'))
      ) {
        onUserReport(video, moreArray.current[indx])
      }

      if (index === moreArray.current.indexOf(localized('Delete Track'))) {
        onDeletePost(video)
      }
    },
    [onSharePost, onDeletePost, onUserReport, moreArray, video],
  )

  const onReactionPress = () => {
    // Temporarily ignore audio status updates to prevent false auto-advance triggers
    ignoreStatusUpdatesRef.current = true

    // Determine the new reaction state
    const wasLiked = !!localMyReaction
    const newReaction = wasLiked ? null : 'like'

    // UPDATE LOCAL STATE ONLY - this provides instant UI feedback
    // WITHOUT triggering parent state update that causes FlatList scroll reset
    if (wasLiked) {
      setLocalMyReaction(null)
      setLocalReactionsCount(prev => Math.max(0, prev - 1))
    } else {
      setLocalMyReaction('like')
      setLocalReactionsCount(prev => prev + 1)
    }

    // SYNC DIRECTLY TO FIREBASE - bypasses parent state entirely!
    // This is the key fix: no parent state update = no FlatList re-render = no scroll reset
    const reactionToSend = newReaction || (wasLiked ? 'like' : null) // Send current state for toggle
    addReactionAPI(video.id, user.id, reactionToSend)
      .then(() => console.log('[FeedItem] ✅ Reaction synced to Firebase'))
      .catch(err => console.log('[FeedItem] ❌ Reaction sync failed:', err))

    // Re-enable status updates after a short delay
    setTimeout(() => {
      ignoreStatusUpdatesRef.current = false
    }, 500)
  }

  const onUserItemPress = author => {
    setPaused(true)
    onFeedUserItemPress(author)
  }

  const onComment = video => {
    // Don't pause audio when opening comments - let music keep playing
    onCommentPress(video)
  }

  const onTextFieldUser = textFieldUser => {
    setPaused(true)
    onTextFieldUserPress(textFieldUser)
  }

  const onTextFieldHashTag = hashTag => {
    setPaused(true)
    onTextFieldHashTagPress(hashTag)
  }

  // Seek to a position in the song when user taps or drags the progress bar
  const handleSeek = async (percentage) => {
    if (!audioRef.current || !audioReadyRef.current || playbackDuration <= 0) return

    const newPosition = Math.max(0, Math.min(percentage, 1)) * playbackDuration
    console.log('[FeedItem] 🎯 Seeking to:', formatTime(newPosition), `(${Math.round(percentage * 100)}%)`)

    try {
      await audioRef.current.setStatusAsync({ positionMillis: newPosition })
      setPlaybackPosition(newPosition)
    } catch (error) {
      console.log('[FeedItem] Seek error:', error.message)
    }
  }

  // Handle tap on progress bar - seek to tapped position
  const handleProgressBarPress = (event) => {
    if (progressBarWidth.current <= 0 || playbackDuration <= 0) return

    const { locationX } = event.nativeEvent
    const percentage = locationX / progressBarWidth.current
    handleSeek(percentage)
  }

  // Toggle follow/unfollow the post author
  const onFollowPress = async () => {
    if (followLoading) return // Loading, ignore press

    setFollowLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        await unfollowUserAPI(user.id, video.author.id)
        setIsFollowing(false)
        console.log('[FeedItem] ✅ Successfully unfollowed:', video.author.username || video.author.firstName)
      } else {
        // Follow
        await followUserAPI(user.id, video.author.id)
        setIsFollowing(true)
        console.log('[FeedItem] ✅ Successfully followed:', video.author.username || video.author.firstName)
      }
    } catch (error) {
      console.log('[FeedItem] ❌ Follow/unfollow failed:', error)
      Alert.alert('Error', `Failed to ${isFollowing ? 'unfollow' : 'follow'} user. Please try again.`)
    } finally {
      setFollowLoading(false)
    }
  }

  // Share functionality
  const onSharePress = () => {
    showActionSheetWithOptions(
      {
        title: localized('Share'),
        options: [
          localized('Share to Social Media'),
          localized('Tag a User'),
          localized('Copy Link'),
          localized('Cancel'),
        ],
        cancelButtonIndex: 3,
      },
      async (buttonIndex) => {
        if (buttonIndex === 0) {
          // Share to social media
          try {
            const songTitle = songInfo?.title || video.postText || 'Check out this song!'
            const artistName = video.author?.stageName || video.author?.firstName || 'an artist'
            const shareMessage = `🎵 "${songTitle}" by ${artistName}\n\nListen on LetsMakeMusic!`

            await Share.share({
              message: shareMessage,
              title: songTitle,
            })
          } catch (error) {
            console.log('[FeedItem] Share error:', error)
          }
        } else if (buttonIndex === 1) {
          // Tag a user - coming soon
          Alert.alert(
            'Coming Soon',
            'User tagging will be available in a future update!',
            [{ text: 'OK' }]
          )
        } else if (buttonIndex === 2) {
          // Copy link - coming soon
          Alert.alert(
            'Coming Soon',
            'Link sharing will be available in a future update!',
            [{ text: 'OK' }]
          )
        }
      }
    )
  }

  // More options menu (Lyrics, About the Song, etc.)
  const onMoreOptionsPress = () => {
    const isSong = isSongPost || video.postType === 'song'
    const isVideo = isVideoPost

    const options = []

    if (isSong) {
      options.push(localized('View Lyrics'))
      options.push(localized('About the Song'))
      options.push(localized('Song Rights'))
      options.push(localized('About the Artist'))
      options.push(localized('Add to Playlist'))
    }

    if (isVideo) {
      options.push(localized('About the Video'))
      options.push(localized('About the Creator'))
    }

    // Common options
    options.push(localized('Save to Library'))

    if (!isUserAuthor) {
      options.push(localized('Report'))
    } else {
      options.push(localized('Delete'))
    }

    options.push(localized('Cancel'))

    showActionSheetWithOptions(
      {
        title: localized('More Options'),
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: options.indexOf(localized('Delete')) !== -1
          ? options.indexOf(localized('Delete'))
          : options.indexOf(localized('Report')),
      },
      (buttonIndex) => {
        const selectedOption = options[buttonIndex]

        if (selectedOption === localized('View Lyrics')) {
          setLyricsModalVisible(true)
        } else if (selectedOption === localized('About the Song')) {
          const title = songInfo?.title || 'Unknown Title'
          const style = songInfo?.style || video.songData?.style || 'AI Generated'
          const prompt = songInfo?.prompt || video.songData?.prompt || ''
          Alert.alert(
            title,
            `Style: ${style}${prompt ? `\n\nPrompt: ${prompt}` : ''}`,
            [{ text: 'Close' }]
          )
        } else if (selectedOption === localized('Song Rights')) {
          // Get song rights from songData or use defaults
          const rights = songInfo?.rights || video.songData?.rights || DEFAULT_SONG_RIGHTS

          // Helper to format boolean rights
          const formatRight = (value, defaultVal) => (value ?? defaultVal) ? '✓ Allowed' : '✗ Disabled'
          const formatComingSoon = (value, defaultVal) => `${(value ?? defaultVal) ? '✓' : '✗'} (Coming Soon)`

          // Build rights display message
          const rightsMessage = `
💰 MONETIZATION
Price: ${rights.monetized ? `$${((rights.price || 0) / 100).toFixed(2)}` : 'Free'}
Tipping: ${formatRight(rights.allowTipping, DEFAULT_SONG_RIGHTS.allowTipping)}

🎵 DERIVATIVE WORKS
Extend: ${formatRight(rights.allowExtend, DEFAULT_SONG_RIGHTS.allowExtend)}
Stem Extraction: ${formatComingSoon(rights.allowStemExtraction, DEFAULT_SONG_RIGHTS.allowStemExtraction)}
WAV Export: ${formatComingSoon(rights.allowWavExport, DEFAULT_SONG_RIGHTS.allowWavExport)}
Lyrics Use: ${formatRight(rights.allowLyricsUse, DEFAULT_SONG_RIGHTS.allowLyricsUse)}
Reinterpret (Cover): ${formatComingSoon(rights.allowReinterpret, DEFAULT_SONG_RIGHTS.allowReinterpret)}
Sampling: ${formatComingSoon(rights.allowSampling, DEFAULT_SONG_RIGHTS.allowSampling)}
Create Persona: ${formatComingSoon(rights.allowPersonaCreation, DEFAULT_SONG_RIGHTS.allowPersonaCreation)}
Video Creation: ${formatRight(rights.allowVideoCreation, DEFAULT_SONG_RIGHTS.allowVideoCreation)}

📝 ATTRIBUTION
Attribution Required: ${(rights.requireAttribution ?? DEFAULT_SONG_RIGHTS.requireAttribution) ? 'Yes' : 'No'}${rights.attributionText ? `\nCredit As: ${rights.attributionText}` : ''}

💼 COMMERCIAL USE
Commercial Use: ${formatComingSoon(rights.allowCommercialUse, DEFAULT_SONG_RIGHTS.allowCommercialUse)}
License Fee: ${rights.commercialLicenseFee ? `$${(rights.commercialLicenseFee / 100).toFixed(2)}` : 'Not set'} (Coming Soon)
`.trim()

          Alert.alert(
            'Song Rights',
            rightsMessage,
            [{ text: 'Close' }]
          )
        } else if (selectedOption === localized('About the Artist') || selectedOption === localized('About the Creator')) {
          onUserItemPress(video.author)
        } else if (selectedOption === localized('About the Video')) {
          Alert.alert(
            'About This Video',
            video.postText || 'No description available.',
            [{ text: 'Close' }]
          )
        } else if (selectedOption === localized('Add to Playlist')) {
          Alert.alert('Coming Soon', 'Playlist feature will be available soon!', [{ text: 'OK' }])
        } else if (selectedOption === localized('Save to Library')) {
          Alert.alert('Coming Soon', 'Library save feature will be available soon!', [{ text: 'OK' }])
        } else if (selectedOption === localized('Report')) {
          onUserReport(video, 'Report Track')
        } else if (selectedOption === localized('Delete')) {
          Alert.alert(
            'Delete Track',
            'Are you sure you want to delete this track?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDeletePost(video) }
            ]
          )
        }
      }
    )
  }

  const firstname = video.author?.firstName ?? ''
  const lastname = video.author?.lastName ?? ''

  const username = video.author?.username
    ? `@${video.author?.username}`
    : `@${firstname?.toLowerCase()}${lastname?.toLowerCase()}`

  return (
    <>
    <TouchableOpacity
      activeOpacity={1}
      key={video.id}
      onPress={() => setPaused(prevPaused => !prevPaused)}
      style={styles.videoContent}>
      {/* Media type indicator badge */}
      <View style={styles.mediaTypeBadge}>
        {isVideoPost ? (
          <>
            <Video size={14} color={stageColors.text} />
            <Text style={styles.mediaTypeBadgeText}>Video</Text>
          </>
        ) : (
          <>
            <Music size={14} color={stageColors.text} />
            <Text style={styles.mediaTypeBadgeText}>Audio</Text>
          </>
        )}
      </View>
      {/* Progress timer bar - positioned at top for audio posts */}
      {isSongPost && playbackDuration > 0 && (
        <View style={styles.songProgressContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleProgressBarPress}
            onLayout={(e) => { progressBarWidth.current = e.nativeEvent.layout.width }}
            style={styles.songProgressBarTouchable}
          >
            <View style={styles.songProgressBarBg}>
              <View
                style={[
                  styles.songProgressBarFill,
                  { width: `${(playbackPosition / playbackDuration) * 100}%` }
                ]}
              />
            </View>
            {/* Seek handle dot */}
            <View
              style={[
                styles.songProgressHandle,
                { left: `${(playbackPosition / playbackDuration) * 100}%` }
              ]}
            />
          </TouchableOpacity>
          <View style={styles.songProgressTime}>
            <Text style={styles.songTimeText}>{formatTime(playbackPosition)}</Text>
            <Text style={styles.songTimeRemaining}>
              {formatTime(playbackDuration - playbackPosition, true)}
            </Text>
          </View>
        </View>
      )}
      {/* Video posts - plays video with optional song audio sync */}
      {/* songInfo is defined above as: video.songData || video.song || null */}
      {/* Only pass song if it actually exists - otherwise video plays with its own audio */}
      {isVideoPost && (
        <VideoPlayer
          video={video.postMedia[0]}
          paused={paused}
          song={songInfo}
          isMounted={selected === index}
          onComplete={() => onMediaComplete?.(index)}
          onPlaybackUpdate={({ position, duration }) => {
            setVideoPosition(position)
            setVideoDuration(duration)
          }}
        />
      )}
      {/* Video progress timer - positioned at top for video posts */}
      {isVideoPost && videoDuration > 0 && (
        <View style={styles.videoProgressContainer}>
          <View style={styles.videoProgressBarBg}>
            <View
              style={[
                styles.videoProgressBarFill,
                { width: `${(videoPosition / videoDuration) * 100}%` }
              ]}
            />
          </View>
          <View style={styles.videoProgressTime}>
            <Text style={styles.videoTimeText}>{formatTime(videoPosition)}</Text>
            <Text style={styles.videoTimeRemaining}>
              {formatTime(videoDuration - videoPosition, true)}
            </Text>
          </View>
        </View>
      )}
      {/* Image posts - static image display */}
      {isImagePost && (
        <Image
          style={styles.videoImage}
          source={{ uri: video.postMedia[0].url }}
        />
      )}
      {/* Song/Audio posts - show album art with audio playback (handled by useEffect above) */}
      {/* Note: Play button overlay comes from parent Feed.js - no duplicate needed here */}
      {/* songInfo is defined above as: video.songData || video.song || null */}
      {isSongPost && !isVideoPost && !isImagePost && songInfo && (
        <View style={styles.songPostContainer}>
          <Image
            style={styles.songAlbumArt}
            contentFit="cover"
            source={{ uri: getPlayableImageUrl(songInfo) }}
            transition={200}
          />
          <View style={styles.songOverlay}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {songInfo?.title || video.description || 'Untitled Song'}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {songInfo?.artist || video.author?.stageName || video.author?.firstName || 'Unknown Artist'}
            </Text>
          </View>
        </View>
      )}
      <View style={styles.contentRight}>
        {/* 1. Artist Profile + Follow Button */}
        <View style={styles.contentRightUser}>
          <TouchableOpacity
            onPress={() => onUserItemPress(video.author)}
            style={styles.contentRightUserImageContainer}>
            <Image
              style={styles.contentRightUserImage}
              contentFit="cover"
              source={{ uri: video.author.profilePictureURL || defaultAvatar }}
            />
          </TouchableOpacity>
          {/* Follow button - only show for other users and if not already following */}
          {!isUserAuthor && !isFollowing && (
            <TouchableOpacity
              onPress={onFollowPress}
              disabled={followLoading}
              style={[
                styles.contentRightUserPlus,
                followLoading && { opacity: 0.5 }
              ]}>
              <Image style={styles.plusIcon} source={theme.icons.add} />
            </TouchableOpacity>
          )}
          {/* Show checkmark if already following */}
          {!isUserAuthor && isFollowing && (
            <View style={[styles.contentRightUserPlus, { backgroundColor: '#4CAF50' }]}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
            </View>
          )}
        </View>

        {/* 2. Heart/Like Button */}
        <TouchableOpacity
          onPress={onReactionPress}
          style={styles.iconRightContainer}>
          <Image
            style={[
              styles.iconRight,
              selectedIcon !== 'heartUnfilled' && styles.iconLike,
            ]}
            source={theme.icons.heartFilled}
          />

          <Text style={styles.contentRightText}>
            {reactionCount > 1000
              ? `${reactionCount / 1000}K`
              : reactionCount > 0
              ? reactionCount
              : ''}
          </Text>
        </TouchableOpacity>

        {/* 3. Comments Button */}
        <TouchableOpacity
          onPress={() => onComment(video)}
          style={styles.iconRightContainer}>
          <Image style={styles.iconRight} source={theme.icons.commentFilled} />
          <Text style={styles.contentRightText}>
            {video.commentCount > 1000
              ? `${video.commentCount}K`
              : video.commentCount > 0
              ? video.commentCount
              : ''}
          </Text>
        </TouchableOpacity>

        {/* 4. Share Button */}
        <TouchableOpacity
          onPress={onSharePress}
          style={styles.iconRightContainer}>
          <Image
            style={styles.iconRight}
            source={theme.icons.share}
          />
        </TouchableOpacity>

        {/* 5. More Options Button */}
        <TouchableOpacity
          onPress={onMoreOptionsPress}
          style={styles.iconRightContainer}>
          <MoreHorizontal size={30} color={stageColors.iconTint} style={{ opacity: stageColors.iconOpacity }} />
        </TouchableOpacity>
      </View>
      <View style={styles.contentLeftBottom}>
        <TouchableOpacity onPress={() => onUserItemPress(video.author)}>
          <Text style={styles.contentLeftBottomNameUserText} numberOfLines={1}>
            {username}
          </Text>
        </TouchableOpacity>
        <IMRichTextView
          defaultTextStyle={styles.contentLeftBottomDescription}
          usernameStyle={styles.username}
          hashTagStyle={styles.hashTag}
          onUserPress={onTextFieldUser}
          onHashTagPress={onTextFieldHashTag}>
          {video.postText || ' '}
        </IMRichTextView>
        {(video.songData || video.song) && (
          <View style={styles.contentLeftBottomMusicContainer}>
            <Image source={theme.icons.musicalNotes} style={styles.musicIcon} />
            <Text style={styles.contentLeftBottomMusic} numberOfLines={1}>
              {video.songData?.title || video.song?.title}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>

    {/* Lyrics View Modal */}
    <LyricsViewModal
      visible={lyricsModalVisible}
      onClose={() => setLyricsModalVisible(false)}
      title={songInfo?.title || video.songData?.title || 'Unknown Track'}
      rawLyrics={songInfo?.rawLyrics || songInfo?.lyrics || video.songData?.rawLyrics || video.songData?.lyrics}
      timestampedLyrics={songInfo?.timestampedLyrics || video.songData?.timestampedLyrics}
    />
    </>
  )
}

export default memo(FeedItem)
