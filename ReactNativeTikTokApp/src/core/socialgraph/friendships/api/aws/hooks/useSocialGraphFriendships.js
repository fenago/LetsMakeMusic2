import { useRef, useState } from 'react'
import {
  fetchFriendships as fetchFriendshipsAPI,
  subscribeToFriendships as subscribeToFriendshipsAPI,
} from '../awsSocialGraphClient'

const batchSize = 25

export const useSocialGraphFriendships = () => {
  const [friendships, setFriendships] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const realtimeFriendships = useRef(null) // the friendships from the live collection only (no need to fetch them again when pull-to-refreshing)

  const pagination = useRef({ size: batchSize, exhausted: false })

  const loadFriendships = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await fetchFriendshipsAPI(
      userID,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (res.items?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const loadMoreFriendships = async userID => {
    const items = await loadFriendships(userID)
    setFriendships(deduplicatedFriendships(friendships, items, true))
  }

  const subscribeToFriendships = userID => {
    loadMoreFriendships(userID)
    return subscribeToFriendshipsAPI(userID, newFriendships => {
      realtimeFriendships.current = newFriendships
      setFriendships(prevFriendships =>
        deduplicatedFriendships(prevFriendships, newFriendships, false),
      )
    })
  }

  const pullToRefresh = async userID => {
    setRefreshing(true)
    pagination.current.nextToken = undefined
    pagination.current.exhausted = false

    const items = await loadFriendships(userID)
    setRefreshing(false)
    setFriendships(
      deduplicatedFriendships(realtimeFriendships.current, items, true),
    )
  }

  const deduplicatedFriendships = (
    oldFriendships,
    newFriendships,
    appendToBottom,
  ) => {
    if (!newFriendships?.length) {
      return oldFriendships || []
    }
    const all = oldFriendships
      ? appendToBottom
        ? [...oldFriendships, ...newFriendships]
        : [...newFriendships, ...oldFriendships]
      : newFriendships
    const deduplicatedFriendships = all.reduce((acc, curr) => {
      if (!acc.some(friend => friend.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    return deduplicatedFriendships
  }

  return {
    batchSize,
    friendships,
    setFriendships,
    refreshing,
    subscribeToFriendships,
    loadMoreFriendships,
    pullToRefresh,
  }
}
