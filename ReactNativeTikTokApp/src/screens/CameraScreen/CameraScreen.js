import React, { useState, useEffect, useRef } from 'react'
import { Platform, SafeAreaView } from 'react-native'
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av'
import { Camera } from 'expo-camera'
import { useTranslations, ActivityIndicator } from '../../core/dopebase'
import IMCameraModal from '../../core/camera/IMCameraModal'
import { loadCachedItem } from '../../core/helpers/cacheManager'
import { blendVideoWithAudio } from '../../core/media/mediaProcessor'
import { useConfig } from '../../config'

export default function (props) {
  const { localized } = useTranslations()

  const { navigation, route } = props
  const songItem = route?.params?.songItem

  const config = useConfig()

  const [soundTitle, setSoundTitle] = useState(localized('Sounds'))
  const [soundDuration, setSoundDuration] = useState(null)
  const [loading, setIsLoading] = useState(false)
  const [shouldMute, setShouldMute] = useState(false)
  const [mediaSource, setMediaSource] = useState(null)
  const [hasPermission, setHasPermission] = useState(null)
  const [selectedSongItem, setSelectedSongItem] = useState(null)

  const soundRef = useRef(null)
  const soundPath = useRef(null)

  useEffect(() => {
    requestPermissions()
  }, [])

  useEffect(() => {
    if (songItem) {
      onSoundChoose(songItem)
    }
  }, [navigation, songItem, onSoundChoose])

  const onSoundChoose = songItem => {
    stopPlayback()
    if (songItem) {
      setSelectedSongItem(songItem)
      setShouldMute(true)
      setSoundTitle(songItem.title)
      setIsLoading(true)
      setSoundDuration(songItem.duration)
      loadCachedAudio(songItem.streamURL)
    }
  }

  const requestPermissions = async () => {
    await Audio.requestPermissionsAsync()
    const { status } = await Camera.requestCameraPermissionsAsync()
    setHasPermission(status === 'granted')
  }

  const loadCachedAudio = async url => {
    const path = await loadCachedItem({ uri: url })
    soundPath.current = path
    setIsLoading(false)
    return loadAudio(path)
  }

  const loadAudio = async path => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      playsInSilentLockedModeIOS: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    })
    soundRef.current = new Audio.Sound()

    try {
      await soundRef.current.loadAsync(
        {
          uri: path,
        },
        {
          isLooping: false,
          isMuted: false,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
        },
      )
    } catch (error) {
      console.log(error)
      // An error occurred!
    }
  }

  const stopPlayback = async () => {
    if (soundRef.current !== null) {
      await soundRef.current.stopAsync()
      await soundRef.current.unloadAsync()
      soundRef.current = null
    }
  }

  const onStartRecordingVideo = async () => {
    if (soundRef.current === null) {
      return
    }
    setTimeout(() => {
      soundRef.current.setStatusAsync({ shouldPlay: true })
    })
  }

  const stopSound = async () => {
    if (soundRef.current !== null) {
      soundRef.current.stopAsync()
    }
  }

  const onImagePost = fileInfo => {
    navigation.replace('NewPost', {
      media: mediaSource ?? fileInfo,
      songItem: selectedSongItem,
    })
  }

  const onCameraClose = () => {
    stopPlayback()
    navigation.goBack()
  }

  const onCancelPost = () => {
    stopSound()
    setMediaSource(null)
  }

  const onSoundPress = () => {
    if (Platform.OS === 'ios') {
      navigation.push('SongPicker', { onSoundChoose: onSoundChoose })
    } else {
      navigation.replace('SongPicker')
    }
  }

  const onStopRecordingVideo = ({ uri, type }, videoRate) => {
    stopSound()
    setIsLoading(true)
    // Call this method if you want to do the audio+video blending client side, using FFMPEG (make sure you include the library in your React Native project in package.json first)
    blendVideoWithAudio(
      { videoStream: uri, audioStream: soundPath.current, videoRate },
      newSource => {
        setMediaSource({ uri: newSource, type, rate: 1.0 })
        setIsLoading(false)
      },
    )
    return

    // Call this method if you want to do the audio+video blending server side
    setMediaSource({ uri, type, rate: videoRate })
    setIsLoading(false)
  }

  if (!hasPermission) {
    return null
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}>
      <IMCameraModal
        wrapInModal={false}
        useExternalSound={true}
        soundTitle={soundTitle}
        soundDuration={soundDuration}
        onCameraClose={onCameraClose}
        onCancelPost={onCancelPost}
        onImagePost={onImagePost}
        onSoundPress={onSoundPress}
        pickerMediaType={'Videos'}
        muteRecord={shouldMute}
        onStopRecordingVideo={onStopRecordingVideo}
        onStartRecordingVideo={onStartRecordingVideo}
        mediaSource={mediaSource}
        maxDuration={config.videoMaxDuration}
      />
      {loading && <ActivityIndicator />}
    </SafeAreaView>
  )
}
