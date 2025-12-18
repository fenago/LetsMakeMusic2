import { Platform, StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]
  return StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
    },
    container: {
      flex: 1,
      justifyContent: 'flex-start',
      alignSelf: 'center',
      padding: 5,
      width: '100%',
      backgroundColor: colorSet.primaryBackground,
    },
    starContainer: { flexDirection: 'row', alignSelf: 'flex-start' },
    starStyle: { marginVertical: 5 },
    actionButtonContainer: {
      padding: 16,
      width: '90%',
      alignSelf: 'center',
      borderRadius: 5,
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 0 : 24,
      backgroundColor: colorSet.primaryForeground,
    },
    actionButtonText: {
      fontWeight: 'bold',
      color: colorSet.primaryBackground,
    },
    reviewText: {
      fontSize: 20,
      margin: 10,
      fontWeight: 'bold',
      alignSelf: 'center',
      color: colorSet.primaryText,
    },
    input: {
      fontSize: 20,
      color: colorSet.primaryText,
      marginTop: 10,
      minHeight: 200,
    },
    headerTitle: {
      position: 'absolute',
      textAlign: 'center',
      width: '100%',
      fontWeight: 'bold',
      fontSize: 20,
      color: colorSet.primaryText,
    },
    rightButton: {
      top: 0,
      right: 0,
      backgroundColor: 'transparent',
      alignSelf: 'flex-end',
      color: colorSet.primaryForeground,
      fontSize: 18,
    },
    selectorRightButton: {
      marginRight: 10,
    },
    navBarContainer: {
      backgroundColor: colorSet.primaryBackground,
    },
    bar: {
      height: 60,
      marginTop: Platform.OS === 'ios' ? 40 : 10,
      justifyContent: 'center',
    },
  })
}

export default dynamicStyles
