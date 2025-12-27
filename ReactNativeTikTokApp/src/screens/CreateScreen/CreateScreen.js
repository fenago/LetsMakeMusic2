import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native'
// Custom slider component (replacing broken @react-native-community/slider)
const CustomSlider = ({ value, onValueChange, minimumValue = 0, maximumValue = 1, step = 0.05 }) => {
  const trackRef = React.useRef(null)

  const handlePress = (event) => {
    // Capture touch position immediately (event is recycled after this function returns)
    const touchPageX = event.nativeEvent.pageX
    if (touchPageX == null) return

    trackRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (width <= 0) return
      const touchX = touchPageX - pageX
      const percentage = Math.max(0, Math.min(1, touchX / width))
      const rawValue = minimumValue + percentage * (maximumValue - minimumValue)
      const steppedValue = Math.round(rawValue / step) * step
      onValueChange(Math.max(minimumValue, Math.min(maximumValue, steppedValue)))
    })
  }

  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100

  return (
    <TouchableOpacity
      ref={trackRef}
      onPress={handlePress}
      activeOpacity={0.8}
      style={{
        height: 44,
        justifyContent: 'center',
        paddingVertical: 10,
      }}
    >
      <View style={{
        height: 8,
        backgroundColor: '#3a3a4a',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <View style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: '#6366F1',
          borderRadius: 4,
        }} />
      </View>
      <View style={{
        position: 'absolute',
        left: `${percentage}%`,
        marginLeft: -12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
      }} />
    </TouchableOpacity>
  )
}
import { useCurrentUser } from '../../core/onboarding'
import { useMediaPlayer } from '../../contexts/MediaPlayerContext'
import {
  generateSongSimple,
  generateSongCustom,
  pollForCompletion,
  getTimestampedLyrics,
  MODEL_VERSIONS,
  DEFAULT_MODEL,
} from '../../services/sunoApi'
import { saveSong } from '../../services/songsService'
import { uploadAudioToFirebase } from '../../services/audioStorageService'
import { DEFAULT_SONG_RIGHTS } from '../../constants/songRights'
import functions from '@react-native-firebase/functions'
import { logInfo, logSuccess, logError, logWarn } from '../../services/debugLogService'

// Model version options for picker
const MODEL_OPTIONS = Object.entries(MODEL_VERSIONS).map(([key, value]) => ({
  key,
  label: value.label,
  maxPrompt: value.maxPrompt,
  maxStyle: value.maxStyle,
}))

// Rotating tips shown during generation - brand messaging from guidelines
const GENERATION_TIPS = [
  { message: "Turn your moment into music", icon: "🎵" },
  { message: "Every clip deserves its own soundtrack", icon: "🎬" },
  { message: "Your life, remixed", icon: "✨" },
  { message: "Where memories become music videos", icon: "🎤" },
  { message: "Describe the feeling, we'll create the song", icon: "💭" },
  { message: "The soundtrack to your moments", icon: "🎧" },
  { message: "AI is learning your vibe...", icon: "🤖" },
  { message: "Composing melodies just for you", icon: "🎹" },
  { message: "Creating something magical", icon: "🪄" },
  { message: "Your unique sound is coming", icon: "🔊" },
]

// Estimated time for song generation (based on Suno API docs)
const ESTIMATED_TIME_SECONDS = 120 // 2-3 minutes, we use 2 as estimate

const CREATE_MODES = {
  VIDEO: 'video',
  SONG: 'song',
  LYRICS: 'lyrics',
  BEATS: 'beats',
}

const SONG_MODES = {
  SIMPLE: 'simple',
  CUSTOM: 'custom',
}

/**
 * CreateScreen - Mode selector for Video or Song creation
 *
 * Video mode -> Navigate to existing CameraScreen
 * Song mode -> Show song creation UI with Simple/Custom modes
 */
export default function CreateScreen({ navigation }) {
  const currentUser = useCurrentUser()
  const { loadMedia } = useMediaPlayer()

  // Main create mode: video or song
  const [createMode, setCreateMode] = useState(CREATE_MODES.SONG)

  // Song mode: simple or custom
  const [songMode, setSongMode] = useState(SONG_MODES.SIMPLE)

  // Simple mode fields
  const [description, setDescription] = useState('')

  // Custom mode fields
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState('')
  const [lyrics, setLyrics] = useState('')

  // Shared fields
  const [instrumental, setInstrumental] = useState(false)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  // Advanced options (collapsed by default)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [negativeTags, setNegativeTags] = useState('')
  const [vocalGender, setVocalGender] = useState(null) // null = any, 'm' = male, 'f' = female
  const [styleWeight, setStyleWeight] = useState(0.5) // 0.00-1.00
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.5) // 0.00-1.00 (lower = more cohesive)

  // Song Rights (collapsed by default)
  const [showSongRights, setShowSongRights] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [songRights, setSongRights] = useState({ ...DEFAULT_SONG_RIGHTS })

  // Get current model config for dynamic limits
  const currentModelConfig = MODEL_VERSIONS[selectedModel] || MODEL_VERSIONS[DEFAULT_MODEL]

  // Rotating tips state
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const tipFadeAnim = useRef(new Animated.Value(1)).current

  // Rotate tips every 4 seconds while generating
  useEffect(() => {
    if (!isGenerating) {
      setCurrentTipIndex(0)
      return
    }

    const rotateTip = () => {
      // Fade out
      Animated.timing(tipFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change tip
        setCurrentTipIndex((prev) => (prev + 1) % GENERATION_TIPS.length)
        // Fade in
        Animated.timing(tipFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start()
      })
    }

    const intervalId = setInterval(rotateTip, 4000)
    return () => clearInterval(intervalId)
  }, [isGenerating, tipFadeAnim])

  const handleClose = () => {
    navigation.goBack()
  }

  const handleVideoMode = () => {
    // Navigate to existing Camera screen for video creation
    // Use navigate instead of replace since Camera is in the parent MainStackNavigator
    navigation.navigate('Camera')
  }

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return

    // Validate inputs
    if (songMode === SONG_MODES.SIMPLE) {
      if (!description.trim()) {
        Alert.alert('Missing Description', 'Please enter a song description')
        return
      }
    } else {
      // Custom mode requires at least title and style
      if (!title.trim()) {
        Alert.alert('Missing Title', 'Please enter a song title')
        return
      }
      if (!style.trim()) {
        Alert.alert('Missing Style', 'Please enter a music style')
        return
      }
    }

    setIsGenerating(true)
    setGenerationStatus('Starting generation...')

    try {
      let result

      // Build advanced options object
      const advancedOptions = {
        negativeTags: negativeTags.trim() || undefined,
        vocalGender: vocalGender || undefined,
        styleWeight: styleWeight !== 0.5 ? styleWeight : undefined, // Only send if changed from default
        weirdnessConstraint: weirdnessConstraint !== 0.5 ? weirdnessConstraint : undefined,
      }

      // Step 1: Submit generation request
      if (songMode === SONG_MODES.SIMPLE) {
        result = await generateSongSimple(description, instrumental, selectedModel, advancedOptions)
      } else {
        result = await generateSongCustom({
          title,
          style,
          lyrics: lyrics || '',
          instrumental,
          model: selectedModel,
          ...advancedOptions,
        })
      }

      console.log('Song generation started:', result)

      if (!result.taskId) {
        throw new Error('No task ID returned from API')
      }

      // Step 2: Poll for completion with progress updates
      setGenerationStatus('AI is composing your song...')
      setElapsedTime(0)

      const completedResult = await pollForCompletion(
        result.taskId,
        60,
        5000,
        (progress) => {
          setElapsedTime(progress.elapsedSeconds)
        }
      )

      console.log('Song generation complete:', completedResult)

      // Step 3: Process completed songs (Suno returns 2 songs per generation)
      if (completedResult.status === 'complete' && completedResult.songs?.length > 0) {
        const allSongs = completedResult.songs
        console.log(`Suno returned ${allSongs.length} songs`)

        // DEBUG: Log ALL fields from each song to diagnose playback issues
        allSongs.forEach((song, i) => {
          console.log(`[CreateScreen] Song ${i + 1} ALL FIELDS:`, JSON.stringify(song, null, 2))
          console.log(`[CreateScreen] Song ${i + 1} KEY URLs:`, {
            id: song.id,
            audio_url: song.audio_url,
            stream_url: song.stream_url,
            image_url: song.image_url,
          })
        })

        // Get artist name from current user
        const artistName = currentUser?.firstName && currentUser?.lastName
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser?.username || currentUser?.firstName || 'Me'

        // Save ALL songs to Firebase
        const savedSongs = []
        for (let i = 0; i < allSongs.length; i++) {
          const song = allSongs[i]
          const songTitle = song.title || title || `AI Song ${i + 1}`

          // Step 4: Try to fetch timestamped lyrics for each song (non-blocking)
          let timestampedLyrics = null
          if (!instrumental && song.id) {
            try {
              setGenerationStatus(`Fetching lyrics for song ${i + 1}...`)
              timestampedLyrics = await getTimestampedLyrics(song.id)
              console.log(`Timestamped lyrics fetched for song ${i + 1}:`, timestampedLyrics)
            } catch (lyricsError) {
              console.warn(`Could not fetch timestamped lyrics for song ${i + 1}:`, lyricsError)
            }
          }

          // Save song to Firebase for user's library
          if (currentUser?.id) {
            try {
              setGenerationStatus(`Saving song ${i + 1} of ${allSongs.length}...`)

              // Save ALL song metadata to Firebase FIRST (to get songId)
              const savedSong = await saveSong({
                userId: currentUser.id,
                // Author info (denormalized for display in FullPlayer "About the Artist")
                author: {
                  id: currentUser.id,
                  stageName: currentUser.stageName || null,
                  bio: currentUser.bio || null,
                  profilePictureURL: currentUser.profilePictureURL || null,
                  firstName: currentUser.firstName || null,
                  lastName: currentUser.lastName || null,
                },
                sunoId: song.id,
                sunoTaskId: result.taskId, // Required for video generation
                // Primary URLs
                audioUrl: song.audio_url,
                streamUrl: song.stream_url,
                imageUrl: song.image_url,
                firebaseAudioUrl: null, // Will be updated by Cloud Function
                videoUrl: song.video_url || null, // Some songs have video
                // Backup source URLs (in case primary expires)
                sourceAudioUrl: song.source_audio_url || null,
                sourceStreamUrl: song.source_stream_url || null,
                sourceImageUrl: song.source_image_url || null,
                // Song content
                title: songTitle,
                style: song.style || style || '',
                tags: song.tags || null, // Suno-generated genre tags
                rawLyrics: timestampedLyrics?.rawLyrics || song.lyric || '',
                timestampedLyrics: timestampedLyrics?.lyrics || [],
                duration: song.duration || 0,
                // Generation settings (for reference/recreation)
                model: selectedModel,
                instrumental: instrumental,
                prompt: songMode === SONG_MODES.SIMPLE ? description : lyrics,
                // Advanced options used (for reference)
                generationOptions: {
                  negativeTags: negativeTags.trim() || null,
                  vocalGender: vocalGender || null,
                  styleWeight: styleWeight !== 0.5 ? styleWeight : null,
                  weirdnessConstraint: weirdnessConstraint !== 0.5 ? weirdnessConstraint : null,
                },
                // Additional Suno metadata
                sunoModelName: song.model_name || selectedModel,
                sunoStatus: song.status || 'complete',
                sunoCreatedAt: song.create_time || song.created_at || null,
                // Song rights - use user's selected settings
                isPublic: isPublic,
                rights: {
                  ...songRights,
                  visibility: isPublic ? 'public' : 'private',
                },
              })
              savedSongs.push({ ...savedSong, timestampedLyrics })
              console.log(`Song ${i + 1} saved to Firebase:`, savedSong.id)

              // Now backup audio to Firebase Storage via Cloud Function
              // This runs async - Cloud Function will update the song doc with firebaseAudioUrl
              const audioSourceUrl = song.audio_url || song.stream_url
              if (audioSourceUrl && savedSong.id) {
                setGenerationStatus(`Backing up audio ${i + 1} to Firebase...`)
                // Don't await - let it run in background
                uploadAudioToFirebase(audioSourceUrl, savedSong.id, song.id, currentUser.id)
                  .then((url) => {
                    if (url) console.log(`Audio ${i + 1} backed up to Firebase:`, url)
                  })
                  .catch((err) => {
                    console.warn(`Could not backup audio ${i + 1} to Firebase:`, err)
                  })
              }
            } catch (saveError) {
              console.warn(`Could not save song ${i + 1} to Firebase:`, saveError)
            }
          }
        }

        // Auto-share to feed if user has enabled this setting
        logInfo('Checking auto-share setting', {
          setting: currentUser?.auto_share_to_feed,
          savedSongsCount: savedSongs.length,
        })

        if (currentUser?.auto_share_to_feed === 'On' && savedSongs.length > 0) {
          setGenerationStatus('Sharing to feed...')
          logInfo('Auto-share enabled, calling createSongPost cloud function')

          const createSongPost = functions().httpsCallable('createSongPost')

          // Auto-share only the first song (main song)
          const autoShareSong = savedSongs[0]
          if (autoShareSong?.id) {
            try {
              logInfo('Calling createSongPost', {
                songId: autoShareSong.id,
                songTitle: autoShareSong.title || title || 'AI Song',
              })

              const result = await createSongPost({
                songId: autoShareSong.id,
                caption: `Just created a new song: ${autoShareSong.title || title || 'AI Song'} 🎵`,
                hashtags: [], // Auto-generated from song style in cloud function
              })

              logSuccess('Song auto-shared to feed!', {
                songId: autoShareSong.id,
                postId: result?.data?.postId,
              })
              console.log('Song auto-shared to feed:', autoShareSong.id)
            } catch (shareError) {
              logError('Failed to auto-share song', {
                error: shareError.message || shareError.toString(),
                code: shareError.code,
                songId: autoShareSong.id,
              })
              console.warn('Could not auto-share song to feed:', shareError)
              // Don't show error - auto-share is a convenience feature
            }
          }
        } else {
          logInfo('Auto-share skipped', {
            reason: currentUser?.auto_share_to_feed !== 'On'
              ? 'Setting is OFF'
              : 'No saved songs',
          })
        }

        // Play the first song immediately using MediaPlayer
        const firstSong = allSongs[0]
        const firstSavedSong = savedSongs[0]
        const firstSongTitle = firstSong.title || title || 'AI Song'

        loadMedia({
          // Use Firebase document ID, not Suno ID
          id: firstSavedSong?.id || firstSong.id,
          sunoId: firstSong.id,
          sunoTaskId: result.taskId, // Required for video generation!
          audioUrl: firstSong.audio_url || firstSong.stream_url,
          title: firstSongTitle,
          thumbnailUrl: firstSong.image_url,
          imageUrl: firstSong.image_url,
          artist: artistName,
          duration: firstSong.duration,
          // For FullPlayer lyrics display:
          timestampedLyrics: firstSavedSong?.timestampedLyrics?.lyrics || [],
          rawLyrics: firstSavedSong?.timestampedLyrics?.rawLyrics || firstSong.lyric || '',
          // Author info for "About the Artist" section:
          author: {
            id: currentUser?.id,
            stageName: currentUser?.stageName || null,
            bio: currentUser?.bio || null,
            profilePictureURL: currentUser?.profilePictureURL || null,
            firstName: currentUser?.firstName || null,
            lastName: currentUser?.lastName || null,
          },
        })

        const songsCreated = savedSongs.length > 1
          ? `${savedSongs.length} songs`
          : 'song'

        Alert.alert(
          'Songs Created! 🎵',
          `Your AI ${songsCreated} saved to Library! Now playing "${firstSongTitle}"`,
          [
            {
              text: 'Keep Creating',
              style: 'cancel',
              onPress: () => {
                // Stay on create screen
              },
            },
            {
              text: 'Go to Library',
              onPress: () => {
                navigation.navigate('Library')
              },
            },
          ],
        )
      } else {
        throw new Error('No songs returned from generation')
      }
    } catch (error) {
      console.error('Song generation error:', error)
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate song. Please try again.',
      )
    } finally {
      setIsGenerating(false)
      setGenerationStatus('')
    }
  }, [
    songMode,
    description,
    title,
    style,
    lyrics,
    instrumental,
    selectedModel,
    negativeTags,
    vocalGender,
    styleWeight,
    weirdnessConstraint,
    currentUser,
    isGenerating,
    navigation,
    loadMedia,
    isPublic,
    songRights,
  ])

  // Character count helpers - dynamic based on model
  const descriptionLimit = currentModelConfig.maxPrompt
  const styleLimit = currentModelConfig.maxStyle
  const lyricsLimit = currentModelConfig.maxPrompt

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Mode Toggle: Video / Song / Lyrics / Beats */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.modeToggle,
              createMode === CREATE_MODES.VIDEO && styles.modeToggleActive,
            ]}
            onPress={handleVideoMode}
          >
            <Text
              style={[
                styles.modeToggleText,
                createMode === CREATE_MODES.VIDEO && styles.modeToggleTextActive,
              ]}
            >
              Video
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeToggle,
              createMode === CREATE_MODES.SONG && styles.modeToggleActive,
            ]}
            onPress={() => setCreateMode(CREATE_MODES.SONG)}
          >
            <Text
              style={[
                styles.modeToggleText,
                createMode === CREATE_MODES.SONG && styles.modeToggleTextActive,
              ]}
            >
              Song
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeToggle,
              createMode === CREATE_MODES.LYRICS && styles.modeToggleActive,
            ]}
            onPress={() => navigation.navigate('CreateLyrics')}
          >
            <Text
              style={[
                styles.modeToggleText,
                createMode === CREATE_MODES.LYRICS && styles.modeToggleTextActive,
              ]}
            >
              Lyrics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeToggle,
              createMode === CREATE_MODES.BEATS && styles.modeToggleActive,
            ]}
            onPress={() => navigation.navigate('BuildBeats')}
          >
            <Text
              style={[
                styles.modeToggleText,
                createMode === CREATE_MODES.BEATS && styles.modeToggleTextActive,
              ]}
            >
              Beats
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Song Mode Content */}
          {createMode === CREATE_MODES.SONG && (
            <>
              {/* Simple / Custom Toggle */}
              <View style={styles.songModeToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.songModeToggle,
                    songMode === SONG_MODES.SIMPLE && styles.songModeToggleActive,
                  ]}
                  onPress={() => setSongMode(SONG_MODES.SIMPLE)}
                >
                  <Text
                    style={[
                      styles.songModeToggleText,
                      songMode === SONG_MODES.SIMPLE &&
                        styles.songModeToggleTextActive,
                    ]}
                  >
                    Simple
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.songModeToggle,
                    songMode === SONG_MODES.CUSTOM && styles.songModeToggleActive,
                  ]}
                  onPress={() => setSongMode(SONG_MODES.CUSTOM)}
                >
                  <Text
                    style={[
                      styles.songModeToggleText,
                      songMode === SONG_MODES.CUSTOM &&
                        styles.songModeToggleTextActive,
                    ]}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Simple Mode UI */}
              {songMode === SONG_MODES.SIMPLE && (
                <View style={styles.formSection}>
                  <Text style={styles.label}>Song Description</Text>
                  <Text style={styles.sublabel}>
                    Describe the song you want to create
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="e.g., An upbeat pop song about summer adventures with friends, featuring catchy hooks and energetic beats..."
                    placeholderTextColor="#666"
                    multiline
                    maxLength={descriptionLimit}
                    value={description}
                    onChangeText={setDescription}
                  />
                  <Text style={styles.charCount}>
                    {description.length}/{descriptionLimit}
                  </Text>
                </View>
              )}

              {/* Custom Mode UI */}
              {songMode === SONG_MODES.CUSTOM && (
                <>
                  {/* Title */}
                  <View style={styles.formSection}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter song title"
                      placeholderTextColor="#666"
                      value={title}
                      onChangeText={setTitle}
                      maxLength={100}
                    />
                  </View>

                  {/* Style of Music */}
                  <View style={styles.formSection}>
                    <Text style={styles.label}>Style of Music</Text>
                    <Text style={styles.sublabel}>
                      Describe the genre, mood, and instruments
                    </Text>
                    <TextInput
                      style={[styles.textArea, styles.mediumTextArea]}
                      placeholder="e.g., Upbeat pop with synthesizers, electronic drums, catchy melody, summer vibes..."
                      placeholderTextColor="#666"
                      multiline
                      maxLength={styleLimit}
                      value={style}
                      onChangeText={setStyle}
                    />
                    <Text style={styles.charCount}>
                      {style.length}/{styleLimit}
                    </Text>
                  </View>

                  {/* Lyrics */}
                  <View style={styles.formSection}>
                    <Text style={styles.label}>Lyrics (Optional)</Text>
                    <Text style={styles.sublabel}>
                      Enter your own lyrics or leave blank for AI generation
                    </Text>
                    <TextInput
                      style={[styles.textArea, styles.largeTextArea]}
                      placeholder="[Verse 1]&#10;Your lyrics here...&#10;&#10;[Chorus]&#10;Catchy chorus lyrics..."
                      placeholderTextColor="#666"
                      multiline
                      maxLength={lyricsLimit}
                      value={lyrics}
                      onChangeText={setLyrics}
                    />
                    <Text style={styles.charCount}>
                      {lyrics.length}/{lyricsLimit}
                    </Text>
                  </View>
                </>
              )}

              {/* Instrumental Toggle */}
              <View style={styles.instrumentalRow}>
                <View style={styles.instrumentalLabel}>
                  <Text style={styles.switchLabel}>Instrumental Only</Text>
                  <Text style={styles.switchSublabel}>
                    No vocals, just music
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    instrumental && styles.toggleButtonActive
                  ]}
                  onPress={() => setInstrumental(!instrumental)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleButtonText}>
                    {instrumental ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Model Version Selector */}
              <View style={styles.formSection}>
                <Text style={styles.label}>AI Model</Text>
                <Text style={styles.sublabel}>
                  Newer models produce higher quality (V5 = latest)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.modelSelector}
                  contentContainerStyle={styles.modelSelectorContent}
                >
                  {MODEL_OPTIONS.map((model) => (
                    <TouchableOpacity
                      key={model.key}
                      style={[
                        styles.modelOption,
                        selectedModel === model.key && styles.modelOptionActive,
                      ]}
                      onPress={() => setSelectedModel(model.key)}
                    >
                      <Text
                        style={[
                          styles.modelOptionText,
                          selectedModel === model.key && styles.modelOptionTextActive,
                        ]}
                      >
                        {model.label}
                      </Text>
                      {selectedModel === model.key && (
                        <Text style={styles.modelOptionInfo}>
                          {model.maxStyle === 1000 ? 'Up to 8 min' : 'Up to 4 min'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Advanced Options Toggle */}
              <TouchableOpacity
                style={styles.advancedToggle}
                onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <Text style={styles.advancedToggleText}>
                  {showAdvancedOptions ? '▼ Hide' : '▶ Show'} Advanced Options
                </Text>
              </TouchableOpacity>

              {/* Advanced Options Section */}
              {showAdvancedOptions && (
                <View style={styles.advancedSection}>
                  {/* Vocal Gender */}
                  {!instrumental && (
                    <View style={styles.formSection}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>Vocal Gender</Text>
                        <TouchableOpacity
                          onPress={() => Alert.alert(
                            '🎤 Vocal Gender',
                            'Choose the voice type for your song:\n\n' +
                            '• Any - Let the AI decide based on your style\n' +
                            '• Male - Deeper, masculine vocals\n' +
                            '• Female - Higher, feminine vocals\n\n' +
                            'Tip: The AI picks what fits best if you choose "Any"'
                          )}
                          style={styles.infoButton}
                        >
                          <Text style={styles.infoButtonText}>ⓘ</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.sublabel}>
                        Prefer male or female vocals
                      </Text>
                      <View style={styles.genderToggleContainer}>
                        <TouchableOpacity
                          style={[
                            styles.genderToggle,
                            vocalGender === null && styles.genderToggleActive,
                          ]}
                          onPress={() => setVocalGender(null)}
                        >
                          <Text
                            style={[
                              styles.genderToggleText,
                              vocalGender === null && styles.genderToggleTextActive,
                            ]}
                          >
                            Any
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderToggle,
                            vocalGender === 'm' && styles.genderToggleActive,
                          ]}
                          onPress={() => setVocalGender('m')}
                        >
                          <Text
                            style={[
                              styles.genderToggleText,
                              vocalGender === 'm' && styles.genderToggleTextActive,
                            ]}
                          >
                            Male
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderToggle,
                            vocalGender === 'f' && styles.genderToggleActive,
                          ]}
                          onPress={() => setVocalGender('f')}
                        >
                          <Text
                            style={[
                              styles.genderToggleText,
                              vocalGender === 'f' && styles.genderToggleTextActive,
                            ]}
                          >
                            Female
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Negative Tags */}
                  <View style={styles.formSection}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Exclude Styles</Text>
                      <TouchableOpacity
                        onPress={() => Alert.alert(
                          '🚫 Exclude Styles',
                          'Tell the AI what NOT to include in your song:\n\n' +
                          'Examples:\n' +
                          '• "Screaming, Growling" - no harsh vocals\n' +
                          '• "Autotune, Electronic" - keep it natural\n' +
                          '• "Heavy Metal, Dubstep" - avoid intense genres\n\n' +
                          'Separate multiple styles with commas. Leave empty if you\'re open to anything!'
                        )}
                        style={styles.infoButton}
                      >
                        <Text style={styles.infoButtonText}>ⓘ</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sublabel}>
                      Styles to avoid (e.g., "Heavy Metal, Screaming, Autotune")
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Heavy Metal, Screaming, Autotune"
                      placeholderTextColor="#666"
                      value={negativeTags}
                      onChangeText={setNegativeTags}
                      maxLength={200}
                    />
                  </View>

                  {/* Style Weight Slider */}
                  <View style={styles.formSection}>
                    <View style={styles.sliderHeader}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>Style Influence</Text>
                        <TouchableOpacity
                          onPress={() => Alert.alert(
                            '🎨 Style Influence',
                            'Controls how closely the AI follows your style description:\n\n' +
                            '• Low (0-30%) - Subtle hint, AI has creative freedom\n' +
                            '• Medium (40-60%) - Balanced mix of your style and AI creativity\n' +
                            '• High (70-100%) - Strictly follows your style tags\n\n' +
                            'Start at 50% and adjust based on results. Higher = more predictable but less surprising.'
                          )}
                          style={styles.infoButton}
                        >
                          <Text style={styles.infoButtonText}>ⓘ</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.sliderValue}>{Math.round(styleWeight * 100)}%</Text>
                    </View>
                    <Text style={styles.sublabel}>
                      How strongly the style guides the output
                    </Text>
                    <CustomSlider
                      minimumValue={0}
                      maximumValue={1}
                      step={0.05}
                      value={styleWeight}
                      onValueChange={setStyleWeight}
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabelText}>Subtle</Text>
                      <Text style={styles.sliderLabelText}>Strong</Text>
                    </View>
                  </View>

                  {/* Weirdness/Creativity Slider */}
                  <View style={styles.formSection}>
                    <View style={styles.sliderHeader}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>Creativity</Text>
                        <TouchableOpacity
                          onPress={() => Alert.alert(
                            '✨ Creativity',
                            'How "out there" should the AI get?\n\n' +
                            '• Low (0-30%) - Safe, familiar, radio-friendly\n' +
                            '• Medium (40-60%) - Balanced, some surprises\n' +
                            '• High (70-100%) - Experimental, unexpected twists\n\n' +
                            'Low = sounds like songs you know\n' +
                            'High = unique but might be weird\n\n' +
                            'Tip: Start at 50% for your first song!'
                          )}
                          style={styles.infoButton}
                        >
                          <Text style={styles.infoButtonText}>ⓘ</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.sliderValue}>{Math.round(weirdnessConstraint * 100)}%</Text>
                    </View>
                    <Text style={styles.sublabel}>
                      Higher = more experimental, lower = more cohesive
                    </Text>
                    <CustomSlider
                      minimumValue={0}
                      maximumValue={1}
                      step={0.05}
                      value={weirdnessConstraint}
                      onValueChange={setWeirdnessConstraint}
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabelText}>Cohesive</Text>
                      <Text style={styles.sliderLabelText}>Experimental</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Song Rights Toggle */}
              <TouchableOpacity
                style={styles.advancedToggle}
                onPress={() => setShowSongRights(!showSongRights)}
              >
                <Text style={[styles.advancedToggleText, { color: '#22c55e' }]}>
                  {showSongRights ? '▼ Hide' : '▶ Show'} Song Rights
                </Text>
              </TouchableOpacity>

              {/* Song Rights Section */}
              {showSongRights && (
                <View style={styles.advancedSection}>
                  {/* Visibility Toggle */}
                  <View style={styles.rightsRow}>
                    <View style={styles.rightsLabel}>
                      <Text style={styles.label}>Visibility</Text>
                      <Text style={styles.sublabel}>
                        {isPublic ? 'Anyone can see this song' : 'Only you can see this song'}
                      </Text>
                    </View>
                    <View style={styles.rightsToggleContainer}>
                      <TouchableOpacity
                        style={[
                          styles.rightsToggle,
                          isPublic && styles.rightsToggleActive,
                        ]}
                        onPress={() => setIsPublic(true)}
                      >
                        <Text style={[
                          styles.rightsToggleText,
                          isPublic && styles.rightsToggleTextActive,
                        ]}>Public</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.rightsToggle,
                          !isPublic && styles.rightsToggleActive,
                        ]}
                        onPress={() => setIsPublic(false)}
                      >
                        <Text style={[
                          styles.rightsToggleText,
                          !isPublic && styles.rightsToggleTextActive,
                        ]}>Private</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Derivative Works Section */}
                  <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Derivative Works</Text>
                  <Text style={[styles.sublabel, { marginBottom: 12 }]}>
                    What can others do with your song?
                  </Text>

                  {/* Allow Extend */}
                  <View style={styles.rightsOptionRow}>
                    <View style={styles.rightsOptionLabel}>
                      <Text style={styles.rightsOptionTitle}>Allow Extensions</Text>
                      <Text style={styles.rightsOptionDesc}>Others can extend/continue this song</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        songRights.allowExtend && styles.toggleButtonActive,
                      ]}
                      onPress={() => setSongRights(prev => ({ ...prev, allowExtend: !prev.allowExtend }))}
                    >
                      <Text style={styles.toggleButtonText}>
                        {songRights.allowExtend ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Allow Lyrics Use */}
                  <View style={styles.rightsOptionRow}>
                    <View style={styles.rightsOptionLabel}>
                      <Text style={styles.rightsOptionTitle}>Allow Lyrics Use</Text>
                      <Text style={styles.rightsOptionDesc}>Others can use your lyrics</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        songRights.allowLyricsUse && styles.toggleButtonActive,
                      ]}
                      onPress={() => setSongRights(prev => ({ ...prev, allowLyricsUse: !prev.allowLyricsUse }))}
                    >
                      <Text style={styles.toggleButtonText}>
                        {songRights.allowLyricsUse ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Allow Video Creation */}
                  <View style={styles.rightsOptionRow}>
                    <View style={styles.rightsOptionLabel}>
                      <Text style={styles.rightsOptionTitle}>Allow Video Creation</Text>
                      <Text style={styles.rightsOptionDesc}>Others can pair this with their videos</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        songRights.allowVideoCreation && styles.toggleButtonActive,
                      ]}
                      onPress={() => setSongRights(prev => ({ ...prev, allowVideoCreation: !prev.allowVideoCreation }))}
                    >
                      <Text style={styles.toggleButtonText}>
                        {songRights.allowVideoCreation ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Attribution Section */}
                  <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Attribution</Text>

                  {/* Require Attribution */}
                  <View style={styles.rightsOptionRow}>
                    <View style={styles.rightsOptionLabel}>
                      <Text style={styles.rightsOptionTitle}>Require Attribution</Text>
                      <Text style={styles.rightsOptionDesc}>Derivatives must credit you</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        songRights.requireAttribution && styles.toggleButtonActive,
                      ]}
                      onPress={() => setSongRights(prev => ({ ...prev, requireAttribution: !prev.requireAttribution }))}
                    >
                      <Text style={styles.toggleButtonText}>
                        {songRights.requireAttribution ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Coming Soon Features */}
                  <View style={styles.comingSoonSection}>
                    <Text style={styles.comingSoonTitle}>Coming Soon</Text>
                    <Text style={styles.comingSoonText}>
                      Monetization, Stem Extraction, WAV Export, Reinterpretation, Sampling, Commercial Licensing
                    </Text>
                  </View>
                </View>
              )}

              {/* Generate Button */}
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  isGenerating && styles.generateButtonDisabled,
                ]}
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View style={styles.generatingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generateButtonText}>
                      {generationStatus || 'Generating...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.generateButtonText}>Generate Song</Text>
                )}
              </TouchableOpacity>

              {/* Generation Progress Info */}
              {isGenerating && (
                <View style={styles.progressInfo}>
                  {/* Rotating tip with animation */}
                  <Animated.View style={[styles.tipContainer, { opacity: tipFadeAnim }]}>
                    <Text style={styles.tipIcon}>{GENERATION_TIPS[currentTipIndex].icon}</Text>
                    <Text style={styles.tipText}>{GENERATION_TIPS[currentTipIndex].message}</Text>
                  </Animated.View>

                  {/* Time estimate */}
                  <View style={styles.timeEstimate}>
                    <Text style={styles.timerText}>
                      {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')} elapsed
                    </Text>
                    <Text style={styles.estimateText}>
                      ~{Math.max(0, Math.ceil((ESTIMATED_TIME_SECONDS - elapsedTime) / 60))} min remaining
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(100, (elapsedTime / ESTIMATED_TIME_SECONDS) * 100)}%` },
                      ]}
                    />
                  </View>

                  <Text style={styles.safeToNavigate}>
                    You can navigate away - your song will continue generating
                  </Text>
                </View>
              )}

              {/* Powered by badge */}
              <Text style={styles.poweredBy}>Powered by LetsMake.Music</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  closeButton: {
    width: 60,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeToggleActive: {
    backgroundColor: '#2126A2',
  },
  modeToggleText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120, // Extra padding for mini player when song is playing
  },
  songModeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 3,
  },
  songModeToggle: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  songModeToggleActive: {
    backgroundColor: '#333',
  },
  songModeToggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  songModeToggleTextActive: {
    color: '#fff',
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sublabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  mediumTextArea: {
    minHeight: 100,
  },
  largeTextArea: {
    minHeight: 180,
  },
  charCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  instrumentalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  instrumentalLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  switchSublabel: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#555',
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#2126A2',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: '#2126A2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonDisabled: {
    backgroundColor: '#1a1a5a',
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  poweredBy: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  tipContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  tipIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  tipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  timeEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  timerText: {
    color: '#2126A2',
    fontSize: 14,
    fontWeight: '600',
  },
  estimateText: {
    color: '#888',
    fontSize: 14,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2126A2',
    borderRadius: 3,
  },
  safeToNavigate: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modelSelector: {
    marginTop: 8,
  },
  modelSelectorContent: {
    paddingRight: 16,
    gap: 8,
  },
  modelOption: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 80,
    alignItems: 'center',
  },
  modelOptionActive: {
    backgroundColor: '#2126A2',
    borderColor: '#2126A2',
  },
  modelOptionText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  modelOptionTextActive: {
    color: '#fff',
  },
  modelOptionInfo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  // Advanced Options styles
  advancedToggle: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  advancedToggleText: {
    color: '#8B8BF5',
    fontSize: 14,
    fontWeight: '600',
  },
  advancedSection: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  genderToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 3,
  },
  genderToggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  genderToggleActive: {
    backgroundColor: '#2126A2',
  },
  genderToggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  genderToggleTextActive: {
    color: '#fff',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  infoButtonText: {
    color: '#6366F1',
    fontSize: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    color: '#666',
    fontSize: 12,
  },
  // Song Rights styles
  rightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rightsLabel: {
    flex: 1,
    marginRight: 16,
  },
  rightsToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 3,
  },
  rightsToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  rightsToggleActive: {
    backgroundColor: '#22c55e',
  },
  rightsToggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  rightsToggleTextActive: {
    color: '#fff',
  },
  rightsOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  rightsOptionLabel: {
    flex: 1,
    marginRight: 12,
  },
  rightsOptionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  rightsOptionDesc: {
    color: '#888',
    fontSize: 12,
  },
  comingSoonSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  comingSoonTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  comingSoonText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})
