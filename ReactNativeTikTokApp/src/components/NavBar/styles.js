import { Dimensions, Platform, StyleSheet } from 'react-native'

const { width } = Dimensions.get('window')

const dynamicStyles = (theme, appearance) => {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      width,
      borderBottomColor: theme.colors[appearance].hairline,
      borderBottomWidth: 1,
      backgroundColor: theme.colors[appearance].primaryBackground,
      paddingVertical: Platform.select({
        android: 16,
        default: 8,
      }),
    },
    textContainer: {
      justifyContent: 'flex-end',
      marginBottom: 7,
      alignItems: 'center',
    },
    text: {
      color: theme.colors[appearance].primaryText,
      fontSize: 16,
    },
    title: {
      fontWeight: 'bold',
    },
    nextText: {
      paddingLeft: 15,
      fontWeight: '500',
    },
    leftContainer: {
      flex: 2,
    },
    titleContainer: {
      flex: 6,
    },
    rightContainer: {
      flex: 2,
    },
  })
}

export default dynamicStyles
