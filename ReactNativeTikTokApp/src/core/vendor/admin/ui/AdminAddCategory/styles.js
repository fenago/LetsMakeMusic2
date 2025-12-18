import { StyleSheet } from 'react-native'

const styles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: colorSet.primaryBackground,
    },
    listContainer: {
      paddingBottom: 20,
    },
    categoryItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colorSet.primaryBackground,
      borderRadius: 10,
      marginBottom: 10,
      padding: 10,
      shadowColor: colorSet.primaryText,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4,
    },
    categoryImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 15,
    },
    categoryText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorSet.primaryText,
      flex: 1, 
    },
    categoryOrder: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorSet.primaryText,
      marginLeft: 10,
    },
    fullWidthButton: {
      position: 'absolute',
      bottom: 0, 
      left: 0, 
      right: 0,
      marginTop: 20,
      paddingVertical: 15,
      backgroundColor: colorSet.primaryForeground,
      borderRadius: 4,
      alignItems: 'center',
      zIndex: 10, 
    },
    fullWidthButtonText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    contentContainer: {
      width: '90%',
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 20,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: '#333',
    },
    input: {
      width: '100%',
      height: 40,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      marginBottom: 15,
      color: '#333',
    },
    imagePicker: {
      width: 100,
      height: 100,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#ccc',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      overflow: 'hidden',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
    },
    addButton: {
      width: '100%',
      backgroundColor: '#007bff',
      padding: 10,
      alignItems: 'center',
      borderRadius: 5,
      marginBottom: 10,
    },
    cancelButton: {
      backgroundColor: '#ff4444',
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
    },
  })
}

export default styles
