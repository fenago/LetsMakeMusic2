import React from 'react'
import { Guitar } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function AddInstrumentsScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Add Instruments"
      description="Add AI-generated instrumental backing to your acapella or vocal track. Choose styles and let AI create the perfect accompaniment."
      icon={Guitar}
      iconColor="#a855f7"
      song={route.params?.song}
    />
  )
}
