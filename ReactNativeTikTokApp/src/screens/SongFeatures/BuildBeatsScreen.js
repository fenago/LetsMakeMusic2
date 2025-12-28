import React, { useState, useCallback } from 'react'
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
} from 'react-native'
import { Image } from 'expo-image'
import { ChevronLeft, AudioWaveform, Wand2, Play, Pause, Music2, CheckCircle } from 'lucide-react-native'
import { Audio } from 'expo-av'

import { useCurrentUser } from '../../core/onboarding'
import { useBeats } from '../../hooks/useBeats'

// Model version options
const MODEL_OPTIONS = [
  { id: 'V5', label: 'V5 (Latest)', description: 'Best quality, newest features' },
  { id: 'V4_5PLUS', label: 'V4.5+', description: 'Great balance of speed and quality' },
  { id: 'V4', label: 'V4', description: 'Fast generation' },
]

export default function BuildBeatsScreen({ navigation, route }) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  const {
    generateBeat,
    operationLoading,
    generationProgress,
    beatsError,
    clearError,
    modelVersions,
  } = useBeats(userId)

  // Form state
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('V5')
  const [generatedBeats, setGeneratedBeats] = useState(null) // Array of 2 variations
  const [selectedVariation, setSelectedVariation] = useState(0)
  const [playingSound, setPlayingSound] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      Alert.alert('Prompt Required', 'Please describe the beat you want to create.')
      return
    }

    if (wordCount > 200) {
      Alert.alert('Prompt Too Long', 'Please keep your prompt under 200 words.')
      return
    }

    // Stop any playing audio
    if (playingSound) {
      await playingSound.stopAsync()
      await playingSound.unloadAsync()
      setPlayingSound(null)
      setIsPlaying(false)
    }

    clearError()
    setGeneratedBeats(null)

    const result = await generateBeat(prompt, selectedModel)

    if (result.success) {
      setGeneratedBeats(result.beats)
      setSelectedVariation(0)
    } else {
      Alert.alert('Generation Failed', result.error || 'Failed to generate beat. Please try again.')
    }
  }, [prompt, wordCount, selectedModel, generateBeat, clearError, playingSound])

  const handlePlayPause = useCallback(async (beat) => {
    const audioUrl = beat.audio_url || beat.audioUrl

    if (!audioUrl) {
      Alert.alert('Audio Unavailable', 'This beat does not have audio available.')
      return
    }

    // If already playing this sound, pause it
    if (playingSound && isPlaying) {
      await playingSound.pauseAsync()
      setIsPlaying(false)
      return
    }

    // If we have a paused sound for this beat, resume it
    if (playingSound && !isPlaying) {
      await playingSound.playAsync()
      setIsPlaying(true)
      return
    }

    // Load and play new sound
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setIsPlaying(false)
            setPlayingSound(null)
          }
        }
      )
      setPlayingSound(sound)
      setIsPlaying(true)
    } catch (error) {
      console.error('[BuildBeatsScreen] Error loading sound:', error)
      Alert.alert('Playback Error', 'Could not load the audio file.')
    }
  }, [playingSound, isPlaying])

  // Cleanup sound on unmount
  React.useEffect(() => {
    return () => {
      if (playingSound) {
        playingSound.stopAsync().then(() => playingSound.unloadAsync())
      }
    }
  }, [playingSound])

  const handleUseBeat = useCallback((beat) => {
    // Navigate back with the selected beat
    if (route.params?.onSelectBeat) {
      route.params.onSelectBeat(beat)
    }
    navigation.goBack()
  }, [navigation, route.params])

  const handleViewBeatsLab = useCallback(() => {
    navigation.navigate('Library', { scrollToBeats: true })
  }, [navigation])

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Beats</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleViewBeatsLab}>
          <AudioWaveform size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Explanation */}
        <View style={styles.infoCard}>
          <Wand2 size={24} color="#8b5cf6" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>AI Beat Generator</Text>
            <Text style={styles.infoText}>
              Describe the instrumental you want to create - the style, mood, tempo, and instruments.
              Our AI will generate two unique beat variations for you. Perfect for producers and beat makers!
            </Text>
          </View>
        </View>

        {/* Prompt Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Describe your beat</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g., Dark trap beat with 808s, hi-hats, and eerie synth melodies. 140 BPM, perfect for a late night vibe..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            multiline
            numberOfLines={5}
            maxLength={2000}
            editable={!operationLoading}
          />
          <Text style={[styles.inputHint, wordCount > 200 && styles.inputHintError]}>
            {wordCount}/200 words
          </Text>
        </View>

        {/* Model Selection */}
        <View style={styles.modelSection}>
          <Text style={styles.inputLabel}>AI Model</Text>
          <View style={styles.modelOptions}>
            {MODEL_OPTIONS.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelOption,
                  selectedModel === model.id && styles.modelOptionSelected,
                ]}
                onPress={() => setSelectedModel(model.id)}
                disabled={operationLoading}
              >
                <Text
                  style={[
                    styles.modelLabel,
                    selectedModel === model.id && styles.modelLabelSelected,
                  ]}
                >
                  {model.label}
                </Text>
                <Text
                  style={[
                    styles.modelDescription,
                    selectedModel === model.id && styles.modelDescriptionSelected,
                  ]}
                >
                  {model.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, (operationLoading || !prompt.trim()) && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={operationLoading || !prompt.trim()}
        >
          {operationLoading ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.generateButtonText}>
                {generationProgress?.message || 'Generating...'}
              </Text>
            </>
          ) : (
            <>
              <Wand2 size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Beat</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Progress Message */}
        {operationLoading && generationProgress && (
          <Text style={styles.progressText}>{generationProgress.message}</Text>
        )}

        {/* Error Message */}
        {beatsError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{beatsError}</Text>
          </View>
        )}

        {/* Generated Beats */}
        {generatedBeats && generatedBeats.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Generated Beats</Text>
            <Text style={styles.resultsSubtitle}>
              {generatedBeats.length} variations created. Tap to preview.
            </Text>

            {/* Variation Tabs */}
            <View style={styles.tabContainer}>
              {generatedBeats.map((beat, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.tab,
                    selectedVariation === index && styles.tabSelected,
                  ]}
                  onPress={async () => {
                    // Stop current audio if switching
                    if (playingSound) {
                      await playingSound.stopAsync()
                      await playingSound.unloadAsync()
                      setPlayingSound(null)
                      setIsPlaying(false)
                    }
                    setSelectedVariation(index)
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedVariation === index && styles.tabTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {beat.title || `Beat ${index + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selected Beat Display */}
            {generatedBeats[selectedVariation] && (
              <View style={styles.beatCard}>
                {/* Beat Cover Art */}
                <View style={styles.beatImageContainer}>
                  {generatedBeats[selectedVariation].image_url || generatedBeats[selectedVariation].imageUrl ? (
                    <Image
                      source={{ uri: generatedBeats[selectedVariation].image_url || generatedBeats[selectedVariation].imageUrl }}
                      style={styles.beatImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.beatImagePlaceholder}>
                      <Music2 size={40} color={isDark ? '#666' : '#999'} />
                    </View>
                  )}
                  {/* Play/Pause Overlay */}
                  <TouchableOpacity
                    style={styles.playOverlay}
                    onPress={() => handlePlayPause(generatedBeats[selectedVariation])}
                  >
                    {isPlaying ? (
                      <Pause size={32} color="#fff" fill="#fff" />
                    ) : (
                      <Play size={32} color="#fff" fill="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.beatInfo}>
                  <Text style={styles.beatTitle}>
                    {generatedBeats[selectedVariation].title || 'Untitled Beat'}
                  </Text>
                  <Text style={styles.beatStyle}>
                    {generatedBeats[selectedVariation].tags || generatedBeats[selectedVariation].style || 'Instrumental'}
                  </Text>
                  {generatedBeats[selectedVariation].duration && (
                    <Text style={styles.beatDuration}>
                      Duration: {Math.floor(generatedBeats[selectedVariation].duration / 60)}:{(generatedBeats[selectedVariation].duration % 60).toString().padStart(2, '0')}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => handlePlayPause(generatedBeats[selectedVariation])}
                  >
                    {isPlaying ? (
                      <>
                        <Pause size={18} color="#fff" />
                        <Text style={styles.playButtonText}>Pause</Text>
                      </>
                    ) : (
                      <>
                        <Play size={18} color="#fff" fill="#fff" />
                        <Text style={styles.playButtonText}>Preview</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.useButton}
                    onPress={() => handleUseBeat(generatedBeats[selectedVariation])}
                  >
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.useButtonText}>Use This Beat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for Great Beats</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Specify the genre (trap, lo-fi, boom bap, house, etc.)
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Include tempo/BPM if you have a specific speed in mind
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Mention key instruments (808s, piano, guitar, synths)
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Describe the mood (dark, uplifting, chill, aggressive)
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Your saved beats are available in the Beats Lab for editing
            </Text>
          </View>
        </View>
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
    paddingBottom: 120,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1a1a2e' : '#f3e8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: isDark ? '#c4b5fd' : '#6b21a8',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 8,
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: isDark ? '#666' : '#999',
    marginTop: 6,
    textAlign: 'right',
  },
  inputHintError: {
    color: '#ef4444',
  },
  modelSection: {
    marginBottom: 20,
  },
  modelOptions: {
    gap: 8,
  },
  modelOption: {
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelOptionSelected: {
    backgroundColor: isDark ? '#1a1a2e' : '#f3e8ff',
    borderColor: '#8b5cf6',
  },
  modelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 2,
  },
  modelLabelSelected: {
    color: '#8b5cf6',
  },
  modelDescription: {
    fontSize: 13,
    color: isDark ? '#888' : '#666',
  },
  modelDescriptionSelected: {
    color: isDark ? '#c4b5fd' : '#6b21a8',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: isDark ? '#333' : '#ccc',
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressText: {
    fontSize: 14,
    color: isDark ? '#888' : '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  errorBox: {
    backgroundColor: isDark ? '#3d1a1a' : '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: isDark ? '#5c2020' : '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: isDark ? '#f87171' : '#b91c1c',
  },
  resultsSection: {
    marginTop: 32,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 14,
    color: isDark ? '#888' : '#666',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabSelected: {
    backgroundColor: isDark ? '#1a1a2e' : '#f3e8ff',
    borderColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#888' : '#666',
  },
  tabTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  beatCard: {
    backgroundColor: isDark ? '#1c1c1e' : '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#e5e7eb',
  },
  beatImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  beatImage: {
    width: '100%',
    height: '100%',
  },
  beatImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: isDark ? '#2a2a2a' : '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  beatInfo: {
    marginBottom: 16,
  },
  beatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  beatStyle: {
    fontSize: 14,
    color: isDark ? '#888' : '#666',
    marginBottom: 4,
  },
  beatDuration: {
    fontSize: 13,
    color: isDark ? '#666' : '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  useButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  useButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  tipsSection: {
    marginTop: 32,
    padding: 16,
    backgroundColor: isDark ? '#1c1c1e' : '#f9f9f9',
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: '#8b5cf6',
    marginRight: 8,
    fontWeight: '600',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: isDark ? '#888' : '#666',
    lineHeight: 20,
  },
})
