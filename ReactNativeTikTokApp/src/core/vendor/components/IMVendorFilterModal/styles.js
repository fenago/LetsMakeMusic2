import { StyleSheet } from 'react-native'

const styles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]
  return StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      height: '80%',
      alignSelf: 'center',
      marginTop: '5%',
      borderTopRightRadius: 10,
      borderTopLeftRadius: 10,
      backgroundColor: colorSet.primaryBackground,
    },
    modalContainer: {
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    modalHeaderContainer: {
      width: '100%',
      justifyContent: 'space-between',
      padding: 10,
      borderBottomColor: colorSet.grey0,
      borderBottomWidth: 1,
      flexDirection: 'row',
    },
    singleFilterContainer: {
      width: '100%',
      justifyContent: 'space-between',
      padding: 10,
      borderBottomColor: colorSet.grey0,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterTitle: {
      marginTop: 15,
      fontWeight: 'bold',
      color: colorSet.primaryText,
      fontSize: 15,
    },
    filterSubtitle: {
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: 13,
      color: colorSet.grey,
    },
    doneContainer: {
      zIndex: 11212,
      right: 10,
      position: 'absolute',
    },
    scrollView: {
      width: '100%',
    },
  })
}

export default styles
