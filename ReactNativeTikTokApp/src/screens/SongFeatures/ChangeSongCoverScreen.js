import React from 'react'
import { Upload } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function ChangeSongCoverScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Change Song Cover"
      description="Upload a new image to use as your song's cover art. Choose from your photo library or take a new photo."
      icon={Upload}
      iconColor="#22c55e"
      song={route.params?.song}
    />
  )
}
