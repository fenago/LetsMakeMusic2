import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useColorScheme,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native'
import { ChevronLeft, Plus, Camera, ImageIcon, Film, Trash2, Check, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'

import { useCurrentUser } from '../../core/onboarding'
import { addSongMediaAssets, removeSongMediaAsset, getSong } from '../../services/songsService'
import firebaseStorage from '../../core/media/api/firebase/storage'

const { width: screenWidth } = Dimensions.get('window')
const ITEM_SIZE = (screenWidth - 48 - 16) / 3 // 3 columns with padding and gaps

export default function AddMediaForVideoScreen({ navigation, route }) {
  const song = route.params?.song
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()

  const [existingMedia, setExistingMedia] = useState([])
  const [selectedMedia, setSelectedMedia] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)

  // Load existing media assets for this song
  useEffect(() => {
    const loadExistingMedia = async () => {
      if (!song?.id) return

      try {
        const songData = await getSong(song.id)
        if (songData?.mediaAssets) {
          setExistingMedia(songData.mediaAssets)
        }
      } catch (error) {
        console.error('Error loading existing media:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadExistingMedia()
  }, [song?.id])

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      })

      if (!result.canceled && result.assets?.length > 0) {
        const newMedia = result.assets.map((asset, index) => ({
          uri: asset.uri,
          type: asset.type || (asset.uri.includes('.mp4') || asset.uri.includes('.mov') ? 'video' : 'image'),
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
          localId: `${Date.now()}-${index}`,
        }))
        setSelectedMedia(prev => [...prev, ...newMedia])
      }
    } catch (error) {
      console.error('Error picking media:', error)
      Alert.alert('Error', 'Failed to select media. Please try again.')
    }
  }

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      })

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0]
        const newMedia = {
          uri: asset.uri,
          type: 'image',
          width: asset.width,
          height: asset.height,
          localId: `${Date.now()}-camera`,
        }
        setSelectedMedia(prev => [...prev, newMedia])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    }
  }

  const removeSelectedMedia = (localId) => {
    setSelectedMedia(prev => prev.filter(m => m.localId !== localId))
  }

  const removeExistingMedia = async (index) => {
    if (!song?.id || !currentUser?.id) return

    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this media?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSongMediaAsset(song.id, currentUser.id, index)
              setExistingMedia(prev => prev.filter((_, i) => i !== index))
            } catch (error) {
              console.error('Error removing media:', error)
              Alert.alert('Error', 'Failed to remove media. Please try again.')
            }
          },
        },
      ]
    )
  }

  const uploadAndSave = async () => {
    if (selectedMedia.length === 0 || !song?.id || !currentUser?.id) {
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: selectedMedia.length })

    try {
      const uploadedAssets = []

      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i]
        setUploadProgress({ current: i + 1, total: selectedMedia.length })

        // Upload each media file
        const uploadResult = await firebaseStorage.processAndUploadMediaFile({
          uri: media.uri,
          type: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
          fileName: `song-media-${song.id}-${Date.now()}-${i}.${media.type === 'video' ? 'mp4' : 'jpg'}`,
        })

        if (uploadResult.error || !uploadResult.downloadURL) {
          console.error('Upload failed for media:', i, uploadResult.error)
          continue // Skip failed uploads but continue with others
        }

        uploadedAssets.push({
          url: uploadResult.downloadURL,
          thumbnailUrl: uploadResult.thumbnailURL || uploadResult.downloadURL,
          type: media.type,
          width: media.width,
          height: media.height,
          duration: media.duration || null,
          order: existingMedia.length + uploadedAssets.length,
          createdAt: new Date().toISOString(),
        })
      }

      if (uploadedAssets.length === 0) {
        throw new Error('No media was successfully uploaded')
      }

      // Save the media assets to the song
      await addSongMediaAssets(song.id, currentUser.id, uploadedAssets)

      // Update local state
      setExistingMedia(prev => [...prev, ...uploadedAssets])
      setSelectedMedia([])

      Alert.alert(
        'Success',
        `${uploadedAssets.length} media file${uploadedAssets.length > 1 ? 's' : ''} added successfully!`
      )

    } catch (error) {
      console.error('Error uploading media:', error)
      Alert.alert('Error', error.message || 'Failed to upload media. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }

  const renderExistingMediaItem = ({ item, index }) => (
    <View style={styles.mediaItem}>
      <Image
        source={{ uri: item.thumbnailUrl || item.url }}
        style={styles.mediaImage}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View style={styles.videoIndicator}>
          <Film size={16} color="#ffffff" strokeWidth={2} />
        </View>
      )}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeExistingMedia(index)}
      >
        <Trash2 size={14} color="#ffffff" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  )

  const renderSelectedMediaItem = ({ item }) => (
    <View style={styles.mediaItem}>
      <Image
        source={{ uri: item.uri }}
        style={styles.mediaImage}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View style={styles.videoIndicator}>
          <Film size={16} color="#ffffff" strokeWidth={2} />
        </View>
      )}
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>New</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeSelectedMedia(item.localId)}
      >
        <X size={14} color="#ffffff" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  )

  const allMedia = [
    ...existingMedia.map((m, i) => ({ ...m, key: `existing-${i}`, isExisting: true, existingIndex: i })),
    ...selectedMedia.map(m => ({ ...m, key: m.localId, isExisting: false })),
  ]

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Media</Text>
        <View style={styles.backButton} />
      </View>

      {/* Song Info */}
      {song && (
        <View style={styles.songInfo}>
          <Image
            source={{ uri: song.imageUrl }}
            style={styles.songCover}
            resizeMode="cover"
          />
          <View style={styles.songDetails}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title || song.name || 'Unknown Song'}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artist || song.author?.stageName || 'Unknown Artist'}
            </Text>
          </View>
        </View>
      )}

      {/* Description */}
      <Text style={styles.description}>
        Add photos and videos to create a custom music video for your song.
        These will be synced to the beat automatically.
      </Text>

      {/* Media Grid */}
      <View style={styles.mediaSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Media ({existingMedia.length + selectedMedia.length})
          </Text>
          {selectedMedia.length > 0 && (
            <Text style={styles.pendingText}>
              {selectedMedia.length} pending upload
            </Text>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3875e8" />
          </View>
        ) : (
          <FlatList
            data={allMedia}
            keyExtractor={(item) => item.key}
            numColumns={3}
            renderItem={({ item }) =>
              item.isExisting
                ? renderExistingMediaItem({ item, index: item.existingIndex })
                : renderSelectedMediaItem({ item })
            }
            contentContainerStyle={styles.mediaGrid}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ImageIcon size={48} color={isDark ? '#444444' : '#cccccc'} strokeWidth={1} />
                <Text style={styles.emptyText}>No media added yet</Text>
                <Text style={styles.emptySubtext}>
                  Add photos and videos to get started
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionArea}>
        <View style={styles.pickerButtons}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={pickFromLibrary}
            disabled={isUploading}
          >
            <Plus size={20} color="#3875e8" strokeWidth={2} />
            <Text style={styles.pickerButtonText}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={takePhoto}
            disabled={isUploading}
          >
            <Camera size={20} color="#22c55e" strokeWidth={2} />
            <Text style={styles.pickerButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>

        {selectedMedia.length > 0 && (
          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={uploadAndSave}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.uploadingContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.uploadButtonText}>
                  Uploading {uploadProgress.current}/{uploadProgress.total}...
                </Text>
              </View>
            ) : (
              <>
                <Check size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.uploadButtonText}>
                  Save {selectedMedia.length} Item{selectedMedia.length > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#222222' : '#e5e7eb',
  },
  songCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
  },
  songDetails: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: isDark ? '#a0a0a0' : '#6b7280',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: isDark ? '#888888' : '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mediaSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
  },
  pendingText: {
    fontSize: 13,
    color: '#f59e0b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaGrid: {
    paddingBottom: 16,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
  },
  newBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#3875e8',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDark ? '#666666' : '#9ca3af',
    marginTop: 4,
  },
  actionArea: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#222222' : '#e5e7eb',
    gap: 12,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  pickerButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#151723',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#22c55e80',
  },
  uploadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
