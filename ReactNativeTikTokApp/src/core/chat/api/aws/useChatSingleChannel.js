import { useEffect, useState } from 'react'
import {
  subscribeToSingleChannel as subscribeToSingleChannelAPI,
  getChannel as getChannelAPI,
} from './awsChatClient'

export const useChatSingleChannel = defaultChannel => {
  const [remoteChannel, setRemoteChannel] = useState(defaultChannel ?? {})

  useEffect(() => {
    if (defaultChannel?.channelID) {
      fetchSingleChannel(defaultChannel?.channelID)
    }
  }, [defaultChannel?.channelID])

  const fetchSingleChannel = async channelID => {
    const channel = await getChannelAPI(channelID)

    setRemoteChannel(prevChannel => ({ ...prevChannel, ...channel }))
  }

  const subscribeToSingleChannel = channelID => {
    if (channelID) {
      return subscribeToSingleChannelAPI(channelID, channel => {
        setRemoteChannel(prevChannel => ({ ...prevChannel, ...channel }))
      })
    }
    return null
  }

  return {
    remoteChannel,
    subscribeToSingleChannel,
  }
}
