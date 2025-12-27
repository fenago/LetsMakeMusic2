import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { BackHandler, View, Text, TouchableOpacity } from 'react-native'
import { useFocusEffect } from '@react-navigation/core'
import { useTheme, useTranslations } from '../../../dopebase'
import IMCreateGroupComponent from '../../ui/IMCreateGroupComponent/IMCreateGroupComponent'
import { useChatChannels } from '../../api'
import { useSocialGraphFriends } from '../../../socialgraph/friendships'
import { useCurrentUser } from '../../../onboarding'

const IMCreateGroupScreen = props => {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()

  // Check if creating a band (from Library) or regular group (from Chat)
  const isBand = props.route?.params?.isBand || false

  const currentUser = useCurrentUser()
  const { friends, loadMoreFriends } = useSocialGraphFriends(currentUser?.id)

  const { createChannel } = useChatChannels()

  const [isLoading, setIsLoading] = useState(false)
  const [isNameDialogVisible, setIsNameDialogVisible] = useState(false)
  const [uiFriends, setUiFriends] = useState(null)

  useLayoutEffect(() => {
    const colorSet = theme.colors[appearance]
    props.navigation.setOptions({
      headerTitle: isBand ? localized('Start Band') : localized('Select Artists'),
      headerRight:
        friends?.length > 1
          ? () => (
              <TouchableOpacity
                style={{ marginHorizontal: 7 }}
                onPress={onCreate}>
                <Text
                  style={{
                    color: colorSet.primaryForeground,
                    fontWeight: 'bold',
                    fontSize: 16,
                  }}>
                  {localized('Create')}
                </Text>
              </TouchableOpacity>
            )
          : () => <View />,
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [friends, isBand])

  useEffect(() => {
    setUiFriends(friends)
  }, [friends])

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackButtonPressAndroid,
      )
      return () => {
        subscription.remove()
      }
    }, []),
  )

  const onBackButtonPressAndroid = () => {
    props.navigation.goBack()
    return true
  }

  const onCreate = () => {
    const checkedFriends = friends.filter(friend => friend.checked)
    if (checkedFriends.length === 0) {
      alert(isBand
        ? 'Please select at least 1 artist to start a band with.'
        : 'Please select at least 1 artist.')
    } else {
      setIsNameDialogVisible(true)
    }
  }

  const onCheck = friend => {
    friend.checked = !friend.checked
    const newFriends = friends.map(item => {
      if (item.id == friend.id) {
        return friend
      }
      return item
    })
    setUiFriends(newFriends)
  }

  const onCancel = () => {
    setIsNameDialogVisible(false)
    setUiFriends(friends)
  }

  const onSubmitName = async name => {
    const participants = friends.filter(friend => friend.checked)
    if (participants.length === 0) {
      alert(localized('Select at least 1 artist to start a band with.'))
      return
    }
    setIsNameDialogVisible(false)
    setIsLoading(true)
    const response = await createChannel(currentUser, participants, name, true, isBand)
    if (response) {
      onCancel();
      props.navigation.goBack()
    }
  }

  const onEmptyStatePress = () => {
    props.navigation.goBack()
  }

  const onListEndReached = () => {
    loadMoreFriends()
  }

  return (
    <IMCreateGroupComponent
      onCancel={onCancel}
      isNameDialogVisible={isNameDialogVisible}
      friends={uiFriends}
      onSubmitName={onSubmitName}
      onCheck={onCheck}
      isLoading={isLoading}
      onEmptyStatePress={onEmptyStatePress}
      onListEndReached={onListEndReached}
    />
  )
}

export default IMCreateGroupScreen
