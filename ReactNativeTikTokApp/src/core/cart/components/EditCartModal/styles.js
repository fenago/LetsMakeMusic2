import { StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]
  return StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: colorSet.primaryBackground,
      alignItems: 'center',
      borderTopRightRadius: 10,
      borderTopLeftRadius: 10,
    },
    quantityLabel: {
      color: colorSet.primaryText,
      fontSize: 18,
      marginHorizontal: 10,
    },
    modalContainer: {
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    buttonSetContainer: {
      marginTop: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonSet: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 25,
      borderColor: colorSet.grey6,
      alignItems: 'center',
    },
    buttonContainer: {
      padding: 4,
      width: 50,
    },
    buttonText: {
      color: 'white',
      fontSize: 18,
    },
    actionContainer: {
      flexDirection: 'row',
      marginTop: 35,
    },
    actionButtonContainer: {
      flex: 1,
      borderRadius: 5,
      padding: 10,
      margin: 10,
      backgroundColor: colorSet.primaryForeground,
    },
    removeButtonContainer: {
      backgroundColor: colorSet.primaryBackground,
      marginTop: -8,
    },
    actionButtonText: {
      fontWeight: 'bold',
      color: colorSet.primaryBackground,
      fontSize: 16,
    },
    price: {
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      padding: 10,
      marginVertical: 10,
      fontSize: 18,
      textAlign: 'center',
      color: colorSet.primaryText,
      borderColor: colorSet.grey3,
    },
    deleteItem: {
      color: '#FF0000',
      textAlign: 'center',
      marginBottom: 32,
      fontSize: 14,
      marginTop: 5,
    },
  })
}

export default dynamicStyles
