import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { View, Text, Share, StatusBar, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { ChevronLeft } from 'lucide-react-native'
import { useTranslations } from '../../core/dopebase'
import { useDispatch } from 'react-redux'
import { Feed } from '../../components'
import dynamicStyles from './styles'
import { useUserReportingMutations } from '../../core/user-reporting'
import { setLocallyDeletedPost } from '../../core/socialgraph/feed/redux'
import CommentsScreen from '../CommentsScreen/CommentsScreen'
import { useHashtagPosts, usePostMutations } from '../../core/socialgraph/feed'
import { useCurrentUser } from '../../core/onboarding'

/**
 * HashtagFeedScreen - TikTok-style feed for posts with a specific hashtag
 *
 * Navigation params:
 * @param {string} hashtag - The hashtag to display (without #)
 */
const HashtagFeedScreen = props => {
  const { navigation, route } = props
  const hashtag = route?.params?.hashtag

  const dispatch = useDispatch()
  const isFocused = useIsFocused()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = useMemo(() => dynamicStyles(isDark), [isDark])

  const { localized } = useTranslations()
  const currentUser = useCurrentUser()

  const { posts, refreshing, addReaction, pullToRefresh, loadMorePosts, updatePost } = useHashtagPosts(hashtag, currentUser?.id)
  const { deletePost } = usePostMutations()
  const { markAbuse } = useUserReportingMutations()

  const [isVisible, setIsVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    if (isFocused) {
      StatusBar.setBarStyle('light-content')
    } else {
      StatusBar.setBarStyle('default')
    }
  }, [isFocused])

  useEffect(() => {
    if (selectedItem) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [selectedItem])

  const onCommentPress = item => {
    setSelectedItem(item)
  }

  const handleUserPress = userInfo => {
    if (userInfo.id === currentUser?.id) {
      navigation.push('Profile')
    } else {
      navigation.push('Profile', {
        user: userInfo,
      })
    }
  }

  const onFeedUserItemPress = async item => {
    handleUserPress(item)
  }

  const onTextFieldUserPress = userInfo => {
    handleUserPress(userInfo)
  }

  const onTextFieldHashTagPress = tag => {
    // Navigate to another hashtag feed
    const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag
    if (cleanTag.toLowerCase() !== hashtag?.toLowerCase()) {
      navigation.push('HashtagFeed', { hashtag: cleanTag })
    }
  }

  const onReaction = useCallback(
    async (reaction, post) => {
      await addReaction(post, currentUser, reaction)
    },
    [addReaction, currentUser],
  )

  const onSharePost = async item => {
    let url = ''
    if (item.postMedia?.length > 0) {
      url = item.postMedia[0].url
    }
    try {
      await Share.share(
        {
          title: `Check out this #${hashtag} post!`,
          url,
        },
        {
          dialogTitle: localized('Share post'),
        },
      )
    } catch (error) {
      console.log('[HashtagFeedScreen] Share error:', error.message)
    }
  }

  const onDeletePost = async item => {
    dispatch(setLocallyDeletedPost(item.id))
    const res = await deletePost(item.id, currentUser?.id)
    if (res.error) {
      alert(res.error)
    }
  }

  const onUserReport = async (item, type) => {
    markAbuse(currentUser?.id, item.authorID, type)
  }

  const onDismiss = () => {
    setSelectedItem(null)
  }

  const handlePullToRefresh = useCallback(() => {
    pullToRefresh(hashtag, currentUser?.id)
  }, [pullToRefresh, hashtag, currentUser?.id])

  const handleLoadMorePosts = useCallback(() => {
    loadMorePosts(hashtag, currentUser?.id)
  }, [loadMorePosts, hashtag, currentUser?.id])

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  // Handler for when a post is edited - updates feed state with new caption and hashtags
  // Receives full update object: { postText, description, hashtags, isEdited }
  const onPostEdited = useCallback((postId, updateData) => {
    console.log('[HashtagFeedScreen] 📝 onPostEdited called:', { postId, updateData })
    updatePost(postId, updateData?.description || updateData?.postText)
  }, [updatePost])

  // Loading state
  if (posts === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F979E" />
        <Text style={[styles.emptyText, { marginTop: 16 }]}>
          Loading #{hashtag} posts...
        </Text>
      </View>
    )
  }

  // Empty state
  if (posts?.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No posts found for #{hashtag}
        </Text>
        <TouchableOpacity
          onPress={handleGoBack}
          style={{ marginTop: 20, padding: 12 }}
        >
          <Text style={{ color: '#1F979E', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const postCount = posts?.length || 0

  return (
    <View style={styles.container}>
      {/* Header overlay */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <ChevronLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.hashtagTitle}>#{hashtag}</Text>
            <Text style={styles.postCount}>
              {postCount} {postCount === 1 ? 'post' : 'posts'}
            </Text>
          </View>
        </View>
      </View>

      <Feed
        loading={false}
        feed={posts}
        isCustomFeed={true}
        onCommentPress={onCommentPress}
        user={currentUser}
        onFeedUserItemPress={onFeedUserItemPress}
        onReaction={onReaction}
        isFetching={false}
        onSharePost={onSharePost}
        onDeletePost={onDeletePost}
        onUserReport={onUserReport}
        navigation={navigation}
        onTextFieldUserPress={onTextFieldUserPress}
        onTextFieldHashTagPress={onTextFieldHashTagPress}
        pullToRefresh={handlePullToRefresh}
        refreshing={refreshing}
        loadMorePosts={handleLoadMorePosts}
        onFollowingFeedPress={null}
        onForYouFeedPress={null}
        isForYouFeed={false}
        isFollowingDisabled={true}
        onPostEdited={onPostEdited}
      />

      <CommentsScreen
        item={selectedItem}
        onDismiss={onDismiss}
        isVisible={isVisible}
      />
    </View>
  )
}

export default HashtagFeedScreen
