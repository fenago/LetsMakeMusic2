import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import functions from '@react-native-firebase/functions'
import { searchUsers, fetchFriends } from '../../../core/socialgraph/friendships/api/firebase/firebaseSocialGraphClient'
import HashtagChips from '../HashtagChips'

const defaultAvatar = 'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

/**
 * EditPostModal - Edit caption and hashtags for a feed post
 *
 * Performance-optimized version:
 * - Uses native TextInput instead of heavy IMRichTextInput
 * - @mentions with 500ms debounced search to prevent Firebase spam
 */
const EditPostModal = ({ visible, onClose, post, onSaveSuccess, onSave }) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = useMemo(() => getStyles(isDark), [isDark])

  // Caption state
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState([])

  // Track original values for detecting changes
  const [originalCaption, setOriginalCaption] = useState('')
  const [originalHashtags, setOriginalHashtags] = useState([])

  // @mentions state - debounced search for performance
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionUsers, setMentionUsers] = useState([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearching, setMentionSearching] = useState(false)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize with post data when modal opens
  useEffect(() => {
    if (visible && post) {
      const postCaption = post.postText || post.description || ''
      setCaption(postCaption)
      setOriginalCaption(postCaption)
      const tags = (post.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`)
      setHashtags(tags)
      setOriginalHashtags(tags)
      // Reset mentions state
      setShowMentions(false)
      setMentionUsers([])
      setMentionQuery('')
    }
  }, [visible, post])

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Debounced mention search - waits 300ms after typing stops
  // Empty query shows friends list
  const debouncedSearchMentions = useCallback((query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    setMentionSearching(true)
    setShowMentions(true) // Show dropdown immediately

    // Use shorter delay for empty query (show friends faster when @ is typed)
    const delay = query ? 300 : 100

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let users
        if (!query || query.trim() === '') {
          // Empty query - show user's friends as suggestions
          users = await fetchFriends(post?.authorID, 0, 10)
        } else {
          // Search by keyword
          users = await searchUsers(post?.authorID, query, 0, 10)
        }
        setMentionUsers(users || [])
        setShowMentions(users && users.length > 0)
      } catch (error) {
        console.log('[EditPostModal] Mention search error:', error)
        setMentionUsers([])
        setShowMentions(false)
      } finally {
        setMentionSearching(false)
      }
    }, delay)
  }, [post?.authorID])

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const captionChanged = caption !== originalCaption
    const hashtagsChanged = JSON.stringify([...hashtags].sort()) !== JSON.stringify([...originalHashtags].sort())
    return captionChanged || hashtagsChanged
  }, [caption, originalCaption, hashtags, originalHashtags])

  // Handle caption text changes - detect @ mentions
  const handleCaptionChange = useCallback((text) => {
    setCaption(text)

    // Find the last @ symbol to detect mention typing
    const lastAtIndex = text.lastIndexOf('@')

    if (lastAtIndex >= 0) {
      // Check if there's text after @ (potential mention query)
      const afterAt = text.slice(lastAtIndex + 1)
      // Stop at space or end of string
      const mentionText = afterAt.split(/\s/)[0]

      // Only search if @ is recent (within last 20 chars typed)
      const isRecentAt = text.length - lastAtIndex <= 20

      // Check if there's a space after the mention (user finished typing mention)
      const hasSpaceAfter = afterAt.includes(' ')

      if (isRecentAt && !hasSpaceAfter) {
        // Trigger search for any change (including empty string after @)
        setMentionStartIndex(lastAtIndex)
        setMentionQuery(mentionText)
        debouncedSearchMentions(mentionText)
      } else if (hasSpaceAfter && showMentions) {
        // User typed space after @mention, hide dropdown
        setShowMentions(false)
        setMentionUsers([])
        setMentionQuery('')
      }
    } else {
      // No @ found, hide mentions
      if (showMentions) {
        setShowMentions(false)
        setMentionUsers([])
        setMentionQuery('')
      }
    }
  }, [showMentions, debouncedSearchMentions])

  // Handle selecting a user from mention dropdown
  const handleSelectMention = useCallback((user) => {
    const username = user.username || `${user.firstName || ''}${user.lastName || ''}`.toLowerCase()

    // Replace @query with @username
    if (mentionStartIndex >= 0) {
      const beforeMention = caption.slice(0, mentionStartIndex)
      const afterMention = caption.slice(mentionStartIndex + mentionQuery.length + 1) // +1 for @
      const newCaption = `${beforeMention}@${username} ${afterMention}`
      setCaption(newCaption)
    }

    // Hide dropdown
    setShowMentions(false)
    setMentionUsers([])
    setMentionQuery('')
    setMentionStartIndex(-1)
  }, [caption, mentionStartIndex, mentionQuery])

  const handleRemoveTag = useCallback((tag) => {
    setHashtags(prev => prev.filter(t => t !== tag))
  }, [])

  const handleAddTag = useCallback((tag) => {
    setHashtags(prev => [...new Set([...prev, tag])].slice(0, 10))
  }, [])

  const handleSave = useCallback(() => {
    if (!post?.id) return

    // Optimistic update - close immediately and update UI
    const updatedData = {
      postText: caption.trim(),
      description: caption.trim(),
      hashtags: hashtags.map(t => t.replace(/^#/, '')),
      isEdited: true,
    }

    // Support both prop names for compatibility
    // ManageFeedScreen uses onSaveSuccess, Feed.js uses onSave
    if (onSaveSuccess) {
      onSaveSuccess(updatedData)
    } else if (onSave) {
      onSave(updatedData.description) // Feed.js expects just the text
    }
    onClose()

    // Save in background with feedback
    console.log('[EditPostModal] 📤 Saving post:', post.id)
    console.log('[EditPostModal] Description:', updatedData.description)
    console.log('[EditPostModal] Hashtags:', updatedData.hashtags)

    const editPost = functions().httpsCallable('editPost')
    editPost({
      postID: post.id,
      postAuthorID: post.authorID,
      description: updatedData.description,
      hashtags: updatedData.hashtags,
    })
      .then(() => {
        console.log('[EditPostModal] ✅ Save successful for post:', post.id)
      })
      .catch(error => {
        console.error('[EditPostModal] ❌ Background save error:', error)
        // Show error alert so user knows to retry
        Alert.alert(
          'Save Failed',
          'Your changes may not have been saved. Please try editing again.',
          [{ text: 'OK' }]
        )
      })
  }, [post, caption, hashtags, onSaveSuccess, onSave, onClose])

  const handleClose = useCallback(() => {
    Keyboard.dismiss()

    if (hasUnsavedChanges) {
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
  }, [hasUnsavedChanges, onClose])

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
          >
            <X size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Post</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasUnsavedChanges}
            style={[
              styles.saveButton,
              hasUnsavedChanges && styles.saveButtonActive,
            ]}
          >
            <Text style={[
              styles.saveButtonText,
              hasUnsavedChanges && styles.saveButtonTextActive,
            ]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Caption Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Caption</Text>
              <Text style={styles.captionHint}>Tip: Use @ to mention users, # for hashtags</Text>
              <View style={styles.captionInputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.captionInput}
                  value={caption}
                  onChangeText={handleCaptionChange}
                  placeholder="Write a caption..."
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />

                {/* @Mentions Dropdown */}
                {showMentions && (
                  <View style={styles.mentionsDropdown}>
                    {mentionSearching ? (
                      <View style={styles.mentionLoading}>
                        <ActivityIndicator size="small" color="#2126A2" />
                        <Text style={styles.mentionLoadingText}>Searching...</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={mentionUsers}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                        style={styles.mentionsList}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.mentionItem}
                            onPress={() => handleSelectMention(item)}
                          >
                            <Image
                              source={{ uri: item.profilePictureURL || defaultAvatar }}
                              style={styles.mentionAvatar}
                            />
                            <View style={styles.mentionInfo}>
                              <Text style={styles.mentionName} numberOfLines={1}>
                                {item.firstName} {item.lastName}
                              </Text>
                              <Text style={styles.mentionUsername} numberOfLines={1}>
                                @{item.username || `${item.firstName}${item.lastName}`.toLowerCase()}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.charCount}>{caption.length}/500</Text>
            </View>

            {/* Hashtags Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Hashtags</Text>
              <HashtagChips
                tags={hashtags}
                onRemove={handleRemoveTag}
                onAdd={handleAddTag}
                editable={true}
                maxTags={10}
                placeholder="Add a hashtag..."
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const getStyles = (isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1c1c1e' : '#e0e0e0',
      minHeight: 56,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: isDark ? '#333' : '#e0e0e0',
    },
    saveButtonActive: {
      backgroundColor: '#1F979E',
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#666' : '#999',
    },
    saveButtonTextActive: {
      color: '#fff',
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 4,
    },
    captionHint: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      marginBottom: 8,
    },
    captionInputContainer: {
      position: 'relative',
    },
    captionInput: {
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
      borderRadius: 12,
      padding: 14,
      minHeight: 120,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ddd',
      color: isDark ? '#fff' : '#000',
      fontSize: 15,
      lineHeight: 22,
    },
    charCount: {
      fontSize: 12,
      color: isDark ? '#666' : '#999',
      textAlign: 'right',
      marginTop: 4,
    },
    // Mentions dropdown styles
    mentionsDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: isDark ? '#1c1c1e' : '#fff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ddd',
      maxHeight: 200,
      zIndex: 1000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      marginTop: 4,
    },
    mentionLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    mentionLoadingText: {
      color: isDark ? '#888' : '#666',
      fontSize: 14,
    },
    mentionsList: {
      maxHeight: 200,
    },
    mentionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#2c2c2e' : '#f0f0f0',
      gap: 12,
    },
    mentionAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#333' : '#e0e0e0',
    },
    mentionInfo: {
      flex: 1,
    },
    mentionName: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
    },
    mentionUsername: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      marginTop: 2,
    },
  })

export default EditPostModal
