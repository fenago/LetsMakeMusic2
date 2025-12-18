import React from 'react'
import { useConfig } from '../../../../config'
import WelcomeScreen from '../WelcomeScreen/WelcomeScreen'

export default function DelayedLoginScreen(props) {
  const { navigation } = props
  const config = useConfig()
  return (
    <WelcomeScreen
      navigation={navigation}
      title={config.onboardingConfig.delayedLoginTitle}
      caption={config.onboardingConfig.delayedLoginCaption}
      delayedMode={true}
    />
  )
}
