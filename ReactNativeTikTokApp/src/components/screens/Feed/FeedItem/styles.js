import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native'

// Get screen dimensions for responsive sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0

// Feed item height - responsive calculation based on screen size
// Calculate available height: Screen - safe area top (~59) - header (~50) - tabs (48) - tab bar (~49) - safe area bottom (~34)
// This ensures each feed item fills exactly the available space with no overlap
// On iPhone 14 Pro (852pt height): 852 - 59 - 50 - 48 - 49 - 34 = 612, which is ~72% of screen
// This value is EXPORTED so Feed.js and MusicFeed can use the exact same height
export const FEED_ITEM_HEIGHT = Math.round(SCREEN_HEIGHT * 0.72)

// Responsive calculations based on feed item height
const BOTTOM_OFFSET = Math.round(FEED_ITEM_HEIGHT * 0.08) // 8% from bottom
const TOP_CONTROLS_OFFSET = Math.round(FEED_ITEM_HEIGHT * 0.12) // 12% from top
const BOTTOM_CONTROLS_OFFSET = Math.round(FEED_ITEM_HEIGHT * 0.15) // 15% from bottom

// Stage theme color definitions for FeedItem
const stageThemeColors = {
  dark: {
    videoBackground: '#010101',
    songPostBackground: '#1a1a2e',
    text: '#fff',
    textSecondary: '#ccc',
    iconTint: '#fff',
    iconOpacity: 0.7,
    likeColor: '#df4a59',
    plusBackground: '#f00',
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
    likeColor: '#df4a59',
    plusBackground: '#1F979E',
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

// Dynamic styles generator
export const dynamicStyles = (stageTheme = 'Dark') => {
  const colors = getStageColors(stageTheme)

  return StyleSheet.create({
    videoContent: {
      height: FEED_ITEM_HEIGHT,
      backgroundColor: colors.videoBackground,
    },
    videoImage: {
      height: FEED_ITEM_HEIGHT,
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
    songPostContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.songPostBackground,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: BOTTOM_OFFSET + 40, // Extra space for bottom content
    },
    songAlbumArt: {
      width: SCREEN_WIDTH * 0.55, // Slightly smaller for better fit
      height: SCREEN_WIDTH * 0.55,
      borderRadius: 16,
      marginBottom: 20,
    },
    songOverlay: {
      alignItems: 'center',
      paddingHorizontal: 40,
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
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    songArtist: {
      fontSize: 14,
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
  })
}

// Static styles for backward compatibility (uses dark theme by default)
const styles = dynamicStyles('Dark')

export default styles
