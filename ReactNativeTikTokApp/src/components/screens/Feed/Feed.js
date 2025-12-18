import React, { useCallback, useState } from 'react'
import {
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native'
import { useTheme } from '../../../core/dopebase'
import FeedItem from './FeedItem/FeedItem'
import styles from './styles'

export default function Feed(props) {
  const {
    onCommentPress,
    onFeedUserItemPress,
    feed,
    isCustomFeed,
    startIndex,
    onSharePost,
    onReaction,
    onTextFieldUserPress,
    onTextFieldHashTagPress,
    user,
    pullToRefresh = () => {},
    refreshing = false,
    loadMorePosts = () => {},
    onDeletePost,
    onUserReport,
    onFollowingFeedPress,
    onForYouFeedPress,
    isForYouFeed,
    isFollowingDisabled,
  } = props

  const { theme } = useTheme()

  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState(startIndex ?? 0)

  const onViewableItemsChanged = useCallback(
    ({ changed }) => {
      changed.forEach(element => {
        if (element.isViewable) {
          setSelected(element.index)
        }
      })
    },
    [setSelected],
  )

  const renderFeedItem = useCallback(
    ({ item: video, index }) => {
      return (
        <FeedItem
          key={video.id ?? index.toString()}
          user={user}
          video={video}
          paused={paused}
          selected={selected}
          index={index}
          onSharePost={onSharePost}
          onReaction={onReaction}
          onFeedUserItemPress={onFeedUserItemPress}
          onCommentPress={onCommentPress}
          setPaused={setPaused}
          onTextFieldUserPress={onTextFieldUserPress}
          onTextFieldHashTagPress={onTextFieldHashTagPress}
          onDeletePost={onDeletePost}
          onUserReport={onUserReport}
        />
      )
    },
    [
      user,
      paused,
      selected,
      onSharePost,
      onReaction,
      onFeedUserItemPress,
      onCommentPress,
      onTextFieldUserPress,
      onTextFieldHashTagPress,
      onDeletePost,
      onUserReport,
    ],
  )

  const onPlayButton = useCallback(() => {
    setPaused(!paused)
  }, [paused, setPaused])

  if (!feed) {
    return null
  }

  return (
    <View style={styles.container}>
      {paused && (
        <TouchableOpacity
          style={styles.playIconContainer}
          onPress={onPlayButton}>
          <Image style={styles.playIcon} source={theme.icons.playButton} />
        </TouchableOpacity>
      )}
      {!isCustomFeed && (
        <SafeAreaView style={styles.feedModeBar}>
          <TouchableOpacity
            disabled={isFollowingDisabled}
            onPress={onFollowingFeedPress}>
            <Text
              style={[
                styles.newsByFollowingText,
                !isForYouFeed && styles.newsByFollowingTextBold,
              ]}>
              {'Following'} |{' '}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onForYouFeedPress}>
            <Text
              style={[
                styles.newsByFollowingText,
                isForYouFeed && styles.newsByFollowingTextBold,
              ]}>
              {'For You'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
      <FlatList
        keyExtractor={(item, index) => index}
        onScrollToIndexFailed={() => {}}
        data={feed}
        onRefresh={() => pullToRefresh(user.id)}
        refreshing={refreshing}
        renderItem={renderFeedItem}
        windowSize={4}
        initialNumToRender={0}
        enableEmptySections={true}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        initialScrollIndex={startIndex}
        getItemLayout={(data, index) => ({
          length:
            Dimensions.get('window').height -
            (Platform.OS === 'android' ? StatusBar.currentHeight + 1 : 0),
          offset:
            (Dimensions.get('window').height -
              (Platform.OS === 'android' ? StatusBar.currentHeight + 1 : 0)) *
            index,
          index,
        })}
        viewabilityConfig={{
          waitForInteraction: true,
          itemVisiblePercentThreshold: 90,
        }}
        onEndReached={() => {
          console.log('loading more posts')
          loadMorePosts(user?.id)
        }}
        onEndReachedThreshold={2}
        decelerationRate={'normal'}
        pagingEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}
