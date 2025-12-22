import React from 'react'
import { Mic } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function GetAcapellaScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Get Acapella"
      description="Extract just the vocals from your song, removing all instruments. Perfect for remixing or creating new versions."
      icon={Mic}
      iconColor="#f97316"
      song={route.params?.song}
    />
  )
}
