import React, { useState } from 'react'
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
  ScrollView,
} from 'react-native'
import { ChevronLeft, Upload, Camera, ImageIcon, Check, Sparkles, Palette } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'

import { useCurrentUser } from '../../core/onboarding'
import { updateSong, getSong } from '../../services/songsService'
import firebaseStorage from '../../core/media/api/firebase/storage'
import { useMediaPlayer } from '../../contexts/MediaPlayerContext'
import { applyArtworkToSong } from '../../services/artworkService'

export default function ChangeSongCoverScreen({ navigation, route }) {
  const song = route.params?.song
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()
  const { loadMedia, currentMedia } = useMediaPlayer()

  // DEBUG: Log the song object we received
  console.log('[ChangeSongCover] Screen loaded with song:', {
    id: song?.id,
    title: song?.title || song?.name || song?.label,
    userId: song?.userId,
    currentImageUrl: song?.imageUrl?.substring(0, 60),
    hasId: !!song?.id,
    hasUserId: !!song?.userId,
  })

  const [selectedImage, setSelectedImage] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSuccess, setIsSuccess] = useState(false)

  const currentCoverUrl = song?.imageUrl || null

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImage(result.assets[0])
        setIsSuccess(false)
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to select image. Please try again.')
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
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImage(result.assets[0])
        setIsSuccess(false)
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo. Please try again.')
    }
  }

  // Navigate to Artwork Studio to select from user's artwork collection
  const selectFromArtwork = () => {
    navigation.navigate('ArtworkStudio', {
      selectMode: true,
      songId: song?.id,
      onSelect: async (artwork) => {
        // Artwork was selected and applied via artworkService
        // The navigation will go back automatically
        setIsSuccess(true)

        // Update the current media if this song is playing
        if (currentMedia?.id === song.id && artwork?.imageUrl) {
          loadMedia({
            ...currentMedia,
            imageUrl: artwork.imageUrl,
          })
        }
      },
    })
  }

  // Navigate to create new AI artwork
  const createNewArtwork = () => {
    navigation.navigate('ArtworkStudio', {
      selectMode: true,
      songId: song?.id,
      openGenerator: true, // Signal to open AI generator modal
      onSelect: async (artwork) => {
        setIsSuccess(true)
        if (currentMedia?.id === song.id && artwork?.imageUrl) {
          loadMedia({
            ...currentMedia,
            imageUrl: artwork.imageUrl,
          })
        }
      },
    })
  }

  const uploadAndSave = async () => {
    if (!selectedImage || !song?.id || !currentUser?.id) {
      Alert.alert('Error', `Missing required data:\n- Image: ${!!selectedImage}\n- Song ID: ${song?.id || 'MISSING'}\n- User ID: ${currentUser?.id || 'MISSING'}`)
      return
    }

    // UPFRONT DEBUG: Show what we're about to update
    console.log('[ChangeSongCover] Starting upload for song:', song.id, song.title)
    console.log('[ChangeSongCover] Song userId from params:', song.userId)
    console.log('[ChangeSongCover] Current user ID:', currentUser.id)

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Upload the image to Firebase Storage
      const uploadResult = await firebaseStorage.processAndUploadMediaFile({
        uri: selectedImage.uri,
        type: 'image/jpeg',
        fileName: `song-cover-${song.id}-${Date.now()}.jpg`,
      })

      console.log('[ChangeSongCover] Upload result:', {
        success: !uploadResult.error,
        hasUrl: !!uploadResult.downloadURL,
        urlPreview: uploadResult.downloadURL?.substring(0, 80),
      })

      if (uploadResult.error || !uploadResult.downloadURL) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      setUploadProgress(70)

      // Update the song document with the new cover URL
      console.log('[ChangeSongCover] Updating song:', song.id, 'with imageUrl')
      console.log('[ChangeSongCover] Song userId:', song.userId, 'Current user:', currentUser.id)
      console.log('[ChangeSongCover] New imageUrl:', uploadResult.downloadURL?.substring(0, 80))

      const updateResult = await updateSong(song.id, currentUser.id, {
        imageUrl: uploadResult.downloadURL,
      })

      console.log('[ChangeSongCover] Update result:', {
        resultId: updateResult?.id,
        resultImageUrl: updateResult?.imageUrl?.substring(0, 80),
        matchesUpload: updateResult?.imageUrl === uploadResult.downloadURL,
      })

      // VERIFY: Check if update actually worked
      if (!updateResult?.imageUrl || updateResult.imageUrl !== uploadResult.downloadURL) {
        console.error('[ChangeSongCover] ⚠️ UPDATE MAY HAVE FAILED - imageUrl mismatch!')
        console.error('[ChangeSongCover] Expected:', uploadResult.downloadURL?.substring(0, 60))
        console.error('[ChangeSongCover] Got:', updateResult?.imageUrl?.substring(0, 60))
      } else {
        console.log('[ChangeSongCover] ✓ Update verified - imageUrl matches!')
      }

      // DIRECT FIRESTORE CHECK: Fetch the raw document to see what's actually stored
      const rawSongDoc = await getSong(song.id)

      // VISIBLE DEBUG: Show what's in database via Alert - BLOCKING until user reads it
      const dbImageUrl = rawSongDoc?.imageUrl || 'NULL/EMPTY'
      const uploadedUrl = uploadResult.downloadURL
      const urlsMatch = rawSongDoc?.imageUrl === uploadResult.downloadURL
      const userIdMatch = rawSongDoc?.userId === currentUser.id

      // Use Promise to WAIT for user to dismiss debug alert before continuing
      await new Promise((resolve) => {
        Alert.alert(
          '🔍 DATABASE VERIFICATION',
          `READ THIS CAREFULLY!\n\n` +
          `Song ID: ${song.id}\n\n` +
          `DB imageUrl:\n${dbImageUrl.substring(0, 70)}...\n\n` +
          `Uploaded URL:\n${uploadedUrl.substring(0, 70)}...\n\n` +
          `✅ URLs Match: ${urlsMatch ? 'YES ✅' : 'NO ❌❌❌'}\n\n` +
          `Song Owner in DB: ${rawSongDoc?.userId || 'NULL'}\n` +
          `Your User ID: ${currentUser.id}\n` +
          `Owner Match: ${userIdMatch ? 'YES ✅' : 'NO ❌'}`,
          [{ text: 'I READ IT - CONTINUE', onPress: resolve }]
        )
      })

      setUploadProgress(100)
      setIsSuccess(true)

      // Update the current media if this song is playing
      if (currentMedia?.id === song.id) {
        loadMedia({
          ...currentMedia,
          imageUrl: uploadResult.downloadURL,
        })
      }

      // Show success feedback AFTER user acknowledges debug alert
      Alert.alert(
        'Success',
        'Song cover updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )

    } catch (error) {
      console.error('Error uploading cover:', error)
      Alert.alert('Error', error.message || 'Failed to upload cover image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const displayImage = selectedImage?.uri || currentCoverUrl

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
        <Text style={styles.headerTitle}>Change Song Cover</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current/Selected Cover Preview */}
        <View style={styles.coverPreviewContainer}>
          {displayImage ? (
            <Image
              source={{ uri: displayImage }}
              style={styles.coverPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverPreview, styles.noCoverPlaceholder]}>
              <ImageIcon size={64} color={isDark ? '#444444' : '#cccccc'} strokeWidth={1} />
              <Text style={styles.noCoverText}>No cover image</Text>
            </View>
          )}
          {selectedImage && !isSuccess && (
            <View style={styles.newImageBadge}>
              <Text style={styles.newImageBadgeText}>New</Text>
            </View>
          )}
          {isSuccess && (
            <View style={[styles.newImageBadge, styles.successBadge]}>
              <Check size={14} color="#ffffff" strokeWidth={3} />
              <Text style={styles.newImageBadgeText}>Saved</Text>
            </View>
          )}
        </View>

        {/* Song Info */}
        {song && (
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title || song.name || 'Unknown Song'}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.author?.stageName || song.artist || 'Unknown Artist'}
            </Text>
            <Text style={[styles.songArtist, { fontSize: 10, marginTop: 4 }]} numberOfLines={1}>
              ID: {song.id || 'NO ID!'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Artwork Collection Options */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={selectFromArtwork}
            disabled={isUploading}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#9333ea20' }]}>
              <Palette size={24} color="#9333ea" strokeWidth={2} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionButtonText}>Your Artwork</Text>
              <Text style={styles.actionSubtext}>Select from your collection</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={createNewArtwork}
            disabled={isUploading}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#ec489920' }]}>
              <Sparkles size={24} color="#ec4899" strokeWidth={2} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionButtonText}>Create with AI</Text>
              <Text style={styles.actionSubtext}>Generate new artwork</Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or upload</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Traditional Upload Options */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={pickFromLibrary}
            disabled={isUploading}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#3875e820' }]}>
              <ImageIcon size={24} color="#3875e8" strokeWidth={2} />
            </View>
            <Text style={styles.actionButtonText}>Choose from Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={takePhoto}
            disabled={isUploading}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#22c55e20' }]}>
              <Camera size={24} color="#22c55e" strokeWidth={2} />
            </View>
            <Text style={styles.actionButtonText}>Take a Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Upload Button */}
        {selectedImage && !isSuccess && (
          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={uploadAndSave}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.uploadingContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.uploadButtonText}>
                  Uploading... {Math.round(uploadProgress)}%
                </Text>
              </View>
            ) : (
              <>
                <Upload size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.uploadButtonText}>Save New Cover</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Helper Text */}
        <Text style={styles.helperText}>
          For best results, use a square image (1:1 aspect ratio).
          Your cover will be visible to anyone who can see this song.
        </Text>
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
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120, // Extra space for mini player
  },
  coverPreviewContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  coverPreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
  },
  noCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCoverText: {
    marginTop: 8,
    fontSize: 14,
    color: isDark ? '#666666' : '#9ca3af',
  },
  newImageBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3875e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  successBadge: {
    backgroundColor: '#22c55e',
  },
  newImageBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  songInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: isDark ? '#a0a0a0' : '#6b7280',
  },
  actionButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: isDark ? '#ffffff' : '#151723',
  },
  actionSubtext: {
    fontSize: 12,
    color: isDark ? '#888888' : '#9ca3af',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: isDark ? '#333333' : '#e5e7eb',
  },
  dividerText: {
    fontSize: 12,
    color: isDark ? '#666666' : '#9ca3af',
    paddingHorizontal: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
    width: '100%',
    marginBottom: 24,
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
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: isDark ? '#666666' : '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
})
