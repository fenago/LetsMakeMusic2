import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  subscribeToHomeFeedPosts as subscribeToHomeFeedPostsAPI,
  listHomeFeedPosts as listHomeFeedPostsAPI,
} from './awsFeedClient'
import { useReactions } from './useReactions'
import { hydratePostsWithMyReactions } from '../utils'

const batchSize = 25

export const useHomeFeedPosts = () => {
  const [posts, setPosts] = useState(null)
  const [isLoadingBottom, setIsLoadingBottom] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { handleFeedReaction } = useReactions(setPosts)

  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  const locallyDeletedPosts = useSelector(
    state => state.feed.locallyDeletedPosts ?? [],
  )

  useEffect(() => {
    if (posts?.length && locallyDeletedPosts?.length) {
      const filterDeletedPosts = removeLocallyDeletedPosts(posts)
      setPosts(filterDeletedPosts)
    }
  }, [JSON.stringify(locallyDeletedPosts)])

  const loadPosts = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await listHomeFeedPostsAPI(
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

  const loadMorePosts = async (userID, loadBottom = true) => {
    loadBottom && setIsLoadingBottom(true)
    const newPosts = await loadPosts(userID)

    loadBottom && setIsLoadingBottom(false)
    setPosts(oldPosts =>
      hydratePostsWithMyReactions(
        deduplicatedPosts(oldPosts, newPosts, true),
        userID,
      ),
    )
  }

  const subscribeToHomeFeedPosts = userID => {
    loadMorePosts(userID, false)
    return subscribeToHomeFeedPostsAPI(userID, newPosts => {
      setPosts(oldPosts =>
        hydratePostsWithMyReactions(
          deduplicatedPosts(
            oldPosts,
            removeLocallyDeletedPosts(newPosts),
            false,
          ),
          userID,
        ),
      )
    })
  }

  const pullToRefresh = async userID => {
    setRefreshing(true)
    pagination.current.nextToken = undefined
    pagination.current.exhausted = false

    const newPosts = await loadPosts(userID)

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

  const ingestAdSlots = adsPlacementDistance => {
    setPosts(oldPosts =>
      postsWithInsertedAdSlots(oldPosts, adsPlacementDistance),
    )
  }

  const postsWithInsertedAdSlots = (posts, adsDistance) => {
    if (!posts) {
      return posts
    }
    // We insert ad slots every X posts
    var adSlotPositions = []
    for (var i = adsDistance; i < posts.length; i += adsDistance) {
      adSlotPositions.push(i)
    }
    for (var j = adSlotPositions.length - 1; j >= 0; --j) {
      posts.splice(adSlotPositions[j], 0, { isAd: true })
    }
    return posts
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
    const deduplicatedPosts = all.reduce((acc, curr) => {
      if (!acc.some(post => post.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
    return deduplicatedPosts
  }

  const removeLocallyDeletedPosts = (postList = []) => {
    return postList.filter(post => !locallyDeletedPosts.includes(post.id))
  }

  return {
    batchSize,
    posts,
    refreshing,
    isLoadingBottom,
    subscribeToHomeFeedPosts,
    loadMorePosts,
    pullToRefresh,
    addReaction,
    ingestAdSlots,
  }
}
