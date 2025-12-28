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
import { ChevronLeft, FileText, Wand2, Copy, CheckCircle } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'

import { useCurrentUser } from '../../core/onboarding'
import { useLyrics } from '../../hooks/useLyrics'

export default function CreateLyricsScreen({ navigation, route }) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  const {
    generateLyrics,
    operationLoading,
    generationProgress,
    lyricsError,
    clearError,
  } = useLyrics(userId)

  // Form state
  const [prompt, setPrompt] = useState('')
  const [generatedLyrics, setGeneratedLyrics] = useState(null) // Array of 2 variations
  const [selectedVariation, setSelectedVariation] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState(null)

  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      Alert.alert('Prompt Required', 'Please describe what your lyrics should be about.')
      return
    }

    if (wordCount > 200) {
      Alert.alert('Prompt Too Long', 'Please keep your prompt under 200 words.')
      return
    }

    clearError()
    setGeneratedLyrics(null)

    const result = await generateLyrics(prompt)

    if (result.success) {
      setGeneratedLyrics(result.lyrics)
      setSelectedVariation(0)
    } else {
      Alert.alert('Generation Failed', result.error || 'Failed to generate lyrics. Please try again.')
    }
  }, [prompt, wordCount, generateLyrics, clearError])

  const handleCopyLyrics = useCallback((text, index) => {
    Clipboard.setStringAsync(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }, [])

  const handleUseLyrics = useCallback((lyrics) => {
    // Navigate back with the selected lyrics
    // The parent screen can use these lyrics in song creation
    if (route.params?.onSelectLyrics) {
      route.params.onSelectLyrics(lyrics)
    }
    navigation.goBack()
  }, [navigation, route.params])

  const handleViewLyricsLab = useCallback(() => {
    navigation.navigate('Library', { scrollToLyrics: true })
  }, [navigation])

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Lyrics</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleViewLyricsLab}>
          <FileText size={24} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Explanation */}
        <View style={styles.infoCard}>
          <Wand2 size={24} color="#ec4899" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>AI Lyrics Generator</Text>
            <Text style={styles.infoText}>
              Describe the theme, mood, or story for your song. Our AI will create two unique
              lyrics variations for you to choose from. You can edit them later in your Lyrics Lab.
            </Text>
          </View>
        </View>

        {/* Prompt Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>What should your lyrics be about?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g., A love song about meeting someone at a coffee shop on a rainy day, with a hopeful and romantic mood..."
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
              <Text style={styles.generateButtonText}>Generate Lyrics</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Progress Message */}
        {operationLoading && generationProgress && (
          <Text style={styles.progressText}>{generationProgress.message}</Text>
        )}

        {/* Error Message */}
        {lyricsError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{lyricsError}</Text>
          </View>
        )}

        {/* Generated Lyrics */}
        {generatedLyrics && generatedLyrics.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Generated Lyrics</Text>
            <Text style={styles.resultsSubtitle}>
              {generatedLyrics.length} variations created. Tap to expand.
            </Text>

            {/* Variation Tabs */}
            <View style={styles.tabContainer}>
              {generatedLyrics.map((lyrics, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.tab,
                    selectedVariation === index && styles.tabSelected,
                  ]}
                  onPress={() => setSelectedVariation(index)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedVariation === index && styles.tabTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {lyrics.title || `Variation ${index + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selected Lyrics Display */}
            {generatedLyrics[selectedVariation] && (
              <View style={styles.lyricsCard}>
                <View style={styles.lyricsHeader}>
                  <Text style={styles.lyricsTitle}>
                    {generatedLyrics[selectedVariation].title || 'Untitled'}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => handleCopyLyrics(
                      generatedLyrics[selectedVariation].text,
                      selectedVariation
                    )}
                  >
                    {copiedIndex === selectedVariation ? (
                      <CheckCircle size={20} color="#22c55e" />
                    ) : (
                      <Copy size={20} color={isDark ? '#888' : '#666'} />
                    )}
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.lyricsTextContainer}
                  nestedScrollEnabled={true}
                >
                  <Text style={styles.lyricsText}>
                    {generatedLyrics[selectedVariation].text}
                  </Text>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.useButton}
                    onPress={() => handleUseLyrics(generatedLyrics[selectedVariation])}
                  >
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.useButtonText}>Use These Lyrics</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for Great Lyrics</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Be specific about the mood (happy, melancholic, energetic)
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Include themes or topics (love, adventure, loss, celebration)
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Mention the song style if relevant (pop ballad, rock anthem, hip-hop)
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Your saved lyrics are available in the Lyrics Lab for editing
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
    backgroundColor: isDark ? '#2a1a2a' : '#fce7f3',
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
    color: isDark ? '#e8a0c4' : '#9d174d',
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
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
    backgroundColor: isDark ? '#2a1a2a' : '#fce7f3',
    borderColor: '#ec4899',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#888' : '#666',
  },
  tabTextSelected: {
    color: '#ec4899',
    fontWeight: '600',
  },
  lyricsCard: {
    backgroundColor: isDark ? '#1c1c1e' : '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#e5e7eb',
  },
  lyricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lyricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    flex: 1,
  },
  copyButton: {
    padding: 8,
  },
  lyricsTextContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  lyricsText: {
    fontSize: 15,
    color: isDark ? '#cccccc' : '#333333',
    lineHeight: 24,
    fontFamily: 'System',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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
    color: '#ec4899',
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
