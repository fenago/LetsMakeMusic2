import React, { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import RootNavigator from './navigators/RootNavigator'
import { MediaPlayerProvider, useMediaPlayer } from './contexts/MediaPlayerContext'
import { GenerationTaskProvider } from './contexts/GenerationTaskContext'
import MiniPlayer from './components/ui/MiniPlayer'
import FullPlayerBottomSheet from './components/ui/FullPlayer'
import DebugOverlay from './components/ui/DebugOverlay'

/**
 * PERFORMANCE: LazyFullPlayer only mounts the heavy FullPlayerBottomSheet when needed.
 * Before this fix, FullPlayer was always mounted (11 useState hooks, all sections)
 * even when not visible, causing severe performance issues.
 */
const LazyFullPlayer = memo(() => {
  const { isFullPlayerVisible } = useMediaPlayer()

  // CRITICAL: Only mount FullPlayer when visible
  // This prevents all the hooks and child components from running when player is hidden
  if (!isFullPlayerVisible) {
    return null
  }

  return <FullPlayerBottomSheet />
})

const AppContent = () => {
  return (
    <GenerationTaskProvider>
      <MediaPlayerProvider>
        <NavigationContainer>
          <View style={styles.container}>
            <RootNavigator />
            {/* Mini player sits above tab bar */}
            <MiniPlayer tabBarHeight={83} />
            {/* Full player - only mounted when visible */}
            <LazyFullPlayer />
            {/* Debug overlay - only visible in DEV mode */}
            {__DEV__ && <DebugOverlay />}
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
