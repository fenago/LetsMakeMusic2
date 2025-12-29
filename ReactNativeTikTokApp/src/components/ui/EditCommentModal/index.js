import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { X, Check } from 'lucide-react-native'
import { IMRichTextInput, IMMentionList } from '../../../core/mentions'
import { useSearchUsers } from '../../../core/socialgraph/friendships'
import { useCurrentUser } from '../../../core/onboarding'
import { editComment as editCommentAPI } from '../../../core/socialgraph/feed/api/firebase/firebaseFeedClient'

/**
 * Edit Comment Modal - Allows editing comment text with @mention support
 *
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {object} comment - The comment object to edit
 * @param {string} postId - The ID of the post this comment belongs to
 * @param {function} onSave - Callback when comment is saved successfully
 */
export default function EditCommentModal({
  visible,
  onClose,
  comment,
  postId,
  onSave,
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()
  const { users: searchResults, search } = useSearchUsers(currentUser?.id)

  const [displayText, setDisplayText] = useState('')
  const [rawText, setRawText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Mention state
  const [keyword, setKeyword] = useState('')
  const [isTrackingStarted, setIsTrackingStarted] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState([])

  const editorRef = useRef(null)
  const textInputRef = useRef(null)

  // Initialize text when comment changes or modal opens
  useEffect(() => {
    if (visible && comment) {
      const initialText = comment.text || comment.commentText || ''
      setDisplayText(initialText)
      setRawText(initialText)
      // Reset the editor with the initial text
      if (editorRef.current?.setText) {
        editorRef.current.setText(initialText)
      }
    }
  }, [visible, comment?.id])

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
    setRawText(text)
  }

  const handleSave = async () => {
    if (isSaving) return

    const textToSave = rawText.trim() || displayText.trim()
    const originalText = (comment?.text || comment?.commentText || '').trim()

    // Check if text actually changed
    if (textToSave === originalText) {
      onClose()
      return
    }

    // Don't allow empty comments
    if (!textToSave) {
      Alert.alert('Error', 'Comment cannot be empty')
      return
    }

    setIsSaving(true)

    try {
      console.log('[EditCommentModal] Saving comment:', comment?.id)
      const result = await editCommentAPI(postId, comment.id, currentUser?.id, textToSave)

      if (result.success) {
        console.log('[EditCommentModal] Comment saved successfully')
        onSave?.(textToSave)
        onClose()
      } else {
        console.log('[EditCommentModal] Save failed:', result.error)
        Alert.alert('Error', result.error || 'Failed to save changes')
      }
    } catch (error) {
      console.log('[EditCommentModal] Error saving:', error)
      Alert.alert('Error', 'Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    // Check if there are unsaved changes
    const textToCheck = rawText.trim() || displayText.trim()
    const originalText = (comment?.text || comment?.commentText || '').trim()

    if (textToCheck !== originalText) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      )
    } else {
      onClose()
    }
  }

  const editorStyles = {
    input: {
      color: isDark ? '#ffffff' : '#151723',
      fontSize: 16,
      minHeight: 100,
      maxHeight: 180,
      paddingVertical: 12,
      paddingHorizontal: 0,
      textAlignVertical: 'top',
    },
    mainContainer: {
      flex: 1,
    },
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={handleClose}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <X size={22} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2.5} />
          </Pressable>

          <Text style={styles.headerTitle}>Edit Comment</Text>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Check size={22} color="#ffffff" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {/* Editor */}
        <View style={styles.editorContainer}>
          <View style={styles.mentionListWrapper}>
            <IMMentionList
              containerStyle={styles.mentionListContainer}
              list={mentionSuggestions}
              keyword={keyword}
              isTrackingStarted={isTrackingStarted}
              onSuggestionTap={editorRef.current?.onSuggestionTap}
            />
          </View>

          <IMRichTextInput
            richTextInputRef={editorRef}
            inputRef={textInputRef}
            list={mentionSuggestions}
            mentionListPosition={'top'}
            onChange={onChangeText}
            showEditor={true}
            toggleEditor={() => {}}
            editorStyles={editorStyles}
            showMentions={false}
            onHideMentions={() => {}}
            onUpdateSuggestions={setKeyword}
            onTrackingStateChange={setIsTrackingStarted}
            placeholder="Edit your comment... (use @ to mention)"
            initialValue={comment?.text || comment?.commentText || ''}
          />
        </View>

        {/* Helper text */}
        <Text style={styles.helperText}>
          Use @username to mention someone
        </Text>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F979E', // Brand teal
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    position: 'relative',
  },
  mentionListWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  mentionListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
    borderRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  helperText: {
    fontSize: 13,
    color: isDark ? '#888888' : '#999999',
    textAlign: 'center',
    paddingVertical: 16,
    paddingBottom: 40,
  },
})
