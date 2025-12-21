import React, { useRef, useLayoutEffect, useState } from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  FlatList,
  Image,
  Modal,
  ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useActionSheet } from '@expo/react-native-action-sheet'
import * as ImagePicker from 'expo-image-picker'

import { useTheme, useTranslations, StoryItem } from '../../../core/dopebase'
import dynamicStyles from './styles'
import { VERSION_STRING } from '../../../config/appVersion'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'

// Test audio URL for development
const TEST_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

// Sample avatar options - music themed
const SAMPLE_AVATARS = [
  {
    id: 'avatar-1',
    url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    label: 'Concert Vibes',
  },
  {
    id: 'avatar-2',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop',
    label: 'Music Notes',
  },
  {
    id: 'avatar-3',
    url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200&h=200&fit=crop',
    label: 'Vinyl Record',
  },
  {
    id: 'avatar-4',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
    label: 'DJ Booth',
  },
  {
    id: 'avatar-5',
    url: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200&h=200&fit=crop',
    label: 'Sheet Music',
  },
  {
    id: 'avatar-6',
    url: 'https://images.unsplash.com/photo-1458560871784-56d23406c091?w=200&h=200&fit=crop',
    label: 'Headphones',
  },
  {
    id: 'avatar-7',
    url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=200&h=200&fit=crop',
    label: 'Crowd Energy',
  },
  {
    id: 'avatar-8',
    url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop',
    label: 'Stage Lights',
  },
]

export default function Profile(props) {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const { loadMedia, isPlaying, currentMedia } = useMediaPlayer()

  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const {
    profilePosts,
    isOtherUser,
    hasBottomTab,
    user,
    followingCount,
    followersCount,
    reactionsCount,
    mainButtonTitle,
    onMainButtonPress,
    onFollowingButtonPress,
    onFollowersButtonPress,
    startUpload,
    removePhoto,
    selectAvatar,
    onFeedItemPress,
    pullToRefreshConfig,
  } = props

  const { onRefresh, refreshing } = pullToRefreshConfig

  const { showActionSheetWithOptions } = useActionSheet()

  const navigation = useNavigation()

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.colors[appearance].primaryBackground,
      },
      headerTintColor: theme.colors[appearance].primaryText,
    })
  }, [navigation, appearance])

  const onProfilePicturePress = () => {
    if (isOtherUser) {
      return
    }
    showActionSheetWithOptions(
      {
        title: localized('Profile Picture'),
        options: [
          localized('Change Photo'),
          localized('Remove'),
          localized('Cancel'),
        ],
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
      },
      onUpdatePhotoDialogDone,
    )
  }

  const onUpdatePhotoDialogDone = index => {
    if (index === 0) {
      showActionSheetWithOptions(
        {
          title: localized('Select Photo'),
          options: [
            localized('Camera'),
            localized('Library'),
            localized('Choose Avatar'),
            localized('Cancel'),
          ],
          cancelButtonIndex: 3,
        },
        onPhotoUploadDialogDone,
      )
    }

    if (index === 1) {
      removePhoto()
    }
  }

  const onPhotoUploadDialogDone = index => {
    if (index === 0) {
      onLaunchCamera()
    }

    if (index === 1) {
      onOpenPhotos()
    }

    if (index === 2) {
      setShowAvatarPicker(true)
    }
  }

  const onSelectAvatar = (avatarUrl) => {
    setShowAvatarPicker(false)
    if (selectAvatar) {
      selectAvatar(avatarUrl)
    }
  }

  const onLaunchCamera = () => {
    ImagePicker.launchCameraAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }).then(result => {
      // expo-image-picker returns { canceled, assets: [{ uri, ... }] }
      if (!result.canceled && result.assets?.[0]) {
        startUpload(result.assets[0])
      }
    })
  }

  const onOpenPhotos = () => {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }).then(result => {
      // expo-image-picker returns { canceled, assets: [{ uri, ... }] }
      if (!result.canceled && result.assets?.[0]) {
        startUpload(result.assets[0])
      }
    })
  }

  // Test audio player - DEV ONLY
  const onTestAudio = () => {
    loadMedia({
      id: 'test-song-1',
      title: 'SoundHelix Song 1',
      artist: 'T. Schürger',
      audioUrl: TEST_AUDIO_URL,
      thumbnailUrl: 'https://picsum.photos/200',
    })
  }

  const firstname = user?.firstName ?? ''
  const lastname = user?.lastName ?? ''

  const username = user?.username
    ? `@${user?.username}`
    : `@${firstname?.toLowerCase()}${lastname?.toLowerCase()}`

  const stageName = user?.stageName || null
  const bio = user?.bio || null

  const renderListHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={onProfilePicturePress}
          activeOpacity={0.8}
          disabled={isOtherUser}
        >
          <StoryItem
            item={user}
            imageStyle={styles.userImage}
            imageContainerStyle={styles.userImageContainer}
            containerStyle={styles.userImageMainContainer}
            activeOpacity={1}
          />
          {/* Camera/Edit overlay for own profile */}
          {!isOtherUser && (
            <View style={{
              position: 'absolute',
              bottom: 18,
              right: 0,
              left: 0,
              alignItems: 'center',
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors[appearance].primaryForeground,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 70,
              }}>
                <Text style={{ fontSize: 16 }}>📷</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
        {stageName && (
          <Text style={styles.stageName}>{stageName}</Text>
        )}
        <Text style={styles.userName}>{username}</Text>
        {bio && (
          <Text style={styles.userBio} numberOfLines={3}>{bio}</Text>
        )}
        <View style={styles.userFollowers}>
          <TouchableOpacity
            onPress={onFollowingButtonPress}
            style={styles.userFollowersText}>
            <Text style={styles.userFollowersTextNumber}>{followingCount}</Text>
            <Text style={styles.userFollowersTextDesc}>
              {localized('Following')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onFollowersButtonPress}
            style={styles.userFollowersText}>
            <Text style={styles.userFollowersTextNumber}>{followersCount}</Text>
            <Text style={styles.userFollowersTextDesc}>
              {localized('Followers')}
            </Text>
          </TouchableOpacity>
          <View style={styles.userFollowersText}>
            <Text style={styles.userFollowersTextNumber}>{reactionsCount}</Text>
            <Text style={styles.userFollowersTextDesc}>
              {localized('Likes')}
            </Text>
          </View>
        </View>
        <View style={styles.editProfile}>
          <TouchableOpacity
            onPress={onMainButtonPress}
            style={styles.buttonEditProfile}>
            <Text style={styles.buttonEditProfileText}>{mainButtonTitle}</Text>
          </TouchableOpacity>
        </View>
        {!isOtherUser && (
          <>
            <Text style={styles.versionText}>{VERSION_STRING}</Text>
            {/* DEV: Test Audio Player Button */}
            <TouchableOpacity
              onPress={onTestAudio}
              style={{
                marginTop: 12,
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: isPlaying && currentMedia?.id === 'test-song-1' ? '#22c55e' : '#3875e8',
                borderRadius: 20,
              }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {isPlaying && currentMedia?.id === 'test-song-1' ? '🎵 Playing...' : '🎵 Test Audio Player'}
              </Text>
            </TouchableOpacity>
            {/* System Status Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('SystemStatus')}
              style={{
                marginTop: 12,
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: '#6b7280',
                borderRadius: 20,
              }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                System Status
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    )
  }

  const renderItem = ({ item, index }) => {
    if (!item?.postMedia || item?.postMedia?.length < 1) {
      return null
    }
    const videoURL = item?.postMedia[0]?.url
    if (!videoURL) {
      return null
    }

    return (
      <TouchableOpacity
        key={index + ''}
        onPress={() => onFeedItemPress(index)}
        style={styles.videoContainer}>
        <Image
          style={styles.video}
          rate={1.0}
          volume={1.0}
          shouldPlay={false}
          useNativeControls={false}
          source={{ uri: item?.postMedia[0].thumbnailURL }}
          resizeMode={'cover'}
        />
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={profilePosts}
        style={hasBottomTab ? styles.scrollContainer : styles.container}
        keyExtractor={(item, index) => item.id ?? index?.toString()}
        ListHeaderComponent={renderListHeader}
        numColumns={3}
        renderItem={renderItem}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: theme.colors[appearance].primaryBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: 40,
            maxHeight: '70%',
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: theme.colors[appearance].primaryText,
              }}>
                {localized('Choose an Avatar')}
              </Text>
              <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
                <Text style={{
                  fontSize: 16,
                  color: theme.colors[appearance].primaryForeground,
                }}>
                  {localized('Cancel')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                paddingHorizontal: 10,
              }}
            >
              {SAMPLE_AVATARS.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  onPress={() => onSelectAvatar(avatar.url)}
                  style={{
                    margin: 8,
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={{ uri: avatar.url }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      borderWidth: 2,
                      borderColor: theme.colors[appearance].grey3,
                    }}
                  />
                  <Text style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: theme.colors[appearance].secondaryText,
                    textAlign: 'center',
                    width: 80,
                  }}>
                    {avatar.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
