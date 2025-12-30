import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { listDiscoverFeedPosts as listDiscoverFeedPostsAPI } from './firebaseFeedClient'
import { useReactions } from './useReactions'
import { hydratePostsWithMyReactions } from '../utils'

const batchSize = 25

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 * Creates a new shuffled array without modifying the original
 */
const shuffleArray = (array) => {
  if (!array?.length) return array
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const useDiscoverPosts = () => {
  const [posts, setPosts] = useState(null)
  const [isLoadingBottom, setIsLoadingBottom] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { handleFeedReaction } = useReactions(setPosts)

  const pagination = useRef({ size: batchSize, exhausted: false })

  const locallyDeletedPosts = useSelector(
    state => state.feed.locallyDeletedPosts ?? [],
  )

  useEffect(() => {
    if (posts?.length && locallyDeletedPosts?.length) {
      const hydrateDeletedPosts = posts.filter(
        post => !locallyDeletedPosts.includes(post.id)
      )
      setPosts(hydrateDeletedPosts)
    }
  }, [JSON.stringify(locallyDeletedPosts)])

  const loadMorePosts = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    setIsLoadingBottom(true)
    
    try {
      const newPosts = await listDiscoverFeedPostsAPI(
        userID,
        pagination.current.page,
        pagination.current.size,
      )
      
      if (newPosts?.length === 0) {
        setPosts([])
        pagination.current.exhausted = true
        setIsLoadingBottom(false)
        return
      }

      pagination.current.page += 1

      setPosts(oldPosts => {
        // Null safety: ensure arrays are never null
        const safeOldPosts = Array.isArray(oldPosts) ? oldPosts : []
        const safeNewPosts = Array.isArray(newPosts) ? newPosts : []

        // Shuffle on initial load (page 0) for variety
        const isInitialLoad = safeOldPosts.length === 0
        const postsToAdd = isInitialLoad ? shuffleArray(safeNewPosts) : safeNewPosts
        const combinedPosts = [...safeOldPosts, ...postsToAdd]
        return hydratePostsWithMyReactions(
          removeDuplicates(combinedPosts),
          userID,
        )
      })
    } finally {
      setIsLoadingBottom(false)
    }
  }

  const removeDuplicates = (posts) => {
    if (!posts?.length) return []
    return Array.from(new Map(posts.map(post => [post.id, post])).values())
  }


  const pullToRefresh = async userID => {
    setRefreshing(true)
    pagination.current.page = 0
    pagination.current.exhausted = false

    const newPosts = await listDiscoverFeedPostsAPI(
      userID,
      pagination.current.page,
      pagination.current.size,
    )
    if (newPosts?.length === 0) {
      pagination.current.exhausted = true
      setPosts([])
      setRefreshing(false)
      return
    }
    pagination.current.page += 1
    setRefreshing(false)
    // Shuffle posts on refresh for variety (with null safety)
    const safeNewPosts = Array.isArray(newPosts) ? newPosts : []
    const shuffledPosts = shuffleArray(safeNewPosts)
    setPosts(
      hydratePostsWithMyReactions(
        shuffledPosts,
        userID,
      ),
    )
  }

  const addReaction = async (post, author, reaction) => {
    await handleFeedReaction(post, reaction, author)
  }

  const deduplicatedPosts = (oldPosts, newPosts, appendToBottom) => {
    if (!oldPosts?.length || !newPosts?.length) {
      return oldPosts?.length ? oldPosts : newPosts?.length ? newPosts : []
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
    loadMorePosts,
    pullToRefresh,
    addReaction,
  }
}
