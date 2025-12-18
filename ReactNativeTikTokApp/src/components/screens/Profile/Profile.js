import React, { useRef, useLayoutEffect } from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  SafeAreaView,
  FlatList,
  Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useActionSheet } from '@expo/react-native-action-sheet'
import * as ImagePicker from 'expo-image-picker'

import { useTheme, useTranslations, StoryItem } from '../../../core/dopebase'
import dynamicStyles from './styles'
import { VERSION_STRING } from '../../../config/appVersion'

export default function Profile(props) {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

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
            localized('Cancel'),
          ],
          cancelButtonIndex: 2,
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
  }

  const onLaunchCamera = () => {
    ImagePicker.launchCameraAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }).then(image => {
      startUpload(image)
    })
  }

  const onOpenPhotos = () => {
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }).then(image => {
      startUpload(image)
    })
  }

  const firstname = user?.firstName ?? ''
  const lastname = user?.lastName ?? ''

  const username = user?.username
    ? `@${user?.username}`
    : `@${firstname?.toLowerCase()}${lastname?.toLowerCase()}`

  const renderListHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <StoryItem
          item={user}
          imageStyle={styles.userImage}
          imageContainerStyle={styles.userImageContainer}
          containerStyle={styles.userImageMainContainer}
          activeOpacity={1}
          onPress={onProfilePicturePress}
        />
        <Text style={styles.userName}>{username}</Text>
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
          <Text style={styles.versionText}>{VERSION_STRING}</Text>
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
    </SafeAreaView>
  )
}
