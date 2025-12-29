import { Dimensions, Platform, StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const commentBodyPaddingLeft = 8

  return StyleSheet.create({
    handleContainer: {
      width: '100%',
      height: 35,
      flexDirection: 'row',
      backgroundColor: theme.colors[appearance].primaryBackground,
    },
    handleLeftContainer: {
      flex: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    handleTitleContainer: {
      flex: 5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    handleTitle: {
      color: theme.colors[appearance].primaryText,
      fontSize: 14,
      fontWeight: '600',
    },
    handleRightContainer: {
      flex: 2,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 10,
    },
    handleRightIcon: {
      width: 14,
      height: 14,
      tintColor: theme.colors[appearance].primaryText,
    },
    commentsContainer: {
      flex: 1,
      backgroundColor: theme.colors[appearance].primaryBackground,
      zIndex: 9,
      marginBottom: Platform.OS === 'android' ? 54 : 90,
    },
    commentItemContainer: {
      alignSelf: 'center',
      flexDirection: 'row',
      marginVertical: 2,
    },
    commentItemImageContainer: {
      flex: 1,
      alignItems: 'center',
    },
    commentItemImage: {
      height: 36,
      width: 36,
      borderRadius: 18,
      marginVertical: 5,
      marginLeft: 5,
    },
    commentItemBodyContainer: {
      flex: 5,
    },
    commentItemBodyRadiusContainer: {
      width: Math.floor(Dimensions.get('window').width * 0.71),
      padding: 7,
      borderRadius: Math.floor(Dimensions.get('window').width * 0.03),
      margin: 5,
      backgroundColor: theme.colors[appearance].grey0,
    },
    commentItemBodyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors[appearance].primaryText,
      paddingVertical: 3,
      paddingLeft: commentBodyPaddingLeft,
      lineHeight: 12,
    },
    commentItemBodySubtitle: {
      fontSize: 14,
      color: theme.colors[appearance].primaryText,
      paddingVertical: 3,
      paddingLeft: commentBodyPaddingLeft,
    },
    mentionText: {
      color: '#2126A2',
      fontWeight: '600',
    },
    hashtagText: {
      color: '#2126A2',
      fontWeight: '500',
    },
    editedLabel: {
      fontSize: 12,
      color: theme.colors[appearance].secondaryText,
      fontStyle: 'italic',
      paddingLeft: commentBodyPaddingLeft,
      paddingTop: 2,
    },
    commentInputContainer: {
      backgroundColor: theme.colors[appearance].grey0,
      flexDirection: 'row',
      width: '100%',
      minHeight: 50,
      paddingVertical: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentTextInputContainer: {
      flex: 6,
      backgroundColor: theme.colors[appearance].primaryBackground,
      color: theme.colors[appearance].primaryText,
      minHeight: 38,
      width: '90%',
      marginLeft: 8,
      justifyContent: 'center',
      borderRadius: 8,
      paddingHorizontal: 8,
    },
    commentTextInput: {
      padding: 8,
      color: theme.colors[appearance].primaryText,
    },
    mentionListContainer: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.colors[appearance].primaryBackground,
      borderRadius: 8,
      marginBottom: 4,
      maxHeight: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
    },
    commentInputIconContainer: {
      flex: 0.7,
      justifyContent: 'center',
      marginLeft: 8,
    },
    commentInputIcon: {
      height: 22,
      width: 22,
      tintColor: theme.colors[appearance].primaryText,
    },
  })
}

export default dynamicStyles
