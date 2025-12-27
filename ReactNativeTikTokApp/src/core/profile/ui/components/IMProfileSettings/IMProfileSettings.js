import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme, useTranslations } from '../../../../dopebase'
import dynamicStyles from './styles'
import { useProfileAuth } from '../../../hooks/useProfileAuth'
import { useConfig } from '../../../../../config'
import { useCurrentUser } from '../../../../onboarding'

function IMProfileSettings(props) {
  const { navigation, onLogout, lastScreenTitle } = props

  const config = useConfig()
  const authManager = useProfileAuth()
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const currentUser = useCurrentUser()

  const onSettingsTypePress = async (
    type,
    routeName,
    form,
    screenTitle,
    phone,
  ) => {
    if (type === 'Logout') {
      await authManager?.logout(currentUser)
      onLogout()
      props.navigation.reset({
        index: 0,
        routes: [
          {
            name: 'LoadScreen',
          },
        ],
      })
    } else if (routeName === 'Videos') {
      // Direct navigation for Videos screen (not prefixed)
      navigation.navigate('Videos')
    } else if (routeName === 'DebugLogs') {
      // Direct navigation for Debug Logs screen
      navigation.navigate('DebugLogs')
    } else {
      navigation.navigate(lastScreenTitle + routeName, {
        form,
        screenTitle,
        phone,
      })
    }
  }

  const renderSettingsType = ({
    type,
    routeName,
    form,
    screenTitle,
    phone,
  }) => (
    <TouchableOpacity
      style={styles.settingsTypeContainer}
      onPress={() =>
        onSettingsTypePress(type, routeName, form, screenTitle, phone)
      }>
      <Text style={styles.settingsType}>{type}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.settingsTitleContainer}>
        <Text style={styles.settingsTitle}>{'GENERAL'}</Text>
      </View>
      <View style={styles.settingsTypesContainer}>
        {renderSettingsType({
          type: 'Account Details',
          routeName: 'EditProfile',
          form: config.editProfileFields,
          screenTitle: localized('Edit Profile'),
        })}
        {renderSettingsType({
          type: 'My Videos',
          routeName: 'Videos',
          screenTitle: localized('My Videos'),
        })}
        {renderSettingsType({
          type: 'Blocked Users',
          routeName: 'BlockedSettings',
          screenTitle: localized('Blocked Users'),
        })}
        {renderSettingsType({
          type: 'Settings',
          routeName: 'AppSettings',
          form: config.userSettingsFields,
          screenTitle: localized('User Settings'),
        })}
        {renderSettingsType({
          type: 'Founders & Dev Team',
          routeName: 'Founders',
          screenTitle: localized('Founders & Dev Team'),
        })}
        {renderSettingsType({
          type: 'Contact Us',
          routeName: 'ContactUs',
          form: config.contactUsFields,
          phone: config.contactUsPhoneNumber,
          screenTitle: localized('Contact Us'),
        })}
        {renderSettingsType({
          type: 'About Us',
          routeName: 'AboutUs',
          screenTitle: localized('About Us'),
        })}
        {renderSettingsType({
          type: 'Debug Logs',
          routeName: 'DebugLogs',
          screenTitle: localized('Debug Logs'),
        })}
        {renderSettingsType({ type: 'Logout' })}
      </View>
    </View>
  )
}

export default IMProfileSettings
