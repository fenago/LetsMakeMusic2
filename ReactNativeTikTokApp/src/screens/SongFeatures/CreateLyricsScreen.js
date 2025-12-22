import React from 'react'
import { FileText } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function CreateLyricsScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Create Lyrics"
      description="Use AI to generate song lyrics. Describe the theme, mood, and style you want, and get custom lyrics for your next song."
      icon={FileText}
      iconColor="#ec4899"
    />
  )
}
