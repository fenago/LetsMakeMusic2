import React, { useRef, useState, useEffect, useCallback } from 'react'
import { View, SafeAreaView } from 'react-native'
import { Video } from 'expo-av'
import {
  useTheme,
  useTranslations,
  ActivityIndicator,
} from '../../core/dopebase'
import { IMRichTextInput, IMMentionList, EU } from '../../core/mentions'
import { NavBar } from '../../components'
import dynamicStyles from './styles'
import { usePostMutations } from '../../core/socialgraph/feed'
import { useSearchUsers } from '../../core/socialgraph/friendships'
import { useCurrentUser } from '../../core/onboarding'

export default function NewPost(props) {
  const { route, navigation } = props
  const { params } = route
  const { media, songItem } = params

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const currentUser = useCurrentUser()

  const { addPost } = usePostMutations()
  const { users: searchResults, search } = useSearchUsers(currentUser?.id)

  const [keyword, setKeyword] = useState('')
  const [isTrackingStarted, setIsTrackingStarted] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [showUsersMention, setShowUsersMention] = useState(false)
  const [shouldPlayVideo, setShouldPlayVideo] = useState(true)
  const [loading, setLoading] = useState(false)

  const textInputRef = useRef()
  const editorRef = useRef()
  const newPost = useRef()

  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.focus()
    }
  }, [])

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

  const onDismiss = () => {
    navigation.goBack()
  }

  const onPost = useCallback(async () => {
    console.log(media)
    setLoading(true)
    const tempPost = {
      ...newPost.current,
      authorID: currentUser.id,
      postMedia: media,
    }
    if (songItem) {
      tempPost.song = songItem
    }

    await addPost(tempPost, [media], currentUser)
    setLoading(false)
    navigation.goBack()
    // TODO: Handle errors
  }, [setLoading, addPost, navigation])

  const onChangeText = ({ displayText, text }) => {
    const mentions = EU.findMentions(text)
    newPost.current = {
      ...newPost.current,
      postText: text,
      displayText,
      commentCount: 0,
      reactionsCount: 0,
      reactions: {
        like: 0,
      },
      mentions,
    }
  }

  const onVideoLoad = () => {
    setShouldPlayVideo(false)
  }

  const editorStyles = {
    input: {
      color: theme.colors[appearance].primaryText,
    },
    mainContainer: {
      width: '100%',
    },
  }

  return (
    <SafeAreaView style={styles.container}>
      <NavBar
        headerTitle={localized('New post')}
        headerLeftTitle={localized('Cancel')}
        headerRightTitle={localized('Share')}
        onHeaderLeftPress={onDismiss}
        onHeaderRightPress={onPost}
      />
      <View style={[styles.captionAvatarContainer, styles.centerContainer]}>
        <View style={styles.avatarContainer}>
          <Video
            style={styles.avatar}
            source={{ uri: media?.uri }}
            shouldPlay={shouldPlayVideo}
            isMuted={true}
            resizeMode={'cover'}
            onLoad={onVideoLoad}
          />
        </View>
        <View style={styles.captionContainer}>
          <IMRichTextInput
            richTextInputRef={editorRef}
            inputRef={textInputRef}
            list={mentionSuggestions}
            mentionListPosition={'bottom'}
            onChange={onChangeText}
            showEditor={true}
            toggleEditor={() => {}}
            editorStyles={editorStyles}
            showMentions={showUsersMention}
            onHideMentions={() => setShowUsersMention(false)}
            onUpdateSuggestions={setKeyword}
            onTrackingStateChange={setIsTrackingStarted}
            placeholder={localized(`What's on your mind...`)}
            autoFocus={true}
          />
        </View>
        <IMMentionList
          containerStyle={styles.container}
          list={mentionSuggestions}
          keyword={keyword}
          isTrackingStarted={isTrackingStarted}
          onSuggestionTap={editorRef.current?.onSuggestionTap}
        />
      </View>
      {loading && <ActivityIndicator />}
    </SafeAreaView>
  )
}
