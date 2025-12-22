import React from 'react'
import { Wand2 } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function ReinterpretSongScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Reinterpret Song"
      description="Transform your song into a completely new style. Turn a pop song into jazz, rock into lo-fi, or any genre transformation you can imagine."
      icon={Wand2}
      iconColor="#a855f7"
      song={route.params?.song}
    />
  )
}
