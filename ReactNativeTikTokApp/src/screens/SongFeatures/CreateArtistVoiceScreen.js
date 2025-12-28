import React, { useState, useCallback, useEffect } from 'react'
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
import { ChevronLeft, Music, Mic, Clock, AlertCircle, CheckCircle } from 'lucide-react-native'

import { useCurrentUser } from '../../core/onboarding'
import { createArtistVoice, canCreateVoiceFromSong } from '../../services/artistVoiceService'

export default function CreateArtistVoiceScreen({ navigation, route }) {
  const song = route.params?.song
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()

  // Form state
  const [voiceName, setVoiceName] = useState('')
  const [voiceDescription, setVoiceDescription] = useState('')

  // Creation state
  const [isCreating, setIsCreating] = useState(false)
  const [eligibility, setEligibility] = useState(null)

  // Check eligibility on mount
  useEffect(() => {
    if (song && currentUser?.id) {
      const result = canCreateVoiceFromSong(song, currentUser.id)
      setEligibility(result)
      console.log('[CreateArtistVoice] Eligibility check:', result)
    }
  }, [song, currentUser?.id])

  // Pre-fill voice name from song
  useEffect(() => {
    if (song?.title) {
      // Suggest a voice name based on the song title
      setVoiceName(`${song.title} Voice`)
    }
  }, [song?.title])

  const handleCreate = useCallback(async () => {
    if (!voiceName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your Synthetic Singer.')
      return
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to create a Synthetic Singer.')
      return
    }

    if (!eligibility?.eligible) {
      Alert.alert('Cannot Create', eligibility?.reason || 'This song is not eligible for Synthetic Singer creation.')
      return
    }

    setIsCreating(true)

    try {
      console.log('[CreateArtistVoice] Creating voice:', { voiceName, voiceDescription })

      const voice = await createArtistVoice({
        userId: currentUser.id,
        song,
        name: voiceName.trim(),
        description: voiceDescription.trim(),
      })

      console.log('[CreateArtistVoice] Voice created:', voice.id)

      Alert.alert(
        'Synthetic Singer Created! 🎤',
        `"${voiceName}" is ready to perform! You can now use this Synthetic Singer when creating new songs in Custom Mode.`,
        [
          {
            text: 'Go to My Voices',
            onPress: () => {
              // Navigate to MyVoices screen when it exists
              // For now, go back
              navigation.goBack()
            },
          },
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error) {
      console.error('[CreateArtistVoice] Error:', error)
      Alert.alert(
        'Creation Failed',
        error.message || 'Failed to create Synthetic Singer. Please try again.'
      )
    } finally {
      setIsCreating(false)
    }
  }, [voiceName, voiceDescription, song, currentUser, eligibility, navigation])

  if (!song) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Synthetic Singer</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No song data available.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const canCreate = eligibility?.eligible && voiceName.trim().length > 0

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Synthetic Singer</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Explanation */}
        <View style={styles.infoCard}>
          <Mic size={24} color="#3875e8" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Create Your Synthetic Singer</Text>
            <Text style={styles.infoText}>
              You're creating a Synthetic Singer - an AI voice that captures the unique vocal style from this song. Once saved, your Synthetic Singer can perform on any new song you create with the same singing style and personality.
            </Text>
          </View>
        </View>

        {/* Source Song Info */}
        <View style={styles.songCard}>
          {song.imageUrl ? (
            <Image source={{ uri: song.imageUrl }} style={styles.songImage} />
          ) : (
            <View style={[styles.songImage, styles.songImagePlaceholder]}>
              <Music size={32} color={isDark ? '#666' : '#999'} />
            </View>
          )}
          <View style={styles.songInfo}>
            <Text style={styles.songLabel}>Source Song</Text>
            <Text style={styles.songTitle} numberOfLines={1}>{song.title || 'Untitled'}</Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.author?.stageName || song.artist || 'Unknown Artist'}
            </Text>
          </View>
        </View>

        {/* Eligibility Status */}
        {eligibility && !eligibility.eligible && (
          <View style={styles.warningBox}>
            <AlertCircle size={20} color={isDark ? '#ffd666' : '#946200'} />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Cannot Create Synthetic Singer</Text>
              <Text style={styles.warningText}>{eligibility.reason}</Text>
            </View>
          </View>
        )}

        {eligibility?.eligible && eligibility.daysRemaining && (
          <View style={styles.timeBox}>
            <Clock size={18} color={eligibility.daysRemaining <= 3 ? '#ef4444' : '#22c55e'} />
            <Text style={[
              styles.timeText,
              eligibility.daysRemaining <= 3 && styles.timeTextUrgent
            ]}>
              {eligibility.daysRemaining} days left to create this voice
            </Text>
          </View>
        )}

        {/* Form - only show if eligible */}
        {eligibility?.eligible && (
          <>
            {/* Voice Name */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Singer Name *</Text>
              <TextInput
                style={styles.input}
                value={voiceName}
                onChangeText={setVoiceName}
                placeholder="e.g., Luna, Rock Star, Pop Diva..."
                placeholderTextColor={isDark ? '#666' : '#999'}
                maxLength={50}
              />
              <Text style={styles.inputHint}>
                {voiceName.length}/50 characters
              </Text>
            </View>

            {/* Voice Description */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={voiceDescription}
                onChangeText={setVoiceDescription}
                placeholder="Describe the vocal style, mood, or characteristics..."
                placeholderTextColor={isDark ? '#666' : '#999'}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.inputHint}>
                {voiceDescription.length}/200 characters
              </Text>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, (!canCreate || isCreating) && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!canCreate || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Create Synthetic Singer</Text>
                </>
              )}
            </TouchableOpacity>

            {isCreating && (
              <Text style={styles.creatingText}>
                Creating your Synthetic Singer... This may take a moment.
              </Text>
            )}
          </>
        )}

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Tips for Great Synthetic Singers</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Choose songs with clear, distinctive vocals for the best Synthetic Singer
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Use your Synthetic Singer with Custom Mode for new songs
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Build a collection of Synthetic Singers for different styles
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1a2a3a' : '#e8f4ff',
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
    color: isDark ? '#a0c4e8' : '#4a7ab0',
    lineHeight: 20,
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
  songLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: isDark ? '#888' : '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
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
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#3d2b00' : '#fff7e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDark ? '#5c4300' : '#ffd666',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#ffd666' : '#946200',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: isDark ? '#e6c366' : '#946200',
    lineHeight: 20,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1a2a1a' : '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22c55e',
  },
  timeTextUrgent: {
    color: '#ef4444',
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: isDark ? '#666' : '#999',
    marginTop: 6,
    textAlign: 'right',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3875e8',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: isDark ? '#333' : '#ccc',
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  creatingText: {
    fontSize: 14,
    color: isDark ? '#888' : '#666',
    textAlign: 'center',
    marginTop: 12,
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
    color: '#3875e8',
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
