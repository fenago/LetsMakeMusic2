import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native'

// Get screen dimensions for responsive sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0

// Layout constants for MusicFeed/Stage screen structure
// These match the actual heights in MusicFeed/index.js
const LAYOUT = {
  // Header with menu/search buttons - paddingTop: insets.top + 8, paddingBottom: 8, content ~40px
  HEADER_CONTENT_HEIGHT: 48, // Just the header content (icon + title + icon + padding)
  HEADER_PADDING_BOTTOM: 8,  // paddingBottom from primaryHeaderContainer style
  // Filter tabs (All, Music, Video, etc.) - fixed height
  FILTER_TABS_HEIGHT: 48,
  // Stories tray when visible - fixed height in MusicFeed styles
  STORIES_TRAY_HEIGHT: 100,
  // Bottom tab bar - 83px total as per AppContent.js MiniPlayer tabBarHeight
  TAB_BAR_TOTAL: 83,
  // Minimal buffer - we have accurate insets now so don't need much
  SAFETY_BUFFER: 0,
}

/**
 * Calculate feed item height dynamically using actual safe area insets
 * This is the PREFERRED method - use this when you have access to useSafeAreaInsets()
 *
 * @param {object} insets - Safe area insets from useSafeAreaInsets()
 * @param {object} options - Configuration options
 * @param {boolean} options.hasStories - Whether stories tray is visible (default: true)
 * @param {boolean} options.hasTabBar - Whether bottom tab bar is visible (default: true)
 * @param {number} options.screenHeight - Override screen height (for testing)
 * @returns {number} Calculated feed item height
 */
export const calculateFeedItemHeight = (insets, options = {}) => {
  const {
    hasStories = true,
    hasTabBar = true,
    screenHeight = SCREEN_HEIGHT,
  } = options

  // Safe area top from actual device insets
  const safeAreaTop = insets?.top || 0

  // Safe area bottom is included in tab bar, but needed if no tab bar
  const safeAreaBottom = hasTabBar ? 0 : (insets?.bottom || 0)

  // Header height = safe area top + padding (8) + content height + padding bottom
  const headerHeight = safeAreaTop + 8 + LAYOUT.HEADER_CONTENT_HEIGHT + LAYOUT.HEADER_PADDING_BOTTOM

  // Calculate total overhead
  let overhead = headerHeight + LAYOUT.FILTER_TABS_HEIGHT + LAYOUT.SAFETY_BUFFER

  if (hasStories) {
    overhead += LAYOUT.STORIES_TRAY_HEIGHT
  }

  if (hasTabBar) {
    overhead += LAYOUT.TAB_BAR_TOTAL
  } else {
    overhead += safeAreaBottom
  }

  return Math.round(screenHeight - overhead)
}

// FALLBACK: Static heights for backward compatibility when insets aren't available
// These use approximate values - prefer calculateFeedItemHeight() when possible
const FALLBACK_SAFE_AREA_TOP = Platform.OS === 'ios' ? 59 : STATUS_BAR_HEIGHT

// Calculate fallback overhead
const FALLBACK_HEADER_HEIGHT = FALLBACK_SAFE_AREA_TOP + 8 + LAYOUT.HEADER_CONTENT_HEIGHT + LAYOUT.HEADER_PADDING_BOTTOM

const FALLBACK_OVERHEAD_WITH_STORIES =
  FALLBACK_HEADER_HEIGHT +
  LAYOUT.FILTER_TABS_HEIGHT +
  LAYOUT.STORIES_TRAY_HEIGHT +
  LAYOUT.TAB_BAR_TOTAL +
  LAYOUT.SAFETY_BUFFER

const FALLBACK_OVERHEAD_WITHOUT_STORIES =
  FALLBACK_HEADER_HEIGHT +
  LAYOUT.FILTER_TABS_HEIGHT +
  LAYOUT.TAB_BAR_TOTAL +
  LAYOUT.SAFETY_BUFFER

// Export static heights for backward compatibility
// WITH stories: accounts for header + tabs + stories + tab bar + safe areas
export const FEED_ITEM_HEIGHT = Math.round(SCREEN_HEIGHT - FALLBACK_OVERHEAD_WITH_STORIES)

// WITHOUT stories: slightly taller when stories tray is hidden
export const FEED_ITEM_HEIGHT_NO_STORIES = Math.round(SCREEN_HEIGHT - FALLBACK_OVERHEAD_WITHOUT_STORIES)

// Full-screen feed item height - for screens WITHOUT bottom tab bar
export const FEED_ITEM_FULL_HEIGHT = Math.round(
  SCREEN_HEIGHT - FALLBACK_HEADER_HEIGHT - LAYOUT.FILTER_TABS_HEIGHT - LAYOUT.SAFETY_BUFFER
)

// Responsive calculations based on feed item height
// Key layout areas from bottom to top:
// 1. Username + caption + hashtags (contentLeftBottom) - needs ~20% of height
// 2. Song title/artist (songOverlay) - part of centered album art area
// 3. Album art - centered in remaining space
// 4. Progress bar + media badge - at top
const BOTTOM_OFFSET = Math.round(FEED_ITEM_HEIGHT * 0.18) // 18% from bottom for username/hashtags
const TOP_CONTROLS_OFFSET = Math.round(FEED_ITEM_HEIGHT * 0.08) // 8% from top for right controls
const BOTTOM_CONTROLS_OFFSET = Math.round(FEED_ITEM_HEIGHT * 0.22) // 22% from bottom for right controls (above bottom content)

// Brand identity colors from LetsMake.Music guidelines
const BRAND_COLORS = {
  vibrantTeal: '#1F979E',      // Primary - key actions, active states
  deepMagenta: '#C12D79',      // Secondary - likes, notifications, special CTAs
  richPurple: '#9C27B0',       // Accent
  tealLight: '#20B2AA',        // Primary 400 for dark theme
  magentaLight: '#D81B60',     // Secondary 400 for dark theme
}

// Stage theme color definitions for FeedItem
const stageThemeColors = {
  dark: {
    videoBackground: '#010101',
    songPostBackground: '#1a1a2e',
    text: '#fff',
    textSecondary: '#ccc',
    iconTint: '#fff',
    iconOpacity: 0.7,
    likeColor: BRAND_COLORS.deepMagenta,           // Brand Deep Magenta for likes
    plusBackground: BRAND_COLORS.vibrantTeal,      // Brand Teal for follow button
    userImageBackground: '#555',
    progressBarBg: 'rgba(255, 255, 255, 0.25)',
    progressBarFill: '#fff',
    mediaBadgeBg: 'rgba(0, 0, 0, 0.6)',
    playOverlayBg: 'rgba(0,0,0,0.3)',
    shadowColor: '#000',
    handleBg: '#fff',
  },
  light: {
    videoBackground: '#e8e8e8',
    songPostBackground: '#f0f0f5',
    text: '#1a1a1a',
    textSecondary: '#555',
    iconTint: '#333',
    iconOpacity: 0.8,
    likeColor: BRAND_COLORS.deepMagenta,           // Brand Deep Magenta for likes
    plusBackground: BRAND_COLORS.vibrantTeal,      // Brand Teal for follow button
    userImageBackground: '#ddd',
    progressBarBg: 'rgba(0, 0, 0, 0.2)',
    progressBarFill: '#1F979E',
    mediaBadgeBg: 'rgba(255, 255, 255, 0.85)',
    playOverlayBg: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    handleBg: '#1F979E',
  },
}

// Function to get theme-aware colors
export const getStageColors = (stageTheme = 'Dark') => {
  return stageThemeColors[stageTheme.toLowerCase()] || stageThemeColors.dark
}

// Dynamic styles generator - accepts stageTheme, fullScreen option, and optional custom height
// When customHeight is provided (from calculateFeedItemHeight), it takes priority
export const dynamicStyles = (stageTheme = 'Dark', fullScreen = false, customHeight = null) => {
  const colors = getStageColors(stageTheme)
  // Priority: customHeight (dynamic) > fullScreen flag > default with stories
  const itemHeight = customHeight || (fullScreen ? FEED_ITEM_FULL_HEIGHT : FEED_ITEM_HEIGHT)

  return StyleSheet.create({
    videoContent: {
      height: itemHeight,
      backgroundColor: colors.videoBackground,
    },
    videoImage: {
      height: itemHeight,
      backgroundColor: colors.videoBackground,
    },
    contentRight: {
      position: 'absolute',
      padding: 10,
      right: 5,
      top: TOP_CONTROLS_OFFSET,
      bottom: BOTTOM_CONTROLS_OFFSET,
      zIndex: 99,
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    contentRightUser: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentRightUserImageContainer: {
      width: 40,
      height: 40,
      borderRadius: 25,
      marginBottom: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.userImageBackground,
      overflow: 'hidden',
    },
    contentRightUserImage: {
      width: 40,
      height: 40,
      borderRadius: 25,
      overflow: 'hidden',
    },
    contentRightUserPlus: {
      position: 'absolute',
      bottom: -2,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 25,
      backgroundColor: colors.plusBackground,
    },
    plusIcon: {
      width: 12,
      height: 12,
      tintColor: '#fff',
    },
    iconRight: {
      width: 33,
      height: 33,
      tintColor: colors.iconTint,
      opacity: colors.iconOpacity,
    },
    iconLike: {
      opacity: 1,
      tintColor: colors.likeColor,
    },
    iconRightContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    contentRightText: {
      marginTop: 4,
      fontWeight: 'bold',
      color: colors.text,
    },
    contentLeftBottom: {
      position: 'absolute',
      padding: 10,
      left: 5,
      bottom: BOTTOM_OFFSET,
      zIndex: 99,
      width: '70%',
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    contentLeftBottomNameUserText: {
      color: colors.text,
      fontWeight: 'bold',
    },
    contentLeftBottomDescription: {
      marginTop: 10,
      color: colors.text,
    },
    username: {
      color: colors.text,
      opacity: 0.7,
    },
    hashTag: {
      color: colors.text,
      opacity: 0.7,
    },
    hashtagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 6,
      gap: 6,
    },
    hashTagChip: {
      color: BRAND_COLORS.vibrantTeal,
      fontSize: 13,
      fontWeight: '500',
    },
    contentLeftBottomMusicContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    contentLeftBottomMusic: {
      color: colors.text,
      overflow: 'scroll',
      paddingLeft: 7,
    },
    musicIcon: {
      height: 20,
      width: 20,
      tintColor: colors.iconTint,
    },
    // Song post styles - Full screen display with centered album art
    // Layout: media badge (10px) + progress bar (45px) = ~70px at top
    // Bottom content (username/hashtags) takes BOTTOM_OFFSET + padding
    songPostContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.songPostBackground,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 70, // Compact: media badge + progress bar at top
      paddingBottom: BOTTOM_OFFSET + 60, // Space for bottom content (username/hashtags)
    },
    songAlbumArt: {
      width: SCREEN_WIDTH * 0.52, // Compact size for better vertical fit
      height: SCREEN_WIDTH * 0.52,
      borderRadius: 16,
      marginBottom: 12, // Reduced margin to song title
    },
    songOverlay: {
      alignItems: 'center',
      paddingHorizontal: 30, // Reduced padding for more text width
      maxWidth: '80%', // Prevent overlap with right controls
    },
    songPlayOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.playOverlayBg,
      zIndex: 10,
    },
    songPlayIcon: {
      width: 70,
      height: 70,
      tintColor: colors.iconTint,
      opacity: 0.9,
    },
    songTitle: {
      fontSize: 18, // Slightly smaller for compact fit
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    songArtist: {
      fontSize: 13, // Slightly smaller
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Song progress bar and timer - positioned at top left, below media badge
    songProgressContainer: {
      position: 'absolute',
      top: 45, // Below the media type badge
      left: 16,
      right: 70, // Leave room for right side controls
      zIndex: 50,
    },
    songProgressBarTouchable: {
      paddingVertical: 10, // Larger touch target
      marginVertical: -6,
    },
    songProgressBarBg: {
      width: '100%',
      height: 6,
      backgroundColor: colors.progressBarBg,
      borderRadius: 3,
      overflow: 'hidden',
    },
    songProgressBarFill: {
      height: '100%',
      backgroundColor: colors.progressBarFill,
      borderRadius: 3,
    },
    songProgressHandle: {
      position: 'absolute',
      top: 4, // Center on the progress bar (touchable has padding)
      marginLeft: -6, // Center the handle on the position
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.handleBg,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    songProgressTime: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 6,
    },
    songTimeText: {
      fontSize: 11,
      color: stageTheme.toLowerCase() === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      fontWeight: '500',
    },
    songTimeRemaining: {
      fontSize: 11,
      color: stageTheme.toLowerCase() === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
      fontWeight: '400',
    },
    // Media type indicator badge (video/audio)
    mediaTypeBadge: {
      position: 'absolute',
      top: 10,
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.mediaBadgeBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      zIndex: 100,
    },
    mediaTypeBadgeText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
    },
    mediaTypeIcon: {
      width: 14,
      height: 14,
    },
    // Video progress bar and timer - positioned at bottom
    videoProgressContainer: {
      position: 'absolute',
      bottom: 120, // Above the bottom actions
      left: 16,
      right: 80,
      zIndex: 100,
    },
    videoProgressBarBg: {
      height: 4,
      backgroundColor: colors.progressBarBg,
      borderRadius: 2,
      overflow: 'hidden',
    },
    videoProgressBarFill: {
      height: '100%',
      backgroundColor: colors.progressBarFill,
      borderRadius: 2,
    },
    videoProgressTime: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 4,
    },
    videoTimeText: {
      fontSize: 11,
      color: stageTheme.toLowerCase() === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      fontWeight: '500',
    },
    videoTimeRemaining: {
      fontSize: 11,
      color: stageTheme.toLowerCase() === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
      fontWeight: '400',
    },
    // Edited indicator label
    editedLabel: {
      fontSize: 12,
      color: stageTheme.toLowerCase() === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
      fontStyle: 'italic',
      marginTop: 4,
    },
  })
}

// Static styles for backward compatibility (uses dark theme by default)
const styles = dynamicStyles('Dark')

export default styles
