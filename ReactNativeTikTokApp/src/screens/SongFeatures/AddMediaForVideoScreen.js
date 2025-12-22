import React from 'react'
import { Film } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function AddMediaForVideoScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Add Media for Video"
      description="Add your own photos and video clips to create a custom music video for your song. We'll sync them to the beat."
      icon={Film}
      iconColor="#22c55e"
      song={route.params?.song}
    />
  )
}
