import { useState, useEffect, useCallback } from 'react'
import functions from '@react-native-firebase/functions'

/**
 * Hook to fetch and manage the current user's feed posts
 * Uses listProfileFeedPosts cloud function
 */
export const useMyPosts = (userId) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const listProfileFeedPosts = functions().httpsCallable('listProfileFeedPosts')
      const result = await listProfileFeedPosts({ userID: userId, limit: 100 })

      if (result.data?.posts) {
        // Sort by createdAt descending
        const sortedPosts = result.data.posts.sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt || 0
          const bTime = b.createdAt?.seconds || b.createdAt || 0
          return bTime - aTime
        })
        setPosts(sortedPosts)
      }
    } catch (err) {
      console.error('[useMyPosts] Error fetching posts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Refresh function for pull-to-refresh
  const refresh = useCallback(() => {
    fetchPosts(true)
  }, [fetchPosts])

  // Delete a post locally (after successful cloud function call)
  const removePostLocally = useCallback((postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }, [])

  // Update a post locally (after successful cloud function call)
  const updatePostLocally = useCallback((postId, updates) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, ...updates } : p
    ))
  }, [])

  return {
    posts,
    postsCount: posts.length,
    loading,
    refreshing,
    error,
    refresh,
    removePostLocally,
    updatePostLocally,
  }
}

export default useMyPosts
