import { StyleSheet, Dimensions } from 'react-native'

const { width: screenWidth } = Dimensions.get('window')

const styles = (theme, appearance) => {
  const colorSet = theme.colors[appearance];
  return StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    scrollView: {
      width: '90%',
      maxHeight: '90%',
    },
    scrollViewContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 20,
      width: '100%',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: '#333',
      alignSelf: 'center',
    },
    input: {
      width: '100%',
      minHeight: 40,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      marginBottom: 15,
      color: '#333',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 15,
      marginBottom: 10,
      color: theme.colors.primaryText,
      alignSelf: 'flex-start',
    },
    filterButtonsScroll: {
      flexGrow: 0,
      marginBottom: 15,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
    },
    value: {
      fontSize: 16,
      color: '#333',
    },
    filterAddButton: {
      backgroundColor: theme.colors.grey6,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: theme.colors.grey3,
    },
    filterAddButtonSelected: {
      backgroundColor: theme.colors.primaryBackground,
      borderColor: theme.colors.primary,
    },
    filterAddButtonText: {
      color: theme.colors.primaryText,
      fontSize: 14,
    },
    filterAddButtonTextSelected: {
      color: theme.colors.primaryForeground,
    },
    selectedFiltersContainer: {
      marginBottom: 15,
    },
    selectedFilterItem: {
      marginBottom: 10,
    },
    selectedFilterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primaryText,
      marginBottom: 5,
    },
    filterDropdownContainer: {
      borderWidth: 1,
      borderColor: theme.colors.grey3,
      borderRadius: 5,
      overflow: 'hidden',
      backgroundColor: theme.colors.grey6,
    },
    filterDropdown: {
      width: '100%',
    },
    imagePicker: {
      width: '100%',
      height: 44,
      backgroundColor: '#007bff',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 5,
      marginBottom: 10,
    },
    imagePickerText: {
      color: '#fff',
      fontSize: 16,
    },
    imageScroll: {
      width: '100%',
      marginVertical: 10,
    },
    imageWrapper: {
      position: 'relative',
      marginRight: 10,
      borderRadius: 10,
      overflow: 'hidden',
    },
    imagePreview: {
      width: 100,
      height: 100,
      borderRadius: 10,
      backgroundColor: '#f0f0f0',
    },
    removeImageButton: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
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
    map: {
      borderRadius: 10,
      overflow: 'hidden',
    },
  });
};

export default styles