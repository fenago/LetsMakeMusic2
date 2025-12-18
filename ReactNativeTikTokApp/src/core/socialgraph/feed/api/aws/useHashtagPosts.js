import { useEffect, useRef, useState } from 'react'
import {
  subscribeToHashtagFeedPosts as subscribeToHashtagFeedPostsAPI,
  listHashtagFeedPosts as listHashtagFeedPostsAPI,
} from './awsFeedClient'
import { useReactions } from './useReactions'
import { hydratePostsWithMyReactions } from '../utils'

const batchSize = 25

export const useHashtagPosts = (hashtag, userID) => {
  const [posts, setPosts] = useState(null)
  const [isLoadingBottom, setIsLoadingBottom] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { handleFeedReaction } = useReactions(setPosts)

  const pagination = useRef({ size: batchSize, exhausted: false })

  useEffect(() => {
    if (!hashtag || !userID) {
      return
    }
    const unsubscribe = subscribeToHashtagPosts(hashtag, userID)
    return () => {
      unsubscribe && unsubscribe()
    }
  }, [hashtag, userID])

  const loadPosts = async (hashtag, userID) => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await listHashtagFeedPostsAPI(
      userID,
      hashtag,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (res.items?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const loadMorePosts = async (hashtag, userID, loadBottom = true) => {
    loadBottom && setIsLoadingBottom(true)
    const newPosts = await loadPosts(hashtag, userID)
    loadBottom && setIsLoadingBottom(false)
    setPosts(oldPosts =>
      hydratePostsWithMyReactions(
        deduplicatedPosts(oldPosts, newPosts, true),
        userID,
      ),
    )
  }

  const subscribeToHashtagPosts = (hashtag, userID) => {
    loadMorePosts(hashtag, userID, false)
    return subscribeToHashtagFeedPostsAPI(hashtag, newPosts => {
      setPosts(oldPosts =>
        hydratePostsWithMyReactions(
          deduplicatedPosts(oldPosts, newPosts, false),
          userID,
        ),
      )
    })
  }

  const pullToRefresh = async (hashtag, userID) => {
    setRefreshing(true)
    pagination.current.nextToken = undefined
    pagination.current.exhausted = false

    const newPosts = await loadPosts(hashtag, userID)

    setRefreshing(false)
    setPosts(oldPosts =>
      hydratePostsWithMyReactions(
        deduplicatedPosts(oldPosts, newPosts, true),
        userID,
      ),
    )
  }

  const addReaction = async (post, author, reaction) => {
    await handleFeedReaction(post, reaction, author)
  }

  const deduplicatedPosts = (oldPosts, newPosts, appendToBottom) => {
    if (!newPosts?.length) {
      return oldPosts || []
    }

    const all = oldPosts
      ? appendToBottom
        ? [...oldPosts, ...newPosts]
        : [...newPosts, ...oldPosts]
      : newPosts
    const deduplicatedPosts = all?.reduce((acc, curr) => {
      if (!acc.some(post => post.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    return deduplicatedPosts || []
  }

  return {
    batchSize,
    posts,
    refreshing,
    isLoadingBottom,
    subscribeToHashtagPosts,
    loadMorePosts,
    pullToRefresh,
    addReaction,
  }
}
