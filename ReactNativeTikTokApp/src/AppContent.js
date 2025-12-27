import React from 'react'
import { View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import RootNavigator from './navigators/RootNavigator'
import { MediaPlayerProvider } from './contexts/MediaPlayerContext'
import { GenerationTaskProvider } from './contexts/GenerationTaskContext'
import MiniPlayer from './components/ui/MiniPlayer'
import FullPlayerBottomSheet from './components/ui/FullPlayer'

const AppContent = () => {
  return (
    <GenerationTaskProvider>
      <MediaPlayerProvider>
        <NavigationContainer>
          <View style={styles.container}>
            <RootNavigator />
            {/* Mini player sits above tab bar */}
            <MiniPlayer tabBarHeight={83} />
            {/* Full player bottom sheet */}
            <FullPlayerBottomSheet />
          </View>
        </NavigationContainer>
      </MediaPlayerProvider>
    </GenerationTaskProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export default AppContent
