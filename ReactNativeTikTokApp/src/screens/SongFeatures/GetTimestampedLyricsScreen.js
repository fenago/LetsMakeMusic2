import React from 'react'
import { FileText } from 'lucide-react-native'
import PlaceholderScreen from './PlaceholderScreen'

export default function GetTimestampedLyricsScreen({ navigation, route }) {
  return (
    <PlaceholderScreen
      navigation={navigation}
      title="Get Timestamped Lyrics"
      description="Generate word-by-word timestamped lyrics for your song. Perfect for karaoke mode, lyric videos, and synced captions."
      icon={FileText}
      iconColor="#a855f7"
      song={route.params?.song}
    />
  )
}
