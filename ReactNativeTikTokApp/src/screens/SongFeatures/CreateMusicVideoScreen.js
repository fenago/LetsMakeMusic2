import React from 'react'
import { Film } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function CreateMusicVideoScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Create Music Video"
      description="Generate an AI-powered music video with visualizations and effects that sync to your song's rhythm and mood."
      icon={Film}
      iconColor="#3875e8"
      song={route.params?.song}
    />
  )
}
