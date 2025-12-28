import { Platform, StyleSheet } from 'react-native'

// Stage theme color definitions
const stageThemeColors = {
  dark: {
    background: '#1a1a1a',
    text: '#fff',
    textSecondary: '#E5E5E5',
    playIcon: '#E5E5E5',
  },
  light: {
    background: '#f5f5f5',
    text: '#1a1a1a',
    textSecondary: '#555555',
    playIcon: '#333333',
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    playIconContainer: {
      zIndex: 999,
      opacity: 0.8,
      position: 'absolute',
      alignSelf: 'center',
      top: '40%',
      bottom: '40%',
      left: '40%',
      right: '40%',
    },
    playIcon: {
      width: 100,
      height: 100,
      tintColor: colors.playIcon,
    },
    feedModeBar: {
      position: 'absolute',
      left: '10%',
      right: '10%',
      top: Platform.select({
        android: '5%',
        default: '10%',
      }),
      zIndex: 99,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...Platform.select({
        web: {
          marginTop: 40,
        },
      }),
    },
    newsByFollowingText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '300',
    },
    newsByFollowingTextBold: {
      fontWeight: 'bold',
      fontSize: 18,
      color: colors.text,
    },
    contentRightHeart: {
      marginTop: 10,
      marginBottom: 10,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
}

// Static styles for backward compatibility (uses dark theme by default)
const styles = dynamicStyles('Dark')

export default styles
