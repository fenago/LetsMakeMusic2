import React, { useState, useEffect } from 'react'
import { RefreshControl } from 'react-native'
import { useTranslations } from '../../core/dopebase'
import { Discover } from '../../components'
import { useCurrentUser } from '../../core/onboarding'
import { useDiscoverPosts } from '../../core/socialgraph/feed'
import { subscribeToAllSongs } from '../../services/songsService'

const DiscoverScreen = props => {
  const { navigation } = props
  const { localized } = useTranslations()

  const [postsByHashtag, setPostsByHashtag] = useState(null)
  const [isFetching, setIsFetching] = useState(false)

  // State for AI-generated songs from Firebase
  const [songs, setSongs] = useState([])
  const [songsLoading, setSongsLoading] = useState(true)

  const {
    posts,
    refreshing,
    loadMorePosts,
    pullToRefresh,
    addReaction,
    isLoadingBottom,
  } = useDiscoverPosts()
  const currentUser = useCurrentUser()

  useEffect(() => {
    if (currentUser?.id) {
      loadMorePosts(currentUser?.id)
    }
  }, [currentUser?.id])

  // Subscribe to all songs from Firebase
  useEffect(() => {
    console.log('[DiscoverScreen] Subscribing to all songs...')
    setSongsLoading(true)

    const unsubscribe = subscribeToAllSongs((fetchedSongs) => {
      console.log('[DiscoverScreen] Received songs:', fetchedSongs.length)
      setSongs(fetchedSongs)
      setSongsLoading(false)
    }, 50)

    return () => {
      console.log('[DiscoverScreen] Unsubscribing from songs')
      if (unsubscribe) unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (posts?.length > 0) {
      setPostsByHashtag(filterOutRelatedPosts(posts))
    } else {
      setPostsByHashtag([])
    }
  }, [posts])

  const onRefresh = async () => {
    if (currentUser?.id) {
      await pullToRefresh(currentUser?.id)
    }
  }

  const onCategoryPress = async categoryFeed => {
    navigation.navigate('CustomFeedScreen', { posts: categoryFeed })
  }

  const onCategoryItemPress = async (categoryFeed, categoryFeedItemIndex) => {
    navigation.navigate('CustomFeedScreen', {
      posts: categoryFeed,
      feedStartIndex: categoryFeedItemIndex,
    })
  }

  const filterOutRelatedPosts = posts => {
    if (!posts) {
      return posts
    }

    const filteredPosts = posts.filter(post => {
      return (
        post &&
        post.author &&
        post.postMedia &&
        post.postMedia?.length > 0 &&
        post.postMedia[0].type?.includes('video')
      )
    })

    return groupByHashTags(filteredPosts)
  }

  const groupByHashTags = filteredPosts => {
    const postsMap = {}

    filteredPosts?.forEach(filteredPost => {
      if (
        filteredPost.hashtags?.length &&
        filteredPost.postMedia?.length > 0 &&
        filteredPost.postMedia[0].type?.includes('video')
      ) {
        filteredPost.hashtags.forEach(hashtag => {
          if (postsMap[hashtag]) {
            postsMap[hashtag].videos.unshift(filteredPost)
          } else {
            postsMap[hashtag] = { hashtag, videos: [filteredPost] }
          }
        })
      }
    })

    return Object.values(postsMap)
  }

  const emptyStateConfig = {
    title: localized('No Discover Posts'),
    description: localized(
      'There are currently no posts from people that you are not following. Posts from non-followings will show up here.',
    ),
  }

  return (
    <Discover
      feed={postsByHashtag}
      songs={songs}
      songsLoading={songsLoading}
      isFetching={isFetching}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onCategoryPress={onCategoryPress}
      onCategoryItemPress={onCategoryItemPress}
      user={currentUser}
      emptyStateConfig={emptyStateConfig}
    />
  )
}

export default DiscoverScreen