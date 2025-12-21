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

      // Step 1: Submit generation request
      if (songMode === SONG_MODES.SIMPLE) {
        result = await generateSongSimple(description, instrumental, selectedModel)
      } else {
        result = await generateSongCustom({
          title,
          style,
          lyrics: lyrics || '',
          instrumental,
          model: selectedModel,
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

              // Upload audio to Firebase Storage as permanent backup (non-blocking)
              // This runs in background - we don't wait for it to complete
              let firebaseAudioUrl = null
              const audioSourceUrl = song.audio_url || song.stream_url
              if (audioSourceUrl && song.id) {
                setGenerationStatus(`Backing up audio ${i + 1} to Firebase...`)
                try {
                  firebaseAudioUrl = await uploadAudioToFirebase(audioSourceUrl, song.id)
                  console.log(`Audio ${i + 1} backed up to Firebase:`, firebaseAudioUrl)
                } catch (uploadError) {
                  console.warn(`Could not backup audio ${i + 1} to Firebase:`, uploadError)
                  // Continue anyway - Suno CDN is primary, Firebase is backup
                }
              }

              // Save ALL song metadata to Firebase
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
                audioUrl: song.audio_url,
                streamUrl: song.stream_url,
                firebaseAudioUrl: firebaseAudioUrl, // Our backup copy
                imageUrl: song.image_url,
                videoUrl: song.video_url || null, // Some songs have video
                title: songTitle,
                style: song.style || style || '',
                rawLyrics: timestampedLyrics?.rawLyrics || song.lyric || '',
                timestampedLyrics: timestampedLyrics?.lyrics || [],
                duration: song.duration || 0,
                model: selectedModel,
                instrumental: instrumental,
                prompt: songMode === SONG_MODES.SIMPLE ? description : lyrics,
                // Additional Suno metadata
                sunoModelName: song.model_name || selectedModel,
                sunoStatus: song.status || 'complete',
                sunoCreatedAt: song.created_at || null,
              })
              savedSongs.push({ ...savedSong, timestampedLyrics })
              console.log(`Song ${i + 1} saved to Firebase:`, savedSong.id)
            } catch (saveError) {
              console.warn(`Could not save song ${i + 1} to Firebase:`, saveError)
            }
          }
        }

        // Play the first song immediately using MediaPlayer
        const firstSong = allSongs[0]
        const firstSavedSong = savedSongs[0]
        const firstSongTitle = firstSong.title || title || 'AI Song'

        loadMedia({
          id: firstSong.id,
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
    currentUser,
    isGenerating,
    navigation,
    loadMedia,
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

        {/* Mode Toggle: Video / Song */}
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
    paddingBottom: 40,
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
})
