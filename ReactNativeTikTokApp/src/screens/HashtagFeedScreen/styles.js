import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native'

const { width, height } = Dimensions.get('window')

const dynamicStyles = (isDark = false) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#ffffff',
    },
    headerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    headerTextContainer: {
      flex: 1,
    },
    hashtagTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#ffffff',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    postCount: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 2,
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#000000' : '#ffffff',
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? '#888888' : '#666666',
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#000000' : '#ffffff',
    },
  })

export default dynamicStyles
