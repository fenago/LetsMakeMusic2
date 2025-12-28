/**
 * VideoGeneratorModal - AI-powered video generation with Veo 3/3.1
 *
 * Features:
 * - Text-to-video generation
 * - Image start frame
 * - Frame interpolation (start + end images)
 * - Reference images for style/subject (Veo 3.1)
 * - Model selection with pricing
 * - Duration, resolution, aspect ratio options
 * - Native audio generation (dialogue, SFX, ambient)
 * - Progress tracking for long-running operations
 *
 * Brand: LetsMake.Music
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
import { Video } from 'expo-av'
import {
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  DollarSign,
  Film,
  Layers,
} from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../../../core/dopebase'
import { useVideoGeneration } from '../../../hooks/useVideoGeneration'
import {
  VIDEO_MODELS,
  VIDEO_DURATIONS,
  VIDEO_RESOLUTIONS,
  VIDEO_ASPECT_RATIOS,
  VIDEO_GENERATION_MODES,
  calculateCost,
} from '../../../services/geminiVideoService'

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
    chipSelected: '#E3F2FD',
    warningBg: '#fef3c7',
    warningText: '#92400e',
    errorBg: '#fef2f2',
    errorText: '#ef4444',
    successBg: '#d1fae5',
    successText: '#047857',
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
    chipSelected: '#1A3A4A',
    warningBg: '#422006',
    warningText: '#fbbf24',
    errorBg: '#450a0a',
    errorText: '#f87171',
    successBg: '#064e3b',
    successText: '#34d399',
  },
}

const VideoGeneratorModal = ({
  visible,
  onClose,
  onGenerated,
  currentUser,
  initialPrompt = '',
  songInfo = null, // Optional: for context-aware generation
}) => {
  const { theme, appearance } = useTheme()
  const brandColors = BRAND_COLORS[appearance] || BRAND_COLORS.dark

  const {
    loading,
    generating,
    progress,
    error,
    result,
    isInitialized,
    hasApiKey,
    generate,
    generateFromImage,
    generateInterpolation,
    generateWithReferences,
    cancelGeneration,
    clear,
    getEstimatedCost,
  } = useVideoGeneration(currentUser)

  // Form state
  const [prompt, setPrompt] = useState(initialPrompt)
  const [negativePrompt, setNegativePrompt] = useState('')
  const [showNegativePrompt, setShowNegativePrompt] = useState(false)
  const [selectedModel, setSelectedModel] = useState('VEO_3_1_FAST')
  const [selectedDuration, setSelectedDuration] = useState('LONG') // 8 seconds
  const [selectedResolution, setSelectedResolution] = useState('HD')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('PORTRAIT')
  const [selectedMode, setSelectedMode] = useState('TEXT_TO_VIDEO')
  const [includeAudio, setIncludeAudio] = useState(true)
  const [referenceImages, setReferenceImages] = useState([]) // Array of { uri, base64, mimeType }
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Video preview state
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = React.useRef(null)

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    const duration = VIDEO_DURATIONS[selectedDuration]?.value || 8
    return calculateCost(selectedModel, duration, includeAudio)
  }, [selectedModel, selectedDuration, includeAudio])

  // Get model info
  const currentModelInfo = VIDEO_MODELS[selectedModel]

  // Check if current mode requires Veo 3.1
  const modeRequiresVeo31 = VIDEO_GENERATION_MODES[selectedMode]?.requiresVeo31
  const modelSupportsMode =
    !modeRequiresVeo31 ||
    currentModelInfo?.supportsReferenceImages ||
    currentModelInfo?.supportsVideoExtension

  // Get max images for current mode
  const maxImages = VIDEO_GENERATION_MODES[selectedMode]?.maxImages || 0

  // Check if 1080p is available (requires 8s duration)
  const is1080pAvailable = selectedDuration === 'LONG'

  // Auto-adjust resolution if 1080p selected but duration changed
  useEffect(() => {
    if (selectedResolution === 'FULL_HD' && !is1080pAvailable) {
      setSelectedResolution('HD')
    }
  }, [selectedDuration, is1080pAvailable, selectedResolution])

  // Handle picking reference images
  const handlePickImage = useCallback(async () => {
    if (referenceImages.length >= maxImages) {
      Alert.alert('Maximum Images', `You can only add up to ${maxImages} images for this mode.`)
      return
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to upload images.'
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: selectedAspectRatio === 'PORTRAIT' ? [9, 16] : [16, 9],
        quality: 0.8,
        base64: true,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0]
        const mimeType = asset.uri.toLowerCase().endsWith('.png')
          ? 'image/png'
          : 'image/jpeg'

        setReferenceImages((prev) => [
          ...prev,
          {
            uri: asset.uri,
            base64: asset.base64,
            mimeType,
          },
        ])
      }
    } catch (err) {
      console.error('[VideoGeneratorModal] Error picking image:', err)
      Alert.alert('Error', 'Failed to pick image. Please try again.')
    }
  }, [referenceImages.length, maxImages, selectedAspectRatio])

  // Remove reference image
  const handleRemoveImage = useCallback((index) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      Alert.alert('Enter a Prompt', 'Please describe the video you want to create.')
      return
    }

    if (!modelSupportsMode) {
      Alert.alert(
        'Model Not Compatible',
        'This generation mode requires a Veo 3.1 model. Please select Veo 3.1 or Veo 3.1 Fast.'
      )
      return
    }

    // Check if mode requires images
    const mode = VIDEO_GENERATION_MODES[selectedMode]
    if (mode.requiresImages && referenceImages.length === 0) {
      Alert.alert(
        'Images Required',
        `Please add ${mode.maxImages === 1 ? 'an image' : 'images'} for ${mode.label} mode.`
      )
      return
    }

    clear()

    const options = {
      model: currentModelInfo.id,
      duration: VIDEO_DURATIONS[selectedDuration].value,
      aspectRatio: VIDEO_ASPECT_RATIOS[selectedAspectRatio].value,
      resolution: VIDEO_RESOLUTIONS[selectedResolution].value,
      negativePrompt: negativePrompt.trim() || undefined,
      includeAudio,
    }

    let success = false

    switch (selectedMode) {
      case 'TEXT_TO_VIDEO':
        success = await generate(prompt.trim(), options)
        break

      case 'IMAGE_START_FRAME':
        if (referenceImages[0]) {
          success = await generateFromImage(
            {
              base64: referenceImages[0].base64,
              mimeType: referenceImages[0].mimeType,
            },
            prompt.trim(),
            options
          )
        }
        break

      case 'INTERPOLATION':
        if (referenceImages[0] && referenceImages[1]) {
          success = await generateInterpolation(
            referenceImages[0],
            referenceImages[1],
            options
          )
        }
        break

      case 'REFERENCE_IMAGES':
        if (referenceImages.length > 0) {
          success = await generateWithReferences(prompt.trim(), referenceImages, options)
        }
        break

      default:
        success = await generate(prompt.trim(), options)
    }

    if (!success) {
      // Error will be shown via error state
    }
  }, [
    prompt,
    negativePrompt,
    selectedMode,
    selectedModel,
    selectedDuration,
    selectedAspectRatio,
    selectedResolution,
    includeAudio,
    referenceImages,
    modelSupportsMode,
    currentModelInfo,
    generate,
    generateFromImage,
    generateInterpolation,
    generateWithReferences,
    clear,
  ])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!result) return

    setIsSaving(true)
    try {
      const videoData = {
        source: 'generated',
        videoUri: result.videoUri,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || null,
        model: currentModelInfo.id,
        modelName: currentModelInfo.name,
        duration: VIDEO_DURATIONS[selectedDuration].value,
        aspectRatio: VIDEO_ASPECT_RATIOS[selectedAspectRatio].value,
        resolution: VIDEO_RESOLUTIONS[selectedResolution].value,
        generationMode: selectedMode,
        includeAudio,
        referenceImages: referenceImages.map((img) => ({
          uri: img.uri,
          mimeType: img.mimeType,
        })),
        estimatedCost,
      }

      onGenerated?.(videoData)
      handleClose()
    } catch (err) {
      console.error('[VideoGeneratorModal] Error saving:', err)
      Alert.alert('Error', 'Failed to save video. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [
    result,
    prompt,
    negativePrompt,
    selectedMode,
    selectedDuration,
    selectedAspectRatio,
    selectedResolution,
    includeAudio,
    referenceImages,
    estimatedCost,
    currentModelInfo,
    onGenerated,
  ])

  // Handle close
  const handleClose = useCallback(() => {
    if (generating) {
      Alert.alert(
        'Generation in Progress',
        'A video is being generated. Do you want to cancel?',
        [
          { text: 'Keep Generating', style: 'cancel' },
          {
            text: 'Cancel & Close',
            style: 'destructive',
            onPress: () => {
              cancelGeneration()
              resetForm()
              onClose()
            },
          },
        ]
      )
      return
    }
    resetForm()
    onClose()
  }, [generating, cancelGeneration, onClose])

  const resetForm = useCallback(() => {
    setPrompt(initialPrompt)
    setNegativePrompt('')
    setShowNegativePrompt(false)
    setSelectedModel('VEO_3_1_FAST')
    setSelectedDuration('LONG')
    setSelectedResolution('HD')
    setSelectedAspectRatio('PORTRAIT')
    setSelectedMode('TEXT_TO_VIDEO')
    setIncludeAudio(true)
    setReferenceImages([])
    setShowAdvanced(false)
    setIsPlaying(false)
    clear()
  }, [initialPrompt, clear])

  // Navigate to settings
  const handleGoToSettings = useCallback(() => {
    handleClose()
    Alert.alert(
      'API Key Required',
      'Please go to Backstage > Settings to add your Gemini API key for AI video generation.'
    )
  }, [handleClose])

  // Toggle video playback
  const togglePlayback = useCallback(async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync()
      } else {
        await videoRef.current.playAsync()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying])

  // Render mode selector
  const renderModeSelector = () => (
    <View style={styles.modeContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Object.entries(VIDEO_GENERATION_MODES).map(([key, mode]) => {
          // Skip extend mode for now (requires existing video)
          if (key === 'EXTEND_VIDEO') return null

          const isSelected = selectedMode === key
          const isDisabled = mode.requiresVeo31 && !currentModelInfo?.supportsReferenceImages

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.modeChip,
                {
                  backgroundColor: isSelected
                    ? brandColors.primary
                    : brandColors.chipBg,
                  borderColor: isSelected ? brandColors.primary : brandColors.border,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]}
              onPress={() => !isDisabled && setSelectedMode(key)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.modeChipText,
                  { color: isSelected ? '#fff' : brandColors.textPrimary },
                ]}
              >
                {mode.label}
              </Text>
              {mode.requiresVeo31 && (
                <Text
                  style={[
                    styles.modeBadge,
                    { color: isSelected ? '#fff' : brandColors.textSecondary },
                  ]}
                >
                  3.1
                </Text>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )

  // Render model selector
  const renderModelSelector = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
        Model
      </Text>
      <View style={styles.modelGrid}>
        {Object.entries(VIDEO_MODELS).map(([key, model]) => {
          const isSelected = selectedModel === key
          const cost8s = (model.pricePerSecond * 8).toFixed(2)

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.modelCard,
                {
                  backgroundColor: isSelected
                    ? brandColors.chipSelected
                    : brandColors.surface,
                  borderColor: isSelected ? brandColors.primary : brandColors.border,
                },
              ]}
              onPress={() => setSelectedModel(key)}
            >
              <View style={styles.modelHeader}>
                <Text
                  style={[
                    styles.modelName,
                    { color: isSelected ? brandColors.primary : brandColors.textPrimary },
                  ]}
                >
                  {model.name}
                </Text>
                <Text style={[styles.modelPrice, { color: brandColors.secondary }]}>
                  ${cost8s}
                </Text>
              </View>
              <Text
                style={[styles.modelDescription, { color: brandColors.textSecondary }]}
                numberOfLines={2}
              >
                {model.description}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )

  // Render duration selector
  const renderDurationSelector = () => (
    <View style={styles.optionRow}>
      <View style={styles.optionLabel}>
        <Clock size={16} color={brandColors.textSecondary} />
        <Text style={[styles.optionLabelText, { color: brandColors.textPrimary }]}>
          Duration
        </Text>
      </View>
      <View style={styles.optionChips}>
        {Object.entries(VIDEO_DURATIONS).map(([key, duration]) => {
          const isSelected = selectedDuration === key
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.optionChip,
                {
                  backgroundColor: isSelected
                    ? brandColors.primary
                    : brandColors.chipBg,
                  borderColor: isSelected ? brandColors.primary : brandColors.border,
                },
              ]}
              onPress={() => setSelectedDuration(key)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: isSelected ? '#fff' : brandColors.textPrimary },
                ]}
              >
                {duration.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )

  // Render aspect ratio selector
  const renderAspectRatioSelector = () => (
    <View style={styles.optionRow}>
      <View style={styles.optionLabel}>
        <Film size={16} color={brandColors.textSecondary} />
        <Text style={[styles.optionLabelText, { color: brandColors.textPrimary }]}>
          Aspect Ratio
        </Text>
      </View>
      <View style={styles.optionChips}>
        {Object.entries(VIDEO_ASPECT_RATIOS).map(([key, ratio]) => {
          const isSelected = selectedAspectRatio === key
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.optionChip,
                {
                  backgroundColor: isSelected
                    ? brandColors.primary
                    : brandColors.chipBg,
                  borderColor: isSelected ? brandColors.primary : brandColors.border,
                },
              ]}
              onPress={() => setSelectedAspectRatio(key)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: isSelected ? '#fff' : brandColors.textPrimary },
                ]}
              >
                {ratio.icon} {ratio.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )

  // Render resolution selector
  const renderResolutionSelector = () => (
    <View style={styles.optionRow}>
      <View style={styles.optionLabel}>
        <Layers size={16} color={brandColors.textSecondary} />
        <Text style={[styles.optionLabelText, { color: brandColors.textPrimary }]}>
          Resolution
        </Text>
      </View>
      <View style={styles.optionChips}>
        {Object.entries(VIDEO_RESOLUTIONS).map(([key, res]) => {
          const isSelected = selectedResolution === key
          const isDisabled = key === 'FULL_HD' && !is1080pAvailable
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.optionChip,
                {
                  backgroundColor: isSelected
                    ? brandColors.primary
                    : brandColors.chipBg,
                  borderColor: isSelected ? brandColors.primary : brandColors.border,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]}
              onPress={() => !isDisabled && setSelectedResolution(key)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.optionChipText,
                  { color: isSelected ? '#fff' : brandColors.textPrimary },
                ]}
              >
                {res.label}
              </Text>
            </TouchableOpacity>
          )
        })}
        {!is1080pAvailable && (
          <Text style={[styles.resolutionHint, { color: brandColors.textSecondary }]}>
            (1080p requires 8s)
          </Text>
        )}
      </View>
    </View>
  )

  // Render audio toggle
  const renderAudioToggle = () => (
    <View style={styles.optionRow}>
      <View style={styles.optionLabel}>
        {includeAudio ? (
          <Volume2 size={16} color={brandColors.textSecondary} />
        ) : (
          <VolumeX size={16} color={brandColors.textSecondary} />
        )}
        <Text style={[styles.optionLabelText, { color: brandColors.textPrimary }]}>
          Audio
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          {
            backgroundColor: includeAudio ? brandColors.primary : brandColors.chipBg,
            borderColor: includeAudio ? brandColors.primary : brandColors.border,
          },
        ]}
        onPress={() => setIncludeAudio(!includeAudio)}
      >
        <Text style={[styles.toggleText, { color: includeAudio ? '#fff' : brandColors.textPrimary }]}>
          {includeAudio ? 'On' : 'Off (saves ~33%)'}
        </Text>
      </TouchableOpacity>
    </View>
  )

  // Render image upload area
  const renderImageUpload = () => {
    if (maxImages === 0) return null

    const mode = VIDEO_GENERATION_MODES[selectedMode]

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
          {mode.label === 'Frame Interpolation' ? 'Start & End Frames' : 'Reference Images'}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: brandColors.textSecondary }]}>
          {mode.description}
        </Text>

        <View style={styles.imageGrid}>
          {referenceImages.map((img, index) => (
            <View key={index} style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: img.uri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={[styles.removeImageBtn, { backgroundColor: brandColors.errorBg }]}
                onPress={() => handleRemoveImage(index)}
              >
                <Trash2 size={14} color={brandColors.errorText} />
              </TouchableOpacity>
              {selectedMode === 'INTERPOLATION' && (
                <View
                  style={[styles.imageBadge, { backgroundColor: brandColors.primary }]}
                >
                  <Text style={styles.imageBadgeText}>
                    {index === 0 ? 'Start' : 'End'}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {referenceImages.length < maxImages && (
            <TouchableOpacity
              style={[
                styles.addImageButton,
                {
                  backgroundColor: brandColors.surface,
                  borderColor: brandColors.border,
                },
              ]}
              onPress={handlePickImage}
            >
              <ImagePlus size={24} color={brandColors.primary} />
              <Text style={[styles.addImageText, { color: brandColors.textSecondary }]}>
                {referenceImages.length === 0 ? 'Add Image' : 'Add More'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  // Render cost estimate
  const renderCostEstimate = () => (
    <View style={[styles.costBanner, { backgroundColor: brandColors.chipBg }]}>
      <DollarSign size={16} color={brandColors.textSecondary} />
      <Text style={[styles.costText, { color: brandColors.textPrimary }]}>
        Estimated cost:{' '}
        <Text style={{ color: brandColors.secondary, fontWeight: '600' }}>
          ${estimatedCost.toFixed(2)}
        </Text>
      </Text>
    </View>
  )

  // Render progress indicator
  const renderProgress = () => {
    if (!generating) return null

    return (
      <View style={[styles.progressContainer, { backgroundColor: brandColors.surface }]}>
        <ActivityIndicator size="large" color={brandColors.primary} />
        <Text style={[styles.progressTitle, { color: brandColors.textPrimary }]}>
          Generating Video...
        </Text>
        <Text style={[styles.progressText, { color: brandColors.textSecondary }]}>
          {progress}% complete
        </Text>
        <View style={[styles.progressBar, { backgroundColor: brandColors.chipBg }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: brandColors.primary,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressHint, { color: brandColors.textSecondary }]}>
          This may take 1-6 minutes
        </Text>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: brandColors.border }]}
          onPress={cancelGeneration}
        >
          <Text style={[styles.cancelButtonText, { color: brandColors.errorText }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Video error state
  const [videoError, setVideoError] = useState(null)
  const [videoLoading, setVideoLoading] = useState(true)

  // Render video preview
  const renderVideoPreview = () => {
    if (!result) return null

    console.log('[VideoGeneratorModal] Rendering video preview with URI:', result.videoUri)

    return (
      <View style={styles.previewSection}>
        <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
          Result
        </Text>
        <View style={styles.videoContainer}>
          {videoLoading && (
            <View style={styles.videoLoadingOverlay}>
              <ActivityIndicator size="large" color={brandColors.primary} />
              <Text style={[styles.videoLoadingText, { color: brandColors.textSecondary }]}>
                Loading video...
              </Text>
            </View>
          )}
          {videoError && (
            <View style={styles.videoErrorOverlay}>
              <AlertCircle size={32} color={brandColors.errorText} />
              <Text style={[styles.videoErrorText, { color: brandColors.errorText }]}>
                {videoError}
              </Text>
              <Text style={[styles.videoUriText, { color: brandColors.textSecondary }]} numberOfLines={2}>
                URI: {result.videoUri?.substring(0, 50)}...
              </Text>
            </View>
          )}
          <Video
            ref={videoRef}
            source={{ uri: result.videoUri }}
            style={styles.videoPlayer}
            resizeMode="contain"
            isLooping
            shouldPlay={false}
            useNativeControls={true}
            onLoad={() => {
              console.log('[VideoGeneratorModal] Video loaded successfully')
              setVideoLoading(false)
              setVideoError(null)
            }}
            onError={(error) => {
              console.error('[VideoGeneratorModal] Video error:', error)
              setVideoLoading(false)
              setVideoError('Failed to load video. The URL may have expired.')
            }}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                setVideoLoading(false)
                setIsPlaying(status.isPlaying)
              }
              if (status.error) {
                console.error('[VideoGeneratorModal] Playback error:', status.error)
                setVideoError(status.error)
              }
            }}
          />
          {!videoError && !videoLoading && (
            <TouchableOpacity style={styles.playOverlay} onPress={togglePlayback}>
              {isPlaying ? (
                <Pause size={48} color="#fff" />
              ) : (
                <Play size={48} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.regenerateButton, { borderColor: brandColors.border }]}
          onPress={handleGenerate}
          disabled={generating}
        >
          <RefreshCw size={18} color={brandColors.textPrimary} />
          <Text style={[styles.regenerateText, { color: brandColors.textPrimary }]}>
            Generate Again
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

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
            AI Video Studio
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, !result && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!result || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={brandColors.primary} />
            ) : (
              <Text
                style={[
                  styles.saveText,
                  { color: result ? brandColors.primary : brandColors.textSecondary },
                ]}
              >
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
                Add your Gemini API key in Settings to use AI video generation
              </Text>
              <Settings size={18} color={brandColors.warningText} />
            </TouchableOpacity>
          )}

          {/* Generation Mode Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
              Generation Mode
            </Text>
            {renderModeSelector()}
          </View>

          {/* Image Upload (if mode requires images) */}
          {renderImageUpload()}

          {/* Prompt Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
              Describe Your Video
            </Text>
            <TextInput
              style={[
                styles.promptInput,
                {
                  color: brandColors.textPrimary,
                  backgroundColor: brandColors.surface,
                  borderColor: brandColors.border,
                },
              ]}
              value={prompt}
              onChangeText={setPrompt}
              placeholder='A musician playing guitar in a neon-lit studio, "This is my new song" they say...'
              placeholderTextColor={brandColors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Negative Prompt Toggle */}
            <TouchableOpacity
              style={styles.negativePromptToggle}
              onPress={() => setShowNegativePrompt(!showNegativePrompt)}
            >
              {showNegativePrompt ? (
                <ChevronUp size={16} color={brandColors.textSecondary} />
              ) : (
                <ChevronDown size={16} color={brandColors.textSecondary} />
              )}
              <Text
                style={[styles.negativePromptLabel, { color: brandColors.textSecondary }]}
              >
                Negative prompt (what to avoid)
              </Text>
            </TouchableOpacity>

            {showNegativePrompt && (
              <TextInput
                style={[
                  styles.negativeInput,
                  {
                    color: brandColors.textPrimary,
                    backgroundColor: brandColors.surface,
                    borderColor: brandColors.border,
                  },
                ]}
                value={negativePrompt}
                onChangeText={setNegativePrompt}
                placeholder="blurry, low quality, distorted..."
                placeholderTextColor={brandColors.textSecondary}
              />
            )}
          </View>

          {/* Model Selection */}
          {renderModelSelector()}

          {/* Options */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={[styles.sectionTitle, { color: brandColors.textPrimary }]}>
                Options
              </Text>
              {showAdvanced ? (
                <ChevronUp size={18} color={brandColors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={brandColors.textSecondary} />
              )}
            </TouchableOpacity>

            {showAdvanced && (
              <>
                {renderDurationSelector()}
                {renderAspectRatioSelector()}
                {renderResolutionSelector()}
                {renderAudioToggle()}
              </>
            )}

            {/* Quick summary if collapsed */}
            {!showAdvanced && (
              <Text style={[styles.optionsSummary, { color: brandColors.textSecondary }]}>
                {VIDEO_DURATIONS[selectedDuration].label} •{' '}
                {VIDEO_ASPECT_RATIOS[selectedAspectRatio].value} •{' '}
                {VIDEO_RESOLUTIONS[selectedResolution].value}
                {includeAudio ? ' • Audio' : ''}
              </Text>
            )}
          </View>

          {/* Cost Estimate */}
          {renderCostEstimate()}

          {/* Generate Button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              { backgroundColor: brandColors.primary },
              (!hasApiKey || loading || generating) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={!hasApiKey || loading || generating}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Sparkles size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Video</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Tip */}
          <Text style={[styles.tipText, { color: brandColors.textSecondary }]}>
            Tip: Use quotes for dialogue ("Hello!"), describe sounds for SFX
          </Text>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: brandColors.errorBg }]}>
              <AlertCircle size={16} color={brandColors.errorText} />
              <Text style={[styles.errorText, { color: brandColors.errorText }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Progress Indicator */}
          {renderProgress()}

          {/* Video Preview */}
          {renderVideoPreview()}

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
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  promptInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 80,
  },
  negativePromptToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  negativePromptLabel: {
    fontSize: 13,
  },
  negativeInput: {
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  modeContainer: {
    marginTop: -4,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modeBadge: {
    fontSize: 10,
    fontWeight: '700',
  },
  modelGrid: {
    gap: 10,
  },
  modelCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '600',
  },
  modelPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  modelDescription: {
    fontSize: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    width: '100%',
  },
  optionLabelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resolutionHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionsSummary: {
    fontSize: 13,
    marginTop: -8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: {
    fontSize: 11,
    textAlign: 'center',
  },
  costBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  costText: {
    fontSize: 14,
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
  progressContainer: {
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  progressText: {
    fontSize: 15,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 12,
    marginTop: 4,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewSection: {
    marginTop: 24,
  },
  videoContainer: {
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    maxHeight: 400,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
    gap: 12,
  },
  videoLoadingText: {
    fontSize: 14,
  },
  videoErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 10,
    padding: 20,
    gap: 12,
  },
  videoErrorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  videoUriText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
})

export default VideoGeneratorModal
