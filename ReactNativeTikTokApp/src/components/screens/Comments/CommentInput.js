import React, { useState, useRef } from 'react'
import { TouchableOpacity, Image, View, TextInput, ActivityIndicator, Alert } from 'react-native'
import {
  useTheme,
  useTranslations,
  BottomSheetTextInput,
} from '../../../core/dopebase'
import dynamicStyles from './styles'

function CommentInput(props) {
  const { onCommentSend } = props

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [value, setValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textInputRef = useRef(null)

  const onChangeText = value => {
    setValue(value)
  }

  const onSendComment = async () => {
    if (!value.trim() || isSending) return

    console.log('[CommentInput] 📝 Sending comment:', value)
    const textToSend = value
    setIsSending(true)
    setValue('') // Clear immediately for better UX
    // Don't blur - keep keyboard open for quick follow-up comments

    try {
      const result = await onCommentSend(textToSend)
      console.log('[CommentInput] ✅ Comment result:', JSON.stringify(result))

      // Check if the result indicates an error
      if (result && result.success === false) {
        console.log('[CommentInput] ❌ Server returned error:', result.error)
        setValue(textToSend)
        Alert.alert('Comment Failed', result.error || 'Unknown error occurred')
      } else if (result && result.success) {
        console.log('[CommentInput] ✅ Comment saved successfully!')
      }
    } catch (error) {
      console.log('[CommentInput] ❌ Error sending comment:', error)
      // Restore the text if sending failed
      setValue(textToSend)
      Alert.alert('Error', `Failed to send comment: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsSending(false)
    }
  }

  const isDisabled = () => {
    if (/\S/.test(value)) {
      return false
    } else {
      return true
    }
  }

  return (
    <View style={styles.commentInputContainer}>
      <View style={styles.commentTextInputContainer}>
        <BottomSheetTextInput
          ref={textInputRef}
          underlineColorAndroid="transparent"
          placeholder={localized('Add a comment to this video')}
          placeholderTextColor={theme.colors[appearance].secondaryText}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSendComment}
          returnKeyType="send"
          blurOnSubmit={false}
          style={styles.commentTextInput}
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
