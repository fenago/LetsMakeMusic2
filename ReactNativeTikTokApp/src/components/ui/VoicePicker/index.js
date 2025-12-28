/**
 * VoicePicker - Component for selecting Synthetic Singers during song creation
 *
 * Used in CreateScreen Custom Mode to apply a saved vocal style to new songs.
 * Synthetic Singers (Suno Personas) only work with customMode: true.
 */

import React, { useState, useEffect, useCallback } from 'react'
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
import { Mic, ChevronDown, X, Music, Check } from 'lucide-react-native'

import { useCurrentUser } from '../../../core/onboarding'
import { subscribeToUserVoices } from '../../../services/artistVoiceService'

/**
 * VoicePicker Component
 *
 * @param {Object} props
 * @param {Object|null} props.selectedVoice - Currently selected voice object
 * @param {function} props.onSelect - Callback when a voice is selected (receives voice object or null)
 * @param {boolean} props.disabled - Whether the picker is disabled
 * @param {Object} props.style - Additional container styles
 */
export default function VoicePicker({ selectedVoice, onSelect, disabled = false, style }) {
  const currentUser = useCurrentUser()
  const [voices, setVoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Subscribe to user's Synthetic Singers
  useEffect(() => {
    if (!currentUser?.id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const unsubscribe = subscribeToUserVoices(
      currentUser.id,
      (updatedVoices) => {
        setVoices(updatedVoices)
        setIsLoading(false)
      },
      (error) => {
        console.error('[VoicePicker] Error fetching voices:', error)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
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
        <View style={styles.emptyState}>
          <Mic size={18} color="#666" />
          <Text style={styles.emptyText}>No Synthetic Singers yet</Text>
        </View>
        <Text style={styles.hintText}>
          Create one from a song using the menu
        </Text>
      </View>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Loading voices...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      {/* Picker Button */}
      <TouchableOpacity
        style={[styles.pickerButton, disabled && styles.pickerButtonDisabled]}
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
              <View style={[styles.voiceImage, styles.voiceImagePlaceholder]}>
                <Mic size={14} color="#888" />
              </View>
            )}
            <View style={styles.selectedVoiceInfo}>
              <Text style={styles.selectedVoiceName} numberOfLines={1}>
                {selectedVoice.name}
              </Text>
              <Text style={styles.selectedVoiceSource} numberOfLines={1}>
                From: {selectedVoice.sourceSong?.title || 'Unknown'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSelection}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color="#888" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContent}>
            <Mic size={18} color="#6366F1" />
            <Text style={styles.placeholderText}>Select Synthetic Singer</Text>
            <ChevronDown size={18} color="#666" />
          </View>
        )}
      </TouchableOpacity>

      {/* Voices count hint */}
      <Text style={styles.voicesCount}>
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
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Synthetic Singer</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsModalOpen(false)}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
              <Mic size={16} color="#6366F1" />
              <Text style={styles.infoBannerText}>
                Synthetic Singers apply a saved vocal style to your new song
              </Text>
            </View>

            {/* No selection option */}
            <TouchableOpacity
              style={[
                styles.voiceItem,
                !selectedVoice && styles.voiceItemSelected,
              ]}
              onPress={() => handleSelectVoice(null)}
            >
              <View style={[styles.voiceImage, styles.voiceImagePlaceholder]}>
                <Music size={18} color="#888" />
              </View>
              <View style={styles.voiceItemInfo}>
                <Text style={styles.voiceItemName}>No Voice (Default)</Text>
                <Text style={styles.voiceItemDesc}>AI generates a new voice</Text>
              </View>
              {!selectedVoice && (
                <Check size={20} color="#22c55e" />
              )}
            </TouchableOpacity>

            {/* Voices list */}
            <FlatList
              data={voices}
              keyExtractor={(item) => item.id}
              style={styles.voicesList}
              contentContainerStyle={styles.voicesListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.voiceItem,
                    selectedVoice?.id === item.id && styles.voiceItemSelected,
                  ]}
                  onPress={() => handleSelectVoice(item)}
                >
                  {item.sourceSong?.imageUrl ? (
                    <Image
                      source={{ uri: item.sourceSong.imageUrl }}
                      style={styles.voiceImage}
                    />
                  ) : (
                    <View style={[styles.voiceImage, styles.voiceImagePlaceholder]}>
                      <Mic size={18} color="#888" />
                    </View>
                  )}
                  <View style={styles.voiceItemInfo}>
                    <Text style={styles.voiceItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.voiceItemDesc} numberOfLines={1}>
                      From: {item.sourceSong?.title || 'Unknown'}
                    </Text>
                    {item.usageCount > 0 && (
                      <Text style={styles.voiceItemUsage}>
                        Used {item.usageCount} time{item.usageCount !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                  {selectedVoice?.id === item.id && (
                    <Check size={20} color="#22c55e" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>No voices found</Text>
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  pickerButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#888',
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
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedVoiceInfo: {
    flex: 1,
  },
  selectedVoiceName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedVoiceSource: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  voicesCount: {
    color: '#666',
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
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34, // Safe area
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoBannerText: {
    color: '#a0a0ff',
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
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  voiceItemSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a2a1a',
  },
  voiceItemInfo: {
    flex: 1,
  },
  voiceItemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  voiceItemDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  voiceItemUsage: {
    color: '#6366F1',
    fontSize: 11,
    marginTop: 4,
  },
  emptyListText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
})
