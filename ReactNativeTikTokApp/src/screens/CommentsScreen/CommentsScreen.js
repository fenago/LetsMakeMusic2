import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomSheet } from '../../core/dopebase'
import { Comments } from '../../components'
import { useCurrentUser } from '../../core/onboarding'
import { useCommentMutations, useComments } from '../../core/socialgraph/feed'
import { Keyboard } from 'react-native'

const CommentsScreen = props => {
  const { item, onDismiss, isVisible } = props

  const insets = useSafeAreaInsets()

  const scrollViewRef = useRef()
  const bottomSheetRef = useRef(null)

  const currentUser = useCurrentUser()
  const { addComment } = useCommentMutations()
  const { comments, commentsLoading, loadMoreComments, subscribeToComments } =
    useComments()

  const commentCountHeader = `${comments?.length} note${
    comments?.length > 1 ? 's' : ''
  }`

  useEffect(() => {
    console.log('[CommentsScreen] useEffect triggered, item.id:', item?.id)
    if (!item?.id) {
      console.log('[CommentsScreen] No item.id, skipping subscription')
      return
    }
    console.log('[CommentsScreen] Subscribing to comments for post:', item.id)
    const commentsUnsubscribe = subscribeToComments(item.id)
    return () => {
      console.log('[CommentsScreen] Unsubscribing from comments')
      commentsUnsubscribe && commentsUnsubscribe()
    }
  }, [item?.id])

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.present()
    }
  }, [isVisible])

  const onCommentSend = useCallback(
    async text => {
      console.log('[CommentsScreen] ========== onCommentSend called ==========')
      console.log('[CommentsScreen] text:', text)
      console.log('[CommentsScreen] item.id:', item?.id)
      console.log('[CommentsScreen] currentUser:', currentUser?.id, currentUser?.username)

      // Validate inputs before calling
      if (!text || !item?.id || !currentUser?.id) {
        console.log('[CommentsScreen] ❌ Missing required data:', {
          hasText: !!text,
          hasPostId: !!item?.id,
          hasUserId: !!currentUser?.id
        })
        return
      }

      console.log('[CommentsScreen] ✅ All data valid, calling addComment...')
      const result = await addComment(text, item.id, currentUser.id)
      console.log('[CommentsScreen] 📥 Comment send result:', result)
      return result
    },
    [addComment, currentUser?.id, item?.id],
  )

  const handleSheetChanges = useCallback(
    index => {
      console.log('handleSheetChanges', index)
      if (index === -1) {
        bottomSheetRef.current?.dismiss()
        onDismiss()
      }
    },
    [onDismiss],
  )
  if (!isVisible) {
    return null
  }

  return (
    <BottomSheet ref={bottomSheetRef} handleSheetChanges={handleSheetChanges}>
      <Comments
        scrollViewRef={scrollViewRef}
        commentItems={comments}
        commentsLoading={commentsLoading}
        onCommentSend={async text => {
          console.log('[CommentsScreen] 🔔 Comment send triggered with text:', text)
          // Dismiss keyboard but DON'T dismiss bottom sheet - let user see result
          Keyboard.dismiss()
          const result = await onCommentSend(text)
          console.log('[CommentsScreen] 📤 Comment send completed, result:', result)
          // Don't auto-dismiss - let user see the comment appear in list
          return result
        }}
        insets={insets}
      />
    </BottomSheet>
  )
}

export default CommentsScreen
