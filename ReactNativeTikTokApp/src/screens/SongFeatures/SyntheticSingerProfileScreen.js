/**
 * SyntheticSingerProfileScreen - View/Edit Synthetic Singer Profile
 *
 * Displays the full profile of a Synthetic Singer including:
 * - Avatar (editable)
 * - Name, bio, backstory, genre
 * - Source song reference
 * - Usage stats
 * - Songs created with this singer
 */

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
  FlatList,
} from 'react-native'
import {
  ChevronLeft,
  Mic,
  Music,
  Edit2,
  Save,
  X,
  Trash2,
  Play,
  Clock,
  User,
} from 'lucide-react-native'

import { useCurrentUser } from '../../core/onboarding'
import { useMediaPlayer } from '../../contexts/MediaPlayerContext'
import {
  getVoiceById,
  updateVoice,
  deleteVoice,
  getSongsBySinger,
} from '../../services/artistVoiceService'

export default function SyntheticSingerProfileScreen({ navigation, route }) {
  const { voiceId, userId: routeUserId } = route.params || {}

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()
  const { loadMedia } = useMediaPlayer()

  // Voice data
  const [voice, setVoice] = useState(null)
  const [songs, setSongs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedBio, setEditedBio] = useState('')
  const [editedBackstory, setEditedBackstory] = useState('')
  const [editedGenre, setEditedGenre] = useState('')

  // Determine which user owns this voice
  const ownerId = routeUserId || currentUser?.id
  const isOwner = currentUser?.id === voice?.managerId

  // Fetch voice data
  useEffect(() => {
    const fetchVoice = async () => {
      if (!voiceId || !ownerId) {
        setError('Missing voice or user information')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const voiceData = await getVoiceById(ownerId, voiceId)

        if (!voiceData) {
          setError('Synthetic Singer not found')
          setIsLoading(false)
          return
        }

        setVoice(voiceData)

        // Pre-fill edit fields
        setEditedName(voiceData.name || '')
        setEditedDescription(voiceData.description || '')
        setEditedBio(voiceData.bio || '')
        setEditedBackstory(voiceData.backstory || '')
        setEditedGenre(voiceData.genre || '')

        // Fetch songs created with this singer
        const singerSongs = await getSongsBySinger(voiceId)
        setSongs(singerSongs)
      } catch (err) {
        console.error('[SyntheticSingerProfile] Error fetching voice:', err)
        setError('Failed to load Synthetic Singer')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVoice()
  }, [voiceId, ownerId])

  const handleStartEditing = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleCancelEditing = useCallback(() => {
    // Reset to original values
    setEditedName(voice?.name || '')
    setEditedDescription(voice?.description || '')
    setEditedBio(voice?.bio || '')
    setEditedBackstory(voice?.backstory || '')
    setEditedGenre(voice?.genre || '')
    setIsEditing(false)
  }, [voice])

  const handleSave = useCallback(async () => {
    if (!editedName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your Synthetic Singer.')
      return
    }

    setIsSaving(true)

    try {
      await updateVoice(ownerId, voiceId, {
        name: editedName.trim(),
        description: editedDescription.trim(),
        bio: editedBio.trim(),
        backstory: editedBackstory.trim(),
        genre: editedGenre.trim(),
      })

      // Update local state
      setVoice((prev) => ({
        ...prev,
        name: editedName.trim(),
        description: editedDescription.trim(),
        bio: editedBio.trim(),
        backstory: editedBackstory.trim(),
        genre: editedGenre.trim(),
      }))

      setIsEditing(false)
      Alert.alert('Saved', 'Your Synthetic Singer has been updated.')
    } catch (err) {
      console.error('[SyntheticSingerProfile] Error saving:', err)
      Alert.alert('Error', 'Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [ownerId, voiceId, editedName, editedDescription, editedBio, editedBackstory, editedGenre])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Synthetic Singer',
      `Are you sure you want to delete "${voice?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVoice(ownerId, voiceId)
              Alert.alert('Deleted', 'Synthetic Singer has been deleted.')
              navigation.goBack()
            } catch (err) {
              console.error('[SyntheticSingerProfile] Error deleting:', err)
              Alert.alert('Error', 'Failed to delete. Please try again.')
            }
          },
        },
      ]
    )
  }, [voice, ownerId, voiceId, navigation])

  const handlePlaySong = useCallback(
    (song) => {
      if (song?.audioUrl || song?.audio_url) {
        loadMedia(song)
      }
    },
    [loadMedia]
  )

  const handleViewSourceSong = useCallback(() => {
    if (voice?.sourceSong?.songId) {
      // Navigate to song detail or play it
      // For now, just show an alert
      Alert.alert('Source Song', `This voice was created from "${voice.sourceSong.title}"`)
    }
  }, [voice])

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Synthetic Singer</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (error || !voice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Synthetic Singer</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Mic size={48} color="#666" />
          <Text style={styles.errorText}>{error || 'Synthetic Singer not found'}</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const avatarSource = voice.avatarUrl || voice.sourceSong?.imageUrl

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Profile' : 'Synthetic Singer'}
        </Text>
        {isOwner && (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={isEditing ? handleCancelEditing : handleStartEditing}
          >
            {isEditing ? (
              <X size={24} color={isDark ? '#fff' : '#000'} />
            ) : (
              <Edit2 size={22} color={isDark ? '#fff' : '#000'} />
            )}
          </TouchableOpacity>
        )}
        {!isOwner && <View style={styles.backButton} />}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {avatarSource ? (
            <Image source={{ uri: avatarSource }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Mic size={40} color="#888" />
            </View>
          )}

          {/* Name - editable or display */}
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Singer Name"
              placeholderTextColor={isDark ? '#666' : '#999'}
              maxLength={50}
            />
          ) : (
            <Text style={styles.singerName}>{voice.name}</Text>
          )}

          {/* Bio - editable or display */}
          {isEditing ? (
            <TextInput
              style={styles.bioInput}
              value={editedBio}
              onChangeText={setEditedBio}
              placeholder="Short bio or tagline..."
              placeholderTextColor={isDark ? '#666' : '#999'}
              maxLength={100}
            />
          ) : voice.bio ? (
            <Text style={styles.singerBio}>{voice.bio}</Text>
          ) : null}

          {/* Genre */}
          {isEditing ? (
            <TextInput
              style={styles.genreInput}
              value={editedGenre}
              onChangeText={setEditedGenre}
              placeholder="Genre (e.g., Pop, Rock, Jazz)"
              placeholderTextColor={isDark ? '#666' : '#999'}
              maxLength={50}
            />
          ) : voice.genre ? (
            <View style={styles.genreTag}>
              <Music size={14} color="#6366F1" />
              <Text style={styles.genreText}>{voice.genre}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{voice.usageCount || 0}</Text>
            <Text style={styles.statLabel}>Songs Created</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {voice.createdAt
                ? new Date(voice.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {voice.lastUsedAt
                ? new Date(voice.lastUsedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Never'}
            </Text>
            <Text style={styles.statLabel}>Last Used</Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Describe the vocal style and characteristics..."
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              maxLength={200}
            />
          ) : (
            <Text style={styles.sectionText}>
              {voice.description || 'No description provided.'}
            </Text>
          )}
        </View>

        {/* Backstory Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backstory</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.largeTextArea]}
              value={editedBackstory}
              onChangeText={setEditedBackstory}
              placeholder="Write a backstory for your Synthetic Singer..."
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              maxLength={500}
            />
          ) : (
            <Text style={styles.sectionText}>
              {voice.backstory || 'No backstory written yet.'}
            </Text>
          )}
        </View>

        {/* Source Song Section */}
        {voice.sourceSong && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Source Song</Text>
            <TouchableOpacity style={styles.sourceSongCard} onPress={handleViewSourceSong}>
              {voice.sourceSong.imageUrl ? (
                <Image source={{ uri: voice.sourceSong.imageUrl }} style={styles.sourceSongImage} />
              ) : (
                <View style={[styles.sourceSongImage, styles.sourceSongImagePlaceholder]}>
                  <Music size={20} color="#888" />
                </View>
              )}
              <View style={styles.sourceSongInfo}>
                <Text style={styles.sourceSongTitle} numberOfLines={1}>
                  {voice.sourceSong.title}
                </Text>
                {voice.sourceSong.style && (
                  <Text style={styles.sourceSongStyle} numberOfLines={1}>
                    {voice.sourceSong.style}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Songs Created with This Singer */}
        {songs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Songs by {voice.name}</Text>
            {songs.slice(0, 5).map((song) => (
              <TouchableOpacity
                key={song.id}
                style={styles.songItem}
                onPress={() => handlePlaySong(song)}
              >
                {song.imageUrl || song.image_url ? (
                  <Image
                    source={{ uri: song.imageUrl || song.image_url }}
                    style={styles.songItemImage}
                  />
                ) : (
                  <View style={[styles.songItemImage, styles.songItemImagePlaceholder]}>
                    <Music size={16} color="#888" />
                  </View>
                )}
                <View style={styles.songItemInfo}>
                  <Text style={styles.songItemTitle} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={styles.songItemDate}>
                    {song.createdAt?.toLocaleDateString() || 'Unknown date'}
                  </Text>
                </View>
                <Play size={20} color="#6366F1" />
              </TouchableOpacity>
            ))}
            {songs.length > 5 && (
              <Text style={styles.moreSongsText}>+{songs.length - 5} more songs</Text>
            )}
          </View>
        )}

        {/* Manager Info */}
        {isOwner && (
          <View style={styles.managerSection}>
            <User size={16} color="#888" />
            <Text style={styles.managerText}>You are the manager of this Synthetic Singer</Text>
          </View>
        )}

        {/* Save Button - when editing */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Delete Button - only when editing and owner */}
        {isEditing && isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={18} color="#ef4444" />
            <Text style={styles.deleteButtonText}>Delete Synthetic Singer</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const getStyles = (isDark) =>
  StyleSheet.create({
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
    headerAction: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 16,
      color: isDark ? '#888' : '#666',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 16,
    },
    errorText: {
      fontSize: 16,
      color: isDark ? '#888' : '#666',
      textAlign: 'center',
    },
    goBackButton: {
      backgroundColor: '#6366F1',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    goBackButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 120,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 16,
    },
    avatarPlaceholder: {
      backgroundColor: isDark ? '#333' : '#ddd',
      justifyContent: 'center',
      alignItems: 'center',
    },
    singerName: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#151723',
      marginBottom: 8,
      textAlign: 'center',
    },
    nameInput: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#151723',
      marginBottom: 8,
      textAlign: 'center',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#444' : '#ddd',
      paddingBottom: 4,
      minWidth: 200,
    },
    singerBio: {
      fontSize: 16,
      color: isDark ? '#aaa' : '#666',
      textAlign: 'center',
      marginBottom: 8,
    },
    bioInput: {
      fontSize: 16,
      color: isDark ? '#aaa' : '#666',
      textAlign: 'center',
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#444' : '#ddd',
      paddingBottom: 4,
      minWidth: 200,
    },
    genreTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1a1a2e' : '#e8e8ff',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    genreText: {
      fontSize: 14,
      color: '#6366F1',
      fontWeight: '500',
    },
    genreInput: {
      fontSize: 14,
      color: '#6366F1',
      textAlign: 'center',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#444' : '#ddd',
      paddingBottom: 4,
      minWidth: 150,
    },
    statsSection: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#151723',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
    },
    statDivider: {
      width: 1,
      backgroundColor: isDark ? '#333' : '#ddd',
      marginHorizontal: 8,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#151723',
      marginBottom: 12,
    },
    sectionText: {
      fontSize: 15,
      color: isDark ? '#aaa' : '#666',
      lineHeight: 22,
    },
    input: {
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: isDark ? '#ffffff' : '#151723',
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#e5e7eb',
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    largeTextArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    sourceSongCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    sourceSongImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
    },
    sourceSongImagePlaceholder: {
      backgroundColor: isDark ? '#333' : '#ddd',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sourceSongInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    sourceSongTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#151723',
      marginBottom: 4,
    },
    sourceSongStyle: {
      fontSize: 14,
      color: isDark ? '#888' : '#666',
    },
    songItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      gap: 12,
    },
    songItemImage: {
      width: 44,
      height: 44,
      borderRadius: 6,
    },
    songItemImagePlaceholder: {
      backgroundColor: isDark ? '#333' : '#ddd',
      justifyContent: 'center',
      alignItems: 'center',
    },
    songItemInfo: {
      flex: 1,
    },
    songItemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#151723',
      marginBottom: 2,
    },
    songItemDate: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
    },
    moreSongsText: {
      fontSize: 14,
      color: '#6366F1',
      textAlign: 'center',
      marginTop: 4,
    },
    managerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      marginBottom: 16,
    },
    managerText: {
      fontSize: 14,
      color: isDark ? '#888' : '#666',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6366F1',
      borderRadius: 12,
      paddingVertical: 16,
      gap: 10,
      marginBottom: 16,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#2a1a1a' : '#fff0f0',
      borderWidth: 1,
      borderColor: isDark ? '#5c2020' : '#ffcccc',
      borderRadius: 12,
      paddingVertical: 14,
      gap: 8,
    },
    deleteButtonText: {
      color: '#ef4444',
      fontSize: 15,
      fontWeight: '500',
    },
  })
