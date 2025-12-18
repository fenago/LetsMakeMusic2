import { useRef, useState } from 'react'
import {
  sendMessage as sendMessageAPI,
  deleteMessage as deleteMessageAPI,
  subscribeToMessages as subscribeMessagesAPI,
  listMessages as listMessagesAPI,
} from './awsChatClient'
import { useReactions } from './useReactions'
import { hydrateMessagesWithMyReactions, getMessageObject } from '../utils'
import { useCurrentUser } from '../../../onboarding'

export const useChatMessages = () => {
  const [messages, setMessages] = useState(null)

  const pagination = useRef({ size: 25, exhausted: false })

  const { handleMessageReaction } = useReactions(setMessages)
  const currentUser = useCurrentUser()

  const addReaction = async (message, author, reaction, channelID) => {
    await handleMessageReaction(message, reaction, author, channelID)
  }

  const loadMessages = async channelID => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await listMessagesAPI(
      channelID,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (res?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const loadMoreMessages = async channelID => {
    if (pagination.current.exhausted) {
      return
    }
    const newMessages = await loadMessages(channelID)

    setMessages(
      hydrateMessagesWithMyReactions(
        deduplicatedMessages(messages, newMessages, true),
        currentUser?.id,
      ),
    )
  }

  const subscribeToMessages = channelID => {
    loadMoreMessages(channelID)
    return subscribeMessagesAPI(channelID, newMessages => {
      setMessages(prevMessages =>
        hydrateMessagesWithMyReactions(
          deduplicatedMessages(prevMessages, newMessages, false),
          currentUser?.id,
        ),
      )
    })
  }

  const optimisticSetMessage = (
    sender,
    message,
    downloadURL,
    inReplyToItem,
  ) => {
    const newMessage = getMessageObject(
      sender,
      message,
      downloadURL,
      inReplyToItem,
    )

    setMessages(prevMessages =>
      hydrateMessagesWithMyReactions(
        deduplicatedMessages(prevMessages, [newMessage], false),
        currentUser?.id,
      ),
    )

    return newMessage
  }

  const sendMessage = async (newMessage, channel) => {
    return sendMessageAPI(channel, newMessage)
  }

  const deleteMessage = async (channel, threadItemID) => {
    return deleteMessageAPI(channel, threadItemID)
  }

  const deduplicatedMessages = (oldMessages, newMessages, appendToBottom) => {
    const oldList = [...(oldMessages ?? [])]
    const newList = [...(newMessages ?? [])]

    // We merge, dedup and sort the two message lists
    const all = oldMessages
      ? appendToBottom
        ? [...oldList, ...newList]
        : [...newList, ...oldList]
      : newList
    const deduplicatedMessages = all.reduce((acc, curr) => {
      if (!acc.some(friend => friend.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
    return deduplicatedMessages.sort((a, b) => {
      return b.createdAt - a.createdAt
    })
  }

  return {
    messages,
    subscribeToMessages,
    loadMoreMessages,
    sendMessage,
    optimisticSetMessage,
    deleteMessage,
    addReaction,
  }
}
