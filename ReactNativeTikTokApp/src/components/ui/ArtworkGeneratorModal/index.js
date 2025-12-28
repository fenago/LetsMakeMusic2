/**
 * ArtworkGeneratorModal - AI-powered image generation
 *
 * Features:
 * - Text prompt input for image generation
 * - Flexible style selection with many options
 * - Generated image preview
 * - Save to collection option
 *
 * Note: Requires user to have configured their API key in Backstage Settings
 *
 * Brand: LetsMake.Music
 */
import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { X, Sparkles, RefreshCw, AlertCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react-native'
import { useTheme } from '../../../core/dopebase'
import { useImageGeneration } from '../../../hooks/useImageGeneration'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Brand colors from LetsMake.Music guidelines
const BRAND_COLORS = {
  light: {
    primary: '#1F979E', // Vibrant Teal 500
    secondary: '#C12D79', // Deep Magenta 500
    accent: '#9C27B0', // Rich Purple 500
    background: '#F8F9FA',
    surface: '#FFFFFF',
    textPrimary: '#212529',
    textSecondary: '#868E96',
    border: '#E9ECEF',
    chipBg: '#F1F3F5',
    warningBg: '#fef3c7',
    warningText: '#92400e',
    errorBg: '#fef2f2',
    errorText: '#ef4444',
  },
  dark: {
    primary: '#20B2AA', // Vibrant Teal 400
    secondary: '#D81B60', // Deep Magenta 400
    accent: '#AB47BC', // Rich Purple 400
    background: '#121212',
    surface: '#1E1E1E',
    textPrimary: '#F5F5F5',
    textSecondary: '#A0A0A0',
    border: '#2C2C2C',
    chipBg: '#2C2C2C',
    warningBg: '#422006',
    warningText: '#fbbf24',
    errorBg: '#450a0a',
    errorText: '#f87171',
  },
}

const ArtworkGeneratorModal = ({
  visible,
  onClose,
  onGenerated,
  currentUser,
  initialPrompt = '',
  songInfo = null, // Optional: for context-aware generation
}) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const brandColors = BRAND_COLORS[appearance] || BRAND_COLORS.dark

  const {
    loading,
    error,
    result,
    isInitialized,
    hasApiKey,
    generate,
    generateStyled,
    generateCoverArt,
    clear,
    stylePresets,
  } = useImageGeneration(currentUser)

  const [prompt, setPrompt] = useState(initialPrompt)
  const [selectedStyle, setSelectedStyle] = useState('NONE')
  const [isSaving, setIsSaving] = useState(false)
  const [showAllStyles, setShowAllStyles] = useState(false)

  // Organize styles into grouped rows for display
  const styleItems = useMemo(() => {
    return Object.entries(stylePresets).map(([key, value]) => ({
      key,
      ...value,
    }))
  }, [stylePresets])

  // Show first row (7-8 items) by default, all if expanded
  const visibleStyles = showAllStyles ? styleItems : styleItems.slice(0, 8)

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      Alert.alert('Enter a Prompt', 'Please describe the image you want to create.')
      return
    }

    clear()

    // If we have song info, use context-aware generation
    if (songInfo && selectedStyle === 'ALBUM_COVER') {
      await generateCoverArt(
        {
          title: songInfo.title,
          style: songInfo.style,
          mood: songInfo.mood,
        },
        prompt.trim()
      )
    } else if (selectedStyle === 'NONE') {
      await generate(prompt.trim())
    } else {
      await generateStyled(prompt.trim(), selectedStyle)
    }
  }, [prompt, selectedStyle, songInfo, generate, generateCoverArt, generateStyled, clear])

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!result) return

    setIsSaving(true)
    try {
      const artworkData = {
        source: 'generated',
        imageData: result.base64,
        mimeType: result.mimeType,
        prompt: prompt.trim(),
        style: selectedStyle,
        aspectRatio: result.aspectRatio || '1:1',
        model: 'gemini-2.0-flash-exp',
      }

      onGenerated?.(artworkData)
      handleClose()
    } catch (err) {
      console.error('[ArtworkGeneratorModal] Error saving:', err)
      Alert.alert('Error', 'Failed to save artwork. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [result, prompt, selectedStyle, onGenerated])

  // Handle close
  const handleClose = useCallback(() => {
    setPrompt(initialPrompt)
    setSelectedStyle('NONE')
    setShowAllStyles(false)
    clear()
    onClose()
  }, [initialPrompt, clear, onClose])

  // Navigate to settings
  const handleGoToSettings = useCallback(() => {
    handleClose()
    Alert.alert(
      'API Key Required',
      'Please go to Backstage > Settings to add your API key for AI image generation.'
    )
  }, [handleClose])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: brandColors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: brandColors.border }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={brandColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: brandColors.textPrimary }]}>
            Create with AI
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              !result && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!result || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={brandColors.primary} />
            ) : (
              <Text style={[
                styles.saveText,
                { color: result ? brandColors.primary : brandColors.textSecondary },
              ]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* API Key Warning */}
          {!hasApiKey && (
            <TouchableOpacity
              style={[styles.warningBanner, { backgroundColor: brandColors.warningBg }]}
              onPress={handleGoToSettings}
            >
              <AlertCircle size={20} color={brandColors.warningText} />
              <Text style={[styles.warningText, { color: brandColors.warningText }]}>
                Add your API key in Settings to use AI generation
              </Text>
              <Settings size={18} color={brandColors.warningText} />
            </TouchableOpacity>
          )}

          {/* Prompt Input - Moved to top for better UX */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
              Describe Your Image
            </Text>
            <TextInput
              style={[styles.promptInput, {
                color: brandColors.textPrimary,
                backgroundColor: brandColors.surface,
                borderColor: brandColors.border,
              }]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="A vibrant sunset over a city skyline with neon colors..."
              placeholderTextColor={brandColors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Style Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
              Style
            </Text>
            <View style={styles.stylesGrid}>
              {visibleStyles.map((style) => (
                <TouchableOpacity
                  key={style.key}
                  style={[
                    styles.styleChip,
                    {
                      backgroundColor: selectedStyle === style.key
                        ? brandColors.primary
                        : brandColors.chipBg,
                      borderColor: selectedStyle === style.key
                        ? brandColors.primary
                        : brandColors.border,
                    },
                  ]}
                  onPress={() => setSelectedStyle(style.key)}
                >
                  <Text style={[
                    styles.styleText,
                    {
                      color: selectedStyle === style.key
                        ? '#fff'
                        : brandColors.textPrimary,
                    },
                  ]}>
                    {style.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Show More/Less Toggle */}
            {styleItems.length > 8 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllStyles(!showAllStyles)}
              >
                {showAllStyles ? (
                  <ChevronUp size={18} color={brandColors.textSecondary} />
                ) : (
                  <ChevronDown size={18} color={brandColors.textSecondary} />
                )}
                <Text style={[styles.showMoreText, { color: brandColors.textSecondary }]}>
                  {showAllStyles ? 'Show Less' : `+${styleItems.length - 8} more styles`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Generate Button - Moved up for accessibility */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              { backgroundColor: brandColors.primary },
              (!hasApiKey || loading) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={!hasApiKey || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Sparkles size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Tip - Condensed */}
          <Text style={[styles.tipText, { color: brandColors.textSecondary }]}>
            Tip: Be specific about colors, mood, and artistic style for better results
          </Text>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: brandColors.errorBg }]}>
              <AlertCircle size={16} color={brandColors.errorText} />
              <Text style={[styles.errorText, { color: brandColors.errorText }]}>{error}</Text>
            </View>
          )}

          {/* Preview Area - Shows result or loading state */}
          {(result || loading) && (
            <View style={styles.previewSection}>
              <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
                Result
              </Text>
              <View style={styles.previewContainer}>
                {result ? (
                  <Image
                    source={{ uri: result.uri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : loading ? (
                  <View style={[styles.previewPlaceholder, { backgroundColor: brandColors.surface }]}>
                    <ActivityIndicator size="large" color={brandColors.primary} />
                    <Text style={[styles.loadingText, { color: brandColors.textSecondary }]}>
                      Creating your artwork...
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Regenerate Button */}
              {result && (
                <TouchableOpacity
                  style={[styles.regenerateButton, { borderColor: brandColors.border }]}
                  onPress={handleRegenerate}
                  disabled={loading}
                >
                  <RefreshCw size={18} color={brandColors.textPrimary} />
                  <Text style={[styles.regenerateText, { color: brandColors.textPrimary }]}>
                    Generate Again
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
  closeButton: {
    padding: 4,
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  saveButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  promptInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 80,
  },
  stylesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  styleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 20,
    borderRadius: 12,
    gap: 10,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  tipText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  previewSection: {
    marginTop: 24,
  },
  previewContainer: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 15,
    marginTop: 8,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  regenerateText: {
    fontSize: 15,
    fontWeight: '500',
  },
})

export default ArtworkGeneratorModal
