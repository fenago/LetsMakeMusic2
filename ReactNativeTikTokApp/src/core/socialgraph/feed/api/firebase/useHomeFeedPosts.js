import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  subscribeToHomeFeedPosts as subscribeToHomeFeedPostsAPI,
  listHomeFeedPosts as listHomeFeedPostsAPI,
} from './firebaseFeedClient'
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

  const loadMorePosts = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    setIsLoadingBottom(true)
    const newPosts = await listHomeFeedPostsAPI(
      userID,
      pagination.current.page,
      pagination.current.size,
    )
    if (newPosts?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.page += 1
    setIsLoadingBottom(false)
    setPosts(oldPosts =>
      hydratePostsWithMyReactions(
        deduplicatedPosts(oldPosts, newPosts, true),
        userID,
      ),
    )
  }

  const subscribeToHomeFeedPosts = userID => {
    console.log('[useHomeFeedPosts] ====== SETTING UP SUBSCRIPTION ======')
    console.log('[useHomeFeedPosts] userID:', userID)
    return subscribeToHomeFeedPostsAPI(userID, newPosts => {
      console.log('[useHomeFeedPosts] ====== CALLBACK RECEIVED ======')
      console.log('[useHomeFeedPosts] home_feed_live: ' + (newPosts?.length || 0) + ' posts')

      // DEBUG: Log detailed info about received posts
      console.log('[useHomeFeedPosts] ====== POST DETAILS ======')
      if (newPosts?.length > 0) {
        newPosts.slice(0, 3).forEach((post, i) => {
          console.log(`[useHomeFeedPosts] Post ${i + 1}:`, {
            id: post?.id?.substring?.(0, 8) || 'no-id',
            postType: post?.postType,
            mediaCount: post?.postMedia?.length || 0,
            mediaType: post?.postMedia?.[0]?.type,
            hasSongData: !!post?.songData,
          })
        })
      } else {
        console.log('[useHomeFeedPosts] ⚠️ No posts received or all posts filtered out!')
      }

      setPosts(oldPosts => {
        const processedPosts = hydratePostsWithMyReactions(
          deduplicatedPosts(
            oldPosts,
            removeLocallyDeletedPosts(newPosts),
            false,
          ),
          userID,
        )
        console.log('[useHomeFeedPosts] Setting posts state, count:', processedPosts?.length || 0)
        return processedPosts
      })
    })
  }

  const pullToRefresh = async userID => {
    setRefreshing(true)
    pagination.current.page = 0
    pagination.current.exhausted = false

    const newPosts = await listHomeFeedPostsAPI(
      userID,
      pagination.current.page,
      pagination.current.size,
    )
    if (newPosts?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.page += 1
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
    const oldList = oldPosts ?? []
    const newList = newPosts ?? []

    const all = oldPosts
      ? appendToBottom
        ? [...oldList, ...newList]
        : [...newList, ...oldList]
      : newPosts

    return all.reduce((acc, curr) => {
      if (!acc.some(post => post.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
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
