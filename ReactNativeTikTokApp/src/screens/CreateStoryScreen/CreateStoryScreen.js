import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  SafeAreaView,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native'
import { Camera } from 'expo-camera'
import { useTranslations, ActivityIndicator } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { useStoryMutations } from '../../core/socialgraph/feed'
import IMCameraModal from '../../core/camera/IMCameraModal'

/**
 * CreateStoryScreen - Screen for capturing and posting ephemeral 24-hour stories
 *
 * Features:
 * - Camera capture (photo/video)
 * - Gallery picker
 * - Post as story (24-hour expiration)
 */
export default function CreateStoryScreen({ navigation, route }) {
  const { localized } = useTranslations()
  const currentUser = useCurrentUser()
  const { addStory } = useStoryMutations()

  const [hasPermission, setHasPermission] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mediaSource, setMediaSource] = useState(null)

  // Whether to open camera immediately (from + button)
  const openCamera = route?.params?.openCamera

  useEffect(() => {
    requestPermissions()
  }, [])

  useEffect(() => {
    StatusBar.setHidden(true)
    return () => StatusBar.setHidden(false)
  }, [])

  const requestPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync()
    setHasPermission(status === 'granted')
  }

  const onCameraClose = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const onCancelPost = useCallback(() => {
    setMediaSource(null)
  }, [])

  const onImagePost = useCallback(async (fileInfo) => {
    if (!currentUser?.id) {
      Alert.alert(localized('Error'), localized('Please log in to post a story'))
      return
    }

    setLoading(true)

    try {
      const media = mediaSource || fileInfo
      console.log('[CreateStoryScreen] Posting story:', media)

      // Determine the type from media info
      const file = {
        uri: media.uri,
        type: media.type === 'video' ? 'video' : 'image',
      }

      const result = await addStory(file, currentUser)

      if (result?.success) {
        console.log('[CreateStoryScreen] Story posted successfully')
        navigation.goBack()
      } else {
        console.log('[CreateStoryScreen] Story post failed:', result)
        Alert.alert(
          localized('Error'),
          localized('Failed to post story. Please try again.')
        )
      }
    } catch (error) {
      console.error('[CreateStoryScreen] Error posting story:', error)
      Alert.alert(
        localized('Error'),
        localized('Failed to post story. Please try again.')
      )
    } finally {
      setLoading(false)
    }
  }, [currentUser, addStory, mediaSource, navigation, localized])

  const onStopRecordingVideo = useCallback(({ uri, type }, videoRate) => {
    console.log('[CreateStoryScreen] Video recorded:', { uri, type, videoRate })
    setMediaSource({ uri, type: 'video', rate: videoRate || 1.0 })
  }, [])

  const onStartRecordingVideo = useCallback(() => {
    console.log('[CreateStoryScreen] Started recording video')
  }, [])

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    )
  }

  if (hasPermission === false) {
    Alert.alert(
      localized('Camera Permission'),
      localized('Camera permission is required to create stories.'),
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    )
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <IMCameraModal
        wrapInModal={false}
        useExternalSound={false}
        soundTitle={localized('Create Story')}
        onCameraClose={onCameraClose}
        onCancelPost={onCancelPost}
        onImagePost={onImagePost}
        pickerMediaType={'All'}
        muteRecord={false}
        onStopRecordingVideo={onStopRecordingVideo}
        onStartRecordingVideo={onStartRecordingVideo}
        mediaSource={mediaSource}
        maxDuration={30} // Stories max 30 seconds
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
})
