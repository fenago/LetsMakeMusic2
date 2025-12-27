import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { Share, StatusBar, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { useTranslations } from '../../core/dopebase'
import { useDispatch } from 'react-redux'
import { Feed, HomeFeed } from '../../components'
import styles from './styles'
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

  const { localized } = useTranslations()

  const currentUser = useCurrentUser()

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
    if (!currentUser?.id) {
      return
    }
    const postsUnsubscribe = subscribeToHomeFeedPosts(currentUser?.id)
    loadMoreDiscoverPosts(currentUser?.id)

    return () => {
      postsUnsubscribe && postsUnsubscribe()
    }
  }, [currentUser?.id])

  useEffect(() => {
    console.log('[HomeScreen] Raw posts from useHomeFeedPosts:', posts?.length || 0)
    if (posts?.length > 0) {
      // Log first 3 posts for debugging
      posts.slice(0, 3).forEach((p, i) => {
        console.log(`[HomeScreen] Post ${i}:`, {
          id: p.id,
          postType: p.postType,
          mediaType: p.postMedia?.[0]?.type,
          description: p.description?.substring(0, 30),
        })
      })
      const filteredFeed = filterNonVideoFeed(posts)
      console.log('[HomeScreen] Filtered posts (songs + videos):', filteredFeed.length)
      setFeed(prevFeed => ({
        ...prevFeed,
        following: filteredFeed,
      }))
    } else {
      console.log('[HomeScreen] No posts received from useHomeFeedPosts')
      setFeed({ following: [] })
    }
  }, [posts])

  useEffect(() => {
    console.log('[HomeScreen] Raw discoverPosts (For You):', discoverPosts?.length || 0)
    if (discoverPosts) {
      const filteredOutPosts = filterOutUserPost(discoverPosts)
      const feed = filterNonVideoFeed(filteredOutPosts)
      console.log('[HomeScreen] Filtered For You posts:', feed.length)
      setFeed(prevFeed => ({
        ...prevFeed,
        forYou: feed,
      }))
    } else {
      console.log('[HomeScreen] No discoverPosts received')
      setFeed({ forYou: [] })
    }
  }, [discoverPosts])

  useEffect(() => {
    const followingFeedLength = feed?.following?.length

    if (followingFeedLength === 0) {
      setFeedType('forYou')
    }
  }, [feed])

  useEffect(() => {
    if (selectedItem) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [selectedItem])

  const filterOutUserPost = feedPosts => {
    return feedPosts.filter(post => {
      return post && post.authorID != currentUser.id
    })
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
    />
  ), [
    loading, refreshing, onRefresh, filteredFeed, feedType, onCommentPress,
    currentUser, onFeedUserItemPress, onReaction, isLoadingBottom,
    onSharePost, onDeletePost, onUserReport, navigation,
    onTextFieldUserPress, onTextFieldHashTagPress,
    onFollowingFeedPress, onForYouFeedPress, feed.following, isVisible,
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