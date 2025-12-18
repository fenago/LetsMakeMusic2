import { StyleSheet } from 'react-native';

const styles = (theme, appearance) => {
  const colorSet = theme.colors[appearance];
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: colorSet.primaryBackground,
    },
    listContainer: {
      paddingBottom: 20,
    },
    vendorItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
    vendorImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 15,
    },
    vendorTextContainer: {
      flex: 1,
    },
    vendorName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorSet.primaryText,
    },
    vendorDescription: {
      fontSize: 14,
      color: colorSet.secondaryText,
      marginTop: 4,
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
  });
};

export default styles;