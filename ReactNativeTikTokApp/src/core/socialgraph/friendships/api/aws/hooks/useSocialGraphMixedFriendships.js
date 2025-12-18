import { useRef, useState } from 'react'
import { fetchOtherUserFriendships } from '../awsSocialGraphClient'

/**
 * This hook is used to fetch someone else's friendships, and model their type against the friend relationship with the viewerID
 * Useful for displaying someone else's friends or followers, with state follow button actions for the current viewer user (who is generally different than that someone else)
 * e.g. used when looking at someone else's profile page (the list of someone else's followers)
 */
export const useSocialGraphMixedFriendships = () => {
  const [friendships, setFriendships] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const pagination = useRef({ size: 25, exhausted: false })

  const loadUserFriendships = async (userID, viewerID, type) => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await fetchOtherUserFriendships(
      userID,
      viewerID,
      type,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (res?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const loadMoreFriendships = async (userID, viewerID, type) => {
    const items = await loadUserFriendships(userID, viewerID, type)
    setFriendships(oldFriendships =>
      deduplicatedFriendships(oldFriendships, items, true),
    )
  }

  const pullToRefresh = async (userID, viewerID, type) => {
    setRefreshing(true)
    pagination.current.nextToken = undefined
    pagination.current.exhausted = false

    const newFriendships = await loadUserFriendships(userID, viewerID, type)

    setRefreshing(false)
    setFriendships(oldFriendships =>
      deduplicatedFriendships(oldFriendships, newFriendships, true),
    )
  }

  const deduplicatedFriendships = (
    oldFriendships,
    newFriendships,
    appendToBottom,
  ) => {
    if (!newFriendships) {
      return oldFriendships || []
    }

    var all = []
    if (oldFriendships && newFriendships) {
      all = appendToBottom
        ? [...oldFriendships, ...newFriendships]
        : [...newFriendships, ...oldFriendships]
    } else if (oldFriendships) {
      all = [...oldFriendships]
    } else if (newFriendships) {
      all = [...newFriendships]
    }

    const deduplicatedFriendships = all?.reduce((acc, curr) => {
      if (!acc.some(friend => friend.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
    return deduplicatedFriendships ?? []
  }

  return {
    friendships,
    refreshing,
    setFriendships,
    loadMoreFriendships,
    pullToRefresh,
  }
}
