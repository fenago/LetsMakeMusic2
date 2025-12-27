import { StyleSheet } from 'react-native'

const dynamicStyles = (theme, colorScheme) => {
  const colorSet = theme.colors[colorScheme]
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.grey3,
    },
    settingsTitleContainer: {
      width: '100%',
      height: 55,
      justifyContent: 'flex-end',
    },
    settingsTitle: {
      color: colorSet.secondaryText,
      paddingLeft: 10,
      fontSize: 14,
      paddingBottom: 6,
      fontWeight: '500',
    },
    settingsTypesContainer: {
      backgroundColor: colorSet.primaryBackground,
    },
    settingsTypeContainer: {
      borderBottomColor: colorSet.grey3,
      borderBottomWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      height: 50,
    },
    settingsType: {
      color: colorSet.primaryForeground,
      fontSize: 14,
      fontWeight: '500',
    },

    //Edit Profile
    contentContainer: {
      width: '100%',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colorSet.hairline,
      backgroundColor: colorSet.primaryBackground,
    },
    divider: {
      height: 0.5,
      width: '96%',
      alignSelf: 'flex-end',
      backgroundColor: colorSet.hairline,
    },
    text: {
      fontSize: 14,
      color: colorSet.primaryText,
    },

    //app Settings
    appSettingsTypeContainer: {
      flexDirection: 'row',
      borderBottomWidth: 0,
      justifyContent: 'space-between',
      paddingHorizontal: 15,
    },
    appSettingsSaveContainer: {
      marginTop: 50,
      height: 45,
      backgroundColor: colorSet.primaryBackground,
    },
    placeholderTextColor: {
      color: colorSet.hairline,
    },

    // Theme selector styles
    themeOptionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    themeOptionContainer: {
      flex: 1,
      marginHorizontal: 5,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colorSet.grey3,
      backgroundColor: colorSet.primaryBackground,
      alignItems: 'center',
    },
    themeOptionSelected: {
      borderColor: '#1F979E', // Brand Vibrant Teal
      backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#E0F2F1',
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: colorSet.secondaryText,
    },
    themeOptionTextSelected: {
      color: '#1F979E', // Brand Vibrant Teal
      fontWeight: '600',
    },
  })
}

export default dynamicStyles
