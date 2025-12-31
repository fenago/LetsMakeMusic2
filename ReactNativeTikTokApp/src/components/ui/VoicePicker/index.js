/**
 * VoicePicker - Component for selecting Synthetic Singers during song creation
 *
 * Used in CreateScreen Custom Mode to apply a saved vocal style to new songs.
 * Synthetic Singers (Suno Personas) only work with customMode: true.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native'
import { Mic, ChevronDown, X, Music, Check, Info } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'

import { useCurrentUser } from '../../../core/onboarding'
import { useTheme } from '../../../core/dopebase'
import { subscribeToUserVoices } from '../../../services/artistVoiceService'

// Brand colors for theming
const BRAND_COLORS = {
  light: {
    primary: '#1F979E',
    secondary: '#C12D79',
    accent: '#6366F1',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F3F5',
    textPrimary: '#212529',
    textSecondary: '#6C757D',
    textMuted: '#ADB5BD',
    border: '#DEE2E6',
    success: '#22c55e',
    successBg: '#dcfce7',
  },
  dark: {
    primary: '#20B2AA',
    secondary: '#D81B60',
    accent: '#6366F1',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceSecondary: '#252525',
    textPrimary: '#F5F5F5',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',
    border: '#333333',
    success: '#22c55e',
    successBg: '#1a2a1a',
  },
}

/**
 * VoicePicker Component
 *
 * @param {Object} props
 * @param {Object|null} props.selectedVoice - Currently selected voice object
 * @param {function} props.onSelect - Callback when a voice is selected (receives voice object or null)
 * @param {boolean} props.disabled - Whether the picker is disabled
 * @param {Object} props.style - Additional container styles
 */
export default function VoicePicker({ selectedVoice, onSelect, disabled = false, style, showProfileButton = true }) {
  const currentUser = useCurrentUser()
  const navigation = useNavigation()
  const { appearance } = useTheme()
  const colors = BRAND_COLORS[appearance] || BRAND_COLORS.dark

  const [voices, setVoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Navigate to voice profile
  const handleViewProfile = useCallback((voice) => {
    setIsModalOpen(false)
    navigation.navigate('SyntheticSingerProfile', {
      voiceId: voice.id,
      userId: currentUser?.id,
    })
  }, [navigation, currentUser?.id])

  // Subscribe to user's Synthetic Singers
  useEffect(() => {
    console.log('[VoicePicker] useEffect running, currentUser?.id:', currentUser?.id)

    if (!currentUser?.id) {
      console.log('[VoicePicker] No currentUser.id, setting loading to false')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let receivedData = false
    console.log('[VoicePicker] Setting up subscription for user:', currentUser.id)

    // Timeout fallback - if no response in 5 seconds, stop loading
    const timeoutId = setTimeout(() => {
      if (!receivedData) {
        console.warn('[VoicePicker] Subscription timeout - no response after 5s')
        setIsLoading(false)
      }
    }, 5000)

    const unsubscribe = subscribeToUserVoices(
      currentUser.id,
      (updatedVoices) => {
        receivedData = true
        clearTimeout(timeoutId)
        console.log('[VoicePicker] Subscription success, voices count:', updatedVoices.length, updatedVoices)
        setVoices(updatedVoices)
        setIsLoading(false)
      },
      (error) => {
        receivedData = true
        clearTimeout(timeoutId)
        console.error('[VoicePicker] Error fetching voices:', error)
        setIsLoading(false)
      }
    )

    return () => {
      console.log('[VoicePicker] Cleaning up subscription')
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [currentUser?.id])

  const handleOpenModal = useCallback(() => {
    if (!disabled && voices.length > 0) {
      setIsModalOpen(true)
    }
  }, [disabled, voices.length])

  const handleSelectVoice = useCallback((voice) => {
    onSelect?.(voice)
    setIsModalOpen(false)
  }, [onSelect])

  const handleClearSelection = useCallback(() => {
    onSelect?.(null)
  }, [onSelect])

  // No voices available
  if (!isLoading && voices.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Mic size={18} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No Synthetic Singers yet</Text>
        </View>
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          Create one from a song using the menu
        </Text>
      </View>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading voices...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      {/* Picker Button */}
      <TouchableOpacity
        style={[
          styles.pickerButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
          disabled && styles.pickerButtonDisabled,
        ]}
        onPress={handleOpenModal}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {selectedVoice ? (
          <View style={styles.selectedVoiceContent}>
            {selectedVoice.sourceSong?.imageUrl ? (
              <Image
                source={{ uri: selectedVoice.sourceSong.imageUrl }}
                style={styles.voiceImage}
              />
            ) : (
              <View style={[styles.voiceImage, styles.voiceImagePlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                <Mic size={14} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.selectedVoiceInfo}>
              <Text style={[styles.selectedVoiceName, { color: colors.textPrimary }]} numberOfLines={1}>
                {selectedVoice.name}
              </Text>
              <Text style={[styles.selectedVoiceSource, { color: colors.textSecondary }]} numberOfLines={1}>
                From: {selectedVoice.sourceSong?.title || 'Unknown'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSelection}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContent}>
            <Mic size={18} color={colors.accent} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Select Synthetic Singer</Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </View>
        )}
      </TouchableOpacity>

      {/* Voices count hint */}
      <Text style={[styles.voicesCount, { color: colors.textMuted }]}>
        {voices.length} voice{voices.length !== 1 ? 's' : ''} available
      </Text>

      {/* Selection Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Synthetic Singer</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsModalOpen(false)}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Info banner */}
            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceSecondary }]}>
              <Mic size={16} color={colors.accent} />
              <Text style={[styles.infoBannerText, { color: colors.accent }]}>
                Synthetic Singers apply a saved vocal style to your new song
              </Text>
            </View>

            {/* Voices list with No Voice option as header */}
            <FlatList
              data={voices}
              keyExtractor={(item) => item.id}
              style={styles.voicesList}
              contentContainerStyle={styles.voicesListContent}
              showsVerticalScrollIndicator={true}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[
                    styles.voiceItem,
                    { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 10 },
                    !selectedVoice && [styles.voiceItemSelected, { borderColor: colors.success, backgroundColor: colors.successBg }],
                  ]}
                  onPress={() => handleSelectVoice(null)}
                >
                  <View style={[styles.voiceImage, styles.voiceImagePlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                    <Music size={18} color={colors.textSecondary} />
                  </View>
                  <View style={styles.voiceItemInfo}>
                    <Text style={[styles.voiceItemName, { color: colors.textPrimary }]}>No Voice (Default)</Text>
                    <Text style={[styles.voiceItemDesc, { color: colors.textSecondary }]}>AI generates a new voice</Text>
                  </View>
                  {!selectedVoice && (
                    <Check size={20} color={colors.success} />
                  )}
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <View style={styles.voiceItemContainer}>
                  <TouchableOpacity
                    style={[
                      styles.voiceItem,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectedVoice?.id === item.id && [styles.voiceItemSelected, { borderColor: colors.success, backgroundColor: colors.successBg }],
                    ]}
                    onPress={() => handleSelectVoice(item)}
                  >
                    {item.sourceSong?.imageUrl ? (
                      <Image
                        source={{ uri: item.sourceSong.imageUrl }}
                        style={styles.voiceImage}
                      />
                    ) : (
                      <View style={[styles.voiceImage, styles.voiceImagePlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                        <Mic size={18} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.voiceItemInfo}>
                      <Text style={[styles.voiceItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.voiceItemDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        From: {item.sourceSong?.title || 'Unknown'}
                      </Text>
                      {item.usageCount > 0 && (
                        <Text style={[styles.voiceItemUsage, { color: colors.accent }]}>
                          Used {item.usageCount} time{item.usageCount !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    {selectedVoice?.id === item.id && (
                      <Check size={20} color={colors.success} />
                    )}
                  </TouchableOpacity>
                  {showProfileButton && (
                    <TouchableOpacity
                      style={styles.profileButton}
                      onPress={() => handleViewProfile(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Info size={18} color={colors.accent} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyListText, { color: colors.textMuted }]}>No voices found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    flex: 1,
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  pickerButton: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  pickerButtonDisabled: {
    opacity: 0.5,
  },
  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeholderText: {
    fontSize: 15,
    flex: 1,
  },
  selectedVoiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  voiceImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedVoiceInfo: {
    flex: 1,
  },
  selectedVoiceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedVoiceSource: {
    fontSize: 12,
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  voicesCount: {
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoBannerText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  voicesList: {
    flex: 1,
  },
  voicesListContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40, // Safe area padding
  },
  voiceItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voiceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
  },
  voiceItemSelected: {
    // Overridden inline with dynamic colors
  },
  voiceItemInfo: {
    flex: 1,
  },
  voiceItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  voiceItemDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  voiceItemUsage: {
    fontSize: 11,
    marginTop: 4,
  },
  emptyListText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
})
