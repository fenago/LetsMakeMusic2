import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import messaging from '@react-native-firebase/messaging'

const useNotificationOpenedApp = () => {
  const navigation = useNavigation()

  useEffect(() => {
    registerOnNotificationOpenedApp()
  }, [])

  const registerOnNotificationOpenedApp = async () => {
    messaging().onNotificationOpenedApp(remoteMessage => {
      const { data } = remoteMessage
      const { type, channelID, name, postId, commentId, mentionType } = data || {}

      if (type === 'chat_message') {
        handleChatMessageType(channelID, name)
      } else if (type === 'mention') {
        handleMentionType(postId, commentId, mentionType)
      }
    })

    // Also check if app was opened from a quit state by a notification
    const initialNotification = await messaging().getInitialNotification()
    if (initialNotification) {
      const { data } = initialNotification
      const { type, channelID, name, postId, commentId, mentionType } = data || {}

      if (type === 'chat_message') {
        // Small delay to ensure navigation is ready
        setTimeout(() => handleChatMessageType(channelID, name), 500)
      } else if (type === 'mention') {
        setTimeout(() => handleMentionType(postId, commentId, mentionType), 500)
      }
    }
  }

  const handleChatMessageType = (channelID, name) => {
    const channel = {
      id: channelID,
      channelID,
      name,
    }

    navigation?.navigate('PersonalChat', {
      channel,
      openedFromPushNotification: true,
    })
  }

  const handleMentionType = (postId, commentId, mentionType) => {
    if (!postId) return

    navigation?.navigate('PostDetails', {
      postId,
      commentId,
      openedFromPushNotification: true,
    })
  }
}

export default useNotificationOpenedApp
