import React, { useState, useCallback } from 'react'
import { SafeAreaView } from 'react-native'
import { useTheme } from '../../core/dopebase'
import CustomTabItem from './CustomTabItem'
import dynamicStyles from './styles'

export default function BottomTabs({
  state,
  navigation,
  tabIcons,
  colorTitle,
  colorIcon,
}) {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  // Track if we're showing video content (needs transparent/white icons)
  // Default to false since HomeFeed now starts with Music tab
  const [isVideoOverlay, setIsVideoOverlay] = useState(false)

  // Use routes directly - Create tab is now a real tab in the navigator
  const customRoutes = state.routes

  const onTabItemPress = useCallback((routeName) => {
    // Only set video overlay when navigating to Feed AND showing videos tab
    // For now, we'll default to non-transparent since we start on Music tab
    if (routeName?.toLowerCase() === 'feed') {
      setIsVideoOverlay(false) // Start with Music view which needs themed icons
    } else {
      setIsVideoOverlay(false)
    }
    navigation.navigate(routeName)
  }, [navigation])

  const renderTabItem = (route, index) => {
    // Create tab shows as the special + button (TikTok-style center button)
    const isCreateTab = route.name?.toLowerCase() === 'create'

    return (
      <CustomTabItem
        key={route.key || index + ''}
        route={route}
        tabIcons={tabIcons}
        focus={state.index === index}
        routeName={route.name}
        onPress={onTabItemPress}
        isAddPhoto={isCreateTab}
        colorTitle={colorTitle}
        isTransparentTab={false} // Always use solid background for now
        isVideoOverlay={isVideoOverlay}
        onAddPress={() => navigation.navigate('Create')}
      />
    )
  }

  return (
    <SafeAreaView style={styles.tabContainer}>
      {customRoutes.map(renderTabItem)}
    </SafeAreaView>
  )
}
