import React from 'react'
import { TouchableOpacity, Image, Text, View } from 'react-native'
import { useTheme } from '../../core/dopebase'
import dynamicStyles from './styles'
import {
  Mic2,
  Compass,
  Library,
  User,
  Plus,
  Sliders,
} from 'lucide-react-native'

// Map route names to Lucide icons (music-inspired terminology)
// Feed → Stage (Mic2), Discover → Explore (Compass), Library → My Catalog (Library)
// Create → Studio (Sliders), Profile → Backstage (User)
const LUCIDE_ICONS = {
  Feed: Mic2,        // Stage - microphone for performances
  Discover: Compass, // Explore - compass for discovery
  Library: Library,  // My Catalog - library/collection
  Create: Sliders,   // Studio - mixer sliders for production
  Profile: User,     // Backstage - artist profile
}

function TabItem({
  route,
  onPress,
  focus,
  tabIcons,
  tabLabels,
  routeName,
  isAddPhoto,
  isTransparentTab,
  isVideoOverlay, // New prop: true when showing video content
  onAddPress,
}) {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const styles = dynamicStyles(theme, appearance)

  const onTabPress = () => {
    onPress(routeName)
  }

  // Get icon color for the add button based on theme
  const getAddIconColor = () => {
    if (isVideoOverlay && isTransparentTab) {
      return '#F5F5F5'
    }
    return colorSet.primaryForeground
  }

  if (isAddPhoto) {
    return (
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onAddPress} style={[styles.addContainer]}>
          <Plus size={26} color={getAddIconColor()} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text
          style={[
            styles.title,
            isVideoOverlay && isTransparentTab && { color: '#F5F5F5' },
          ]}>
          {tabLabels?.[routeName] || routeName}
        </Text>
      </View>
    )
  }

  // Get icon color based on state
  const getIconColor = () => {
    if (isVideoOverlay && isTransparentTab) {
      return '#ffffff'
    }
    return focus ? colorSet.primaryForeground : colorSet.secondaryText
  }

  // Get the Lucide icon component for this route
  const LucideIcon = LUCIDE_ICONS[route.name]

  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={onTabPress}>
      {LucideIcon ? (
        <LucideIcon
          size={24}
          color={getIconColor()}
          strokeWidth={focus ? 2.5 : 2}
        />
      ) : (
        // Fallback to image if no Lucide icon defined
        <Image
          style={[styles.icon, focus ? styles.focusTintColor : styles.unFocusTintColor]}
          source={
            focus ? tabIcons[route.name]?.focus : tabIcons[route.name]?.unFocus
          }
        />
      )}
      <Text
        style={[
          styles.title,
          focus && styles.titleFocused,
          isVideoOverlay && isTransparentTab && { color: '#F5F5F5' },
        ]}>
        {tabLabels?.[routeName] || routeName}
      </Text>
    </TouchableOpacity>
  )
}

export default TabItem
