import React, { useCallback, useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
} from 'react-native'
import { useTheme } from '../../../core/dopebase'
import FeedItem from './FeedItem/FeedItem'
import EditPostModal from '../../ui/EditPostModal'
import { FEED_ITEM_HEIGHT, FEED_ITEM_FULL_HEIGHT } from './FeedItem/styles'
import { dynamicStyles } from './styles'

// CRITICAL: viewabilityConfig must be defined OUTSIDE the component or in a useRef
// React Native FlatList does not support changing viewabilityConfig after mount
const VIEWABILITY_CONFIG = {
  waitForInteraction: false, // Changed from true - fire immediately when items become visible
  itemVisiblePercentThreshold: 50, // Changed from 90 - more responsive to scrolling
}

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
    isCommentsOpen = false,
    onPostEdited,
    // Dynamic height calculated from actual safe area insets
    feedItemHeight = null,
  } = props

  const { theme } = useTheme()

  // Get stage theme from user settings (default to 'Light')
  const stageTheme = user?.settings?.stage_theme || 'Light'

  // Use full-screen height when in custom feed mode (no bottom tab bar)
  // Priority: feedItemHeight prop (dynamic) > isCustomFeed flag > default with stories
  const currentItemHeight = feedItemHeight || (isCustomFeed ? FEED_ITEM_FULL_HEIGHT : FEED_ITEM_HEIGHT)

  // Generate dynamic styles based on stage theme, passing the calculated height
  const styles = useMemo(() => dynamicStyles(stageTheme), [stageTheme])

  const [paused, setPaused] = useState(true) // Start paused - user must tap to play
  const [selected, setSelected] = useState(startIndex ?? 0)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [postToEdit, setPostToEdit] = useState(null)
  const flatListRef = useRef(null)
  // Flag to ignore viewability changes during UI interactions (like, comment, etc.)
  const ignoreViewabilityChangesRef = useRef(false)
  // Track current index in a ref for reliable access during state updates
  const currentIndexRef = useRef(startIndex ?? 0)

  // Check if auto-advance is enabled (default: On)
  const isAutoAdvanceEnabled = user?.settings?.auto_advance_feed !== 'Off'

  // Scroll to next item when media completes
  const onMediaComplete = useCallback((currentIndex) => {
    if (!isAutoAdvanceEnabled) return

    const nextIndex = currentIndex + 1
    if (feed && nextIndex < feed.length) {
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      })
    }
  }, [feed, isAutoAdvanceEnabled])

  const onViewableItemsChanged = useCallback(
    ({ changed }) => {
      // Skip viewability changes during UI interactions (heart, comment, etc.)
      if (ignoreViewabilityChangesRef.current) return

      changed.forEach(element => {
        if (element.isViewable) {
          setSelected(element.index)
          currentIndexRef.current = element.index
        }
      })
    },
    [setSelected],
  )

  // Wrapper for reaction handler
  // FeedItem handles reactions locally AND syncs directly to Firebase.
  // Parent state will sync on next pull-to-refresh.
  // We just need to briefly block viewability changes during the animation.
  const handleReaction = useCallback((reactionType, post) => {
    // Block viewability changes during the heart animation
    ignoreViewabilityChangesRef.current = true

    // Re-enable viewability changes after animation completes
    setTimeout(() => {
      ignoreViewabilityChangesRef.current = false
    }, 300)
  }, [])

  // Comment handler - comments sheet opens as overlay, no scroll restoration needed
  const handleCommentPress = useCallback((post) => {
    onCommentPress(post)
  }, [onCommentPress])

  // Handler for edit post - opens edit modal
  const handleEditPost = useCallback((post) => {
    setPostToEdit(post)
    setEditModalVisible(true)
  }, [])

  // Handler for when edit is saved
  // Receives full update object: { postText, description, hashtags, isEdited }
  const handleEditPostSave = useCallback((updateData) => {
    if (onPostEdited) {
      onPostEdited(postToEdit?.id, updateData)
    }
    setEditModalVisible(false)
    setPostToEdit(null)
  }, [postToEdit, onPostEdited])

  // Handler for closing edit modal
  const handleEditModalClose = useCallback(() => {
    setEditModalVisible(false)
    setPostToEdit(null)
  }, [])

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
          stageTheme={stageTheme}
          fullScreen={isCustomFeed}
          feedItemHeight={currentItemHeight}
          onSharePost={onSharePost}
          onReaction={handleReaction}
          onFeedUserItemPress={onFeedUserItemPress}
          onCommentPress={handleCommentPress}
          setPaused={setPaused}
          onTextFieldUserPress={onTextFieldUserPress}
          onTextFieldHashTagPress={onTextFieldHashTagPress}
          onDeletePost={onDeletePost}
          onEditPost={handleEditPost}
          onUserReport={onUserReport}
          onMediaComplete={onMediaComplete}
        />
      )
    },
    [
      user,
      paused,
      selected,
      stageTheme,
      isCustomFeed,
      currentItemHeight,
      onSharePost,
      handleReaction,
      onFeedUserItemPress,
      handleCommentPress,
      onTextFieldUserPress,
      onTextFieldHashTagPress,
      onDeletePost,
      handleEditPost,
      onUserReport,
      onMediaComplete,
    ],
    // Note: handleReaction and handleCommentPress use refs internally,
    // so they don't need selected in their dependencies
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
        ref={flatListRef}
        style={{ flex: 1 }}
        keyExtractor={(item, index) => item.id || index.toString()}
        onScrollToIndexFailed={() => {}}
        data={feed}
        extraData={{ selected, paused, feed }}
        onRefresh={() => pullToRefresh(user.id)}
        refreshing={refreshing}
        renderItem={renderFeedItem}
        windowSize={5}
        initialNumToRender={2}
        enableEmptySections={true}
        maxToRenderPerBatch={3}
        removeClippedSubviews={true}
        initialScrollIndex={startIndex}
        getItemLayout={(data, index) => ({
          // Uses dynamic height based on context (full-screen vs with tab bar)
          length: currentItemHeight,
          offset: currentItemHeight * index,
          index,
        })}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onEndReached={() => loadMorePosts(user?.id)}
        onEndReachedThreshold={2}
        decelerationRate={'fast'}
        // Use dynamic height for responsive snapping
        snapToInterval={currentItemHeight}
        snapToAlignment="start"
        disableIntervalMomentum={true}
        onViewableItemsChanged={onViewableItemsChanged}
        showsVerticalScrollIndicator={false}
        // Preserve scroll position when data changes (iOS 13+)
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        visible={editModalVisible}
        onClose={handleEditModalClose}
        post={postToEdit}
        onSave={handleEditPostSave}
      />
    </View>
  )
}
