import { useRef, useState } from 'react'

import {
  subscribeToComments as subscribeToCommentsAPI,
  listComments as listCommentsAPI,
} from './awsFeedClient'

const batchSize = 25

export const useComments = () => {
  const [comments, setComments] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const pagination = useRef({ size: batchSize, exhausted: false })

  const loadComments = async postID => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await listCommentsAPI(
      postID,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (res.items?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const loadMoreComments = async postID => {
    const newComments = await loadComments(postID)

    setCommentsLoading(false)

    setComments(oldComments =>
      deduplicatedComments(oldComments, newComments, true),
    )
  }

  const subscribeToComments = postID => {
    setCommentsLoading(true)
    loadMoreComments(postID)
    return subscribeToCommentsAPI(postID, newComments => {
      setCommentsLoading(false)
      setComments(oldComments =>
        deduplicatedComments(oldComments, newComments, false),
      )
    })
  }

  const deduplicatedComments = (oldComments, newComments, appendToBottom) => {
    if (!newComments?.length) {
      return oldComments || []
    }
    const all = oldComments
      ? appendToBottom
        ? [...oldComments, ...newComments]
        : [...newComments, ...oldComments]
      : newComments
    const deduplicatedComments = all.reduce((acc, curr) => {
      if (!acc.some(comment => comment.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    return deduplicatedComments
  }

  return {
    batchSize,
    comments,
    commentsLoading,
    subscribeToComments,
    loadMoreComments,
  }
}
