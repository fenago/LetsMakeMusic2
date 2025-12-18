import { useRef, useState } from 'react'
import {
  subscribeChannels as subscribeChannelsAPI,
  listChannels as listChannelsAPI,
  createChannel as createChannelAPI,
  markChannelMessageAsRead as markChannelMessageAsReadAPI,
  updateGroup as updateGroupAPI,
  leaveGroup as leaveGroupAPI,
  markUserAsTypingInChannel as markUserAsTypingInChannelAPI,
  deleteGroup as deleteGroupAPI,
} from './awsChatClient'

export const useChatChannels = () => {
  const [channels, setChannels] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const pagination = useRef({ size: 25, exhausted: false })
  const realtimeChannelsRef = useRef(null)

  const loadChannels = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await listChannelsAPI(
      userID,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (res?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const loadMoreChannels = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    const newChannels = await loadChannels(userID)

    setChannels(oldChannels =>
      deduplicatedChannels(oldChannels, newChannels, true),
    )
  }

  const subscribeToChannels = userID => {
    loadMoreChannels(userID)
    return subscribeChannelsAPI(userID, newChannels => {
      realtimeChannelsRef.current = newChannels
      setChannels(oldChannels =>
        deduplicatedChannels(oldChannels, newChannels, false),
      )
    })
  }

  const pullToRefresh = async userID => {
    setRefreshing(true)
    pagination.current.nextToken = null
    pagination.current.exhausted = false

    const newChannels = await loadChannels(userID)

    setRefreshing(false)
    setChannels(deduplicatedChannels([], newChannels, true))
  }

  const createChannel = async (creator, otherParticipants, name, isAdmin) => {
    return await createChannelAPI(creator, otherParticipants, name, isAdmin)
  }

  const markUserAsTypingInChannel = async (channelID, typingUsers) => {
    return await markUserAsTypingInChannelAPI(channelID, typingUsers)
  }

  const markChannelMessageAsRead = async (
    channelID,
    userID,
    threadMessageID,
    readUserIDs,
    participants,
  ) => {
    return await markChannelMessageAsReadAPI(
      channelID,
      userID,
      threadMessageID,
      readUserIDs,
      participants,
    )
  }

  const updateGroup = async (channelID, userID, data) => {
    return await updateGroupAPI(channelID, userID, data)
  }

  const leaveGroup = async (channelID, userID, content) => {
    return await leaveGroupAPI(channelID, userID, content)
  }

  const deleteGroup = async channelID => {
    return await deleteGroupAPI(channelID)
  }

  const deduplicatedChannels = (oldChannels, newChannels, appendToBottom) => {
    if (!newChannels?.length) {
      return oldChannels || []
    }

    const all = oldChannels
      ? appendToBottom
        ? [...oldChannels, ...newChannels]
        : [...newChannels, ...oldChannels]
      : newChannels
    const deduplicatedChannels = all.reduce((acc, curr) => {
      if (!acc.some(friend => friend.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
    return deduplicatedChannels
  }

  return {
    channels,
    refreshing,
    subscribeToChannels,
    loadMoreChannels,
    pullToRefresh,
    markChannelMessageAsRead,
    markUserAsTypingInChannel,
    createChannel,
    updateGroup,
    leaveGroup,
    deleteGroup,
  }
}
