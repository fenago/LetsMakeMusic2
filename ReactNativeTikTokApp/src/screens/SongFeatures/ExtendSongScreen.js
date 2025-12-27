import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { ChevronLeft, Music, Play, Clock, ChevronDown, Check, Info } from 'lucide-react-native'

// Custom slider component (same as CreateScreen)
const CustomSlider = ({ value, onValueChange, minimumValue = 0, maximumValue = 1, step = 0.05, isDark }) => {
  const trackRef = React.useRef(null)

  const handlePress = (event) => {
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
      style={{ height: 44, justifyContent: 'center', paddingVertical: 10 }}
    >
      <View style={{
        height: 8,
        backgroundColor: isDark ? '#3a3a4a' : '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <View style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: '#3875e8',
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
import { useGenerationTask } from '../../contexts/GenerationTaskContext'
import { extendSong, MODEL_VERSIONS, DEFAULT_MODEL } from '../../services/sunoApi'

// Rotating tips to show during generation
const GENERATION_TIPS = [
  'AI is extending your track...',
  'Creating seamless transitions...',
  'Matching the original style...',
  'Adding new musical ideas...',
  'Blending melodies together...',
  'Merging audio tracks...',
  'Your extended song is coming...',
]

export default function ExtendSongScreen({ navigation, route }) {
  const song = route.params?.song
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()
  const { startExtendTask } = useGenerationTask()

  // Form state - default to custom mode to encourage new lyrics
  const [useOriginalParams, setUseOriginalParams] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customStyle, setCustomStyle] = useState('')
  const [customLyrics, setCustomLyrics] = useState('')
  const [selectedModel, setSelectedModel] = useState(song?.model || DEFAULT_MODEL)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [continueAtEnabled, setContinueAtEnabled] = useState(false)
  const [continueAtTime, setContinueAtTime] = useState(0)
  const [mergeWithOriginal, setMergeWithOriginal] = useState(true)

  // Advanced options (collapsed by default)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [audioWeight, setAudioWeight] = useState(0.7) // How much original audio influences extension
  const [styleWeight, setStyleWeight] = useState(0.6) // Style tag influence
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.3) // Creativity level

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentTip, setCurrentTip] = useState(0)

  const elapsedTimerRef = useRef(null)
  const tipTimerRef = useRef(null)

  // Get song duration for the slider
  const songDuration = song?.duration || 120

  // Validate that we have the required sunoId
  const canExtend = song?.sunoId

  // DEBUG: Log FULL song object when screen loads
  useEffect(() => {
    console.log('[ExtendSong] ========== SCREEN LOADED ==========')
    console.log('[ExtendSong] FULL song object from route.params:', JSON.stringify(song, null, 2))
    console.log('[ExtendSong] Key fields:', {
      id: song?.id,
      sunoId: song?.sunoId,
      sunoIdType: typeof song?.sunoId,
      sunoIdLength: song?.sunoId?.length,
      title: song?.title,
      model: song?.model,
      duration: song?.duration,
      audioUrl: song?.audioUrl?.substring(0, 60),
      firebaseAudioUrl: song?.firebaseAudioUrl?.substring(0, 60),
    })
    console.log('[ExtendSong] canExtend:', !!song?.sunoId)
    console.log('[ExtendSong] ===========================================')
  }, [song])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      if (tipTimerRef.current) clearInterval(tipTimerRef.current)
    }
  }, [])

  // Pre-fill custom fields - use template to encourage NEW lyrics
  useEffect(() => {
    if (song) {
      setCustomTitle(song.title ? `${song.title} (Extended)` : '')
      setCustomStyle(song.style || '')
      // Don't pre-fill lyrics - encourage users to write NEW content
      // Show guidance instead
      setCustomLyrics('')
    }
  }, [song])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startTimers = useCallback(() => {
    // Start elapsed time counter
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    // Rotate tips every 5 seconds
    tipTimerRef.current = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % GENERATION_TIPS.length)
    }, 5000)
  }, [])

  const stopTimers = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    if (tipTimerRef.current) {
      clearInterval(tipTimerRef.current)
      tipTimerRef.current = null
    }
  }, [])

  const handleExtend = useCallback(async () => {
    if (!canExtend) {
      Alert.alert('Error', 'This song cannot be extended. It may not have a valid Suno ID.')
      return
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to extend songs.')
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setElapsedTime(0)
    setCurrentTip(0)
    startTimers()

    try {
      console.log('[ExtendSong] ========== EXTEND BUTTON PRESSED ==========')

      // Step 1: Validate song has sunoId
      if (!song.sunoId) {
        console.error('[ExtendSong] ERROR: song.sunoId is missing!')
        throw new Error('This song cannot be extended. It was not created with Suno AI or is missing its Suno ID.')
      }

      // Log relevant song data
      console.log('[ExtendSong] Song to extend:', JSON.stringify({
        id: song.id,
        sunoId: song.sunoId,
        title: song.title,
        model: song.model,
        duration: song.duration,
      }, null, 2))

      console.log('[ExtendSong] Extension settings:', JSON.stringify({
        selectedModel,
        useOriginalParams,
        continueAtEnabled,
        continueAtTime,
        mergeWithOriginal,
      }, null, 2))

      // Build extend params
      const extendParams = {
        audioId: song.sunoId,
        model: selectedModel,
        defaultParamFlag: useOriginalParams,
        // Advanced options for extension quality
        audioWeight,
        styleWeight,
        weirdnessConstraint,
      }

      if (!useOriginalParams) {
        extendParams.prompt = customLyrics
        extendParams.style = customStyle
        extendParams.title = customTitle
      }

      if (continueAtEnabled && continueAtTime > 0) {
        extendParams.continueAt = continueAtTime
      }

      console.log('[ExtendSong] Calling extendSong API...')
      const result = await extendSong(extendParams)

      if (!result.taskId) {
        throw new Error('No task ID returned from extend API')
      }

      console.log('[ExtendSong] Extension task started:', result.taskId)
      setProgress(0.1)

      // Hand off to background task context - this will continue even if user navigates away
      const extensionSettings = {
        model: selectedModel,
        title: useOriginalParams ? `${song.title || 'Song'} (Extended)` : customTitle || `${song.title || 'Song'} (Extended)`,
        style: customStyle,
        prompt: customLyrics,
        instrumental: song.instrumental || false,
        mergeWithOriginal,
        continueAt: continueAtEnabled ? continueAtTime : 0,
        // Advanced options used (for reference)
        advancedOptions: {
          audioWeight,
          styleWeight,
          weirdnessConstraint,
        },
      }

      // Start background task (this runs even after navigation)
      startExtendTask({
        taskId: result.taskId,
        originalSong: song,
        currentUser,
        extensionSettings,
        onProgress: ({ progress: taskProgress }) => {
          // Update local progress if still on screen
          setProgress(0.1 + (taskProgress || 0) * 0.9)
        },
      })

      stopTimers()
      setIsGenerating(false)

      // Show confirmation and let user navigate
      Alert.alert(
        'Extension Started! 🎵',
        'Your song is being extended in the background. You\'ll be notified when it\'s ready. Feel free to browse the app!',
        [
          {
            text: 'Go to Library',
            onPress: () => navigation.navigate('Library'),
          },
          {
            text: 'Stay Here',
            style: 'cancel',
          },
        ]
      )

    } catch (error) {
      console.error('[ExtendSong] Error:', error)
      stopTimers()
      setIsGenerating(false)
      Alert.alert('Extension Failed', error.message || 'An error occurred while extending your song. Please try again.')
    }
  }, [
    song,
    canExtend,
    currentUser,
    selectedModel,
    useOriginalParams,
    customTitle,
    customStyle,
    customLyrics,
    continueAtEnabled,
    continueAtTime,
    mergeWithOriginal,
    audioWeight,
    styleWeight,
    weirdnessConstraint,
    startTimers,
    stopTimers,
    startExtendTask,
    navigation,
  ])

  const modelOptions = Object.values(MODEL_VERSIONS)

  if (!song) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Extend Song</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No song data available.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Extend Song</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Original Song Info */}
        <View style={styles.songCard}>
          {song.imageUrl ? (
            <Image source={{ uri: song.imageUrl }} style={styles.songImage} />
          ) : (
            <View style={[styles.songImage, styles.songImagePlaceholder]}>
              <Music size={32} color={isDark ? '#666' : '#999'} />
            </View>
          )}
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={1}>{song.title || 'Untitled'}</Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.author?.stageName || song.artist || 'Unknown Artist'}
            </Text>
            {song.duration > 0 && (
              <View style={styles.durationRow}>
                <Clock size={14} color={isDark ? '#888' : '#666'} />
                <Text style={styles.durationText}>{formatTime(song.duration)}</Text>
              </View>
            )}
          </View>
        </View>

        {!canExtend && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              This song cannot be extended because it doesn't have a valid Suno ID.
              Only songs generated through LetsMakeMusic can be extended.
            </Text>
          </View>
        )}

        {/* Extension Options */}
        {canExtend && !isGenerating && (
          <>
            {/* Use Original Parameters Toggle */}
            <TouchableOpacity
              style={styles.optionSection}
              activeOpacity={0.7}
              onPress={() => setUseOriginalParams(!useOriginalParams)}
            >
              <View style={styles.optionRow}>
                <Text style={styles.optionTitle}>Use Original Song Settings</Text>
                <View style={[styles.toggleButton, useOriginalParams && styles.toggleButtonActive]}>
                  <Text style={[styles.toggleButtonText, useOriginalParams && styles.toggleButtonTextActive]}>
                    {useOriginalParams ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>
              <Text style={styles.optionDescription}>
                {useOriginalParams
                  ? 'AI will continue with similar lyrics and style. Good for more of the same vibe.'
                  : 'Write NEW lyrics for the extension! This creates fresh content that flows into your song.'}
              </Text>
              {useOriginalParams && (
                <Text style={styles.optionHint}>
                  💡 Tip: Turn this OFF and add new lyrics for more variety in your extension!
                </Text>
              )}
            </TouchableOpacity>

            {/* Custom Parameters (shown when not using original) */}
            {!useOriginalParams && (
              <View style={styles.customSection}>
                <View style={styles.customHeader}>
                  <Text style={styles.customHeaderTitle}>Create Fresh Extension Content</Text>
                  <Text style={styles.customHeaderSubtitle}>
                    Write NEW lyrics that will continue your song. The AI will blend these seamlessly with your original track.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>New Title</Text>
                <TextInput
                  style={styles.input}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Extended song title..."
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  maxLength={80}
                />

                <Text style={styles.inputLabel}>Style/Tags</Text>
                <TextInput
                  style={styles.input}
                  value={customStyle}
                  onChangeText={setCustomStyle}
                  placeholder="e.g., pop, upbeat, energetic..."
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  maxLength={MODEL_VERSIONS[selectedModel]?.maxStyle || 200}
                />

                <Text style={styles.inputLabel}>New Lyrics for Extension *</Text>
                <Text style={styles.inputHint}>
                  Write the lyrics that should come AFTER the original song ends. This is where you add new verses, a bridge, final chorus, or outro.
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={customLyrics}
                  onChangeText={setCustomLyrics}
                  placeholder={`Example:\n\n[Bridge]\nWe've come so far together...\n\n[Final Chorus]\nNow the story continues on...\n\n[Outro]\nFade into the night...`}
                  placeholderTextColor={isDark ? '#555' : '#aaa'}
                  multiline
                  numberOfLines={6}
                  maxLength={MODEL_VERSIONS[selectedModel]?.maxPrompt || 3000}
                />
              </View>
            )}

            {/* Continue At Time */}
            <View style={styles.optionSection}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setContinueAtEnabled(!continueAtEnabled)}
              >
                <View style={styles.optionRow}>
                  <Text style={styles.optionTitle}>Continue from Specific Time</Text>
                  <View style={[styles.toggleButton, continueAtEnabled && styles.toggleButtonActive]}>
                    <Text style={[styles.toggleButtonText, continueAtEnabled && styles.toggleButtonTextActive]}>
                      {continueAtEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.optionDescription}>
                {continueAtEnabled
                  ? `Extension will start from ${formatTime(continueAtTime)} in the original song.`
                  : 'Extension will continue naturally from the end of the song.'}
              </Text>

              {continueAtEnabled && (
                <View style={styles.timePickerContainer}>
                  {/* Simple Stepper Control */}
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setContinueAtTime(Math.max(0, continueAtTime - 10))}
                    >
                      <Text style={styles.stepperButtonText}>-10s</Text>
                    </TouchableOpacity>

                    <View style={styles.timeDisplay}>
                      <Text style={styles.timeDisplayValue}>{formatTime(continueAtTime)}</Text>
                      <Text style={styles.timeDisplayLabel}>of {formatTime(songDuration)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setContinueAtTime(Math.min(songDuration - 10, continueAtTime + 10))}
                    >
                      <Text style={styles.stepperButtonText}>+10s</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quick Presets */}
                  <View style={styles.timePresets}>
                    {[0, 30, 60, 90].filter(t => t <= songDuration - 10).map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.presetChip,
                          continueAtTime === time && styles.presetChipActive
                        ]}
                        onPress={() => setContinueAtTime(time)}
                      >
                        <Text style={[
                          styles.presetChipText,
                          continueAtTime === time && styles.presetChipTextActive
                        ]}>
                          {formatTime(time)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Merge with Original Toggle */}
            <TouchableOpacity
              style={styles.optionSection}
              activeOpacity={0.7}
              onPress={() => setMergeWithOriginal(!mergeWithOriginal)}
            >
              <View style={styles.optionRow}>
                <Text style={styles.optionTitle}>Merge with Original</Text>
                <View style={[styles.toggleButton, mergeWithOriginal && styles.toggleButtonActive]}>
                  <Text style={[styles.toggleButtonText, mergeWithOriginal && styles.toggleButtonTextActive]}>
                    {mergeWithOriginal ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>
              <Text style={styles.optionDescription}>
                {mergeWithOriginal
                  ? 'Creates one seamless track combining original + extension.'
                  : 'Saves extension as a separate track (continuation only).'}
              </Text>
            </TouchableOpacity>

            {/* Model Selection */}
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>AI Model</Text>
              <TouchableOpacity
                style={styles.modelSelector}
                onPress={() => setShowModelPicker(!showModelPicker)}
              >
                <Text style={styles.modelSelectorText}>
                  {MODEL_VERSIONS[selectedModel]?.label || selectedModel}
                </Text>
                <ChevronDown size={20} color={isDark ? '#888' : '#666'} />
              </TouchableOpacity>

              {showModelPicker && (
                <View style={styles.modelPicker}>
                  {modelOptions.map((model) => (
                    <TouchableOpacity
                      key={model.value}
                      style={[
                        styles.modelOption,
                        selectedModel === model.value && styles.modelOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedModel(model.value)
                        setShowModelPicker(false)
                      }}
                    >
                      <Text style={[
                        styles.modelOptionText,
                        selectedModel === model.value && styles.modelOptionTextSelected,
                      ]}>
                        {model.label}
                      </Text>
                      {selectedModel === model.value && (
                        <Check size={18} color="#3875e8" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
                {/* Audio Weight Slider */}
                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeader}>
                    <View style={styles.labelRow}>
                      <Text style={styles.sliderLabel}>Original Audio Influence</Text>
                      <TouchableOpacity
                        onPress={() => Alert.alert(
                          '🎵 Original Audio Influence',
                          'Controls how much your original song influences the extension:\n\n' +
                          '• High (70-100%) - Extension sounds very similar to original\n' +
                          '• Medium (40-60%) - Balanced blend of old and new\n' +
                          '• Low (0-30%) - More creative freedom, may sound different\n\n' +
                          'Tip: Keep at 70% for seamless extensions, lower for more variety.'
                        )}
                        style={styles.infoButton}
                      >
                        <Text style={styles.infoButtonText}>ⓘ</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sliderValue}>{Math.round(audioWeight * 100)}%</Text>
                  </View>
                  <CustomSlider
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={audioWeight}
                    onValueChange={setAudioWeight}
                    isDark={isDark}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Creative</Text>
                    <Text style={styles.sliderLabelText}>Faithful</Text>
                  </View>
                </View>

                {/* Style Weight Slider */}
                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeader}>
                    <View style={styles.labelRow}>
                      <Text style={styles.sliderLabel}>Style Influence</Text>
                      <TouchableOpacity
                        onPress={() => Alert.alert(
                          '🎨 Style Influence',
                          'How strongly should style tags guide the extension:\n\n' +
                          '• High (70-100%) - Strictly follows your style tags\n' +
                          '• Medium (40-60%) - Balanced mix\n' +
                          '• Low (0-30%) - Subtle hint, more AI creativity\n\n' +
                          'Higher values = more predictable but less surprising.'
                        )}
                        style={styles.infoButton}
                      >
                        <Text style={styles.infoButtonText}>ⓘ</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sliderValue}>{Math.round(styleWeight * 100)}%</Text>
                  </View>
                  <CustomSlider
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={styleWeight}
                    onValueChange={setStyleWeight}
                    isDark={isDark}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Subtle</Text>
                    <Text style={styles.sliderLabelText}>Strong</Text>
                  </View>
                </View>

                {/* Creativity Slider */}
                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeader}>
                    <View style={styles.labelRow}>
                      <Text style={styles.sliderLabel}>Creativity</Text>
                      <TouchableOpacity
                        onPress={() => Alert.alert(
                          '✨ Creativity',
                          'How experimental should the extension be:\n\n' +
                          '• Low (0-30%) - Safe, cohesive, blends seamlessly\n' +
                          '• Medium (40-60%) - Some surprises, still musical\n' +
                          '• High (70-100%) - Wild, unexpected twists\n\n' +
                          'Tip: Keep low (30%) for smooth extensions that match your original!'
                        )}
                        style={styles.infoButton}
                      >
                        <Text style={styles.infoButtonText}>ⓘ</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sliderValue}>{Math.round(weirdnessConstraint * 100)}%</Text>
                  </View>
                  <CustomSlider
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={weirdnessConstraint}
                    onValueChange={setWeirdnessConstraint}
                    isDark={isDark}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>Cohesive</Text>
                    <Text style={styles.sliderLabelText}>Experimental</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Extend Button */}
            <TouchableOpacity
              style={[styles.extendButton, !canExtend && styles.extendButtonDisabled]}
              onPress={handleExtend}
              disabled={!canExtend}
            >
              <Play size={20} color="#fff" fill="#fff" />
              <Text style={styles.extendButtonText}>Extend Song</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Generation Progress */}
        {isGenerating && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#3875e8" />
            <Text style={styles.progressTitle}>Creating Extended Song</Text>
            <Text style={styles.progressTip}>{GENERATION_TIPS[currentTip]}</Text>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.progressStats}>
              <Text style={styles.progressStat}>{Math.round(progress * 100)}%</Text>
              <Text style={styles.progressStat}>{formatTime(elapsedTime)}</Text>
            </View>

            <Text style={styles.progressNote}>
              This typically takes 2-3 minutes. Feel free to browse the app - we'll notify you when it's ready!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#222222' : '#e5e7eb',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // Extra padding for miniplayer
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: isDark ? '#888' : '#666',
    textAlign: 'center',
  },
  songCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  songImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  songImagePlaceholder: {
    backgroundColor: isDark ? '#333' : '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: isDark ? '#888' : '#666',
    marginBottom: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 13,
    color: isDark ? '#888' : '#666',
  },
  warningBox: {
    backgroundColor: isDark ? '#3d2b00' : '#fff7e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDark ? '#5c4300' : '#ffd666',
  },
  warningText: {
    fontSize: 14,
    color: isDark ? '#ffd666' : '#946200',
    lineHeight: 20,
  },
  optionSection: {
    marginBottom: 20,
    backgroundColor: isDark ? '#1c1c1e' : '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    flex: 1,
    marginRight: 12,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isDark ? '#333' : '#e0e0e0',
    minWidth: 50,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3875e8',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#888' : '#666',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  optionDescription: {
    fontSize: 14,
    color: isDark ? '#888' : '#666',
    lineHeight: 20,
  },
  customSection: {
    marginBottom: 20,
  },
  customHeader: {
    backgroundColor: isDark ? '#1a2a1a' : '#e8f5e9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  customHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#81c784' : '#2e7d32',
    marginBottom: 6,
  },
  customHeaderSubtitle: {
    fontSize: 14,
    color: isDark ? '#a5d6a7' : '#388e3c',
    lineHeight: 20,
  },
  inputHint: {
    fontSize: 13,
    color: isDark ? '#888' : '#666',
    marginBottom: 8,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  optionHint: {
    fontSize: 13,
    color: isDark ? '#ffd54f' : '#f57c00',
    marginTop: 10,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: isDark ? '#ffffff' : '#151723',
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#e5e7eb',
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  timePickerContainer: {
    marginTop: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 60,
    height: 44,
    borderRadius: 8,
    backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#444' : '#ddd',
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3875e8',
  },
  timeDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  timeDisplayValue: {
    fontSize: 28,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
  },
  timeDisplayLabel: {
    fontSize: 12,
    color: isDark ? '#666' : '#999',
    marginTop: 2,
  },
  timePresets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0',
    borderWidth: 1,
    borderColor: isDark ? '#444' : '#ddd',
  },
  presetChipActive: {
    backgroundColor: '#3875e8',
    borderColor: '#3875e8',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#888' : '#666',
  },
  presetChipTextActive: {
    color: '#ffffff',
  },
  modelSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: isDark ? '#444' : '#e5e7eb',
  },
  modelSelectorText: {
    fontSize: 16,
    color: isDark ? '#ffffff' : '#151723',
  },
  modelPicker: {
    marginTop: 8,
    backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#444' : '#e5e7eb',
    overflow: 'hidden',
  },
  modelOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#444' : '#e5e7eb',
  },
  modelOptionSelected: {
    backgroundColor: isDark ? '#3875e820' : '#3875e810',
  },
  modelOptionText: {
    fontSize: 16,
    color: isDark ? '#ffffff' : '#151723',
  },
  modelOptionTextSelected: {
    color: '#3875e8',
    fontWeight: '600',
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3875e8',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    gap: 8,
  },
  extendButtonDisabled: {
    backgroundColor: isDark ? '#333' : '#ccc',
    opacity: 0.6,
  },
  extendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    marginTop: 20,
    marginBottom: 8,
  },
  progressTip: {
    fontSize: 16,
    color: isDark ? '#888' : '#666',
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: isDark ? '#333' : '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3875e8',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  progressStat: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#888' : '#666',
  },
  progressNote: {
    fontSize: 13,
    color: isDark ? '#666' : '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  // Advanced Options styles
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333' : '#e5e7eb',
    marginTop: 8,
  },
  advancedToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
  },
  advancedSection: {
    marginTop: 8,
    paddingTop: 8,
  },
  sliderSection: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#151723',
  },
  infoButton: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: isDark ? '#444' : '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#aaa' : '#666',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3875e8',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: isDark ? '#666' : '#999',
  },
})
