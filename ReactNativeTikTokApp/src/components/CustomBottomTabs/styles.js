import { Platform, StyleSheet } from 'react-native'

// LetsMake.Music Brand Colors
const BRAND_COLORS = {
  primary: {
    light: '#1F979E', // Vibrant Teal 500
    dark: '#20B2AA',  // Vibrant Teal 400
  },
  secondary: {
    light: '#C12D79', // Deep Magenta 500
    dark: '#D81B60',  // Deep Magenta 400
  },
  neutral: {
    text: {
      light: '#212529',  // Neutral 900 light
      dark: '#F5F5F5',   // Neutral 900 dark
    },
    secondary: {
      light: '#868E96',  // Neutral 600 light
      dark: '#A0A0A0',   // Neutral 600 dark
    },
    background: {
      light: '#F8F9FA',  // Neutral 50 light
      dark: '#121212',   // Neutral 50 dark
    },
    surface: {
      light: '#FFFFFF',
      dark: '#1E1E1E',   // Neutral 100 dark
    },
    border: {
      light: '#E9ECEF',  // Neutral 200 light
      dark: '#2C2C2C',   // Neutral 200 dark
    },
  },
}

const dynamicStyles = (theme, appearance) => {
  const isDark = appearance === 'dark'

  return StyleSheet.create({
    tabContainer: {
      position: 'absolute',
      bottom: 0,
      height: Platform.OS == 'android' ? 60 : 90,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: isDark ? BRAND_COLORS.neutral.border.dark : BRAND_COLORS.neutral.border.light,
      backgroundColor: isDark ? BRAND_COLORS.neutral.surface.dark : BRAND_COLORS.neutral.surface.light,
      width: '100%',
      maxWidth: 1024,
      alignSelf: 'center',
    },
    buttonContainer: {
      width: '20%',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Platform.OS == 'android' ? 4 : 16,
    },
    title: {
      fontSize: 10,
      color: isDark ? BRAND_COLORS.neutral.secondary.dark : BRAND_COLORS.neutral.secondary.light,
      paddingTop: 2,
    },
    titleFocused: {
      color: isDark ? BRAND_COLORS.primary.dark : BRAND_COLORS.primary.light,
    },
    addContainer: {
      width: '70%',
      padding: 5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: 4,
      borderRightWidth: 4,
      borderRadius: 10,
      // Brand gradient colors for create button
      borderLeftColor: BRAND_COLORS.primary.light,
      borderRightColor: BRAND_COLORS.secondary.light,
      backgroundColor: isDark ? BRAND_COLORS.neutral.surface.dark : '#FFFFFF',
    },
    icon: {
      height: 28,
      width: 28,
    },
    addIcon: {
      height: 18,
      width: 18,
      tintColor: isDark ? BRAND_COLORS.neutral.text.dark : BRAND_COLORS.neutral.text.light,
    },
    // Focused state uses brand primary color
    focusTintColor: {
      tintColor: isDark ? BRAND_COLORS.primary.dark : BRAND_COLORS.primary.light,
    },
    // Unfocused state uses neutral secondary color
    unFocusTintColor: {
      tintColor: isDark ? BRAND_COLORS.neutral.secondary.dark : BRAND_COLORS.neutral.secondary.light,
    },
    // For video overlay (transparent tab) - white icons
    videoOverlayTintColor: {
      tintColor: '#F5F5F5',
    },
  })
}

export default dynamicStyles
