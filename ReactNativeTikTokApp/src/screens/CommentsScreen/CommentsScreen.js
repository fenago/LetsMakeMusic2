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

  const commentCountHeader = `${comments?.length} comment${
    comments?.length > 1 ? 's' : ''
  }`

  useEffect(() => {
    if (!item?.id) {
      return
    }
    const commentsUnsubscribe = subscribeToComments(item.id)
    return () => {
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
      await addComment(text, item.id, currentUser.id)
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
        onCommentSend={text => {
          Keyboard.dismiss()
          bottomSheetRef.current?.dismiss()
          onCommentSend(text)
        }}
        insets={insets}
      />
    </BottomSheet>
  )
}

export default CommentsScreen
