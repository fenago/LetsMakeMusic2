import { API, graphqlOperation } from 'aws-amplify'
import { v4 as uuidv4 } from 'uuid'


import { storageAPI } from '../../../media'
import { getUnixTimeStamp } from '../../../helpers/timeFormat'

export const createChannel = async (
  creator,
  otherParticipants,
  name,
  isAdmin = false,
) => {
  let channelID = uuidv4()
  const id1 = creator.id
  if (otherParticipants?.length == 1) {
    const id2 = otherParticipants[0].id || otherParticipants[0].userID
    if (id1 == id2) {
      // We should never create a self chat
      return null
    }
    // For any 1-1 chat, the id of the channel is the concatanation of the two user ids (in alphabetical order)
    channelID = id1 < id2 ? id1 + id2 : id2 + id1
  }
  const allParticipants = [...otherParticipants, creator]
  const channelParticipants = allParticipants.map(participant => ({
    id: participant.id,
    fullName: participant.fullName || '',
    username: participant.username || '',
    firstName: participant.firstName || '',
    lastName: participant.lastName || '',
    profilePictureKey: participant.profilePictureKey || '',
  }))

  const channel = {
    creatorID: id1,
    id: channelID,
    channelID,
    name: name || '',
    participants: channelParticipants,
    createdAt: getUnixTimeStamp(),
    updatedAt: getUnixTimeStamp(),
  }

  if (isAdmin) {
    channel['admins'] = [creator?.id]
  }

  try {
    await API.graphql(
      graphqlOperation(chatMutations.createChannel, {
        input: channel,
      }),
    )

    const res = await API.graphql(
      graphqlOperation(chatMutations.onChannelCreated, {
        channelID,
      }),
    )

    return channel
  } catch (error) {
    console.log(error)

    API.graphql(
      graphqlOperation(chatMutations.deleteChannel, {
        input: { id: channelID },
      }),
    )

    return null
  }
}

export const getChannel = async channelID => {
  const res = await API.graphql(
    graphqlOperation(chatQueries.getChannel, {
      id: channelID,
    }),
  )

  return res.data.getChannel
}

export const sendMessage = async (channel, message) => {
  const data = {
    id: uuidv4(),
    ...message,
    url: message.url
      ? {
          mime: message.url.mime,
          url: message.url.url,
          urlKey: message.url.urlKey,
          fileID: message.url.fileID || '',
        }
      : undefined,
    sender: {
      id: message.senderID,
      fullName: message.senderFirstName || '',
      username: message.senderUsername || '',
    },
    channelID: channel?.channelID,
    updatedAt: getUnixTimeStamp(),
    createdAt: getUnixTimeStamp(),
  }

  try {
    await API.graphql(
      graphqlOperation(chatMutations.createMessage, {
        input: data,
      }),
    )

    const res = await API.graphql(
      graphqlOperation(chatMutations.onMessageCreated, {
        messageID: data.id,
        channelID: channel?.channelID,
      }),
    )

    return { success: true }
  } catch (error) {
    API.graphql(
      graphqlOperation(chatMutations.deleteMessage, {
        input: { id: data.id },
      }),
    )
    console.log(error)
    return { error }
  }
}

export const listChannels = async (userID, nextToken, size = 50) => {
  try {
    const res = await API.graphql(
      graphqlOperation(chatQueries.channelFeedByUser, {
        userID,
        limit: size,
        nextToken: nextToken,
        sortDirection: 'DESC',
      }),
    )

    if (!res.data?.channelFeedByUser.items) {
      return {
        items: [],
        nextToken: null,
      }
    }

    const channelFeedByUser = res.data?.channelFeedByUser

    const hydratedChannels = channelFeedByUser.items.map(async channelItem => {
      channelItem.participants = await storageAPI.hydrateListWithFileLink(
        channelItem.participants,
        'profilePictureKey',
        'profilePictureURL',
      )

      return { ...channelItem }
    })
    return {
      items: await Promise.all(hydratedChannels),
      nextToken: channelFeedByUser.nextToken,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const listMessages = async (channelID, nextToken, size = 20) => {
  try {
    const res = await API.graphql(
      graphqlOperation(chatQueries.messagesByChannelID, {
        channelID,
        sortDirection: 'DESC',
        limit: size,
        nextToken: nextToken,
      }),
    )

    if (!res.data?.messagesByChannelID.items) {
      return {
        items: [],
        nextToken: null,
      }
    }

    const messagesByChannelID = res.data?.messagesByChannelID

    const task = messagesByChannelID?.items?.map(async messageItem => {
      messageItem.participantProfilePictureURLs =
        await storageAPI.hydrateListWithFileLink(
          messageItem.participantProfilePictureURLs,
          'profilePictureKey',
          'profilePictureURL',
        )
      messageItem.senderProfilePictureURL = await storageAPI.getFileLink(
        messageItem.senderProfilePictureKey,
      )
      if (messageItem.url?.url || messageItem.url?.urlKey) {
        messageItem.url.url = await storageAPI.getFileLink(
          messageItem.url?.urlKey,
        )
      }
      return messageItem
    })

    return {
      items: await Promise.all(task),
      nextToken: messagesByChannelID.nextToken,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const markChannelMessageAsRead = async (
  channelID,
  userID,
  messageID,
  readUserIDs,
) => {
  try {
    const res = await API.graphql(
      graphqlOperation(chatMutations.markAsRead, {
        channelID,
        userID,
        messageID,
        readUserIDs,
      }),
    )
  } catch (error) {
    console.log(error)
    return null
  }
}

export const markUserAsTypingInChannel = async (channelID, typingUsers) => {
  try {
    await API.graphql(
      graphqlOperation(chatMutations.updateChannel, {
        input: {
          id: channelID,
          typingUsers,
        },
      }),
    )

    return { success: true }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const deleteMessage = async (channel, messageID) => {
  if (!channel?.channelID || !messageID) {
    return
  }
  try {
    const res = await API.graphql(
      graphqlOperation(chatMutations.deleteMessageAndUpdateChannel, {
        channelID: channel.channelID,
        messageID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const leaveGroup = async (channelID, userID, content) => {
  try {
    const res = await API.graphql(
      graphqlOperation(chatMutations.leaveGroup, {
        channelID,
        userID,
        content,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const updateGroup = async (channelID, userID, newData) => {
  const { content, ...channelData } = newData
  try {
    await API.graphql(
      graphqlOperation(chatMutations.updateChannel, {
        input: { ...channelData, id: channelID, updatedAt: getUnixTimeStamp() },
      }),
    )
    const res = await API.graphql(
      graphqlOperation(chatMutations.onGroupUpdate, {
        channelID,
        userID,
        content,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const deleteGroup = async channelID => {
  try {
    const res = await API.graphql(
      graphqlOperation(chatMutations.deleteGroup, {
        channelID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToSingleChannel = (channelID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(chatsubscriptions.onSingleChannelUpdate, {
      channelID,
    }),
  ).subscribe({
    next: ({ provider, value }) => {
      callback(value.data.onSingleChannelUpdate)
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeChannels = (userID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(chatsubscriptions.onUserChannelFeedUpdate, {
      userID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const updatedChannel = { ...value.data.onUserChannelFeedUpdate }
      updatedChannel.participants = await storageAPI.hydrateListWithFileLink(
        updatedChannel.participants,
        'profilePictureKey',
        'profilePictureURL',
      )
      callback([updatedChannel])
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeToMessages = (channelID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(chatsubscriptions.onChannelMessageUpdate, {
      channelID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onChannelMessageUpdate }
      item.senderProfilePictureURL = await storageAPI.getFileLink(
        item.senderProfilePictureKey,
      )

      callback([item])
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const addReaction = async (messageID, authorID, reaction, channelID) => {
  try {
    await API.graphql(
      graphqlOperation(chatMutations.addChatReaction, {
        authorID,
        messageID,
        reaction,
        channelID,
      }),
    )

    return { success: true }
  } catch (error) {
    console.log(error)
    return null
  }
}
