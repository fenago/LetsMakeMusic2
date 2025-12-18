import { result } from 'lodash'
import { useEffect, useRef, useState } from 'react'
import {
  fetchFriends as fetchFriendsAPI,
  subscribeToFriends as subscribeToFriendsAPI,
} from '../awsSocialGraphClient'

const batchSize = 25

export const useSocialGraphFriends = userID => {
  const [friends, setFriends] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const pagination = useRef({ size: batchSize, exhausted: false })

  useEffect(() => {
    if (!userID) {
      return
    }
    const unsubscribe = subscribeToFriends(userID)
    return () => {
      unsubscribe && unsubscribe()
    }
  }, [userID])

  const loadFriends = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await fetchFriendsAPI(
      userID,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (result?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const subscribeToFriends = userID => {
    loadMoreFriends(userID)
    return subscribeToFriendsAPI(userID, newFriends => {
      setFriends(prevFriends => deduplicatedFriends(prevFriends, newFriends))
    })
  }

  const loadMoreFriends = async userID => {
    const newFriends = await loadFriends(userID)
    setFriends(prevFriends => deduplicatedFriends(prevFriends, newFriends))
  }

  const deduplicatedFriends = (oldFriends, newFriends) => {
    const all = [...(oldFriends ?? []), ...(newFriends ?? [])]
    const list = all.reduce((acc, curr) => {
      if (!acc.some(friend => friend?.id === curr?.user?.id)) {
        curr?.user && acc.push(curr.user)
      }
      return acc
    }, [])

    return list
  }

  const refreshFriends = async userID => {
    setRefreshing(true)
    pagination.current.nextToken = null
    pagination.current.exhausted = false

    const newFriends = await loadFriends(userID)

    setRefreshing(false)
    setFriends(deduplicatedFriends([], newFriends, true))
  }

  return {
    batchSize,
    refreshing,
    friends,
    refreshFriends,
    subscribeToFriends,
    loadMoreFriends,
  }
}
