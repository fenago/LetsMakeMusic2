import React, { useState, useCallback } from 'react'
import { ActivityIndicator, FlatList } from 'react-native'
import { useTheme, KeyboardAvoidingView } from '../../../core/dopebase'
import CommentItem from './CommentItem'
import CommentInput from './CommentInput'
import EditCommentModal from '../../ui/EditCommentModal'
import dynamicStyles from './styles'

function Comments(props) {
  const { commentItems, onCommentSend, onCommentDelete, onCommentEdited, currentUserId, commentsLoading, postId, insets } = props

  // Debug: Log received data
  console.log('[Comments] Received commentItems:', commentItems?.length ?? 'null', 'loading:', commentsLoading)
  if (commentItems?.length > 0) {
    console.log('[Comments] First comment:', JSON.stringify(commentItems[0]).substring(0, 200))
  }

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  // Edit comment modal state
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [commentToEdit, setCommentToEdit] = useState(null)

  const handleEditComment = useCallback((comment) => {
    console.log('[Comments] Edit comment pressed:', comment?.id)
    setCommentToEdit(comment)
    setEditModalVisible(true)
  }, [])

  const handleEditSave = useCallback((newText) => {
    console.log('[Comments] Comment edited:', commentToEdit?.id)
    onCommentEdited?.(commentToEdit?.id, newText)
    setEditModalVisible(false)
    setCommentToEdit(null)
  }, [commentToEdit, onCommentEdited])

  const handleEditModalClose = useCallback(() => {
    setEditModalVisible(false)
    setCommentToEdit(null)
  }, [])

  const onListEndReached = () => {
    // Use this method if you want to add pagination and load more comments
    console.log('onListEndReached')
  }

  return (
    <KeyboardAvoidingView style={[styles.commentsContainer]}>
      {commentsLoading ? (
        <ActivityIndicator style={{ marginVertical: 7 }} size="small" />
      ) : (
        <FlatList
          data={commentItems}
          renderItem={({ item }) => {
            return (
              <CommentItem
                item={item}
                key={item.id}
                currentUserId={currentUserId}
                onDelete={() => onCommentDelete?.(item.id)}
                onEdit={handleEditComment}
              />
            )
          }}
          keyExtractor={comment => `${comment.id}`}
          initialNumToRender={5}
          removeClippedSubviews={true}
          onListEndReached={onListEndReached}
          onEndReachedThreshold={0.3}
        />
      )}
      <CommentInput onCommentSend={onCommentSend} />

      {/* Edit Comment Modal */}
      <EditCommentModal
        visible={editModalVisible}
        onClose={handleEditModalClose}
        comment={commentToEdit}
        postId={postId}
        onSave={handleEditSave}
      />
    </KeyboardAvoidingView>
  )
}

export default Comments
