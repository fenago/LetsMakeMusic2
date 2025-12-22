import React from 'react'
import { Mic } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function AddVocalsScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Add Vocals"
      description="Generate AI vocals for your instrumental track. Provide lyrics or let AI create them, then add a voice that fits your song's style."
      icon={Mic}
      iconColor="#a855f7"
      song={route.params?.song}
    />
  )
}
