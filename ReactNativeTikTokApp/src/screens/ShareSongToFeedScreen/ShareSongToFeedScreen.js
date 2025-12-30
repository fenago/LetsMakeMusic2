import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Play, Music2 } from 'lucide-react-native'
import functions from '@react-native-firebase/functions'
import HashtagChips from '../../components/ui/HashtagChips'
import { IMRichTextInput, IMMentionList, EU } from '../../core/mentions'
import { useSearchUsers } from '../../core/socialgraph/friendships'
import { useCurrentUser } from '../../core/onboarding'

/**
 * Auto-generate hashtags from song style
 * "electronic chill pop" -> ['#electronic', '#chill', '#pop']
 */
const autoGenerateHashtags = (style) => {
  if (!style) return []

  return style
    .split(/[\s,]+/) // Split on spaces/commas
    .map((s) => s.toLowerCase()) // Lowercase
    .map((s) => s.replace(/[^a-z0-9]/g, '')) // Remove special chars
    .filter((s) => s.length > 2) // Min 3 chars
    .map((s) => `#${s}`) // Add hash prefix
    .slice(0, 5) // Max 5 hashtags
}

/**
 * ShareSongToFeedScreen - Share a song to social feed with hashtags
 *
 * Features:
 * - Song preview card with cover art
 * - Caption input with hashtag detection
 * - Auto-generated hashtags from song style
 * - Editable hashtag chips (add/remove)
 * - Share to feed via createSongPost cloud function
 */
const ShareSongToFeedScreen = () => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const navigation = useNavigation()
  const route = useRoute()
  const { song } = route.params || {}

  const currentUser = useCurrentUser()
  const { users: searchResults, search } = useSearchUsers(currentUser?.id)

  const [caption, setCaption] = useState('')
  const [rawCaption, setRawCaption] = useState('')
  const [hashtags, setHashtags] = useState(() =>
    autoGenerateHashtags(song?.style)
  )
  const [isSharing, setIsSharing] = useState(false)

  // Mention state
  const [keyword, setKeyword] = useState('')
  const [isTrackingStarted, setIsTrackingStarted] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [showUsersMention, setShowUsersMention] = useState(false)

  const editorRef = useRef()
  const textInputRef = useRef()

  const styles = getStyles(isDark)

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

  // Extract COMPLETED hashtags from caption (followed by space/punctuation, not still being typed)
  useEffect(() => {
    // Only match hashtags followed by whitespace, punctuation, or that aren't at the end
    // This prevents extracting partial hashtags while user is still typing
    const completedTagsRegex = /#(\w{3,})(?=[\s,.!?;:]|$(?!.))/g
    const matches = []
    let match

    // Find all completed hashtags (not at the very end where user might still be typing)
    const trimmedCaption = caption.trimEnd()
    const isTypingAtEnd = caption.length > 0 && caption.endsWith(trimmedCaption.slice(-1)) && /\w$/.test(caption)

    while ((match = completedTagsRegex.exec(caption)) !== null) {
      const tag = `#${match[1].toLowerCase()}`
      // Skip if this tag is at the very end and user might still be typing
      const isAtEnd = match.index + match[0].length >= caption.length
      if (!isAtEnd || !isTypingAtEnd) {
        matches.push(tag)
      }
    }

    // Also extract hashtags that are clearly complete (followed by space)
    const spaceCompletedTags = caption.match(/#\w{3,}(?=\s)/g) || []
    spaceCompletedTags.forEach(tag => {
      const normalized = tag.toLowerCase()
      if (!matches.includes(normalized)) {
        matches.push(normalized)
      }
    })

    const newTags = matches.filter((t) => !hashtags.includes(t))

    if (newTags.length > 0) {
      setHashtags((prev) => [...new Set([...prev, ...newTags])].slice(0, 10))
    }
  }, [caption])

  const onCaptionChange = ({ displayText, text }) => {
    setCaption(displayText)
    setRawCaption(text) // Keep raw text with mention markup
  }

  const handleRemoveTag = useCallback((tag) => {
    setHashtags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleAddTag = useCallback((tag) => {
    setHashtags((prev) => [...new Set([...prev, tag])].slice(0, 10))
  }, [])

  const handleShare = useCallback(async () => {
    if (!song?.id) {
      Alert.alert('Error', 'No song selected')
      return
    }

    setIsSharing(true)
    try {
      const createSongPost = functions().httpsCallable('createSongPost')
      const result = await createSongPost({
        songId: song.id,
        caption: rawCaption.trim() || caption.trim(), // Use raw caption with mention markup
        hashtags: hashtags,
      })

      if (result.data?.postId) {
        Alert.alert('Shared!', 'Your song has been shared to your feed.', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ])
      } else {
        throw new Error('No postId returned')
      }
    } catch (error) {
      console.error('Error sharing song:', error)
      Alert.alert(
        'Error',
        error.message || 'Failed to share song. Please try again.'
      )
    } finally {
      setIsSharing(false)
    }
  }, [song, caption, rawCaption, hashtags, navigation])

  if (!song) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No song selected</Text>
      </SafeAreaView>
    )
  }

  const imageUrl = song.imageUrl || song.thumbnailUrl || song.coverUrl

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Song Preview Card */}
          <View style={styles.songCard}>
            <View style={styles.songImageContainer}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.songImage} />
              ) : (
                <View style={[styles.songImage, styles.placeholderImage]}>
                  <Music2 size={40} color={isDark ? '#666' : '#999'} />
                </View>
              )}
              <View style={styles.playBadge}>
                <Play size={16} color="#fff" fill="#fff" />
              </View>
            </View>
            <View style={styles.songInfo}>
              <Text style={styles.songTitle} numberOfLines={2}>
                {song.title || 'Untitled Song'}
              </Text>
              <Text style={styles.songStyle} numberOfLines={1}>
                {song.style || 'Original'}
              </Text>
            </View>
          </View>

          {/* Caption Input */}
          <View style={styles.captionSection}>
            <Text style={styles.sectionLabel}>Caption</Text>
            <View style={styles.captionInputContainer}>
              <IMRichTextInput
                richTextInputRef={editorRef}
                inputRef={textInputRef}
                list={mentionSuggestions}
                mentionListPosition={'bottom'}
                onChange={onCaptionChange}
                showEditor={true}
                toggleEditor={() => {}}
                editorStyles={{
                  input: {
                    color: isDark ? '#fff' : '#000',
                    fontSize: 15,
                    minHeight: 80,
                  },
                  mainContainer: {
                    width: '100%',
                  },
                }}
                showMentions={showUsersMention}
                onHideMentions={() => setShowUsersMention(false)}
                onUpdateSuggestions={setKeyword}
                onTrackingStateChange={setIsTrackingStarted}
                placeholder="Write a caption... (use @mentions and #hashtags)"
              />
            </View>
            <Text style={styles.charCount}>{caption.length}/500</Text>
            <IMMentionList
              containerStyle={styles.mentionListContainer}
              list={mentionSuggestions}
              keyword={keyword}
              isTrackingStarted={isTrackingStarted}
              onSuggestionTap={editorRef.current?.onSuggestionTap}
            />
          </View>

          {/* Hashtags Section */}
          <View style={styles.hashtagSection}>
            <Text style={styles.sectionLabel}>Hashtags</Text>
            <Text style={styles.sectionHint}>
              Auto-generated from song style. Tap X to remove or add more
              below.
            </Text>
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

        {/* Share Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.shareButtonText}>Share to Feed</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const getStyles = (isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    errorText: {
      color: isDark ? '#fff' : '#000',
      fontSize: 16,
      textAlign: 'center',
      marginTop: 40,
    },
    // Song Preview Card
    songCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
      borderRadius: 12,
      padding: 12,
      gap: 12,
      marginBottom: 24,
    },
    songImageContainer: {
      position: 'relative',
    },
    songImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: isDark ? '#333' : '#ddd',
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    playBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(33, 38, 162, 0.9)',
      borderRadius: 12,
      padding: 4,
    },
    songInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    songTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 4,
    },
    songStyle: {
      fontSize: 14,
      color: isDark ? '#8e8e93' : '#666',
    },
    // Caption Section
    captionSection: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 8,
    },
    sectionHint: {
      fontSize: 13,
      color: isDark ? '#8e8e93' : '#666',
      marginBottom: 8,
    },
    captionInputContainer: {
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
      borderRadius: 12,
      padding: 14,
      minHeight: 100,
      borderWidth: 1,
      borderColor: isDark ? '#333' : '#ddd',
    },
    mentionListContainer: {
      backgroundColor: isDark ? '#1c1c1e' : '#fff',
      borderRadius: 8,
      marginTop: 4,
    },
    charCount: {
      fontSize: 12,
      color: isDark ? '#666' : '#999',
      textAlign: 'right',
      marginTop: 4,
    },
    // Hashtag Section
    hashtagSection: {
      marginBottom: 24,
    },
    // Button Container
    buttonContainer: {
      padding: 16,
      paddingBottom: 24,
      backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#1c1c1e' : '#f0f0f0',
    },
    shareButton: {
      backgroundColor: '#2126A2',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareButtonDisabled: {
      opacity: 0.7,
    },
    shareButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  })

export default ShareSongToFeedScreen
