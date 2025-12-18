import { Platform, StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  return StyleSheet.create({
    tabContainer: {
      position: 'absolute',
      bottom: 0,
      height: Platform.OS == 'android' ? 60 : 90,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 0.2,
      borderTopColor: '#aaa',
      backgroundColor: theme.colors[appearance].primaryBackground,
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
      color: theme.colors[appearance].primaryText,
      paddingTop: 2,
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
      borderLeftColor: '#69C9D0',
      borderRightColor: '#EE1D52',
      backgroundColor: '#FFF',
    },
    icon: {
      height: 28,
      width: 28,
    },
    addIcon: {
      height: 18,
      width: 18,
      tintColor: '#010101',
    },
    focusTintColor: {
      tintColor: '#010101',
      // tintColor: '#f5f5f5',
    },
    unFocusTintColor: {
      // tintColor: '#fff',
      tintColor: appearance === 'dark' ? 'lightgrey' : 'grey',
    },
  })
}

export default dynamicStyles
