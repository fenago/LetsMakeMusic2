import React from 'react'
import { ActivityIndicator, FlatList } from 'react-native'
import { useTheme, KeyboardAvoidingView } from '../../../core/dopebase'
import CommentItem from './CommentItem'
import CommentInput from './CommentInput'
import dynamicStyles from './styles'

function Comments(props) {
  const { commentItems, onCommentSend, commentsLoading, insets } = props

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

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
            return <CommentItem item={item} key={item.id} />
          }}
          keyExtractor={comment => `${comment.id}`}
          initialNumToRender={5}
          removeClippedSubviews={true}
          onListEndReached={onListEndReached}
          onEndReachedThreshold={0.3}
        />
      )}
      <CommentInput onCommentSend={onCommentSend} />
    </KeyboardAvoidingView>
  )
}

export default Comments
