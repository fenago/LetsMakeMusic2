import { useState, useCallback } from 'react'
import { useReactions } from './useReactions'

// handles a static list of posts
export const useCustomPosts = originalPosts => {
  const [posts, setPosts] = useState(originalPosts)

  const { handleFeedReaction } = useReactions(setPosts)

  const addReaction = async (post, author, reaction) => {
    await handleFeedReaction(post, reaction, author)
  }

  // Update a post's text fields after editing
  const updatePost = useCallback((postId, newText) => {
    setPosts(prevPosts =>
      prevPosts?.map(post =>
        post.id === postId
          ? { ...post, postText: newText, description: newText }
          : post
      ) || []
    )
  }, [])

  return {
    posts,
    addReaction,
    updatePost,
  }
}
