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
import { ChevronLeft, Heart, Copy, CheckCircle, Pencil, Trash2, Save, X } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'

import { useCurrentUser } from '../../core/onboarding'
import { useLyricsDetail, useLyrics } from '../../hooks/useLyrics'

export default function LyricsDetailScreen({ navigation, route }) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const { lyricsId } = route.params || {}

  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  const { lyrics, lyricsLoading, lyricsError } = useLyricsDetail(lyricsId)
  const { updateLyrics, deleteLyrics, toggleFavorite } = useLyrics(userId)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Initialize edit fields when lyrics load
  React.useEffect(() => {
    if (lyrics) {
      setEditTitle(lyrics.title || '')
      setEditText(lyrics.text || '')
    }
  }, [lyrics])

  const handleCopyLyrics = useCallback(() => {
    if (lyrics?.text) {
      Clipboard.setStringAsync(lyrics.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [lyrics])

  const handleToggleFavorite = useCallback(async () => {
    if (lyricsId) {
      await toggleFavorite(lyricsId)
    }
  }, [lyricsId, toggleFavorite])

  const handleStartEditing = useCallback(() => {
    setIsEditing(true)
    setEditTitle(lyrics?.title || '')
    setEditText(lyrics?.text || '')
  }, [lyrics])

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditTitle(lyrics?.title || '')
    setEditText(lyrics?.text || '')
  }, [lyrics])

  const handleSaveEdits = useCallback(async () => {
    if (!lyricsId) return

    setSaving(true)
    try {
      const result = await updateLyrics(lyricsId, {
        title: editTitle.trim() || 'Untitled',
        text: editText,
      })

      if (result.success) {
        setIsEditing(false)
      } else {
        Alert.alert('Error', result.error || 'Failed to save changes')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [lyricsId, editTitle, editText, updateLyrics])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Lyrics',
      'Are you sure you want to delete these lyrics? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteLyrics(lyricsId)
            if (result.success) {
              navigation.goBack()
            } else {
              Alert.alert('Error', result.error || 'Failed to delete lyrics')
            }
          },
        },
      ]
    )
  }, [lyricsId, deleteLyrics, navigation])

  if (lyricsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Loading lyrics...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (lyricsError || !lyrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lyrics</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{lyricsError || 'Lyrics not found'}</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isEditing ? 'Edit Lyrics' : (lyrics.title || 'Lyrics')}
        </Text>
        {isEditing ? (
          <TouchableOpacity style={styles.backButton} onPress={handleCancelEditing}>
            <X size={24} color={isDark ? '#ffffff' : '#151723'} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backButton} onPress={handleToggleFavorite}>
            <Heart
              size={24}
              color={lyrics.isFavorite ? '#ef4444' : (isDark ? '#ffffff' : '#151723')}
              fill={lyrics.isFavorite ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {isEditing ? (
          /* Edit Mode */
          <>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.titleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Lyrics title"
                placeholderTextColor={isDark ? '#666' : '#999'}
                maxLength={100}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Lyrics</Text>
              <TextInput
                style={[styles.lyricsInput]}
                value={editText}
                onChangeText={setEditText}
                placeholder="Enter your lyrics..."
                placeholderTextColor={isDark ? '#666' : '#999'}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveEdits}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* View Mode */
          <>
            {/* Metadata */}
            <View style={styles.metadataCard}>
              {lyrics.prompt && (
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Original Prompt</Text>
                  <Text style={styles.metadataValue}>{lyrics.prompt}</Text>
                </View>
              )}
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Status</Text>
                <View style={styles.statusBadges}>
                  {lyrics.isEdited && (
                    <View style={styles.editedBadge}>
                      <Pencil size={12} color="#f59e0b" />
                      <Text style={styles.editedBadgeText}>Edited</Text>
                    </View>
                  )}
                  {lyrics.usedInSongs?.length > 0 && (
                    <View style={styles.usedBadge}>
                      <Text style={styles.usedBadgeText}>
                        Used in {lyrics.usedInSongs.length} song{lyrics.usedInSongs.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {!lyrics.isEdited && !lyrics.usedInSongs?.length && (
                    <Text style={styles.metadataValue}>New</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Lyrics Content */}
            <View style={styles.lyricsCard}>
              <View style={styles.lyricsHeader}>
                <Text style={styles.lyricsTitle}>{lyrics.title || 'Untitled'}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyLyrics}>
                  {copied ? (
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
                <Text style={styles.lyricsText}>{lyrics.text}</Text>
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editButton} onPress={handleStartEditing}>
                <Pencil size={18} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={18} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
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
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: isDark ? '#888' : '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  backLink: {
    padding: 12,
  },
  backLinkText: {
    fontSize: 16,
    color: '#ec4899',
    fontWeight: '600',
  },
  metadataCard: {
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metadataRow: {
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#888' : '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metadataValue: {
    fontSize: 14,
    color: isDark ? '#cccccc' : '#333333',
    lineHeight: 20,
  },
  statusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  editedBadgeText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  usedBadge: {
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usedBadgeText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  lyricsCard: {
    backgroundColor: isDark ? '#1c1c1e' : '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#e5e7eb',
    marginBottom: 20,
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
    maxHeight: 400,
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
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#2a1a1a' : '#fee2e2',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  // Edit Mode Styles
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: isDark ? '#ffffff' : '#151723',
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#e5e7eb',
  },
  lyricsInput: {
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: isDark ? '#ffffff' : '#151723',
    borderWidth: 1,
    borderColor: isDark ? '#333' : '#e5e7eb',
    minHeight: 300,
    lineHeight: 24,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
})
