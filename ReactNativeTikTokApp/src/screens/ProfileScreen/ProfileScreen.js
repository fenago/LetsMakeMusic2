import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useFocusEffect } from '@react-navigation/native'
import { useTranslations } from '../../core/dopebase'
import { Profile } from '../../components'
import { storageAPI } from '../../core/media'
import { updateUser } from '../../core/users'
import { setUserData } from '../../core/onboarding/redux/auth'
import { useCurrentUser } from '../../core/onboarding'
import { useProfile } from '../../core/socialgraph/feed'
import { useSocialGraphMutations } from '../../core/socialgraph/friendships'

const defaultAvatar =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

const ProfileScreen = props => {
  const { navigation, route } = props
  const { localized } = useTranslations()

  const otherUser = route?.params?.user
  const hasBottomTab = route?.params?.hasBottomTab

  const currentUser = useCurrentUser()

  const { addEdge } = useSocialGraphMutations()

  const dispatch = useDispatch()

  const [uploadProgress, setUploadProgress] = useState(0)
  const [localActionButtonType, setLocalActionButtonType] = useState(
    !otherUser ? 'settings' : null,
  )
  const {
    profile,
    posts,
    refreshing,
    isLoadingBottom,
    subscribeToProfileFeedPosts,
    loadMorePosts,
    pullToRefresh,
    addReaction,
  } = useProfile(otherUser?.id ?? currentUser?.id, currentUser?.id)
  const { user, friends, moreFriendsAvailable, actionButtonType } =
    profile ?? {}

  // Store pullToRefresh in a ref to avoid dependency issues
  const pullToRefreshRef = useRef(pullToRefresh)
  pullToRefreshRef.current = pullToRefresh

  useEffect(() => {
    const postsUnsubscribe = subscribeToProfileFeedPosts(
      otherUser?.id ?? currentUser?.id,
    )

    return () => {
      postsUnsubscribe && postsUnsubscribe()
    }
  }, [currentUser?.id])

  // Refresh profile when screen comes into focus (e.g., after following someone)
  // Using a ref to store pullToRefresh to prevent infinite re-renders
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id && pullToRefreshRef.current) {
        pullToRefreshRef.current(currentUser?.id)
      }
    }, [currentUser?.id])
  )

  const onMainButtonPress = useCallback(() => {
    const actionType = localActionButtonType
      ? localActionButtonType
      : actionButtonType
    if (actionType === 'add') {
      addFriend()
      return
    }
    if (actionType === 'message') {
      onMessage()
      return
    }
    if (actionType === 'settings') {
      navigation.navigate('ProfileSettings')
    }
  }, [
    localActionButtonType,
    actionButtonType,
    addFriend,
    onMessage,
    navigation,
  ])

  const onMessage = () => {
    console.log('[ProfileScreen] onMessage called')
    console.log('[ProfileScreen] currentUser:', currentUser?.id)
    console.log('[ProfileScreen] otherUser:', otherUser?.id, otherUser?.firstName)

    if (!currentUser?.id) {
      console.error('[ProfileScreen] Cannot send message: currentUser is not available')
      alert('Please log in to send messages.')
      return
    }

    if (!otherUser?.id) {
      console.error('[ProfileScreen] Cannot send message: otherUser is not available')
      alert('Cannot send message to this user. Please try again.')
      return
    }

    const viewer = currentUser
    const viewerID = viewer.id || viewer.userID
    const friendID = otherUser.id || otherUser.userID
    let channel = {
      id: viewerID < friendID ? viewerID + friendID : friendID + viewerID,
      participants: [otherUser],
    }
    console.log('[ProfileScreen] Navigating to PersonalChat with channel:', channel.id)
    navigation.navigate('PersonalChat', { channel })
  }

  const addFriend = useCallback(async () => {
    if (!currentUser || !user) {
      return
    }
    setLocalActionButtonType('message')
    await addEdge(currentUser, user)
  }, [currentUser, user, addEdge, setLocalActionButtonType])

  const startUpload = useCallback(
    async source => {
      console.log('[ProfileScreen] startUpload called with source:', source)

      dispatch(
        setUserData({
          user: {
            ...currentUser,
            profilePictureURL: source?.path || source.uri,
          },
          profilePictureURL: source?.path || source.uri,
        }),
      )

      storageAPI.processAndUploadMediaFileWithProgressTracking(
        source,
        async progressOrSnapshot => {
          // Handle both number (new format) and object with bytesTransferred (old format)
          let uploadProgress
          if (typeof progressOrSnapshot === 'number') {
            uploadProgress = progressOrSnapshot * 100
          } else if (progressOrSnapshot?.bytesTransferred !== undefined) {
            uploadProgress =
              (progressOrSnapshot.bytesTransferred / progressOrSnapshot.totalBytes) * 100
          } else {
            uploadProgress = 50
          }
          console.log('[ProfileScreen] Upload progress:', uploadProgress)
          setUploadProgress(uploadProgress)
        },
        async response => {
          // Handle both string URL (old format) and object with downloadURL (new format)
          const url = typeof response === 'string' ? response : response?.downloadURL
          console.log('[ProfileScreen] Upload success, URL:', url)

          if (!url) {
            console.error('[ProfileScreen] No URL in upload response:', response)
            alert(
              localized(
                'Oops! An error occured while trying to update your profile picture. Please try again.',
              ),
            )
            setUploadProgress(0)
            return
          }

          const data = {
            profilePictureURL: url,
          }
          dispatch(
            setUserData({
              user: { ...currentUser, profilePictureURL: url },
            }),
          )

          updateUser(currentUser.id, data)
          setUploadProgress(0)
        },
        error => {
          setUploadProgress(0)
          console.error('[ProfileScreen] Upload error:', error)
          alert(
            localized(
              'Oops! An error occured while trying to update your profile picture. Please try again.',
            ),
          )
        },
      )
    },
    [dispatch, setUploadProgress, setUserData, storageAPI, localized],
  )

  const removePhoto = useCallback(async () => {
    const res = await updateUser(currentUser.id, {
      profilePictureURL: defaultAvatar,
    })
    if (res.success) {
      dispatch(
        setUserData({
          user: { ...currentUser, profilePictureURL: defaultAvatar },
        }),
      )
    } else {
      alert(
        localized(
          'Oops! An error occured while trying to remove your profile picture. Please try again.',
        ),
      )
    }
  }, [updateUser, currentUser, localized])

  // Select a sample avatar (URL-based, no upload needed)
  const selectAvatar = useCallback(async (avatarUrl) => {
    console.log('[ProfileScreen] selectAvatar called with URL:', avatarUrl)

    // Immediately update local state for instant feedback
    dispatch(
      setUserData({
        user: { ...currentUser, profilePictureURL: avatarUrl },
      }),
    )

    // Update in Firestore
    const res = await updateUser(currentUser.id, {
      profilePictureURL: avatarUrl,
    })

    if (!res.success) {
      console.error('[ProfileScreen] Failed to save avatar:', res)
      alert(
        localized(
          'Oops! An error occurred while trying to update your profile picture. Please try again.',
        ),
      )
    } else {
      console.log('[ProfileScreen] Avatar saved successfully')
    }
  }, [dispatch, currentUser, updateUser, localized])

  const onEmptyStatePress = () => {
    navigation.navigate('CreatePost')
  }

  const onFollowersButtonPress = () => {
    navigation.push('AllFriends', {
      title: localized('Fans'),
      otherUser: otherUser ?? currentUser,
      type: 'inbound',
      followEnabled: true,
    })
  }

  const onFeedItemPress = profileFeedItemIndex => {
    navigation.push('CustomFeedScreen', {
      posts: posts,
      feedStartIndex: profileFeedItemIndex,
    })
  }

  const onFollowingButtonPress = () => {
    navigation.push('AllFriends', {
      title: localized('My Artists'),
      otherUser: otherUser ?? currentUser,
      type: 'outbound',
      followEnabled: true,
    })
  }

  const actionType = localActionButtonType
    ? localActionButtonType
    : actionButtonType
  const mainButtonTitle =
    actionType === 'settings'
      ? localized('Backstage Settings')
      : actionType === 'message'
      ? localized('Send Message')
      : actionType === 'add'
      ? localized('Become a Fan')
      : null

  const pullToRefreshConfig = {
    refreshing: refreshing,
    onRefresh: () => {
      pullToRefresh(currentUser?.id)
    },
  }

  return (
    <Profile
      profilePosts={posts}
      user={otherUser ? otherUser : currentUser}
      onFollowingButtonPress={onFollowingButtonPress}
      onFollowersButtonPress={onFollowersButtonPress}
      followingCount={
        user?.outboundFriendshipCount ?? otherUser?.outboundFriendshipCount ?? 0
      }
      followersCount={
        user?.inboundFriendshipCount ?? otherUser?.inboundFriendshipCount ?? 0
      }
      reactionsCount={user?.reactionsCount ?? otherUser?.reactionsCount ?? 0}
      mainButtonTitle={mainButtonTitle}
      onMainButtonPress={onMainButtonPress}
      isOtherUser={otherUser}
      hasBottomTab={hasBottomTab}
      onFeedItemPress={onFeedItemPress}
      startUpload={startUpload}
      removePhoto={removePhoto}
      selectAvatar={selectAvatar}
      pullToRefreshConfig={pullToRefreshConfig}
    />
  )
}

export default ProfileScreen
