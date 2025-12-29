import React, { useState, useRef, useEffect } from 'react'
import { TouchableOpacity, Image, View, ActivityIndicator, Alert } from 'react-native'
import {
  useTheme,
  useTranslations,
} from '../../../core/dopebase'
import { IMRichTextInput, IMMentionList, EU } from '../../../core/mentions'
import { useSearchUsers } from '../../../core/socialgraph/friendships'
import { useCurrentUser } from '../../../core/onboarding'
import dynamicStyles from './styles'

function CommentInput(props) {
  const { onCommentSend } = props

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const currentUser = useCurrentUser()
  const { users: searchResults, search } = useSearchUsers(currentUser?.id)

  const [displayText, setDisplayText] = useState('')
  const [rawText, setRawText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Mention state
  const [keyword, setKeyword] = useState('')
  const [isTrackingStarted, setIsTrackingStarted] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [showUsersMention, setShowUsersMention] = useState(false)

  const textInputRef = useRef(null)
  const editorRef = useRef(null)

  // Search for users when keyword changes
  useEffect(() => {
    if (keyword && keyword.length > 0) {
      search(keyword)
    }
  }, [keyword])

  // Format search results for mention list
  useEffect(() => {
    if (searchResults) {
      const formattedUsers = searchResults.map(user => {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
        const username = user.username || `${user.firstName}.${user.lastName}`
        const id = user.id || user.userID

        return { id, name, username, ...user }
      })
      setMentionSuggestions(formattedUsers)
    }
  }, [searchResults])

  const onChangeText = ({ displayText: display, text }) => {
    setDisplayText(display)
    setRawText(text) // Keep raw text with mention markup
  }

  const onSendComment = async () => {
    const textToSend = rawText.trim() || displayText.trim()
    if (!textToSend || isSending) return

    console.log('[CommentInput] 📝 Sending comment:', textToSend)
    setIsSending(true)

    // Clear the editor
    if (editorRef.current?.clear) {
      editorRef.current.clear()
    }
    setDisplayText('')
    setRawText('')
    // Don't blur - keep keyboard open for quick follow-up comments

    try {
      const result = await onCommentSend(textToSend)
      console.log('[CommentInput] ✅ Comment result:', JSON.stringify(result))

      // Check if the result indicates an error
      if (result && result.success === false) {
        console.log('[CommentInput] ❌ Server returned error:', result.error)
        Alert.alert('Comment Failed', result.error || 'Unknown error occurred')
      } else if (result && result.success) {
        console.log('[CommentInput] ✅ Comment saved successfully!')
      }
    } catch (error) {
      console.log('[CommentInput] ❌ Error sending comment:', error)
      Alert.alert('Error', `Failed to send comment: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsSending(false)
    }
  }

  const isDisabled = () => {
    if (/\S/.test(displayText)) {
      return false
    } else {
      return true
    }
  }

  const editorStyles = {
    input: {
      color: theme.colors[appearance].primaryText,
      fontSize: 14,
      minHeight: 36,
      maxHeight: 80,
      paddingVertical: 8,
    },
    mainContainer: {
      flex: 1,
    },
  }

  return (
    <View style={styles.commentInputContainer}>
      <View style={styles.commentTextInputContainer}>
        <IMRichTextInput
          richTextInputRef={editorRef}
          inputRef={textInputRef}
          list={mentionSuggestions}
          mentionListPosition={'top'}
          onChange={onChangeText}
          showEditor={true}
          toggleEditor={() => {}}
          editorStyles={editorStyles}
          showMentions={showUsersMention}
          onHideMentions={() => setShowUsersMention(false)}
          onUpdateSuggestions={setKeyword}
          onTrackingStateChange={setIsTrackingStarted}
          placeholder={localized('Leave a note on this track... (use @mentions)')}
        />
        <IMMentionList
          containerStyle={styles.mentionListContainer}
          list={mentionSuggestions}
          keyword={keyword}
          isTrackingStarted={isTrackingStarted}
          onSuggestionTap={editorRef.current?.onSuggestionTap}
        />
      </View>
      <TouchableOpacity
        onPress={onSendComment}
        disabled={isDisabled() || isSending}
        style={styles.commentInputIconContainer}>
        {isSending ? (
          <ActivityIndicator size="small" color={theme.colors[appearance].primaryForeground} />
        ) : (
          <Image
            style={[
              styles.commentInputIcon,
              isDisabled() ? { opacity: 0.3 } : { opacity: 1 },
            ]}
            source={theme.icons.send}
          />
        )}
      </TouchableOpacity>
    </View>
  )
}

export default CommentInput
