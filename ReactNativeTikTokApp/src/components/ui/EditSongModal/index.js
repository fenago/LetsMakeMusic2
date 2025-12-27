/**
 * EditSongModal - Shared component for editing song metadata and rights
 * Used by both LibraryScreen and FullPlayer
 */
import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import ffirestore from '@react-native-firebase/firestore'
import { useTheme } from '../../../core/dopebase'
import { songsRef, recalculateLikeCount } from '../../../services/songsService'
import { DEFAULT_SONG_RIGHTS, mergeWithDefaultRights } from '../../../constants/songRights'

const EditSongModal = ({
  visible,
  song,
  onClose,
  onSongUpdated,
  onDeleteSong,
}) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]

  // Editable fields
  const [editTitle, setEditTitle] = useState('')
  const [editStyle, setEditStyle] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [editRights, setEditRights] = useState({ ...DEFAULT_SONG_RIGHTS })

  // Loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isFixingLikes, setIsFixingLikes] = useState(false)

  // Initialize form when song changes
  useEffect(() => {
    if (song) {
      setEditTitle(song.title || '')
      setEditStyle(song.style || '')
      setEditIsPublic(song.isPublic !== false)
      const songRights = mergeWithDefaultRights(song.rights || {})
      setEditRights(songRights)
    }
  }, [song])

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format date from Firestore timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Save edited song
  const handleSave = async () => {
    if (!song) return

    setIsSaving(true)
    try {
      const updates = {}

      if (editTitle.trim() !== song.title) {
        updates.title = editTitle.trim()
      }
      if (editStyle.trim() !== song.style) {
        updates.style = editStyle.trim()
      }
      const currentIsPublic = song.isPublic !== false
      if (editIsPublic !== currentIsPublic) {
        updates.isPublic = editIsPublic
      }

      // Sync visibility with isPublic for backwards compatibility
      const updatedRights = {
        ...editRights,
        visibility: editIsPublic ? 'public' : 'private',
      }
      updates.rights = updatedRights

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = ffirestore.FieldValue.serverTimestamp()
        await songsRef.doc(song.id).update(updates)
        console.log('Song updated:', song.id, updates)
      }

      onClose()
      if (onSongUpdated) {
        onSongUpdated({ ...song, ...updates })
      }
    } catch (error) {
      console.error('Error updating song:', error)
      Alert.alert('Error', 'Failed to update song.')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle fix likes
  const handleFixLikes = async () => {
    if (isFixingLikes || !song) return
    setIsFixingLikes(true)
    try {
      const newCount = await recalculateLikeCount(song.id)
      Alert.alert('Fixed!', `Like count corrected to ${newCount}`)
    } catch (error) {
      console.error('Error fixing likes:', error)
      Alert.alert('Error', 'Failed to fix like count')
    } finally {
      setIsFixingLikes(false)
    }
  }

  // Handle delete
  const handleDelete = () => {
    onClose()
    if (onDeleteSong) {
      onDeleteSong(song)
    }
  }

  // Metadata row component
  const MetadataRow = ({ label, value }) => (
    <View style={styles.metadataRow}>
      <Text style={[styles.metadataLabel, { color: colorSet.secondaryText }]}>{label}</Text>
      <Text
        style={[styles.metadataValue, { color: colorSet.primaryText }]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value || 'N/A'}
      </Text>
    </View>
  )

  // Rights toggle component
  const RightsToggle = ({ label, subtext, value, onToggle, disabled = false }) => (
    <View style={styles.rightsToggleRow}>
      <View style={styles.rightsLabelContainer}>
        <Text style={[styles.rightsLabel, { color: colorSet.primaryText }]}>{label}</Text>
        <Text style={[styles.rightsSubtext, { color: colorSet.secondaryText }]}>{subtext}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          value && !disabled && styles.toggleButtonActive,
          disabled && styles.toggleButtonDisabled,
          { borderColor: value && !disabled ? colorSet.primaryForeground : colorSet.grey6 },
        ]}
        onPress={onToggle}
        disabled={disabled}
      >
        <Text style={[
          styles.toggleButtonText,
          { color: disabled ? colorSet.grey6 : (value ? colorSet.primaryForeground : colorSet.secondaryText) },
        ]}>
          {value ? 'Yes' : 'No'}
        </Text>
      </TouchableOpacity>
    </View>
  )

  if (!song) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colorSet.primaryBackground }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colorSet.grey3 }]}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={[styles.modalCloseText, { color: colorSet.secondaryText }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colorSet.primaryText }]}>Edit Song</Text>
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colorSet.primaryForeground} />
            ) : (
              <Text style={[styles.modalSaveText, { color: colorSet.primaryForeground }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Song Cover Image */}
          <View style={styles.editImageContainer}>
            {song.imageUrl ? (
              <Image
                source={{ uri: song.imageUrl }}
                style={styles.editSongImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.editSongImagePlaceholder, { backgroundColor: colorSet.grey3 }]}>
                <Image
                  source={theme.icons.musicalNotes}
                  style={[styles.editPlaceholderIcon, { tintColor: colorSet.grey9 }]}
                />
              </View>
            )}
          </View>

          {/* Editable Fields */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Editable</Text>

            <View style={styles.editField}>
              <Text style={[styles.editFieldLabel, { color: colorSet.secondaryText }]}>Title</Text>
              <TextInput
                style={[styles.editInput, {
                  color: colorSet.primaryText,
                  backgroundColor: colorSet.grey3,
                  borderColor: colorSet.grey6,
                }]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Song title"
                placeholderTextColor={colorSet.secondaryText}
              />
            </View>

            <View style={styles.editField}>
              <Text style={[styles.editFieldLabel, { color: colorSet.secondaryText }]}>Style / Genre</Text>
              <TextInput
                style={[styles.editInput, {
                  color: colorSet.primaryText,
                  backgroundColor: colorSet.grey3,
                  borderColor: colorSet.grey6,
                }]}
                value={editStyle}
                onChangeText={setEditStyle}
                placeholder="e.g., Pop, Rock, Jazz"
                placeholderTextColor={colorSet.secondaryText}
              />
            </View>
          </View>

          {/* Read-Only Metadata */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Song Info</Text>
            <MetadataRow label="Duration" value={formatDuration(song.duration)} />
            <MetadataRow label="Instrumental" value={song.instrumental ? 'Yes' : 'No'} />
            <MetadataRow label="AI Model" value={song.model || song.sunoModelName || 'Unknown'} />
            <MetadataRow label="Play Count" value={String(song.playCount || 0)} />
            <View style={styles.likesRowContainer}>
              <View style={{ flex: 1 }}>
                <MetadataRow label="Likes" value={String(song.likeCount || 0)} />
              </View>
              {(song.likeCount < 0 || song.likeCount === undefined) && (
                <TouchableOpacity
                  style={[
                    styles.fixLikesButton,
                    { backgroundColor: colorSet.primaryForeground },
                    isFixingLikes && styles.fixLikesButtonDisabled,
                  ]}
                  onPress={handleFixLikes}
                  disabled={isFixingLikes}
                >
                  {isFixingLikes ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.fixLikesButtonText}>Fix</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <MetadataRow label="Comments" value={String(song.commentCount || 0)} />
          </View>

          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Dates</Text>
            <MetadataRow label="Created" value={formatDate(song.createdAt)} />
            <MetadataRow label="Updated" value={formatDate(song.updatedAt)} />
            {song.sunoCreatedAt && (
              <MetadataRow label="Suno Created" value={song.sunoCreatedAt} />
            )}
          </View>

          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Technical IDs</Text>
            <MetadataRow label="Firebase ID" value={song.id} />
            <MetadataRow label="Suno ID" value={song.sunoId} />
            <MetadataRow label="User ID" value={song.userId} />
          </View>

          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Audio URLs</Text>
            <MetadataRow label="Suno CDN" value={song.sunoId ? `cdn1.suno.ai/${song.sunoId}.mp3` : 'N/A'} />
            <MetadataRow label="Firebase Backup" value={song.firebaseAudioUrl ? 'Available' : 'Not backed up'} />
            <MetadataRow label="Stream URL" value={song.streamUrl} />
            <MetadataRow label="Audio URL" value={song.audioUrl} />
          </View>

          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Lyrics</Text>
            <MetadataRow label="Has Raw Lyrics" value={song.rawLyrics ? 'Yes' : 'No'} />
            <MetadataRow label="Timestamped Lines" value={String(song.timestampedLyrics?.length || 0)} />
            {song.rawLyrics && (
              <View style={[styles.lyricsPreview, { backgroundColor: colorSet.grey3 }]}>
                <Text
                  style={[styles.lyricsPreviewText, { color: colorSet.secondaryText }]}
                  numberOfLines={6}
                >
                  {song.rawLyrics}
                </Text>
              </View>
            )}
          </View>

          {/* Visibility */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Visibility</Text>
            <View style={styles.visibilityButtonRow}>
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  editIsPublic && styles.visibilityButtonActive,
                  { borderColor: editIsPublic ? colorSet.primaryForeground : colorSet.grey6 },
                ]}
                onPress={() => setEditIsPublic(true)}
              >
                <Text style={[
                  styles.visibilityButtonText,
                  { color: editIsPublic ? colorSet.primaryForeground : colorSet.secondaryText },
                ]}>
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.visibilityButton,
                  !editIsPublic && styles.visibilityButtonActive,
                  { borderColor: !editIsPublic ? colorSet.primaryForeground : colorSet.grey6 },
                ]}
                onPress={() => setEditIsPublic(false)}
              >
                <Text style={[
                  styles.visibilityButtonText,
                  { color: !editIsPublic ? colorSet.primaryForeground : colorSet.secondaryText },
                ]}>
                  Private
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.visibilityDescription, { color: colorSet.secondaryText }]}>
              {editIsPublic ? 'Everyone can see this song in Discover' : 'Only you can see this song'}
            </Text>
            <MetadataRow label="Deleted" value={song.isDeleted ? 'Yes' : 'No'} />
          </View>

          {/* Song Rights - Derivative Works */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>
              Derivative Works (What Others Can Do)
            </Text>
            <Text style={[styles.rightsDescription, { color: colorSet.secondaryText }]}>
              Control what other users can do with your song
            </Text>

            <RightsToggle
              label="Allow Extend"
              subtext="Others can extend/continue your song"
              value={editRights.allowExtend}
              onToggle={() => setEditRights(prev => ({ ...prev, allowExtend: !prev.allowExtend }))}
            />

            <RightsToggle
              label="Allow Lyrics Use"
              subtext="Others can use your lyrics"
              value={editRights.allowLyricsUse}
              onToggle={() => setEditRights(prev => ({ ...prev, allowLyricsUse: !prev.allowLyricsUse }))}
            />

            <RightsToggle
              label="Allow Video Creation"
              subtext="Others can create videos with this song"
              value={editRights.allowVideoCreation}
              onToggle={() => setEditRights(prev => ({ ...prev, allowVideoCreation: !prev.allowVideoCreation }))}
            />

            <RightsToggle
              label="Allow Stem Extraction"
              subtext="Coming Soon"
              value={editRights.allowStemExtraction}
              disabled={true}
            />

            <RightsToggle
              label="Allow WAV Export"
              subtext="Coming Soon"
              value={editRights.allowWavExport}
              disabled={true}
            />

            <RightsToggle
              label="Allow Reinterpret (Cover)"
              subtext="Coming Soon"
              value={editRights.allowReinterpret}
              disabled={true}
            />

            <RightsToggle
              label="Allow Sampling"
              subtext="Coming Soon"
              value={editRights.allowSampling}
              disabled={true}
            />

            <RightsToggle
              label="Allow Persona Creation"
              subtext="Coming Soon"
              value={editRights.allowPersonaCreation}
              disabled={true}
            />
          </View>

          {/* Attribution */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Attribution</Text>

            <RightsToggle
              label="Require Attribution"
              subtext="Credit required when used"
              value={editRights.requireAttribution}
              onToggle={() => setEditRights(prev => ({ ...prev, requireAttribution: !prev.requireAttribution }))}
            />

            {editRights.requireAttribution && (
              <View style={styles.editField}>
                <Text style={[styles.editFieldLabel, { color: colorSet.secondaryText }]}>Attribution Text</Text>
                <TextInput
                  style={[styles.editInput, {
                    color: colorSet.primaryText,
                    backgroundColor: colorSet.grey3,
                    borderColor: colorSet.grey6,
                  }]}
                  value={editRights.attributionText || ''}
                  onChangeText={(text) => setEditRights(prev => ({ ...prev, attributionText: text }))}
                  placeholder="e.g., Credit to @username"
                  placeholderTextColor={colorSet.secondaryText}
                />
              </View>
            )}
          </View>

          {/* Monetization */}
          <View style={styles.editSection}>
            <Text style={[styles.editSectionTitle, { color: colorSet.primaryText }]}>Monetization</Text>
            <Text style={[styles.rightsDescription, { color: colorSet.secondaryText }]}>
              Monetization features coming soon
            </Text>

            <RightsToggle
              label="Allow Tipping"
              subtext="Coming Soon"
              value={editRights.allowTipping}
              disabled={true}
            />

            <RightsToggle
              label="Allow Commercial Use"
              subtext="Coming Soon"
              value={editRights.allowCommercialUse}
              disabled={true}
            />
          </View>

          {/* Danger Zone */}
          <View style={[styles.editSection, styles.dangerSection]}>
            <Text style={[styles.editSectionTitle, { color: '#ff4444' }]}>Danger Zone</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Delete Song</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
    minWidth: 60,
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  editSongImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  editSongImagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPlaceholderIcon: {
    width: 60,
    height: 60,
  },
  editSection: {
    marginBottom: 24,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  editField: {
    marginBottom: 16,
  },
  editFieldLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  editInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  metadataLabel: {
    fontSize: 14,
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  likesRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fixLikesButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  fixLikesButtonDisabled: {
    opacity: 0.6,
  },
  fixLikesButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  lyricsPreview: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  lyricsPreviewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  visibilityButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  visibilityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  visibilityButtonActive: {
    backgroundColor: 'rgba(56, 117, 232, 0.1)',
  },
  visibilityButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  visibilityDescription: {
    fontSize: 12,
    marginBottom: 12,
  },
  rightsDescription: {
    fontSize: 12,
    marginBottom: 12,
  },
  rightsToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  rightsLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  rightsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  rightsSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dangerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.3)',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default EditSongModal
