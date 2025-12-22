import React from 'react'
import { AudioWaveform } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function BuildBeatsScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Build Beats"
      description="Create custom beats and instrumentals. Choose your tempo, style, and instruments to generate the perfect backing track."
      icon={AudioWaveform}
      iconColor="#8b5cf6"
    />
  )
}
