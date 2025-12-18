import { StyleSheet, I18nManager } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]

  return StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colorSet.primaryBackground,
      alignSelf: 'center',
      paddingTop: 20,
    },
    modal: {
      justifyContent: 'flex-end',
    },
    horizontalPane: {
      flexDirection: 'row',
      padding: 3,
      justifyContent: 'space-between',
      marginVertical: 10,
      alignItems: 'center',
    },
    textInputLabel: {
      fontSize: 14,
      color: colorSet.primaryText,
      width: '50%',
      textAlign: 'right',
      flex: 1,
      marginRight: 10,
      fontWeight: 'bold',
    },
    textInput: {
      color: colorSet.primaryText,
      width: '50%',
      textAlign: 'left',
      flex: 3,
      height: 42,
      borderWidth: 1,
      borderColor: colorSet.grey3,
      paddingLeft: 20,
      alignSelf: 'center',
      alignItems: 'center',
      borderRadius: 5,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
      marginRight: 20,
    },
    actionButtonContainer: {
      padding: 16,
      width: '90%',
      alignSelf: 'center',
      borderRadius: 5,
      backgroundColor: colorSet.primaryForeground,
      marginVertical: 30,
    },
    actionButtonText: {
      fontWeight: 'bold',
      color: 'white',
      fontSize: 14,
    },
  })
}

export default dynamicStyles
