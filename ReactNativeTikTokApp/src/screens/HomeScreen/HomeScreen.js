import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { Share, StatusBar, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslations } from '../../core/dopebase'
import { useDispatch } from 'react-redux'
import { Feed, HomeFeed } from '../../components'
import styles from './styles'
import { calculateFeedItemHeight } from '../../components/screens/Feed/FeedItem/styles'
import { useUserReportingMutations } from '../../core/user-reporting'
import CommentsScreen from '../CommentsScreen/CommentsScreen'
import {
  useHomeFeedPosts,
  useDiscoverPosts,
  usePostMutations,
} from '../../core/socialgraph/feed'
import { setLocallyDeletedPost } from '../../core/socialgraph/feed/redux'
import { useCurrentUser } from '../../core/onboarding'

const FeedScreen = props => {
  const { navigation } = props

  const dispatch = useDispatch()

  const isFocused = useIsFocused()
  const insets = useSafeAreaInsets()

  const { localized } = useTranslations()

  const currentUser = useCurrentUser()

  // Calculate feed item height dynamically using actual safe area insets
  // This ensures proper layout on all device types (iPhone, iPad, Android)
  const feedItemHeight = useMemo(
    () => calculateFeedItemHeight(insets, { hasStories: true, hasTabBar: true }),
    [insets]
  )

  const {
    posts,
    isLoadingBottom,
    refreshing, 
    pullToRefresh, 
    subscribeToHomeFeedPosts,
    loadMorePosts,
    addReaction: addReactionHomeFeed,
  } = useHomeFeedPosts()
  const { deletePost } = usePostMutations()
  const { markAbuse } = useUserReportingMutations()

  const {
    posts: discoverPosts,
    loadMorePosts: loadMoreDiscoverPosts,
    addReaction: addReactionDiscoverFeed,
  } = useDiscoverPosts()

  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [feedType, setFeedType] = useState('following')
  const [feed, setFeed] = useState({
    following: null,
    forYou: null,
  })
  // NEW: Media type filter state (all/music/video)
  const [mediaFilter, setMediaFilter] = useState('all')

  useEffect(() => {
    if (isFocused) {
      StatusBar.setBarStyle('light-content')
    } else {
      StatusBar.setBarStyle('default')
    }
  }, [isFocused])

  const onRefresh = useCallback(async () => {
    if (feedType === 'following') {
      await pullToRefresh(currentUser?.id)
    } else {
      await loadMoreDiscoverPosts(currentUser?.id, true) // Add isRefresh parameter
    }
  }, [feedType, currentUser?.id, pullToRefresh, loadMoreDiscoverPosts])

  
  useEffect(() => {
    console.log('[HomeScreen] ====== MOUNTING HOME FEED ======')
    console.log('[HomeScreen] currentUser?.id:', currentUser?.id)
    if (!currentUser?.id) {
      console.log('[HomeScreen] No user ID yet, waiting...')
      return
    }
    console.log('[HomeScreen] Setting up subscriptions for user:', currentUser?.id)
    const postsUnsubscribe = subscribeToHomeFeedPosts(currentUser?.id)
    loadMoreDiscoverPosts(currentUser?.id)

    return () => {
      console.log('[HomeScreen] Cleaning up subscriptions')
      postsUnsubscribe && postsUnsubscribe()
    }
  }, [currentUser?.id])


  useEffect(() => {
    console.log('[FEED] posts effect triggered, posts:', posts === null ? 'null' : (posts?.length || 0) + ' posts')

    // Only update feed if posts has actually been loaded (not null)
    // null = not yet loaded, [] = loaded but empty, [...] = loaded with data
    if (posts === null) {
      console.log('[FEED] Posts not yet loaded, keeping current following state')
      return
    }

    if (posts.length > 0) {
      const filteredFeed = filterNonVideoFeed(posts)
      console.log('[FEED] Following: ' + filteredFeed.length + ' posts after filter')
      setFeed(prevFeed => ({
        ...prevFeed,
        following: filteredFeed,
      }))
    } else {
      console.log('[FEED] Posts loaded but empty, setting following to empty')
      setFeed(prevFeed => ({ ...prevFeed, following: [] }))
    }
  }, [posts])

  useEffect(() => {
    if (discoverPosts) {
      const validMediaPosts = filterNonVideoFeed(discoverPosts || [])
      const mixedFeed = mixUserPostsIntoFeed(validMediaPosts)
      console.log('[FEED] For You: ' + mixedFeed.length + ' posts')
      setFeed(prevFeed => ({
        ...prevFeed,
        forYou: mixedFeed,
      }))
    } else {
      setFeed(prevFeed => ({ ...prevFeed, forYou: [] }))
    }
  }, [discoverPosts])

  // Auto-switch feedType based on data availability
  // - Switch to 'forYou' only if 'following' is explicitly empty (loaded but no data)
  // - Switch BACK to 'following' when following data becomes available
  useEffect(() => {
    // Don't auto-switch until data has loaded (not null)
    const followingLoaded = feed?.following !== null
    const forYouLoaded = feed?.forYou !== null

    const followingLength = feed?.following?.length ?? 0
    const forYouLength = feed?.forYou?.length ?? 0

    console.log('[HomeScreen] Feed state check:', {
      followingLoaded,
      forYouLoaded,
      followingLength,
      forYouLength,
      currentFeedType: feedType,
    })

    // If following has data, ensure we're showing it (switch back if needed)
    if (followingLength > 0 && feedType !== 'following') {
      console.log('[HomeScreen] Following feed has data, switching to following mode')
      setFeedType('following')
    }
    // Only switch to forYou if following has been LOADED as empty (not just null) and forYou has data
    else if (followingLoaded && followingLength === 0 && forYouLength > 0 && feedType === 'following') {
      console.log('[HomeScreen] Following feed loaded but empty, switching to forYou mode')
      setFeedType('forYou')
    }
  }, [feed, feedType])

  useEffect(() => {
    if (selectedItem) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [selectedItem])

  /**
   * Mix user's own posts into the feed with a balanced ratio
   * Instead of filtering out user posts, we now include them with balance
   * Inserts 1 user post every 4 other posts
   */
  const mixUserPostsIntoFeed = (feedPosts) => {
    if (!feedPosts || !currentUser?.id) return feedPosts

    const userPosts = feedPosts.filter(post => post?.authorID === currentUser.id)
    const otherPosts = feedPosts.filter(post => post?.authorID !== currentUser.id)

    if (!userPosts.length) return otherPosts
    if (!otherPosts.length) return userPosts

    // Insert user posts every 4 other posts for balance
    const result = []
    let userPostIndex = 0
    const insertEveryN = 4

    for (let i = 0; i < otherPosts.length; i++) {
      result.push(otherPosts[i])

      if ((i + 1) % insertEveryN === 0 && userPostIndex < userPosts.length) {
        result.push(userPosts[userPostIndex])
        userPostIndex++
      }
    }

    // Add remaining user posts
    while (userPostIndex < userPosts.length) {
      result.push(userPosts[userPostIndex])
      userPostIndex++
    }

    return result
  }

  /**
   * Filter feed posts to show video, audio, and song posts
   * - Video posts: postMedia[0].type includes 'video'
   * - Audio posts: postMedia[0].type includes 'audio'
   * - Song posts: postType === 'song' (created by createSongPost cloud function)
   */
  const filterNonVideoFeed = feedPosts => {
    return feedPosts.filter(feedPost => {
      // Always include song posts (from auto-share and manual share)
      if (feedPost.postType === 'song') {
        return true
      }
      // Include video and audio posts
      if (feedPost.postMedia && feedPost.postMedia.length > 0) {
        const mediaType = feedPost?.postMedia[0]?.type || ''
        return mediaType.includes('video') || mediaType.includes('audio')
      }
      return false
    })
  }

  /**
   * NEW: Filter feed posts by media type (all/music/video)
   * - all: Show everything (songs + videos + audio)
   * - music: Only song posts and audio posts
   * - video: Only video posts
   */
  const filterByMediaType = useCallback((feedPosts, filterType) => {
    if (!feedPosts || filterType === 'all') {
      return feedPosts
    }

    return feedPosts.filter(post => {
      if (filterType === 'music') {
        // Include song posts and audio posts
        if (post.postType === 'song') return true
        if (post.postMedia?.[0]?.type?.includes('audio')) return true
        return false
      }
      if (filterType === 'video') {
        // Only video posts
        if (post.postMedia?.[0]?.type?.includes('video')) return true
        return false
      }
      return true
    })
  }, [])

  // NEW: Handle media filter change from MusicFeed tabs
  const handleMediaFilterChange = useCallback((filterId) => {
    console.log('[HomeScreen] Media filter changed to:', filterId)
    setMediaFilter(filterId)
  }, [])

  const onCommentPress = item => {
    setSelectedItem(item)
  }

  const handleUserPress = userInfo => {
    if (userInfo.id === currentUser.id) {
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

  const onTextFieldHashTagPress = hashtag => {
    navigation.push('FeedSearch', { hashtag })
  }

  const onReaction = useCallback(
    async (reaction, post) => {
      if (feedType === 'following') {
        await addReactionHomeFeed(post, currentUser, reaction)
      } else {
        await addReactionDiscoverFeed(post, currentUser, reaction)
      }
    },
    [addReactionHomeFeed, addReactionDiscoverFeed, feedType, currentUser],
  )

  const onSharePost = async item => {
    let url = ''
    if (item.postMedia?.length > 0) {
      url = item.postMedia[0].url
    }
    try {
      const result = await Share.share(
        {
          title: localized('Share Instamobile post.'),
          url,
        },
        {
          dialogTitle: localized('Share Instamobile post.'),
        },
      )
    } catch (error) {
      alert(error.message)
    }
  }

  const onDeletePost = async item => {
    dispatch(setLocallyDeletedPost(item.id))
    const res = await deletePost(item.id, currentUser?.id)
    if (res.error) {
      alert(res.error)
    }
  }

  const onUserReport = useCallback(
    async (item, type) => {
      await markAbuse(currentUser.id, item.authorID, type)
    },
    [currentUser.id, markAbuse],
  )

  const onDismissCommentsSheet = () => {
    setSelectedItem(null)
  }

  const onForYouFeedPress = () => {
    setFeedType('forYou')
  }

  const onFollowingFeedPress = () => {
    setFeedType('following')
  }

  // Handler for when a post is edited - updates feed state with new caption and hashtags
  const onPostEdited = useCallback((postId, updateData) => {
    if (!postId) return
    setFeed(prevFeed => {
      const updatePost = (posts) =>
        posts?.map(post =>
          post.id === postId
            ? {
                ...post,
                postText: updateData.postText || updateData.description,
                description: updateData.description || updateData.postText,
                hashtags: updateData.hashtags || post.hashtags,
                isEdited: updateData.isEdited ?? true,
              }
            : post
        ) || []
      return {
        following: updatePost(prevFeed.following),
        forYou: updatePost(prevFeed.forYou),
      }
    })
  }, [])

  // NEW: Apply media type filter to the feed
  const filteredFeed = useMemo(() => {
    const baseFeed = feed[feedType]
    return filterByMediaType(baseFeed, mediaFilter)
  }, [feed, feedType, mediaFilter, filterByMediaType])

  // Memoized video feed component to pass to HomeFeed
  const videoFeedComponent = useMemo(() => (
    <Feed
      loading={loading}
      refreshing={refreshing}
      pullToRefresh={onRefresh}
      feed={filteredFeed}
      isCustomFeed={true}
      feedItemHeight={feedItemHeight}
      onCommentPress={onCommentPress}
      user={currentUser}
      onFeedUserItemPress={onFeedUserItemPress}
      onReaction={onReaction}
      isFetching={isLoadingBottom}
      onSharePost={onSharePost}
      onDeletePost={onDeletePost}
      onUserReport={onUserReport}
      navigation={navigation}
      startIndex={0}
      onTextFieldUserPress={onTextFieldUserPress}
      onTextFieldHashTagPress={onTextFieldHashTagPress}
      onFollowingFeedPress={onFollowingFeedPress}
      onForYouFeedPress={onForYouFeedPress}
      isForYouFeed={feedType === 'forYou'}
      isFollowingDisabled={(feed.following ?? []).length < 1}
      isCommentsOpen={isVisible}
      onPostEdited={onPostEdited}
    />
  ), [
    loading, refreshing, onRefresh, filteredFeed, feedType, feedItemHeight,
    onCommentPress, currentUser, onFeedUserItemPress, onReaction, isLoadingBottom,
    onSharePost, onDeletePost, onUserReport, navigation,
    onTextFieldUserPress, onTextFieldHashTagPress,
    onFollowingFeedPress, onForYouFeedPress, feed.following, isVisible, onPostEdited,
  ])

  // Get user's display name for greeting (prefer stage name)
  const userName = currentUser?.stageName || currentUser?.firstName || currentUser?.username || 'there'

  return (
    <View style={styles.container}>
      <HomeFeed
        videoFeedComponent={videoFeedComponent}
        userName={userName}
        currentUserId={currentUser?.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onFilterChange={handleMediaFilterChange}
        onArtistPress={(artist) => {
          navigation.push('Profile', { user: artist })
        }}
        onPlaylistPress={(playlist) => {
          // Future: Navigate to playlist detail
          console.log('Playlist pressed:', playlist)
        }}
      />
      <CommentsScreen
        item={selectedItem}
        onDismiss={onDismissCommentsSheet}
        isVisible={isVisible}
      />
    </View>
  )
}

export default FeedScreen