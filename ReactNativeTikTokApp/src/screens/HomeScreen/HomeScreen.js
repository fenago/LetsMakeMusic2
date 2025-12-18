import React, { useCallback, useEffect, useState } from 'react'
import { Share, StatusBar, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { useTranslations } from '../../core/dopebase'
import { useDispatch } from 'react-redux'
import { Feed } from '../../components'
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
    if (posts?.length > 0) {
      const filteredFeed = filterNonVideoFeed(posts)
      setFeed(prevFeed => ({
        ...prevFeed,
        following: filteredFeed,
      }))
    } else {
      setFeed({ following: [] })
    }
  }, [posts])

  useEffect(() => {
    if (discoverPosts) {
      const filteredOutPosts = filterOutUserPost(discoverPosts)
      const feed = filterNonVideoFeed(filteredOutPosts)
      setFeed(prevFeed => ({
        ...prevFeed,
        forYou: feed,
      }))
    } else {
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

  const filterNonVideoFeed = feedPosts => {
    return feedPosts.filter(feedPost => {
      if (feedPost.postMedia && feedPost.postMedia.length > 0) {
        return feedPost?.postMedia[0].type?.includes('video')
      }
      return feedPost?.postMedia?.type?.includes('video')
    })
  }

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

  return (
    <View style={styles.container}>
      <Feed
        loading={loading}
        refreshing={refreshing}
        pullToRefresh={onRefresh}
        feed={feed[feedType]}
        isCustomFeed={false}
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