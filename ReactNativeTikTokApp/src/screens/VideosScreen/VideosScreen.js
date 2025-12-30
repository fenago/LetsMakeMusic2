/**
 * VideosScreen - Simple list of user's videos with inline player
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  useColorScheme,
} from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { Film, Trash2, X, Play, AlertCircle, Volume2, VolumeX } from 'lucide-react-native'
import { useCurrentUser } from '../../core/onboarding'
import { subscribeToUserVideos, deleteVideo } from '../../services/videosService'
import { usePlaybackState } from '../../contexts/MediaPlayerContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const VideosScreen = ({ navigation }) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const currentUser = useCurrentUser()
  const { pause: pauseAudio } = usePlaybackState()

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingVideoId, setPlayingVideoId] = useState(null)
  const [videoError, setVideoError] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const videoRefs = useRef({}) // Track refs by video ID

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToUserVideos(currentUser.id, (fetchedVideos) => {
      setVideos(fetchedVideos)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser?.id])

  const handlePlayVideo = useCallback(async (videoId) => {
    // If same video, stop it
    if (playingVideoId === videoId) {
      // Stop the current video
      const currentRef = videoRefs.current[videoId]
      if (currentRef) {
        await currentRef.stopAsync().catch(() => {})
      }
      setPlayingVideoId(null)
      setVideoError(null)
      return
    }

    // Pause any audio playing (this also hides the miniplayer)
    pauseAudio()

    // Stop any currently playing video first
    if (playingVideoId && videoRefs.current[playingVideoId]) {
      await videoRefs.current[playingVideoId].stopAsync().catch(() => {})
    }

    setVideoError(null)
    setPlayingVideoId(videoId)
  }, [playingVideoId, pauseAudio])

  const handleDeleteVideo = useCallback((video) => {
    Alert.alert(
      'Delete Video',
      `Delete "${video.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteVideo(video.id, currentUser.id)
            if (!result.success) {
              Alert.alert('Error', result.error)
            }
          },
        },
      ]
    )
  }, [currentUser?.id])

  const styles = createStyles(isDark)

  const handleVideoError = useCallback((error, videoId) => {
    console.error('[VideosScreen] Video playback error:', error)
    setVideoError(`Failed to play video: ${error.error?.message || 'Unknown error'}`)
    setPlayingVideoId(null)
  }, [])

  const handleCloseVideo = useCallback(async () => {
    if (playingVideoId && videoRefs.current[playingVideoId]) {
      await videoRefs.current[playingVideoId].stopAsync().catch(() => {})
    }
    setPlayingVideoId(null)
    setVideoError(null)
  }, [playingVideoId])

  const handleToggleMute = useCallback(async () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)

    // Apply mute state to currently playing video
    if (playingVideoId && videoRefs.current[playingVideoId]) {
      try {
        await videoRefs.current[playingVideoId].setIsMutedAsync(newMuted)
      } catch (error) {
        console.log('[VideosScreen] Error setting mute:', error)
      }
    }
  }, [isMuted, playingVideoId])

  const renderVideo = ({ item }) => {
    const isPlaying = playingVideoId === item.id

    return (
      <View style={styles.videoCard}>
        <View style={styles.videoHeader}>
          <Text style={styles.videoTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleDeleteVideo(item)}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {isPlaying ? (
          <View style={styles.playerContainer}>
            <Video
              ref={(ref) => { videoRefs.current[item.id] = ref }}
              source={{ uri: item.videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              isMuted={isMuted}
              volume={isMuted ? 0 : 1}
              onError={(error) => handleVideoError(error, item.id)}
              onPlaybackStatusUpdate={(status) => {
                if (status.error) {
                  handleVideoError({ error: { message: status.error } }, item.id)
                }
              }}
            />
            {/* Custom mute button */}
            <TouchableOpacity
              style={styles.muteButton}
              onPress={handleToggleMute}
            >
              {isMuted ? (
                <VolumeX size={22} color="#fff" />
              ) : (
                <Volume2 size={22} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseVideo}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={() => handlePlayVideo(item.id)}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
              <View style={styles.placeholderThumbnail}>
                <Film size={40} color={isDark ? '#666' : '#ccc'} />
              </View>
            )}
            <View style={styles.playOverlay}>
              <Play size={48} color="#fff" fill="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Show error if any */}
        {videoError && isPlaying && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{videoError}</Text>
          </View>
        )}

        <Text style={styles.videoDate}>
          {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
      </View>
    )
  }

  if (videos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Film size={64} color={isDark ? '#666' : '#ccc'} />
        <Text style={styles.emptyText}>No videos yet</Text>
        <Text style={styles.emptySubtext}>
          Create a video from the song action menu
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const createStyles = (isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000' : '#f5f5f5',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#000' : '#f5f5f5',
      padding: 20,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: isDark ? '#888' : '#666',
      marginTop: 8,
      textAlign: 'center',
    },
    listContent: {
      padding: 16,
    },
    videoCard: {
      backgroundColor: isDark ? '#1c1c1e' : '#fff',
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    },
    videoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
    },
    videoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      flex: 1,
      marginRight: 12,
    },
    thumbnailContainer: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: isDark ? '#2c2c2e' : '#e5e5e5',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    placeholderThumbnail: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playerContainer: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000',
    },
    video: {
      width: '100%',
      height: '100%',
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: 8,
    },
    muteButton: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: 8,
    },
    videoDate: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      padding: 12,
      paddingTop: 0,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      paddingTop: 8,
      gap: 8,
    },
    errorText: {
      flex: 1,
      color: '#ef4444',
      fontSize: 13,
    },
  })

export default VideosScreen
