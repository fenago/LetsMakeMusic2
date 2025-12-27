import { useRef, useState } from 'react'

import {
  subscribeToComments as subscribeToCommentsAPI,
  listComments as listCommentsAPI,
} from './firebaseFeedClient'

const batchSize = 25

export const useComments = () => {
  const [comments, setComments] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  // Debug: Log comments state changes
  console.log('[useComments] Current comments state:', comments?.length ?? 'null', 'loading:', commentsLoading)

  const loadMoreComments = async postID => {
    if (pagination.current.exhausted) {
      return
    }
    const newComments = await listCommentsAPI(
      postID,
      pagination.current.page,
      pagination.current.size,
    )
    if (newComments?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.page += 1
    setComments(oldComments =>
      deduplicatedComments(oldComments, newComments, true),
    )
  }

  const subscribeToComments = postID => {
    console.log('[useComments] subscribeToComments called with postID:', postID)
    setCommentsLoading(true)
    setComments(null)
    return subscribeToCommentsAPI(postID, newComments => {
      console.log('[useComments] 🔥 Received callback with', newComments?.length ?? 0, 'comments')
      if (newComments?.length > 0) {
        console.log('[useComments] First comment:', JSON.stringify(newComments[0]).substring(0, 150))
      }
      setCommentsLoading(false)
      setComments(oldComments => {
        const dedupedComments = deduplicatedComments(oldComments, newComments, false)
        console.log('[useComments] After dedup:', dedupedComments?.length ?? 0, 'comments')
        return dedupedComments
      })
    })
  }

  const deduplicatedComments = (oldComments, newComments, appendToBottom) => {
    const oldList = oldComments ?? []
    const newList = newComments ?? []

    const all = oldComments
      ? appendToBottom
        ? [...oldList, ...newList]
        : [...newList, ...oldList]
      : newComments

    return all.reduce((acc, curr) => {
      if (!acc.some(comment => comment.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])
  }

  return {
    batchSize,
    comments,
    commentsLoading,
    subscribeToComments,
    loadMoreComments,
  }
}
