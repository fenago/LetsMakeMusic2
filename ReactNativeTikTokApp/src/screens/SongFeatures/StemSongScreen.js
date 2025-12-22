import React from 'react'
import { Layers } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function StemSongScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Stem Your Song"
      description="Separate your song into individual stems: vocals, drums, bass, and other instruments. Download each track separately for remixing."
      icon={Layers}
      iconColor="#f97316"
      song={route.params?.song}
    />
  )
}
