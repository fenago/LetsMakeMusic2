import RootNavigator from '../navigators/RootNavigator'
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { useTheme } from '../core/dopebase'

const AppContainer = () => {
  const { appearance, theme } = useTheme()

  return (
    <NavigationContainer
      theme={
        appearance === 'dark'
          ? theme.navContainerTheme.dark
          : theme.navContainerTheme.light
      }>
      <RootNavigator />
    </NavigationContainer>
  )
}

export default AppContainer
