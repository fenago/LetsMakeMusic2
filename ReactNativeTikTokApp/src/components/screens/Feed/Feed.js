import React, { useCallback, useState, useRef, useMemo } from 'react'
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
  InteractionManager,
} from 'react-native'
import { useTheme } from '../../../core/dopebase'
import FeedItem from './FeedItem/FeedItem'
import EditPostModal from '../../ui/EditPostModal'
import { FEED_ITEM_HEIGHT, FEED_ITEM_FULL_HEIGHT, calculateFeedItemHeight } from './FeedItem/styles'
import { dynamicStyles } from './styles'
import { logInfo, logWarn, logError } from '../../../services/debugLogService'

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
  // Note: Comments no longer pause audio - music keeps playing while commenting
  // Track current index in a ref for reliable access during state updates
  const currentIndexRef = useRef(startIndex ?? 0)
  // Track exact scroll offset for precise position restoration
  const scrollOffsetRef = useRef(0)

  // Track previous offset for change detection
  const prevOffsetRef = useRef(0)

  // Track scroll position for restoration after state updates
  const handleScroll = useCallback((event) => {
    const newOffset = event.nativeEvent.contentOffset.y
    const prevOffset = prevOffsetRef.current
    scrollOffsetRef.current = newOffset
    prevOffsetRef.current = newOffset

    // DEBUG: Log ALL scroll updates to catch unexpected jumps
    // This will help us see if FlatList is auto-scrolling after state changes
    const change = Math.abs(newOffset - prevOffset)
    if (change > 20) {
      logInfo('[Feed] 📜 SCROLL CHANGE', {
        from: prevOffset,
        to: newOffset,
        change: Math.round(change),
        index: Math.round(newOffset / currentItemHeight),
      })
    }
  }, [currentItemHeight])

  // Check if auto-advance is enabled (default: On)
  const isAutoAdvanceEnabled = user?.settings?.auto_advance_feed !== 'Off'

  // Scroll to next item when media completes
  const onMediaComplete = useCallback((currentIndex) => {
    if (!isAutoAdvanceEnabled) {
      logInfo('[Feed] Auto-advance disabled, not advancing')
      return
    }

    const nextIndex = currentIndex + 1
    if (feed && nextIndex < feed.length) {
      logInfo('[Feed] ⏭️ Auto-advancing to:', { nextIndex })
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      })
    } else {
      logInfo('[Feed] Reached end of feed, no more items')
    }
  }, [feed, isAutoAdvanceEnabled])

  const onViewableItemsChanged = useCallback(
    ({ changed, viewableItems }) => {
      logInfo('[Feed] 👀 onViewableItemsChanged', {
        ignoring: ignoreViewabilityChangesRef.current,
        viewableIndices: viewableItems?.map(v => v.index),
      })

      // Skip viewability changes during UI interactions (heart, comment, etc.)
      if (ignoreViewabilityChangesRef.current) {
        logWarn('[Feed] ⏸️ BLOCKING viewability change - returning early')
        return
      }

      changed.forEach(element => {
        if (element.isViewable) {
          logInfo('[Feed] ✅ Setting selected to:', { index: element.index })
          setSelected(element.index)
          currentIndexRef.current = element.index // Keep ref in sync
        }
      })
    },
    [setSelected],
  )

  // Wrapper for reaction handler - preserves scroll position during state update
  // ROOT CAUSE: useReactions hook creates a new array reference with .map()
  // This causes FlatList to see new data and potentially reset scroll
  // SOLUTION: Disable scrolling, save offset, restore after update
  const handleReaction = useCallback((reactionType, post) => {
    // Capture EXACT scroll position BEFORE any state changes
    const savedOffset = scrollOffsetRef.current
    const currentIndex = currentIndexRef.current
    const expectedOffset = currentIndex * currentItemHeight

    logInfo('[Feed] 💜💜💜 REACTION PRESSED 💜💜💜', {
      savedOffset,
      currentIndex,
      expectedOffset,
      currentItemHeight,
      hasFlatListRef: !!flatListRef.current,
    })

    // Block viewability changes during the update
    ignoreViewabilityChangesRef.current = true

    // CRITICAL: Disable scroll during the update to prevent automatic scrolling
    if (flatListRef.current?.setNativeProps) {
      logInfo('[Feed] 💜 Disabling scroll via setNativeProps')
      flatListRef.current.setNativeProps({ scrollEnabled: false })
    } else {
      logWarn('[Feed] ⚠️ setNativeProps NOT available on flatListRef!')
    }

    // DO NOT call parent's onReaction - it causes FlatList to re-render and reset scroll!
    // FeedItem now handles reactions locally AND syncs directly to Firebase.
    // The parent state will sync on next pull-to-refresh.
    logInfo('[Feed] 💜 Skipping parent onReaction - FeedItem syncs directly to Firebase')

    // Use the CALCULATED offset based on index, not the saved offset
    // (in case onScroll wasn't firing properly)
    const restoreOffset = savedOffset > 0 ? savedOffset : expectedOffset

    // Use multiple restore attempts to ensure position is maintained
    // Try BOTH scrollToIndex (more reliable with getItemLayout) AND scrollToOffset
    logInfo('[Feed] 💜 Scheduling restore attempts', { restoreOffset, currentIndex })

    // First attempt: immediate with scrollToIndex
    requestAnimationFrame(() => {
      logInfo('[Feed] 💜 [1/4] requestAnimationFrame - scrollToIndex', { currentIndex })
      flatListRef.current?.scrollToIndex({
        index: currentIndex,
        animated: false,
        viewPosition: 0, // Position item at top
      })
    })

    // Second attempt: after React commits - use both methods
    InteractionManager.runAfterInteractions(() => {
      logInfo('[Feed] 💜 [2/4] InteractionManager restore', { restoreOffset, currentIndex })
      // Try scrollToIndex first
      flatListRef.current?.scrollToIndex({
        index: currentIndex,
        animated: false,
        viewPosition: 0,
      })
      // Also try scrollToOffset as backup
      flatListRef.current?.scrollToOffset({
        offset: restoreOffset,
        animated: false,
      })
      // Ensure the selected index is correct
      setSelected(currentIndex)
    })

    // Third attempt: delayed to catch any late rendering
    setTimeout(() => {
      logInfo('[Feed] 💜 [3/4] setTimeout(150) restore', {
        restoreOffset,
        currentIndex,
        currentScrollOffset: scrollOffsetRef.current
      })
      flatListRef.current?.scrollToIndex({
        index: currentIndex,
        animated: false,
        viewPosition: 0,
      })
    }, 150)

    // Fourth attempt: much longer delay to catch FlatList's own scroll adjustments
    setTimeout(() => {
      const currentOffset = scrollOffsetRef.current
      const expectedForIndex = currentIndex * currentItemHeight
      logInfo('[Feed] 💜 [4/4] setTimeout(500) final check', {
        restoreOffset,
        expectedForIndex,
        currentOffset,
        currentIndex,
        needsRestore: Math.abs(currentOffset - expectedForIndex) > 50,
      })

      // If we've drifted away from target, restore again using scrollToIndex
      if (Math.abs(currentOffset - expectedForIndex) > 50) {
        logWarn('[Feed] 💜 SCROLL DRIFTED! Restoring with scrollToIndex...', {
          driftAmount: Math.round(currentOffset - expectedForIndex),
          currentIndex,
        })
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false,
          viewPosition: 0,
        })
      }

      // Re-enable scrolling after position is stable
      flatListRef.current?.setNativeProps?.({ scrollEnabled: true })
      logInfo('[Feed] 💜 Scroll re-enabled')

      // Re-enable viewability changes
      setTimeout(() => {
        ignoreViewabilityChangesRef.current = false
        logInfo('[Feed] 💜 Viewability changes re-enabled')
      }, 100)
    }, 500)
  }, [onReaction, currentItemHeight])

  // Wrapper for comment handler - preserves scroll position during navigation
  // Saves offset so when user returns from comment screen, position is restored
  const handleCommentPress = useCallback((post) => {
    // Capture scroll position before navigating
    const savedOffset = scrollOffsetRef.current
    const currentIndex = currentIndexRef.current
    logInfo('[Feed] 💬 Comment pressed', { savedOffset, currentIndex })

    ignoreViewabilityChangesRef.current = true

    // Disable scroll to prevent any automatic scrolling during navigation
    flatListRef.current?.setNativeProps?.({ scrollEnabled: false })

    onCommentPress(post)

    // Restore position immediately
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: savedOffset,
        animated: false,
      })
    })

    // Re-enable after navigation starts
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: savedOffset,
        animated: false,
      })
      flatListRef.current?.setNativeProps?.({ scrollEnabled: true })
      ignoreViewabilityChangesRef.current = false
    }, 300)
  }, [onCommentPress])

  // Handler for edit post - opens edit modal
  const handleEditPost = useCallback((post) => {
    logInfo('[Feed] ✏️ Edit post pressed', { postId: post?.id })
    setPostToEdit(post)
    setEditModalVisible(true)
  }, [])

  // Handler for when edit is saved
  // Receives full update object: { postText, description, hashtags, isEdited }
  const handleEditPostSave = useCallback((updateData) => {
    console.warn('[Feed] 💾 handleEditPostSave CALLED', {
      postId: postToEdit?.id,
      hasOnPostEdited: !!onPostEdited,
      updateData,
    })
    logInfo('[Feed] ✏️ Post edited successfully', {
      postId: postToEdit?.id,
      text: updateData?.description?.substring(0, 50),
      hashtags: updateData?.hashtags?.length,
    })
    // Notify parent to update feed data with full update object
    if (onPostEdited) {
      console.warn('[Feed] 💾 Calling onPostEdited with:', postToEdit?.id, updateData)
      onPostEdited(postToEdit?.id, updateData)
    } else {
      console.warn('[Feed] ⚠️ NO onPostEdited callback available!')
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

  // DEBUG: Log every render with feed info
  logInfo('[Feed] 🔄 RENDER', {
    feedLength: feed?.length,
    selected,
    paused,
    currentIndexRef: currentIndexRef.current,
    scrollOffsetRef: scrollOffsetRef.current,
  })

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
        removeClippedSubviews={false}
        initialScrollIndex={startIndex}
        getItemLayout={(data, index) => ({
          // Uses dynamic height based on context (full-screen vs with tab bar)
          length: currentItemHeight,
          offset: currentItemHeight * index,
          index,
        })}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onEndReached={() => {
          logInfo('[Feed] Loading more posts')
          loadMorePosts(user?.id)
        }}
        onEndReachedThreshold={2}
        decelerationRate={'fast'}
        // Use dynamic height for responsive snapping
        snapToInterval={currentItemHeight}
        snapToAlignment="start"
        disableIntervalMomentum={true}
        onViewableItemsChanged={onViewableItemsChanged}
        showsVerticalScrollIndicator={false}
        // NEW: Track scroll position for restoration after reactions/comments
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
