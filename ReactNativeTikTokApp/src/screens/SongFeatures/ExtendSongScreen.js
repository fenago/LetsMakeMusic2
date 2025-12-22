import React from 'react'
import { Music } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function ExtendSongScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Extend Your Song"
      description="Make your song longer by generating additional verses, choruses, or instrumental sections that seamlessly continue your track."
      icon={Music}
      iconColor="#a855f7"
      song={route.params?.song}
    />
  )
}
