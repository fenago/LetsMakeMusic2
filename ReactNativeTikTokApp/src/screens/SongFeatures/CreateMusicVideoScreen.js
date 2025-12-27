/**
 * CreateMusicVideoScreen - Simple video generation
 *
 * 1. Call Suno API to generate video
 * 2. Download video from Suno URL
 * 3. Upload to Firebase Storage
 * 4. Save to videos collection
 * 5. Done - video is permanently stored
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  useColorScheme,
  TextInput,
} from 'react-native'
import { Film, ArrowLeft, AlertCircle, Check } from 'lucide-react-native'
import { useCurrentUser } from '../../core/onboarding'
import { generateMusicVideo, pollForVideoCompletion } from '../../services/sunoApi'
import { uploadVideoFromUrl, createVideo } from '../../services/videosService'

// Check if song is older than 15 days (Suno expiration)
const isSongExpired = (song) => {
  if (!song?.createdAt) return false
  const createdDate = song.createdAt?.toDate?.() || new Date(song.createdAt)
  const fifteenDaysAgo = new Date()
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
  return createdDate < fifteenDaysAgo
}

export default function CreateMusicVideoScreen({ navigation, route }) {
  const song = route.params?.song
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const currentUser = useCurrentUser()

  // Debug log to understand what fields the song has
  console.log('[CreateMusicVideo] Song data received:', {
    id: song?.id,
    sunoId: song?.sunoId,
    sunoTaskId: song?.sunoTaskId,
    title: song?.title,
    hasCreatedAt: !!song?.createdAt,
    createdAt: song?.createdAt?.toDate?.()?.toISOString() || song?.createdAt,
  })

  // Check if song audio has expired (15 day limit)
  const isExpired = isSongExpired(song)

  // Branding options (optional per Suno API)
  const defaultAuthor = song?.author?.stageName || song?.artist || currentUser?.stageName || ''
  const [author, setAuthor] = useState(defaultAuthor)
  const [domainName, setDomainName] = useState('LetsMakeMusic')

  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleGenerateVideo = useCallback(async () => {
    if (!song?.sunoId) {
      Alert.alert('Error', 'Only AI-generated songs can have music videos.')
      return
    }

    const userId = currentUser?.id || currentUser?.userID
    if (!userId) {
      Alert.alert('Error', 'Please sign in.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccess(false)
    setProgress(0)

    // Track all metadata from Suno API
    let videoMetadata = {
      sunoVideoUrl: null,
      sunoTaskId: null,
      sunoMusicId: null,
      sunoCreateTime: null,
      sunoCompleteTime: null,
    }

    try {
      // Step 1: Generate video via Suno API
      setStatus('Starting video generation...')
      setProgress(5)

      const result = await generateMusicVideo({
        taskId: song.sunoTaskId,
        audioId: song.sunoId,
        author: author || 'LetsMakeMusic',
        domainName: domainName || 'LetsMakeMusic',
      })

      let videoUrl

      if (result.status === 'already_exists' && result.existingVideo?.videoUrl) {
        videoUrl = result.existingVideo.videoUrl
        videoMetadata.sunoVideoUrl = videoUrl
        videoMetadata.sunoTaskId = result.existingVideo.taskId || result.taskId
        setStatus('Found existing video!')
        setProgress(30)
      } else if (result.taskId) {
        setStatus('Generating video (this takes 2-5 minutes)...')
        setProgress(10)

        // Poll for completion - captures all metadata
        const videoResult = await pollForVideoCompletion(
          result.taskId,
          120, // max 10 minutes
          5000, // poll every 5 seconds
          (p) => {
            const pct = Math.min(30, 10 + (p.attempt / p.maxAttempts) * 20)
            setProgress(pct)
            setStatus(`Generating video... (${Math.floor(p.elapsedSeconds)}s)`)
          }
        )

        if (!videoResult.videoUrl) {
          throw new Error('Video generation failed - no URL returned')
        }

        // Capture all metadata from Suno response
        videoUrl = videoResult.videoUrl
        videoMetadata = {
          sunoVideoUrl: videoResult.videoUrl,
          sunoTaskId: videoResult.taskId,
          sunoMusicId: videoResult.musicId,
          sunoCreateTime: videoResult.createTime,
          sunoCompleteTime: videoResult.completeTime,
        }
        setProgress(35)
      } else {
        throw new Error('Unexpected response from video API')
      }

      // Step 2: Download from Suno and upload to Firebase Storage
      setStatus('Downloading video from Suno...')
      setProgress(40)

      const filename = `${song.id}_${Date.now()}.mp4`
      const uploadResult = await uploadVideoFromUrl(
        videoUrl,
        userId,
        filename,
        (pct) => {
          // Upload progress goes from 40% to 90%
          const adjustedPct = 40 + (pct * 0.5)
          setProgress(adjustedPct)
          if (pct < 50) {
            setStatus('Downloading video...')
          } else {
            setStatus('Uploading to your library...')
          }
        }
      )

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to save video')
      }

      // Step 3: Create video document in Firestore with ALL metadata
      setStatus('Saving to library...')
      setProgress(95)

      const videoDoc = await createVideo({
        // User & Song references
        userId,
        songId: song.id,  // Ties video back to original song
        sunoId: song.sunoId,

        // Suno metadata
        ...videoMetadata,

        // Content
        title: song.title || 'Untitled Video',
        videoUrl: uploadResult.storageUrl, // Firebase Storage URL (permanent)
        thumbnailUrl: song.thumbnailUrl || song.coverUrl || song.imageUrl,
        audioUrl: song.audioUrl,

        // Branding used for this video
        author: author || null,
        domainName: domainName || null,
      })

      if (!videoDoc.success) {
        throw new Error(videoDoc.error || 'Failed to save video record')
      }

      // Done!
      setProgress(100)
      setStatus('Video saved!')
      setSuccess(true)

      Alert.alert(
        'Video Created!',
        'Your music video has been saved to your library.',
        [
          {
            text: 'View Videos',
            onPress: () => navigation.navigate('Videos'),
          },
          { text: 'OK' },
        ]
      )
    } catch (err) {
      console.error('[CreateMusicVideo] Error:', err)
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [song, currentUser, navigation, author, domainName])

  const styles = getStyles(isDark)

  if (!song) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Music Video</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>No song provided</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Music Video</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* Song Info */}
        <View style={styles.songCard}>
          <Image
            source={{ uri: song.thumbnailUrl || song.coverUrl || song.imageUrl || 'https://picsum.photos/200' }}
            style={styles.songImage}
          />
          <View style={styles.songInfo}>
            <Text style={styles.songTitle} numberOfLines={2}>{song.title}</Text>
            <Text style={styles.songArtist}>
              {song.author?.stageName || song.artist || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Status */}
        {(isGenerating || success) && (
          <View style={styles.statusCard}>
            {success ? (
              <Check size={24} color="#22c55e" />
            ) : (
              <ActivityIndicator size="small" color="#3875e8" />
            )}
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}

        {/* Progress Bar */}
        {isGenerating && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.errorCardText}>{error}</Text>
          </View>
        )}

        {/* Branding Options (optional) */}
        {song.sunoId && !isGenerating && !success && (
          <View style={styles.optionsCard}>
            <Text style={styles.optionsTitle}>Video Branding (Optional)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Author Name</Text>
              <TextInput
                style={styles.input}
                value={author}
                onChangeText={setAuthor}
                placeholder="Artist name shown in video"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>App/Brand Name</Text>
              <TextInput
                style={styles.input}
                value={domainName}
                onChangeText={setDomainName}
                placeholder="Brand watermark"
                placeholderTextColor="#666"
              />
            </View>
          </View>
        )}

        {/* Generate Button */}
        {!song.sunoId ? (
          <View style={styles.warningCard}>
            <AlertCircle size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              Only AI-generated songs can have music videos.
            </Text>
          </View>
        ) : isExpired ? (
          <View style={styles.expiredCard}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.expiredText}>
              This song is older than 15 days. Audio files on our generation servers expire after 15 days, so video generation is no longer available.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, isGenerating && styles.buttonDisabled]}
            onPress={handleGenerateVideo}
            disabled={isGenerating}
          >
            <Film size={24} color="#fff" />
            <Text style={styles.buttonText}>
              {isGenerating ? 'Generating...' : 'Generate Music Video'}
            </Text>
          </TouchableOpacity>
        )}

        {/* View Videos Link */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Videos')}
        >
          <Text style={styles.linkText}>View All Videos →</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Video generation takes 2-5 minutes. The video will be permanently saved to your Firebase storage.
        </Text>
      </ScrollView>
    </View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    marginTop: 12,
  },
  songCard: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  songImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#888',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3875e8',
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  errorCardText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 14,
  },
  expiredCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  expiredText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
    lineHeight: 20,
  },
  optionsCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  optionsTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3875e8',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  linkText: {
    color: '#3875e8',
    fontSize: 15,
    fontWeight: '500',
  },
  note: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
})
