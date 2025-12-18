import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React from 'react'
import {
  InnerFeedNavigator,
  InnerChatSearchNavigator,
  InnerDiscoverNavigator,
  InnerProfileNavigator,
} from './InnerStackNavigators'
import { CustomBottomTabs } from '../components'
import { useConfig } from '../config'
import { useTheme } from '../core/dopebase'

const BottomTab = createBottomTabNavigator()
const BottomTabNavigator = () => {
  const config = useConfig()
  const { theme } = useTheme()

  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        title: route.name,
        headerShown: false,
      })}
      sceneContainerStyle={theme.webContainerStyle}
      tabBar={({ state, route, navigation }) => (
        <CustomBottomTabs
          tabIcons={config.tabIcons}
          route={route}
          state={state}
          navigation={navigation}
        />
      )}
      initialRouteName="Feed">
      <BottomTab.Screen name="Feed" component={InnerFeedNavigator} />
      <BottomTab.Screen name="Discover" component={InnerDiscoverNavigator} />
      <BottomTab.Screen name="Inbox" component={InnerChatSearchNavigator} />
      <BottomTab.Screen name="Profile" component={InnerProfileNavigator} />
    </BottomTab.Navigator>
  )
}
export default BottomTabNavigator
